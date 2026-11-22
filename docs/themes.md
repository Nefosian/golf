# Thèmes : l'habillage des trous

Statut : **construit** (2026-11-22) dans `web/scene.js` (`THEMES`, `SIDE`, `CROWN`, `dress()`), le
thème de chaque trou dans son script (`tools/maps/holes/`). Les couleurs ont été choisies par calcul
(écart ΔE CIE76) puis regardées sur les aperçus et en jeu. Écarts à ce document : les poteaux de
`quai` et de `ville` reprennent la tuile du poteau recolorée, le château a ses tourelles, et la
guirlande de `nuit` n'éclaire pas (des ampoules mates, pas de lumière).

Le reproche : « des murs en boîtes qui se ressemblent tous, aucune identité par carte ». Aujourd'hui
tout mur est une boîte crème, tout poteau est crème à bande rouge, tout parcours est une île verte
sur de la terre brune dans le même ciel. La réponse : un champ `theme` par trou, sept thèmes, et le
client habille. La physique ne change pas : mêmes boîtes, même jeu.

## 1. Ce qui se voit vraiment

Sur un aperçu de 400 × 280, un mur fait 2 à 3 pixels de large : **son motif ne s'y voit pas**. Ce
qui occupe l'image, dans l'ordre :

1. le fond : le plan sous le parcours (`below`), le ciel, l'horizon ;
2. la jupe de l'île (`skirt()` : feston, terre, roche) ;
3. la teinte de l'herbe ;
4. la couleur du dessus des murs, qui dessine le tracé ;
5. la silhouette du décor (sapins, rochers, îlots de sable ou de neige).

Chaque thème est donc défini d'abord par ces cinq couleurs, et **deux thèmes quelconques diffèrent
d'au moins 52 de ΔE sur l'une des quatre premières** (tableau en section 6), et deux fonds ne sont jamais à moins de 26 l'un de l'autre. Le motif des flancs,
les chaperons et les poteaux ne se voient qu'en jeu, caméra basse : c'est la seconde couche.

D'où l'ordre de construction : **d'abord la plomberie des couleurs pour les sept thèmes** (fond,
ciel, brouillard, jupe, herbe, dessus et flanc de mur unis, recoloration du décor), qui change déjà
tous les aperçus ; **ensuite** les motifs, les chaperons, les poteaux, thème par thème dans l'ordre
du classement.

## 2. Ce qu'un thème ne touche jamais

- **La physique** : aucun collider ne bouge ni ne change de taille.
- **Ce qui joue garde ses couleurs** : jaune rayé d'encre (obstacle mobile), orange (accélérateur),
  rose (bumper), sarcelle (saut), rouge et marine (aimant, répulseur), violet, rose et indigo
  (portails), bleu et vermillon (clés et portes), or (pièce), damier (checkpoint), tapis sombre.
- **Les sols** : sable, glace et eau gardent leur tuile. Seule l'herbe reçoit une teinte, légère,
  toujours verte (teinte Lab entre 128° et 151°, 139° aujourd'hui).
- **Un collider déjà habillé** : dès que `surface(c)` rend quelque chose (porte, obstacle mobile,
  bumper), le thème ne s'applique pas. Il n'habille que les murs et poteaux nus.
- **Les lumières** : le soleil et la lumière d'ambiance restent les mêmes dans tous les thèmes, y
  compris de nuit : c'est un terrain éclairé, pas un trou dans le noir.
- **La ligne de vue** : le décor reste sous `floor + 0,12 × gap`, comme aujourd'hui.

## 3. Le socle commun

**Les couleurs.** Une table par thème, lue par `setHole` :

```js
const THEMES = {
  nuit: { sky: '#141a3c', horizon: '#3a2f73', below: '#1c2350', grass: '#5fcf86', lip: '#2f9a6a', skirt: ['#2f9a6a', '#5a4f8a', '#3a3463'], wallTop: '#4a4a70', wallSide: '#3d3f66' },
  banquise: { sky: '#8fd0ee', horizon: '#f2faff', below: '#27587f', grass: '#7dd690', lip: '#4fb07a', skirt: ['#ffffff', '#a9d3ea', '#6fa3cc'], wallTop: '#7d4f35', wallSide: '#7d4f35' },
  quai: { sky: '#5cc4e8', horizon: '#e8f7ff', below: '#2b93d1', grass: '#6fd36a', lip: '#3fae5a', skirt: ['#b98455', '#7d4f35', '#5d4630'], wallTop: '#b98455', wallSide: '#96643f' },
  canyon: { sky: '#74c6e3', horizon: '#ffe2b8', below: '#a65a42', grass: '#93d65c', lip: '#66ad40', skirt: ['#66ad40', '#e0905e', '#c8704a'], wallTop: '#c96a45', wallSide: '#a84f33' },
  chateau: { sky: '#7fb6dc', horizon: '#eef1f6', below: '#eef1f6', grass: '#62c873', lip: '#38a05e', skirt: ['#38a05e', '#9aa5b3', '#6e7989'], wallTop: '#d5dbe3', wallSide: '#a9b4c2' },
  bocage: { sky: '#5cc4e8', horizon: '#fff2d6', below: '#8fd0e8', grass: '#7ddb6b', lip: '#49b65c', skirt: ['#49b65c', '#b07a4f', '#8a5a3c'], wallTop: '#175f3d', wallSide: '#124f33' },
  ville: { sky: '#7fb0e6', horizon: '#ffdcc4', below: '#f3b0c0', grass: '#6fd36a', lip: '#3fae5a', skirt: ['#3fae5a', '#b8644a', '#8f4a36'], wallTop: '#fff7e6', wallSide: '#b8644a' },
};
```

- `sky` et `horizon` : les deux couleurs du dôme ; le brouillard prend `horizon`.
- `below` : le plan à `killY` ; `grass` et `lip` : l'herbe et son chant (`MAT.side`).
- `skirt` : les trois bandes de `skirt()`, dans l'ordre feston, terre (0,9), roche.
- `wallTop`, `wallSide` : le dessus et les flancs des murs nus, unis à l'étape 1, le flanc
  remplacé par sa tuile à l'étape 2.
- `toon()` n'adoucit l'ombre que des couleurs de `PALE` (des nombres : `0xd5dbe3`, pas la chaîne).
  Toute couleur unie claire d'un thème doit y entrer, sinon son ombre tombe à la moitié et vire au
  gris sale : `#d5dbe3` (dessus du château), `#a9d3ea` et `#d6f3ff` (glace de la banquise),
  `#f2d89a` et `#e0c080` (sable des îlots du quai), `#ffe1c2` et `#ffe6ea` (nuages du canyon et de
  la ville). Les tuiles n'ont rien à faire : `toon(0xffffff, { map })` a déjà la rampe douce.
- **Des matières propres au thème, jamais celles qui sont partagées.** `MAT.wall` sert aussi aux
  pointillés de l'arc des canons et au dessus des poteaux, `MAT.side` au chant des sols et au feston
  de la jupe, `PALETTE.horizon` au brouillard et au dôme, tous créés une fois. Le thème construit ses
  matières dans `setHole` (mur, flanc, chant, jupe) et règle le dôme, le brouillard et le plan ; il
  ne recolore pas `MAT.*`.

**Les tuiles de flanc.** `TILE` vaut 1 et les UV sont en unités du parcours : une tuile ne peut pas
s'aligner sur le haut ni sur le pied d'un mur. Toute tuile est donc **raccordable dans les deux
sens et indifférente au décalage** (assises, planches, strates : oui ; « de la neige en haut » : non).
Ce qui doit être en haut est de la géométrie : un chaperon.

**Quels murs.** Les 75 cartes comptent 1 322 murs nus, de 105 gabarits : 710 sont la
bordure standard (0,6 de haut dont 0,45 hors sol, 0,3 d'épais), les autres sont des rails en pente,
des contremarches et des pièces de structure hauts de 0,6 à 8 (238 murs pour La Grenouille).

- Couleur du dessus et tuile de flanc : **tous** les murs nus. Les grandes contremarches deviennent
  des murs de brique, de pierre ou de rondins : c'est là que le motif se voit le mieux.
- Chaperon : seulement les murs nus de demi-hauteur ≤ 0,5 (bordures et rails), inclinés ou non.
- Pièces répétées (créneaux, ampoules) : seulement sur 1,2 de long ou plus, posées depuis le milieu.

**Un chaperon** est un enfant du maillage du mur (il tourne, s'estompe et projette son ombre avec
lui), a son trait d'encre (`outlineAround`), **ne dépasse pas le collider de plus de 0,10 en hauteur
ni de 0,03 sur les côtés** (des balles sautent les murs : le dessin ne doit pas mentir), et se
fusionne ou s'instancie par trou.

**Un poteau** nu (rayon 0,2 à 1, demi-hauteur 0,3 à 1,3) prend un flanc et un dessus, à l'échelle de
son rayon, dans les mêmes limites.

**Le décor** garde ses trois couronnes et ses règles : petits îlots à 3–7, îlots à arbres à 8–20,
lointain à 45–70, mer de nuages. Un thème choisit les props de chaque couronne et **recolore le
décor par clé de matière** du kit (`leaf`, `leaf2`, `earth`, `earth2`, `stone`, `cloud`, `water`) :
une table de matières de rechange pour les `InstancedMesh` de `decorate()`, jamais pour les props
du jeu, qui partagent ces clés. À savoir : `leaf` colore à la fois le dessus des îlots, la boule de
`tree_ball` et `bush` ; `leaf2` le sapin ; `earth` et `earth2` le corps des îlots. **Aucun nouveau
modèle Blender n'est nécessaire.**

## 4. Les sept thèmes, classés

Classés par ce qu'ils changent sur une capture, multiplié par le nombre de trous. Les quatre
premiers transforment le fond de l'image ; les trois derniers le changent moins et comptent
davantage sur leurs murs.

### 1. `nuit` — Nocturne (10 trous)

**En un coup d'œil** : une île verte éclairée sous un ciel indigo étoilé, sur une mer de nuages
violette ; des murs sombres. En jeu, des guirlandes d'ampoules courent sur les murs.

| | |
|---|---|
| Fond | ciel `#141a3c`, horizon et brouillard `#3a2f73`, plan `#1c2350` ; nuages recolorés `cloud → #5a5fb0` ; des étoiles sur le dôme (un semis dans le shader du ciel, ou 200 points) |
| Jupe | feston `#2f9a6a`, terre `#5a4f8a`, roche `#3a3463` |
| Herbe | `#5fcf86`, chant `#2f9a6a` |
| Mur, flanc | `#3d3f66`, fines nervures verticales `#55578a` tous les 0,25 |
| Mur, dessus | `#4a4a70` ; chaperon : des ampoules, demi-sphères de rayon 0,09 en `MeshBasicMaterial` `#fff3c4`, tous les 0,6 sur l'axe du dessus |
| Poteau | flanc `#3d3f66`, dessus : un dôme lumineux `#fff3c4` aplati à 0,08 (un lampadaire) |
| Décor | `leaf → #3f9a78`, `leaf2 → #2c7d66`, `earth → #5a4f8a`, `earth2 → #3a3463`, `stone → #8e88c0`. Près : `mushroom` × 2, `rock_a/b`, `bush`. Plus loin : `tree_pine`, `tree_ball`, `rock_c`, `mushroom`. Au loin : trois `balloon` (des lanternes), pas de moulin |

Les trous de gravité faible, les aimants « planètes », le flipper, le ring, le videur : tout ce qui
se joue le soir. À vérifier à l'écran : le faisceau des portails sur l'horizon sombre (ΔE calculés,
#9b6bff : 51 ; #ff75dd : 61 ; #7b93ff : 44 : ils devraient ressortir).

### 2. `banquise` — Banquise (9 trous)

**En un coup d'œil** : une mer sombre semée de glaçons blancs, une île coiffée de neige sur de la
glace bleue, des murs de rondins à crête blanche.

| | |
|---|---|
| Fond | ciel `#8fd0ee`, horizon et brouillard `#f2faff`, plan `#27587f` (la mer) ; la mer de nuages devient des glaçons : mêmes nuages, aplatis (échelle 0,3 en hauteur) |
| Jupe | feston `#ffffff` (la neige qui déborde), terre `#a9d3ea`, roche `#6fa3cc` (la glace) |
| Herbe | `#7dd690`, chant `#4fb07a` : un vert givré, à peine |
| Mur, flanc | rondins horizontaux de 0,25 : fond `#7d4f35`, joint `#5a3725`, reflet `#96643f` |
| Mur, dessus | `#7d4f35` ; chaperon : une crête de neige `#ffffff`, demi-cylindre large de 0,22 et haut de 0,08, en retrait de 0,04 aux bouts |
| Poteau | flanc en rondins, dessus : un dôme de neige `#ffffff` aplati à 0,10 |
| Décor | `leaf → #ffffff` (îlots enneigés, buissons en congères), `earth → #a9d3ea`, `earth2 → #6fa3cc`, `water → #d6f3ff` (cascade gelée). Près : `rock_a/b`, `bush`. Plus loin : `tree_pine` seulement, `rock_c`, `fence`. Au loin : un `balloon`, pas de moulin |

Le dessus des murs est **brun, pas blanc** : un mur blanc sur la glace (`#bfeefb`) ne ferait que 19
de ΔE, moins que le crème d'aujourd'hui (24). Le rondin fait 69, et la crête blanche au milieu dit
« neige ». De même le fond est une mer sombre : un fond pâle effacerait le bord des sols de glace.

### 3. `quai` — Quai (12 trous)

**En un coup d'œil** : la mer à la place des nuages, des pilotis, des murs de planches, des îlots
de sable plantés de pins.

| | |
|---|---|
| Fond | ciel `#5cc4e8`, horizon et brouillard `#e8f7ff`, plan `#2b93d1`, entre les deux bleus de l'eau des trous, avec la tuile de vagues `LOOK.water` qui défile (`#2b93d1` et `#8fd6f5`) ; **pas de mer de nuages** |
| Jupe | feston `#b98455` (le chant du platelage), terre `#7d4f35`, roche `#5d4630` (les pilotis mouillés) |
| Herbe | inchangée (`#6fd36a`, `#3fae5a`) |
| Mur, flanc | planches verticales de 0,25 : fond `#96643f`, joint `#6f472e`, deux clous `#5d4630` par planche |
| Mur, dessus | `#b98455` ; chaperon : une lisse, planche plate de 0,05 qui déborde de 0,03 |
| Poteau | une bitte d'amarrage : la tuile `LOOK.post` recolorée (fond `#96643f`, bande `#fff7e6`), dessus plat `#fff7e6` |
| Décor | `leaf → #f2d89a` (îlots de sable), `earth → #e0c080`, `earth2 → #b79a62`. **Les îlots sont posés sur l'eau** (leur dessus à `killY + 0,25`), le reste sous le plan. Près : `rock_a/b/c`. Plus loin : `tree_pine` × 2 ou 3, `rock_c`, `fence` sur chaque îlot (des ganivelles). Au loin : deux `balloon`, pas de moulin |

Les trous d'eau, d'îles et de canons, plus deux jeux de bois (La Planche à Clous, La Grenouille).
Tomber du parcours et tomber dans un bassin se ressemblent enfin : c'est de l'eau dans les deux
cas, et le même coup de pénalité.

### 4. `canyon` — Canyon (10 trous)

**En un coup d'œil** : tout est chaud. Des falaises rouille au-dessus d'un fond de terre cuite, un
horizon pêche, une herbe plus jaune, des mesas nues.

| | |
|---|---|
| Fond | ciel `#74c6e3`, horizon et brouillard `#ffe2b8`, plan `#a65a42` ; moitié moins de nuages, recolorés `cloud → #ffe1c2` (de la poussière) |
| Jupe | feston `#66ad40`, terre `#e0905e`, roche `#c8704a` : plus claire que le fond, la falaise s'en détache |
| Herbe | `#93d65c`, chant `#66ad40` : sèche, tirée vers le jaune |
| Mur, flanc | strates horizontales à peine ondulées : fond `#a84f33`, bandes `#c96a45` et `#8f3f2a` |
| Mur, dessus | `#c96a45` ; pas de chaperon : de la roche taillée |
| Poteau | un piton de roche : flanc en strates, dessus plat `#c96a45` |
| Décor | `leaf → #e9b872` (dessus secs, buissons en boules d'herbe sèche), `earth → #e0905e`, `earth2 → #c8704a`, `stone → #d9895c`. Près : `rock_a/b/c` × 3, `bush`. Plus loin : rochers × 4 à l'échelle 1,5 à 2,5 (sous la ligne de vue), `fence`, `bush` ; **aucun arbre**. Au loin : le moulin, trois `balloon` |

Les trous de sable et de relief. Le rouille est voisin du vermillon des clés (ΔE 26) et du rouge
des aimants (31) : **aucun trou à clé, à aimant ni à accélérateur n'est en `canyon`** (contrôlé par
script sur les cartes) ; à garder vrai si l'on déplace des trous.

### 5. `chateau` — Château (10 trous)

**En un coup d'œil** : des falaises grises qui sortent d'une brume blanche, des murs de pierre
claire, des sapins. En jeu, des créneaux et des tourelles.

| | |
|---|---|
| Fond | ciel `#7fb6dc`, horizon, brouillard **et plan** `#eef1f6` : la brume, sans ligne d'horizon ; nuages inchangés, blancs sur blanc : un banc de brouillard |
| Jupe | feston `#38a05e`, terre `#9aa5b3`, roche `#6e7989` |
| Herbe | `#62c873`, chant `#38a05e` : un peu plus froide et plus profonde |
| Mur, flanc | pierres de taille en quinconce, 0,5 × 0,25 : fond `#a9b4c2`, joint `#7f8a99`, quelques pierres `#bcc6d2` et `#98a4b3` |
| Mur, dessus | `#d5dbe3` ; chaperon : des créneaux, merlons de 0,3 de long, de l'épaisseur du mur et hauts de 0,10, tous les 0,6, instanciés |
| Poteau | une tourelle : flanc de pierre, toit conique bas `#5d6b7c` (hauteur 0,4 × rayon, 0,10 au plus) qui déborde de 0,03 |
| Décor | `earth → #9aa5b3`, `earth2 → #6e7989`. Près : `rock_a/b/c` × 2, `bush`, une `flower`. Plus loin : `tree_pine` × 2 à 4, un `tree_ball` au plus, rochers, `fence`. Au loin : le moulin, un `balloon` |

Sept des dix trous à clés, les douves, le viaduc. Le gris clair est la couleur de la plaque des
aimants (ΔE 6) : aucun trou à aimant en `chateau` (contrôlé).

### 6. `bocage` — Bocage (11 trous)

**En un coup d'œil** : le monde d'aujourd'hui (ciel bleu, nuages, terre brune, îlots fleuris), mais
le tracé est dessiné par des haies taillées, arrondies, vert très sombre sur une pelouse plus claire.

| | |
|---|---|
| Fond | inchangé : ciel `#5cc4e8`, horizon `#fff2d6`, plan `#8fd0e8`, mer de nuages |
| Jupe | feston `#49b65c`, terre `#b07a4f`, roche `#8a5a3c` (celles d'aujourd'hui) |
| Herbe | `#7ddb6b`, chant `#49b65c` : un cran plus claire, pour creuser l'écart avec les haies |
| Mur, flanc | feuillage : fond `#124f33`, pastilles `#175f3d` et `#1f7a4c` de 0,06 à 0,1 de rayon (la recette de `LOOK.sand`) |
| Mur, dessus | `#175f3d` ; chaperon : le dessus arrondi, demi-cylindre de la largeur du mur aplati à 0,10 |
| Poteau | un buis taillé : flanc de feuillage, dessus en dôme `#175f3d` aplati à 0,10 |
| Décor | aucune recoloration. Près : `bush`, `rock_a/b`, `flower` × 2, `mushroom`. Plus loin : `tree_ball` et `tree_blossom` (pas de sapin), `bush` × 2, fleurs, `fence`. Au loin : le moulin, deux `balloon` |

C'est la vraie réponse à « des boîtes » : le seul thème dont les murs n'ont plus d'arête. C'est
aussi **le pari de lisibilité** : une haie fait 58 de ΔE sur la pelouse, contre 64 pour le crème, mais
le shader assombrit l'herbe des creux : au fond d'une cuvette l'écart tombe à 39 (calculé avec
les facteurs du shader, sans compter l'ombre portée du mur). C'est le thème à juger sur un aperçu
avant d'aller plus loin, et **La Cuvette (h02) est le trou d'essai** : une cuvette, en `bocage`.
Repli : dessus `#145236` (64, et 45 dans un creux). Ce vert sombre est à 30 du tapis roulant et à 42 de la
plaque de saut : aucun trou du thème n'a de tapis (contrôlé) ; trois ont des sauts, à regarder sur
Course de Haies.

### 7. `ville` — Ville (13 trous)

**En un coup d'œil** : le soir sur la ville : une mer de nuages rose, un soubassement de brique,
des murets coiffés de pierre crème, un décor rangé.

| | |
|---|---|
| Fond | ciel `#7fb0e6`, horizon et brouillard `#ffdcc4`, plan `#f3b0c0` ; nuages recolorés `cloud → #ffe6ea` |
| Jupe | feston `#3fae5a`, terre `#b8644a`, roche `#8f4a36` (un soubassement de brique) |
| Herbe | inchangée |
| Mur, flanc | brique en quinconce, 0,25 × 0,125 : fond `#b8644a`, joint `#e8d5ac`, quelques briques `#a85840` et `#c9755a` |
| Mur, dessus | `#fff7e6` ; chaperon : une couvertine, dalle de 0,06 qui déborde de 0,03 |
| Poteau | un potelet : `LOOK.post` recolorée (fond `#2b3a36`, bande `#fff7e6`), dessus en dôme `#fff7e6` aplati à 0,08 |
| Décor | `earth → #b8644a`, `earth2 → #8f4a36`. Près : `bush` × 2, `flower` × 2 (des massifs), ni rocher ni champignon. Plus loin : `tree_ball` seulement, `bush`, `fence` sur chaque îlot. Au loin : trois `balloon`, pas de moulin |

Le crème d'aujourd'hui survit ici, sur le dessus : c'est le thème où le mur ressemble le plus à
celui d'aujourd'hui, et le plus joli caméra basse, quand la brique se voit. Son fond rose est ce
qui le sépare de `bocage` sur un aperçu (46 de ΔE entre les deux fonds, 47 avec le sable).
Carrefours, voies ferrées, bowling, grand magasin. Aucun trou du thème n'a de bumper, dont le rose
serait voisin ; la brique est à 34 du vermillon, et le seul trou à clé du thème (Le Vigile) n'a
que la clé bleue.

## 5. Le thème de chaque trou

Par préfixe de fichier :

```json
{
  "h01": "ville", "h02": "bocage", "h03": "canyon", "h04": "banquise", "h05": "canyon",
  "h06": "quai", "h07": "nuit", "h08": "ville", "h09": "quai", "h10": "chateau",
  "h11": "bocage", "h12": "nuit", "h13": "quai", "h14": "nuit", "h15": "chateau",
  "h16": "bocage", "h17": "ville", "h18": "nuit", "h19": "quai", "h20": "canyon",
  "h21": "canyon", "h22": "banquise", "h23": "banquise", "h24": "banquise", "h25": "banquise",
  "h26": "canyon", "h27": "bocage", "h28": "canyon", "h29": "quai", "h30": "ville",
  "h31": "canyon", "h32": "nuit", "h33": "ville", "h34": "chateau", "h35": "bocage",
  "h36": "canyon", "h37": "quai", "h38": "nuit", "h39": "ville", "h40": "nuit",
  "h41": "bocage", "h42": "chateau", "h43": "chateau", "h44": "chateau", "h45": "chateau",
  "h46": "quai", "h47": "ville", "h48": "bocage", "h49": "chateau", "h50": "quai",
  "h51": "banquise", "h52": "banquise", "h53": "canyon", "h54": "banquise", "h55": "ville",
  "h56": "ville", "h57": "nuit", "h58": "ville", "h59": "ville", "h60": "quai",
  "h61": "bocage", "h62": "canyon", "h63": "quai", "h64": "chateau", "h65": "bocage",
  "h66": "nuit", "h67": "quai", "h68": "chateau", "h69": "bocage", "h70": "ville",
  "h71": "bocage", "h72": "banquise", "h73": "nuit", "h74": "ville", "h75": "quai"
}
```

| Thème | Trous |
|---|---|
| `nuit` (10) | 7 Multibille, 12 Tombé du Ciel, 14 Le Siphon, 18 Clair de Lune, 32 Le Videur, 38 Feu Croisé, 40 La Fronde, 57 Le Ring, 66 Le Saut Quantique, 73 Les Cratères |
| `banquise` (9) | 4 Verglas, 22 Le Toboggan, 23 La Luge, 24 Pêche sur Glace, 25 Le Gardien, 51 Triple Axel, 52 La Cible, 54 La Régate, 72 Le Chasse-Neige |
| `quai` (12) | 6 Coup de Mistral, 9 Tir Groupé, 13 Le Saumon, 19 La Planche à Clous, 29 La Piste d'Envol, 37 Les Ricochets, 46 La Boule de Démolition, 50 Les Marais Salants, 60 Les Cascadeurs, 63 L'Archipel, 67 Le Chant des Sirènes, 75 La Grenouille |
| `canyon` (10) | 3 Le Puy, 5 Le Boulodrome, 20 La Gouttière, 21 La Cascade, 26 La Dune, 28 L'Œil du Cyclone, 31 Le Fronton, 36 Les Étages, 53 Le Sablier, 62 Les Geysers |
| `chateau` (10) | 10 Fenêtre de Tir, 15 Aller-Retour, 34 Le Viaduc, 42 Le Coffre-Fort, 43 La Trappe, 44 L'Évasion, 45 Le Donjon, 49 Le Goulot, 64 La Douane Volante, 68 Pile ou Face |
| `bocage` (11) | 2 La Cuvette, 11 Bonneteau, 16 La Pendule, 27 Courant d'Air, 35 Course de Haies, 41 La Pie Voleuse, 48 Les Taupes, 61 La Corde à Sauter, 65 La Fontaine, 69 La Patte d'Oie, 71 Les Moulins |
| `ville` (13) | 1 Trois Bandes, 8 Le Carrefour, 17 Le Passage à Niveau, 30 L'Aiguillage, 33 Sens Interdit, 39 La Correspondance, 47 La Porte Tambour, 55 Le Tapis à Bagages, 56 Le Grand Magasin, 58 Le Bowling, 59 Le Rond-Point, 70 Le Vigile, 74 Le Skatepark |

Ce qui a guidé le choix, et ce qu'un script a contrôlé sur les cartes construites :

- **tout trou qui a de la glace est en `banquise`** (les sept), plus Le Toboggan et Le
  Chasse-Neige pour leur nom ;
- **les trois trous à gravité réduite sont en `nuit`** (Clair de Lune, Feu Croisé, Les Cratères) ;
- les dix trous à clés : sept en `chateau`, et un chacun en `banquise` (La Régate), `bocage`
  (La Patte d'Oie) et `ville` (Le Vigile), pour qu'une clé ne veuille pas toujours dire un donjon ;
- les trous d'eau en `quai`, sauf ceux qu'un autre thème réclame (Le Videur et Feu Croisé de nuit,
  Les Geysers en canyon, les douves en château) ;
- pas de clé, d'aimant ni d'accélérateur en `canyon` ; pas d'aimant en `chateau` ; pas de clé
  vermillon en `ville`.

**Le tirage.** 9 trous au hasard parmi ces 75 (simulé, 200 000 tirages) montrent en moyenne
5,4 thèmes différents : 5 ou plus dans 86 % des parties (5 : 42 %, 6 : 37 %,
les 7 : 8 %), 4 dans 13 %, 3 dans moins de 1 %.

## 6. Les contrôles

Écarts ΔE calculés. Dessus de mur contre les sols présents dans les trous du thème ; la couleur de
jeu la plus proche du dessus et du flanc ; l'herbe teintée contre la glace, le sable et la plaque
de saut ; le fond contre l'herbe, le sable et la glace. « Herbe basse » : l'herbe d'un creux, telle que le
shader l'assombrit (facteurs 0,76 / 0,83 / 0,79, bande et tache sombres), sans l'ombre portée.
Repère : le mur crème d'aujourd'hui fait 64 sur l'herbe, 33 sur le sable, 24 sur la glace.

| Thème | Dessus / herbe | / herbe basse | / sable | / glace | Plus proche du dessus | Plus proche du flanc | Herbe / glace, sable, saut | Fond / herbe, sable, glace |
|---|---|---|---|---|---|---|---|---|
| `nuit` | 87 | 73 | 83 | – | sombre tapis 30 | sombre tapis 30 | 55 / 53 / 32 | 102 / 100 / – |
| `banquise` | 71 | 58 | 54 | 69 | sombre tapis 36 | sombre tapis 36 | 49 / 46 / 31 | 78 / 85 / 58 |
| `quai` | 68 | 58 | 31 | – | vermillon clé 43 | sombre tapis 44 | 68 / 53 / 48 | 95 / 86 / – |
| `canyon` | 81 | 72 | 46 | – | vermillon clé 26 | rouge aimant 32 | 71 / 46 / 57 | 81 / 50 / – |
| `chateau` | 62 | 61 | 45 | – | acier aimant 6 | acier aimant 9 | 60 / 52 / 38 | 64 / 44 / – |
| `bocage` | 58 | 39 | 67 | – | sombre tapis 30 | sombre tapis 23 | 69 / 52 / 51 | 73 / 62 / – |
| `ville` | 64 | 63 | 33 | – | acier aimant 22 | vermillon clé 34 | 68 / 53 / 48 | 87 / 47 / – |

Les proximités qui restent : le « sombre tapis » (un tapis est à plat et à lattes, un mur est debout
et cerné ; aucun trou en `bocage` n'en a) ; l'acier en `chateau` et le rouge en `canyon`, écartés par l'affectation des trous ;
le dessus de planche sur le sable en `quai` (31, comme le crème aujourd'hui).

Deux thèmes entre eux, sur les quatre leviers d'un aperçu (fond, jupe, dessus de mur, herbe) :

| Paire | Fond | Jupe | Dessus | Herbe |
|---|---|---|---|---|
| `nuit` / `banquise` | 26 | 55 | 46 | 8 |
| `nuit` / `quai` | 48 | 55 | 61 | 16 |
| `nuit` / `canyon` | 66 | 77 | 68 | 27 |
| `nuit` / `chateau` | 85 | 43 | 58 | 7 |
| `nuit` / `bocage` | 71 | 66 | 54 | 20 |
| `nuit` / `ville` | 71 | 64 | 72 | 16 |
| `banquise` / `quai` | 26 | 64 | 23 | 19 |
| `banquise` / `canyon` | 64 | 66 | 29 | 26 |
| `banquise` / `chateau` | 64 | 18 | 59 | 11 |
| `banquise` / `bocage` | 46 | 60 | 48 | 21 |
| `banquise` / `ville` | 59 | 68 | 63 | 19 |
| `quai` / `canyon` | 78 | 34 | 20 | 13 |
| `quai` / `chateau` | 53 | 46 | 49 | 10 |
| `quai` / `bocage` | 32 | 20 | 55 | 5 |
| `quai` / `ville` | 58 | 21 | 48 | 0 |
| `canyon` / `chateau` | 64 | 54 | 63 | 21 |
| `canyon` / `bocage` | 71 | 16 | 72 | 10 |
| `canyon` / `ville` | 41 | 19 | 62 | 13 |
| `chateau` / `bocage` | 26 | 45 | 63 | 14 |
| `chateau` / `ville` | 32 | 52 | 17 | 10 |
| `bocage` / `ville` | 46 | 16 | 69 | 5 |

La paire la plus proche est `chateau` / `ville` (52 au mieux). Les deux fonds les plus voisins sont ceux de
`nuit` et `banquise` (26) ; les quatre fonds bleus ou pâles (`bocage`, `quai`, `banquise`, `chateau`)
sont à 26–64 les uns des autres : ce sont aussi la jupe, les nuages (absents du quai, aplatis en
glaçons sur la banquise, noyés dans la brume du château) et les murs qui les séparent. À regarder
côte à côte sur les premiers aperçus.

## 7. L'ordre de construction

1. **La plomberie** : la table des couleurs, le champ `theme` (le JSON des cartes refuse un champ
   inconnu : il faut l'ajouter au format, par défaut `bocage`), le ciel, le brouillard, le plan, la
   jupe, l'herbe, les murs unis, la table de recoloration du décor et le choix des props. Les sept
   thèmes d'un coup : tous les aperçus changent.
2. `nuit` : étoiles, ampoules. `banquise` : crête de neige, glaçons. Les deux thèmes qui changent
   le plus une capture.
3. `quai` : la mer (tuile de vagues, îlots posés sur l'eau), la lisse.
4. `canyon` : rien que des couleurs et une tuile.
5. `chateau` : créneaux et tourelles. `bocage` : la haie arrondie, après avoir jugé sa lisibilité
   sur un aperçu. `ville` : brique et couvertine.

## 8. Écartés

- **Kermesse** (rayures, fanions, couleurs vives) : toutes les teintes saturées sont prises par le
  jeu, les rayures veulent dire « ça bouge » et le damier « checkpoint ». Ses ampoules sont passées
  dans `nuit`.
- **Volcan** (lave sous le parcours) : l'orange et le rouge sont pris, et les bassins des trous
  resteraient de l'eau au-dessus d'une mer de lave.
- **Jungle** (bambou) : du vert sur du vert, et un jaune-vert trop près du jaune des obstacles.
- **Plage** séparée de `quai` : des murs couleur sable sur des sols de sable.
- **Garrigue** (pierre sèche, cyprès) : c'est `chateau` en plus chaud.
- **Espace** séparé de `nuit` : trois trous seulement.
- **Classique crème** comme thème à part : c'est ce dont on se plaint ; il reste le dessus de
  `ville`.
- **Un huitième thème** : sept tiennent chacun leur couleur de mur sans marcher sur le jeu ; il ne
  reste pas de huitième teinte libre.
- **Le poteau-cactus** du canyon : un vert à 35 de son herbe et à 33 de la plaque de saut, et La
  Gouttière a sept poteaux. Le poteau reste de la roche.
- **Nouveaux modèles** (phare, cactus, tour) : aucun n'est indispensable.
