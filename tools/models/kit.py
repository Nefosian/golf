# Builds the props of the game in Blender and exports them, all in one file, to web/models/kit.glb:
#
#   blender -b --factory-startup -P tools/models/kit.py
#
# Every prop is made here from code (no hand-edited .blend): change a number, run it again; the
# script also saves tools/models/kit.blend, to look at them in Blender. The colours are not decided
# here: each face carries a material named after a key of PALETTE in web/scene.js, which gives it its
# colour ("tint": a colour the game gives, a key's for example); LOOK only makes the .blend readable.
# Units are game units (the ball has a radius of 0.18), and each prop is modelled at the size the
# game shows it, so that its outline keeps the same thickness everywhere. Blender's Z is up; the
# exporter turns it into the game's Y. A prop stands on its origin (the ground) unless said
# otherwise. Its ink outline is not in the file: each object says how thick it is (custom property
# "ink"), and the game builds it when it loads the kit (inkShell in web/scene.js).
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'web', 'models', 'kit.glb')
TAU = math.tau
INK = 0.035 # the thickness of the outline, in course units
FONT = '/usr/share/fonts/liberation/LiberationSans-Bold.ttf' # the numbers on the tokens

LOOK = {
    'ink': '#17332b', 'cream': '#fff7e6', 'sand': '#e8d5ac', 'red': '#e63946', 'sun': '#ffd23f', 'mint': '#b9efc9',
    'pink': '#ff5d8f', 'orange': '#ff8a1f', 'violet': '#8b5cf6', 'violet2': '#5b3fd6', 'leaf': '#38aa6c', 'leaf2': '#2f9e63',
    'wood': '#b07a4f', 'steel': '#8e9aa8', 'dark': '#2b3a36', 'white': '#ffffff', 'tint': '#ffffff', 'cloud': '#ffffff',
    'stone': '#a9b4c2', 'earth': '#b07a4f', 'earth2': '#8a5a3c', 'lip': '#3fae5a', 'gold': '#ffc93c', 'water': '#3db8e8',
}

def linear(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1]

def material(name):
    m = bpy.data.materials.get(name)
    if not m:
        m = bpy.data.materials.new(name)
        m.diffuse_color = linear(LOOK[name])
        m.use_backface_culling = True # single-sided in the game: the ink shell relies on it
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = linear(LOOK[name])
    return m

R = lambda deg, axis: Matrix.Rotation(math.radians(deg), 4, axis)
T = lambda x, y, z: Matrix.Translation((x, y, z))
S = lambda x, y, z: Matrix.Diagonal((x, y, z, 1))

class Part:
    """A mesh being built: shapes are added in place, each face with a material by name."""
    def __init__(self):
        self.bm = bmesh.new()
        self.mats = []

    def mat(self, name):
        if name not in self.mats:
            self.mats.append(name)
        return self.mats.index(name)

    def take(self, verts, name, smooth=False, at=Matrix()):
        verts = [v for v in verts if isinstance(v, bmesh.types.BMVert)]
        bmesh.ops.transform(self.bm, matrix=at, verts=verts)
        for f in {f for v in verts for f in v.link_faces}:
            f.material_index = self.mat(name)
            f.smooth = smooth
        return verts

    def cylinder(self, r, h, name, segs=16, z=0.0, r2=None, at=Matrix(), smooth=True, caps=True):
        g = bmesh.ops.create_cone(self.bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2,
                                  depth=h, matrix=T(0, 0, z + h / 2))
        verts = self.take(g['verts'], name, smooth, at)
        for f in {f for v in verts for f in v.link_faces}:
            if len(f.verts) > 4: # a cap stays flat, its rim sharp
                f.smooth = False
                for e in f.edges: e.smooth = False
        return verts

    def box(self, sx, sy, sz, name, at=Matrix(), bevel=0.0, segments=1):
        g = bmesh.ops.create_cube(self.bm, size=1, matrix=S(sx, sy, sz))
        verts = self.take(g['verts'], name, False, at)
        if bevel:
            edges = list({e for v in verts for e in v.link_edges})
            new = bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, segments=segments, affect='EDGES', profile=0.5)
            for f in new['faces']:
                f.material_index = self.mat(name)
                f.smooth = segments > 1
        return verts

    def sphere(self, r, name, subdiv=3, at=Matrix(), smooth=True):
        g = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=r)
        return self.take(g['verts'], name, smooth, at)

    def uvsphere(self, r, name, segs=20, rings=12, at=Matrix(), smooth=True):
        g = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=rings, radius=r)
        return self.take(g['verts'], name, smooth, at)

    def torus(self, R0, r, name, segs=24, ring=8, at=Matrix(), arc=1.0):
        """A ring lying flat, around Z; arc < 1 leaves an open arc, from angle 0."""
        closed = arc >= 1.0
        n = segs if closed else segs + 1
        verts = []
        for i in range(n):
            a = TAU * arc * i / segs
            for j in range(ring):
                b = TAU * j / ring
                d = R0 + r * math.cos(b)
                verts.append(self.bm.verts.new((d * math.cos(a), d * math.sin(a), r * math.sin(b))))
        for i in range(segs if closed else segs):
            for j in range(ring):
                i2 = (i + 1) % n
                a, b = i * ring + j, i * ring + (j + 1) % ring
                c, d = i2 * ring + (j + 1) % ring, i2 * ring + j
                self.bm.faces.new((verts[a], verts[d], verts[c], verts[b]))
        if not closed: # cap the two ends
            self.bm.faces.new([verts[j] for j in reversed(range(ring))])
            self.bm.faces.new([verts[(n - 1) * ring + j] for j in range(ring)])
        return self.take(verts, name, True, at)

    def lathe(self, profile, name, segs=16, at=Matrix(), smooth=True, radial=None, caps=True):
        """A solid of revolution: profile is (radius, height) from the top down; a radius of 0 is a
        point. radial(angle) scales the radius around (an irregular outline)."""
        rnd = radial or (lambda a: 1.0)
        rings = []
        for r, z in profile:
            if r == 0:
                rings.append([self.bm.verts.new((0, 0, z))])
            else:
                rings.append([self.bm.verts.new((r * rnd(TAU * i / segs) * math.cos(TAU * i / segs), r * rnd(TAU * i / segs) * math.sin(TAU * i / segs), z)) for i in range(segs)])
        faces = []
        for k in range(len(rings) - 1):
            a, b = rings[k], rings[k + 1]
            for i in range(segs):
                if len(a) == 1: faces.append(self.bm.faces.new((a[0], b[(i + 1) % segs], b[i])))
                elif len(b) == 1: faces.append(self.bm.faces.new((a[i], a[(i + 1) % segs], b[0])))
                else: faces.append(self.bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i])))
        if caps and len(rings[0]) > 1: faces.append(self.bm.faces.new(list(reversed(rings[0]))))
        if caps and len(rings[-1]) > 1: faces.append(self.bm.faces.new(rings[-1]))
        verts = [v for r in rings for v in r]
        self.take(verts, name, smooth, at)
        return faces

    def poly(self, pts, z0, z1, name, at=Matrix(), bevel=0.0):
        """A prism: the polygon pts (x, y, counter-clockwise) from height z0 to z1."""
        bot = [self.bm.verts.new((x, y, z0)) for x, y in pts]
        top = [self.bm.verts.new((x, y, z1)) for x, y in pts]
        self.bm.faces.new(top)
        self.bm.faces.new(list(reversed(bot)))
        n = len(pts)
        for i in range(n):
            self.bm.faces.new((bot[i], bot[(i + 1) % n], top[(i + 1) % n], top[i]))
        verts = self.take(bot + top, name, False, at)
        if bevel:
            rims = [e for e in {e for v in verts for e in v.link_edges} if len(e.link_faces) == 2 and abs(e.link_faces[0].normal.dot(e.link_faces[1].normal)) < 0.5]
            new = bmesh.ops.bevel(self.bm, geom=rims, offset=bevel, segments=2, affect='EDGES', profile=0.5)
            for f in new['faces']:
                f.material_index = self.mat(name)
                f.smooth = True
        return verts

    def star(self, points, r_out, r_in, z0, z1, name, at=Matrix(), bevel=0.0):
        pts = [((r_out if i % 2 == 0 else r_in) * math.cos(TAU * i / (2 * points) + TAU / 4),
                (r_out if i % 2 == 0 else r_in) * math.sin(TAU * i / (2 * points) + TAU / 4)) for i in range(2 * points)]
        return self.poly(pts, z0, z1, name, at, bevel)

    def tube(self, path, r, name, sides=8, caps=True):
        """A tube along a list of points."""
        rings = []
        for i, c in enumerate(path):
            d = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            u = d.cross(Vector((0, 0, 1)))
            if u.length < 1e-4: u = d.cross(Vector((1, 0, 0)))
            u.normalize()
            w = d.cross(u)
            rings.append([self.bm.verts.new(c + (u * math.cos(TAU * j / sides) + w * math.sin(TAU * j / sides)) * r) for j in range(sides)])
        for i in range(len(rings) - 1):
            for j in range(sides):
                self.bm.faces.new((rings[i][j], rings[i][(j + 1) % sides], rings[i + 1][(j + 1) % sides], rings[i + 1][j]))
        if caps:
            self.bm.faces.new(list(reversed(rings[0])))
            self.bm.faces.new(rings[-1])
        return self.take([v for r in rings for v in r], name, True)

    def cut_below(self, z):
        """Drops what is under the height z (a half dome, a flat-bottomed cloud), and closes it."""
        geom = self.bm.verts[:] + self.bm.edges[:] + self.bm.faces[:]
        bmesh.ops.bisect_plane(self.bm, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_inner=True)

    def merge(self, other):
        """Adds the faces of another part, with their materials."""
        m = bpy.data.meshes.new('tmp')
        other.bm.to_mesh(m)
        start = len(self.bm.faces)
        self.bm.from_mesh(m)
        self.bm.faces.ensure_lookup_table()
        for f in self.bm.faces[start:]:
            f.material_index = self.mat(other.mats[f.material_index])
        bpy.data.meshes.remove(m)
        other.bm.free()

    def build(self, name, ink=INK, parent=None):
        """The object; ink is the thickness of its outline (none if 0)."""
        bm = self.bm
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        mesh = bpy.data.meshes.new(name)
        bm.to_mesh(mesh)
        bm.free()
        for m in self.mats:
            mesh.materials.append(material(m))
        obj = bpy.data.objects.new(name, mesh)
        obj['ink'] = ink
        bpy.context.collection.objects.link(obj)
        if parent:
            obj.parent = parent
        return obj

def text(p, s, size, depth, name, at=Matrix()):
    """Adds the text s to the part p, in relief, centred on its origin, lying in the XY plane, depth
    thick along Z."""
    cu = bpy.data.curves.new('text', 'FONT')
    cu.body, cu.size, cu.extrude, cu.bevel_depth = s, size, depth / 2, depth * 0.15
    if os.path.exists(FONT): # a bold font if the machine has it, Blender's own otherwise
        cu.font = bpy.data.fonts.get(os.path.basename(FONT)) or bpy.data.fonts.load(FONT)
    cu.align_x, cu.align_y = 'CENTER', 'CENTER'
    ob = bpy.data.objects.new('text', cu)
    bpy.context.collection.objects.link(ob)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    q = Part()
    q.bm.from_mesh(me)
    q.take(q.bm.verts[:], name, False, at)
    bpy.data.objects.remove(ob)
    bpy.data.curves.remove(cu)
    bpy.data.meshes.remove(me)
    p.merge(q)

def wobble(seed, amount, waves=3):
    """A radius that wanders around the circle: an irregular outline, the same for the same seed."""
    rnd = random.Random(seed)
    ph = [(rnd.uniform(0, TAU), rnd.uniform(0.3, 1.0)) for _ in range(waves)]
    return lambda a: 1 + amount * sum(w * math.sin((i + 2) * a + p) for i, (p, w) in enumerate(ph)) / waves

# ---------------------------------------------------------------------------------------- the hole

def flag():
    """The pin in the cup: its foot at the bottom of the cup (0.6 under the ground), standing 2.3 over
    the ground, a pennant at the top pointing to +X. The pole is cream with red bands."""
    p = Part()
    z = -0.6
    for i, (h, c) in enumerate(((1.0, 'cream'), (0.3, 'red'), (0.35, 'cream'), (0.3, 'red'), (0.35, 'cream'), (0.6, 'cream'))):
        p.cylinder(0.05, h, c, segs=12, z=z)
        z += h
    p.uvsphere(0.11, 'sun', segs=16, rings=10, at=T(0, 0, 2.36))
    # the pennant: a waving triangle, thick, with a cream band near the pole
    q = Part()
    n, L, H = 10, 1.05, 0.62
    top, bot = [], []
    for i in range(n + 1):
        x = L * i / n
        y = 0.08 * math.sin(x * 5.0)
        h = H / 2 * (1 - x / L) + 0.005
        top.append(q.bm.verts.new((x, y, 1.95 + h)))
        bot.append(q.bm.verts.new((x, y, 1.95 - h)))
    for i in range(n):
        f = q.bm.faces.new((bot[i], bot[i + 1], top[i + 1], top[i]))
        f.material_index = q.mat('cream' if i == 1 else 'red')
        f.smooth = True
    bmesh.ops.solidify(q.bm, geom=q.bm.faces[:], thickness=0.045)
    for f in q.bm.faces:
        if f.material_index >= len(q.mats): f.material_index = q.mat('red')
        f.smooth = True
    bmesh.ops.translate(q.bm, vec=(0.04, 0, 0), verts=q.bm.verts)
    p.merge(q)
    return p.build('flag', ink=0.025)

def cup_rim():
    """The rim of a cup of radius 0.45, flat on the ground: an ink line, then a cream ring."""
    p = Part()
    for r0, r1, c in ((0.45, 0.48, 'ink'), (0.48, 0.56, 'cream'), (0.56, 0.585, 'ink')):
        a = [p.bm.verts.new((r0 * math.cos(TAU * i / 48), r0 * math.sin(TAU * i / 48), 0.006)) for i in range(48)]
        b = [p.bm.verts.new((r1 * math.cos(TAU * i / 48), r1 * math.sin(TAU * i / 48), 0.006)) for i in range(48)]
        for i in range(48):
            f = p.bm.faces.new((a[i], a[(i + 1) % 48], b[(i + 1) % 48], b[i]))
            f.material_index = p.mat(c)
    return p.build('cup_rim', ink=0)

def tee():
    """The tee: a rubber mat flush with the grass, rounded, dark, a cream ring where the ball sits;
    0.9 across."""
    p = Part()
    r, n, half = 0.12, 6, 0.45 - 0.12
    pts = []
    for cx, cy, a0 in ((half, half, 0), (-half, half, 90), (-half, -half, 180), (half, -half, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    p.poly(pts, 0.0, 0.02, 'dark')
    ring = Part()
    ring.torus(0.2, 0.018, 'cream', segs=32, ring=6, at=T(0, 0, 0.02) @ S(1, 1, 0.5))
    p.merge(ring)
    p.cylinder(0.05, 0.026, 'cream', segs=16, z=0.0, smooth=False)
    return p.build('tee', ink=0.015)

# ---------------------------------------------------------------------------------------- on the course

def bumper_cap():
    """The top of a bumper post of radius 0.45 (the game scales it to the post): a pink dome on a
    thick cream ring, a sun button on top. Its origin is the top of the post."""
    p = Part()
    p.uvsphere(0.4, 'pink', segs=32, rings=16, at=S(1, 1, 0.55))
    p.cut_below(0.0)
    p.torus(0.42, 0.06, 'cream', segs=32, ring=10, at=T(0, 0, 0.02))
    p.cylinder(0.12, 0.07, 'sun', segs=20, z=0.19)
    p.star(5, 0.1, 0.045, 0.255, 0.275, 'cream')
    return p.build('bumper_cap')

def coin(name, face, sign):
    """A token, standing, facing -Y and +Y (the game spins it), its number in relief on both faces:
    the -1 a round gold coin, the +1 a red spiky one."""
    p = Part()
    up = R(90, 'X')
    if face == 'gold':
        p.cylinder(0.3, 0.09, 'gold', segs=40, z=-0.045, at=up)
        p.torus(0.29, 0.03, 'orange', segs=40, ring=8, at=S(1, 1.6, 1) @ up)
        ink, depth = 'orange', 0.12
    else:
        p.star(12, 0.36, 0.27, -0.045, 0.045, 'red', at=up)
        ink, depth = 'cream', 0.12
    for turn in (0, 180): # one number on each face, each read from its side
        text(p, sign, 0.34, 0.03, ink, at=R(turn, 'Z') @ T(-0.01, -0.06, 0) @ R(90, 'X'))
    return p.build(name, ink=0.025)

def key():
    """A chunky toy key, standing, its bow up; "tint" takes the colour of the key."""
    p = Part()
    up = R(90, 'X')
    p.torus(0.12, 0.05, 'tint', segs=24, ring=10, at=T(0, 0, 0.18) @ up)
    p.cylinder(0.04, 0.38, 'tint', segs=12, z=-0.32, at=Matrix())
    p.box(0.12, 0.07, 0.06, 'tint', at=T(0.07, 0, -0.28), bevel=0.012)
    p.box(0.09, 0.07, 0.05, 'tint', at=T(0.06, 0, -0.17), bevel=0.012)
    p.uvsphere(0.05, 'cream', segs=12, rings=8, at=T(0, 0, 0.18))
    return p.build('key', ink=0.02)

def padlock():
    """The badge of a gate: a padlock in the colour of its key, origin at its bottom."""
    p = Part()
    p.box(0.42, 0.2, 0.34, 'tint', at=T(0, 0, 0.17), bevel=0.05, segments=3)
    p.torus(0.13, 0.04, 'steel', segs=16, ring=8, arc=0.5, at=T(0, 0, 0.34) @ R(90, 'X'))
    p.cylinder(0.04, 0.06, 'steel', segs=8, z=0.28, at=T(0.13, 0, 0))
    p.cylinder(0.04, 0.06, 'steel', segs=8, z=0.28, at=T(-0.13, 0, 0))
    p.cylinder(0.09, 0.02, 'cream', segs=20, z=0.0, at=T(0, -0.1, 0.17) @ R(90, 'X'))
    p.box(0.03, 0.03, 0.08, 'ink', at=T(0, -0.115, 0.15))
    p.uvsphere(0.025, 'ink', segs=8, rings=6, at=T(0, -0.115, 0.2))
    return p.build('padlock', ink=0.022)

def ghost():
    """Power "ghost": a little sheet ghost, about 0.5 high, looking to -Y (the camera side)."""
    p = Part()
    lobes = lambda a: 1 + 0.12 * math.cos(6 * a)
    prof = [(0.0, 0.52), (0.12, 0.5), (0.19, 0.44), (0.22, 0.36), (0.22, 0.24), (0.23, 0.12), (0.25, 0.04)]
    p.lathe(prof, 'white', segs=24)
    p.bm.verts.ensure_lookup_table()
    for v in p.bm.verts: # the hem, in six lobes
        if v.co.z < 0.05:
            a = math.atan2(v.co.y, v.co.x)
            v.co.z = 0.04 + 0.05 * math.cos(6 * a)
            v.co.x *= lobes(a); v.co.y *= lobes(a)
    for x in (-0.075, 0.075):
        p.uvsphere(0.035, 'ink', segs=10, rings=6, at=T(x, -0.19, 0.36) @ S(1, 0.6, 1.4))
        p.uvsphere(0.03, 'pink', segs=8, rings=6, at=T(x * 1.7, -0.18, 0.28) @ S(1, 0.4, 0.7))
    return p.build('ghost', ink=0.022)

def weight():
    """Power "heavy": a kettlebell with a cream plate, about 0.5 high."""
    p = Part()
    p.uvsphere(0.22, 'dark', segs=24, rings=14, at=T(0, 0, 0.21) @ S(1, 1, 0.9))
    p.torus(0.14, 0.045, 'dark', segs=20, ring=8, arc=0.5, at=T(0, 0, 0.36) @ R(90, 'X'))
    p.cylinder(0.045, 0.05, 'dark', segs=8, z=0.33, at=T(0.14, 0, 0))
    p.cylinder(0.045, 0.05, 'dark', segs=8, z=0.33, at=T(-0.14, 0, 0))
    p.box(0.2, 0.03, 0.09, 'cream', at=T(0, -0.205, 0.2), bevel=0.012)
    p.cylinder(0.2, 0.03, 'dark', segs=20, z=0.0)
    return p.build('weight', ink=0.022)

def gum():
    """Power "sticky": a blob of green gum, a shine, a long drip."""
    p = Part()
    p.uvsphere(0.22, 'leaf', segs=24, rings=14, at=T(0, 0, 0.17) @ S(1, 1, 0.75))
    p.tube([Vector((0.12, -0.1, 0.12)), Vector((0.15, -0.12, 0.04)), Vector((0.16, -0.13, -0.05))], 0.04, 'leaf', sides=10)
    p.uvsphere(0.055, 'leaf', segs=12, rings=8, at=T(0.16, -0.13, -0.07))
    p.uvsphere(0.05, 'white', segs=10, rings=6, at=T(-0.08, -0.13, 0.25) @ S(1.3, 0.5, 0.8))
    return p.build('gum', ink=0.022)

def spring():
    """Power "bouncy": a coil spring with a pink ball on top."""
    p = Part()
    turns, n, R0 = 4, 64, 0.14
    path = [Vector((R0 * math.cos(TAU * turns * i / n), R0 * math.sin(TAU * turns * i / n), 0.05 + 0.26 * i / n)) for i in range(n + 1)]
    p.tube(path, 0.028, 'steel', sides=8)
    p.cylinder(0.19, 0.04, 'pink', segs=24, z=0.0)
    p.uvsphere(0.13, 'pink', segs=20, rings=12, at=T(0, 0, 0.43))
    p.uvsphere(0.03, 'white', segs=8, rings=6, at=T(-0.05, -0.08, 0.5))
    return p.build('spring', ink=0.022)

def portal():
    """The mouth of a teleporter of radius 0.6 (the game scales it to the zone), flat on the ground:
    a thick violet ring around a spiral."""
    p = Part()
    p.torus(0.58, 0.07, 'violet', segs=48, ring=10, at=T(0, 0, 0.02) @ S(1, 1, 0.7))
    # the spiral: two arms, flat, just over the ground
    for arm, c in ((0, 'violet2'), (math.pi, 'violet')):
        pts = []
        for i in range(40):
            s = i / 39
            a = arm + s * TAU * 0.9
            r = 0.05 + s * 0.48
            w = 0.03 + 0.05 * s
            pts.append((a, r, w))
        verts = []
        for a, r, w in pts:
            verts.append((p.bm.verts.new(((r - w) * math.cos(a), (r - w) * math.sin(a), 0.012)), p.bm.verts.new(((r + w) * math.cos(a), (r + w) * math.sin(a), 0.012))))
        for i in range(len(verts) - 1):
            f = p.bm.faces.new((verts[i][0], verts[i + 1][0], verts[i + 1][1], verts[i][1]))
            f.material_index = p.mat(c)
    return p.build('portal', ink=0.03)

def shard():
    """A crystal that circles over a teleporter: a bevelled diamond, 0.26 high."""
    p = Part()
    p.lathe([(0, 0.13), (0.07, 0.02), (0.07, -0.02), (0, -0.13)], 'violet', segs=6, smooth=False)
    p.bm.faces.ensure_lookup_table()
    for f in p.bm.faces:
        if f.calc_center_median().z < -0.01: f.material_index = p.mat('mint')
    return p.build('shard', ink=0.015)

def fan():
    """A fan floating at the start of a wind, blowing to -Y: a cream ring on a rear housing; its
    blades are the object fan_blades, which the game turns."""
    p = Part()
    p.torus(0.5, 0.07, 'cream', segs=40, ring=10, at=R(90, 'X'))
    p.lathe([(0.0, 0.3), (0.11, 0.27), (0.15, 0.18), (0.13, 0.06), (0.08, 0.0)], 'steel', segs=20, at=R(-90, 'X'))
    for i in range(4): # struts from the housing to the ring
        a = TAU * i / 4 + TAU / 8
        p.box(0.035, 0.03, 0.42, 'cream', at=R(math.degrees(a), 'Y') @ T(0, 0.16, 0.27), bevel=0.01)
    fanobj = p.build('fan', ink=0.03)
    b = Part()
    b.uvsphere(0.08, 'sun', segs=16, rings=8, at=T(0, -0.04, 0))
    for i in range(5):
        a = 360 * i / 5
        blade = Part()
        blade.uvsphere(0.2, 'mint', segs=16, rings=8, at=T(0, 0, 0.24) @ S(0.75, 0.12, 1.0))
        bmesh.ops.transform(blade.bm, matrix=R(a, 'Y') @ R(25, 'Z'), verts=blade.bm.verts)
        b.merge(blade)
    b.build('fan_blades', ink=0.02, parent=fanobj)
    return fanobj

def cannon():
    """A launcher's cannon: its barrel (this object) along -Y from its breech, the origin, where the
    ball goes in, 1.3 long, hollow, to the muzzle where it flies out; the game raises it to the angle
    it throws at. Its carriage is the object cannon_carriage."""
    p = Part()
    prof = [(0.2, 1.3), (0.32, 1.3), (0.32, 1.17), (0.26, 1.12), (0.25, 0.55), (0.3, 0.5), (0.3, 0.4), (0.28, 0.35),
            (0.3, 0.12), (0.36, 0.06), (0.36, 0.0), (0.2, 0.0), (0.2, 1.3)]
    p.lathe(prof, 'dark', segs=28, caps=False)
    bmesh.ops.remove_doubles(p.bm, verts=p.bm.verts, dist=1e-5)
    for f in p.bm.faces: # gold bands, the inside dark as a hole
        c = f.calc_center_median()
        r = math.hypot(c.x, c.y)
        if r < 0.205: f.material_index = p.mat('ink')
        elif c.z > 1.15 or 0.38 < c.z < 0.52 or c.z < 0.07: f.material_index = p.mat('gold')
    bmesh.ops.transform(p.bm, matrix=R(90, 'X'), verts=p.bm.verts)
    return p.build('cannon', ink=0.03)

def cannon_carriage():
    """The carriage of a cannon, on the ground under its breech: a wooden cradle on two red wheels,
    facing -Y."""
    p = Part()
    p.box(0.5, 0.75, 0.14, 'wood', at=T(0, -0.15, 0.1), bevel=0.03)
    for x in (-0.38, 0.38):
        p.cylinder(0.22, 0.08, 'red', segs=24, z=-0.04, at=T(x, -0.1, 0.22) @ R(90, 'Y'))
        p.cylinder(0.07, 0.11, 'gold', segs=12, z=-0.055, at=T(x, -0.1, 0.22) @ R(90, 'Y'))
    p.cylinder(0.04, 0.84, 'wood', segs=8, z=-0.42, at=T(0, -0.1, 0.22) @ R(90, 'Y'))
    return p.build('cannon_carriage', ink=0.03)

def fin():
    """A shark fin cutting through the water of a hazard (the game moves it round), heading to -Y,
    0.45 high over the water line, its foot under it."""
    p = Part()
    # its outline: forward (to -Y), up
    shape = [(0.26, -0.15), (0.2, 0.05), (0.09, 0.25), (-0.05, 0.41), (-0.15, 0.46), (-0.13, 0.33), (-0.15, 0.13), (-0.21, 0.0), (-0.28, -0.15)]
    to_world = Matrix(((0, 0, 1, 0), (-1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1))) # x: forward, y: up, z: across
    p.poly(list(reversed(shape)), -0.04, 0.04, 'steel', at=to_world, bevel=0.02)
    return p.build('fin', ink=0.025)

def coil():
    """A steel spring under a jump pad, 0.14 high."""
    p = Part()
    turns, n, R0 = 3, 48, 0.07
    p.tube([Vector((R0 * math.cos(TAU * turns * i / n), R0 * math.sin(TAU * turns * i / n), 0.015 + 0.11 * i / n)) for i in range(n + 1)], 0.016, 'steel', sides=6)
    return p.build('coil', ink=0.012)

def pennant():
    """A checkered pennant on a short mast, floating over the end of a checkpoint."""
    p = Part()
    p.cylinder(0.025, 0.7, 'cream', segs=8, z=0.0)
    p.uvsphere(0.045, 'sun', segs=10, rings=6, at=T(0, 0, 0.72))
    n = 4
    for i in range(n):
        for j in range(3):
            x0, x1 = 0.36 * i / n, 0.36 * (i + 1) / n
            z0, z1 = 0.4 + 0.08 * j, 0.4 + 0.08 * (j + 1)
            vs = [p.bm.verts.new(v) for v in ((x0 + 0.02, 0, z0), (x1 + 0.02, 0, z0), (x1 + 0.02, 0, z1), (x0 + 0.02, 0, z1))]
            f = p.bm.faces.new(vs)
            f.material_index = p.mat('ink' if (i + j) % 2 else 'white')
            f2 = p.bm.faces.new(list(reversed([p.bm.verts.new(v.co + Vector((0, -0.001, 0))) for v in vs])))
            f2.material_index = f.material_index
    return p.build('pennant', ink=0.0)

# ---------------------------------------------------------------------------------------- around the course

def islet(name, r, seed, fall=False):
    """A floating island of radius about r, its top flat at 0: grass, a band of earth, rock tapering
    down to a point, its outline irregular; with fall, a pond and its waterfall over the edge."""
    p = Part()
    out = wobble(seed, 0.35)
    if fall:
        a = 0.6
        edge = r * out(a) * 0.93 # the earth's edge there
        q = waterfall()
        bmesh.ops.transform(q.bm, matrix=R(math.degrees(a) - 90 + 180, 'Z') @ T(0, -edge, 0), verts=q.bm.verts)
        p.merge(q)
    p.lathe([(r * 0.98, 0.0), (r, -0.06), (r, -0.3)], 'leaf', segs=20, radial=out, smooth=False)
    p.lathe([(r * 0.97, -0.3), (r * 0.93, -0.9)], 'earth', segs=20, radial=out, smooth=False)
    p.lathe([(r * 0.93, -0.9), (r * 0.62, -1.6), (r * 0.3, -2.4), (0, -3.1 - r * 0.3)], 'earth2', segs=20, radial=out, smooth=False)
    bmesh.ops.remove_doubles(p.bm, verts=p.bm.verts, dist=1e-4)
    return p.build(name, ink=0.045)

def waterfall():
    """A ribbon of water from the edge of an islet (its origin) falling into the sea, to -Y; the
    pond it comes from, inwards. A part, for islet."""
    p = Part()
    rows = 14
    left, right = [], []
    for i in range(rows + 1):
        s = i / rows
        y = -0.15 - 0.5 * s ** 0.5
        z = -3.6 * s
        w = 0.35 + 0.1 * s
        left.append(p.bm.verts.new((-w, y, z)))
        right.append(p.bm.verts.new((w, y, z)))
    for i in range(rows):
        f = p.bm.faces.new((left[i], right[i], right[i + 1], left[i + 1]))
        f.material_index = p.mat('water' if i % 3 else 'cream')
        f.smooth = True
    bmesh.ops.solidify(p.bm, geom=p.bm.faces[:], thickness=0.04)
    for f in p.bm.faces:
        if f.material_index >= len(p.mats): f.material_index = p.mat('water')
    p.lathe([(0.0, 0.03), (0.5, 0.02), (0.5, -0.06)], 'water', segs=16, at=T(0, 0.6, 0.0)) # the pond it comes from
    return p

def tree_ball():
    """A round tree: a flared trunk, a crown of three soft balls; about 2.6 high."""
    p = Part()
    p.cylinder(0.18, 1.3, 'wood', segs=10, z=0.0, r2=0.1)
    p.cylinder(0.26, 0.15, 'wood', segs=10, z=0.0, r2=0.18)
    for c, r in (((0, 0, 1.75), 0.75), ((0.45, 0.2, 1.45), 0.5), ((-0.4, -0.25, 1.5), 0.5)):
        p.sphere(r, 'leaf', subdiv=3, at=T(*c))
    return p.build('tree_ball', ink=0.04)

def tree_pine():
    """A fir: four bell-shaped tiers on a short trunk; about 2.8 high."""
    p = Part()
    p.cylinder(0.14, 0.6, 'wood', segs=10, z=0.0, r2=0.1)
    for r, z, h in ((0.95, 0.45, 0.8), (0.78, 0.95, 0.75), (0.6, 1.45, 0.7), (0.4, 1.95, 0.85)):
        p.lathe([(0, z + h), (r * 0.35, z + h * 0.6), (r * 0.8, z + h * 0.2), (r, z), (r * 0.7, z - 0.05)], 'leaf2', segs=14)
    return p.build('tree_pine', ink=0.04)

def tree_blossom():
    """A blossom tree: a crooked trunk, pink and cream puffs; about 2.5 high."""
    p = Part()
    p.tube([Vector((0, 0, 0)), Vector((0.05, 0, 0.6)), Vector((-0.1, 0.05, 1.2)), Vector((0, 0, 1.5))], 0.13, 'wood', sides=10)
    for c, r, m in (((0, 0, 1.75), 0.62, 'pink'), ((0.45, 0.1, 2.0), 0.42, 'pink'), ((-0.42, -0.15, 1.95), 0.4, 'pink'), ((0.1, -0.3, 2.25), 0.3, 'cream')):
        p.sphere(r, m, subdiv=3, at=T(*c))
    return p.build('tree_blossom', ink=0.04)

def bush():
    """A low bush of three soft balls, about 0.6 high, with two flowers."""
    p = Part()
    for c, r in (((0, 0, 0.3), 0.38), ((0.35, 0.1, 0.22), 0.28), ((-0.32, -0.08, 0.2), 0.27)):
        p.sphere(r, 'leaf', subdiv=2, at=T(*c))
    p.sphere(0.06, 'pink', subdiv=2, at=T(0.15, -0.3, 0.5))
    p.sphere(0.06, 'sun', subdiv=2, at=T(-0.2, -0.25, 0.4))
    return p.build('bush', ink=0.03)

def rock(name, seed, size):
    """A rounded boulder, faceted, sitting on the ground."""
    p = Part()
    rnd = random.Random(seed)
    p.sphere(size, 'stone', subdiv=2, at=S(1.2, 1.0, 0.75), smooth=False)
    for v in p.bm.verts:
        v.co *= 1 + rnd.uniform(-0.12, 0.12)
        v.co.z = max(v.co.z, -size * 0.25)
    bmesh.ops.translate(p.bm, vec=(0, 0, size * 0.25), verts=p.bm.verts)
    return p.build(name, ink=0.03)

def flower():
    """A flower about 0.35 high; "tint" is its petals."""
    p = Part()
    p.tube([Vector((0, 0, 0)), Vector((0.02, 0, 0.15)), Vector((0, 0.01, 0.3))], 0.015, 'leaf2', sides=6)
    p.uvsphere(0.07, 'leaf', segs=8, rings=6, at=T(0.06, 0, 0.1) @ S(1, 0.4, 0.4))
    for i in range(5):
        a = TAU * i / 5
        p.uvsphere(0.055, 'tint', segs=8, rings=4, at=T(0.07 * math.cos(a), 0.07 * math.sin(a), 0.32) @ S(1, 1, 0.45))
    p.uvsphere(0.04, 'sun', segs=8, rings=4, at=T(0, 0, 0.34))
    return p.build('flower', ink=0.012)

def mushroom():
    """A red toadstool with cream dots, about 0.45 high."""
    p = Part()
    p.cylinder(0.08, 0.28, 'cream', segs=12, z=0.0, r2=0.06)
    p.lathe([(0, 0.46), (0.12, 0.44), (0.2, 0.36), (0.23, 0.28), (0.06, 0.27)], 'red', segs=20)
    for a, z in ((0.3, 0.4), (2.2, 0.38), (4.0, 0.36), (5.3, 0.41)):
        p.uvsphere(0.03, 'cream', segs=8, rings=6, at=T(0.15 * math.cos(a), 0.15 * math.sin(a), z))
    return p.build('mushroom', ink=0.02)

def fence():
    """A bit of cream picket fence, 1.6 long along X, 0.55 high."""
    p = Part()
    for i in range(5):
        x = -0.7 + 0.35 * i
        p.box(0.09, 0.05, 0.5, 'cream', at=T(x, 0, 0.25), bevel=0.012)
        p.cylinder(0.0, 0.08, 'cream', segs=4, z=0.5, r2=0.0, at=T(x, 0, 0))
        p.cylinder(0.064, 0.08, 'cream', segs=4, z=0.5, r2=0.0, at=T(x, 0, 0) @ R(45, 'Z'))
    for z in (0.15, 0.38):
        p.box(1.6, 0.04, 0.06, 'wood', at=T(0, 0.04, z), bevel=0.01)
    return p.build('fence', ink=0.025)

def cloud(name, seed):
    """A soft cloud with a flat bottom, about 4 long."""
    p = Part()
    rnd = random.Random(seed)
    for i in range(6):
        r = rnd.uniform(0.55, 1.0) * (1.0 if i == 0 else 0.85)
        c = (rnd.uniform(-1.4, 1.4), rnd.uniform(-0.6, 0.6), rnd.uniform(0.0, 0.35))
        p.sphere(r, 'cloud', subdiv=2, at=T(*c) @ S(1, 1, 0.8))
    p.cut_below(-0.05)
    return p.build(name, ink=0.04)

def balloon():
    """A hot-air balloon, about 5 high, origin at the bottom of its basket; its gores alternate cream
    and "tint"."""
    p = Part()
    n = 16
    prof = [(0.0, 5.0), (0.85, 4.85), (1.4, 4.4), (1.55, 3.8), (1.4, 3.1), (1.0, 2.45), (0.5, 1.95), (0.32, 1.75)]
    rings = [[p.bm.verts.new((r * math.cos(TAU * i / n), r * math.sin(TAU * i / n), z)) if r else None for i in range(n)] for r, z in prof]
    top = p.bm.verts.new((0, 0, 5.0))
    for k in range(len(prof) - 1):
        for i in range(n):
            if k == 0:
                f = p.bm.faces.new((top, rings[1][i], rings[1][(i + 1) % n]))
            else:
                f = p.bm.faces.new((rings[k][i], rings[k + 1][i], rings[k + 1][(i + 1) % n], rings[k][(i + 1) % n]))
            f.material_index = p.mat('tint' if i % 2 else 'cream')
            f.smooth = True
    p.box(0.55, 0.55, 0.42, 'wood', at=T(0, 0, 0.21), bevel=0.04, segments=2)
    p.torus(0.29, 0.035, 'earth2', segs=16, ring=6, at=T(0, 0, 0.42) @ S(1, 1, 1))
    for x, y in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
        p.tube([Vector((0.24 * x, 0.24 * y, 0.42)), Vector((0.24 * x, 0.24 * y, 1.8))], 0.015, 'earth2', sides=4)
    return p.build('balloon', ink=0.05)

def windmill():
    """A minigolf windmill, the landmark far away, about 7 high; its sails are the object
    windmill_sails, which the game turns, facing -Y."""
    p = Part()
    p.lathe([(1.2, 0.0), (1.05, 3.6), (1.15, 3.7)], 'cream', segs=12, smooth=False)
    p.lathe([(0, 6.1), (0.9, 4.2), (1.45, 3.6), (1.3, 3.55)], 'red', segs=12, smooth=False)
    p.box(0.6, 0.12, 1.0, 'wood', at=T(0, -1.1, 0.5), bevel=0.04)
    for z in (1.8, 3.0):
        p.box(0.45, 0.12, 0.45, 'wood', at=T(0, -1.12, z), bevel=0.04)
    mill = p.build('windmill', ink=0.06)
    s = Part()
    s.cylinder(0.3, 0.5, 'sun', segs=16, z=0.0, at=R(90, 'X'))
    for i in range(4):
        a = 90 * i + 45
        s.box(0.12, 0.12, 3.0, 'wood', at=R(a, 'Y') @ T(0, -0.4, 1.6), bevel=0.02)
        s.box(0.8, 0.05, 2.3, 'cream', at=R(a, 'Y') @ T(0.45, -0.42, 1.85), bevel=0.02)
    s.build('windmill_sails', ink=0.05, parent=mill)
    s_obj = mill.children[0]
    s_obj.location = (0, -1.25, 4.6)
    return mill

# ---------------------------------------------------------------------------------------- export

def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    props = [flag(), cup_rim(), tee(), bumper_cap(), coin('bonus', 'gold', '-1'), coin('malus', 'spiky', '+1'), key(), padlock(), ghost(), weight(), gum(), spring(),
             portal(), shard(), fan(), cannon(), cannon_carriage(), coil(), fin(), pennant(),
             islet('islet_s', 1.6, 1), islet('islet_m', 3.0, 2), islet('islet_l', 4.5, 3, fall=True),
             tree_ball(), tree_pine(), tree_blossom(), bush(), rock('rock_a', 1, 0.45), rock('rock_b', 2, 0.3), rock('rock_c', 3, 0.7),
             flower(), mushroom(), fence(), cloud('cloud_a', 1), cloud('cloud_b', 2), cloud('cloud_c', 3), balloon(), windmill()]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_texcoords=False, export_normals=True,
                              export_vertex_color='NONE', export_materials='EXPORT', export_yup=True, export_extras=True)
    tris = {o.name: sum(len(p.vertices) - 2 for c in [o, *o.children] for p in c.data.polygons) for o in props}
    bpy.context.preferences.filepaths.save_version = 0 # no kit.blend1 next to it
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'kit.blend'))
    print('KIT', os.path.getsize(OUT), 'bytes', tris, 'total tris', sum(tris.values()))

main()
