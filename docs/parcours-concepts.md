# Parcours : les concepts des trous

Statut : **concepts**, quatrième version (2026-11-21) : 75 trous, chacun en plusieurs actes. Trois
prototypes sont construits (La Cuvette, Le Carrefour, Tir Groupé) et ont été joués par l'équipe ;
rien d'autre ne l'a été. Les nombres viennent des constantes du moteur
(`internal/physics/world.go`, `material.go`) et sont **calculés, pas mesurés en jeu** ; chaque par
est **à confirmer par `tools/verify`**, chaque accroche multijoueur par une vraie partie (l'outil
joue une seule balle : il ne voit aucun effet entre balles).

Le cahier des charges : des trous amusants et originaux, pour des groupes de 3-4 à 10 joueurs qui
jouent **tous en même temps**, sans tour de rôle, et qui enchaînent les parties sans avoir
l'impression de rejouer les mêmes trous.

Le retour sur les prototypes : « les trois sont bons, mais un peu simples et courts ; un bon début
pour un design qui se sent vraiment différent ». D'où la règle des actes ci-dessous, des pars de
3 à 5, et la dernière section, « Enrichir les trois prototypes ».

## 1. Le plan du pool

### 75 trous, et un tirage qui n'oublie pas

Le pool est passé de 18 à 50, puis à 75 trous : les 50 premiers, et les 25 que ce document
annonçait comme « possibles sans toucher au moteur » (fiches 51 à 75). C'est le haut de la
fourchette promise (20 à 25), et la réserve est maintenant vide : voir « Au-delà de 75 ».

Le parcours par défaut tire 9 trous au hasard. Deux parties de suite ont en moyenne 81/N trous en
commun : 4,5 avec 18 trous, 1,6 avec 50, 1,1 avec 75, 0,8 avec 100. Mais la répétition qu'un groupe
ressent se joue sur la soirée. Sur cinq parties de suite (45 trous joués), tirées chacune de son
côté comme aujourd'hui, un groupe rejoue en moyenne 27,6 trous déjà vus avec un pool de 18,
13,6 avec 50, 9,6 avec 75 et encore 7,4 avec 100 (simulé). Avec un tirage « en sac » (on ne
remet un trou en jeu dans une salle qu'une fois tous les autres joués), c'est zéro pendant huit
parties à 75 trous. **Le sac compte plus que la taille du pool** ; voir « Difficulté et tirage ».

### Les pistes de test et les démos sortent du tirage

Aujourd'hui elles y sont : `maps.Holes()` (`maps/maps.go`) met les 7 pistes de `internal/tracks`
devant les cartes, et `defaults()` (`internal/game/settings.go`) coche tous les trous. À changer
(du code, hors de ce document) :

- **les 7 pistes de test** (`lane`, `bank`, `ramp`, `hump`, `bowl`, `posts`, `drop`) : hors du jeu.
  Ce sont des bancs d'essai du moteur, larges de 3 unités (un embouteillage à 8), sans nom ni ligne
  risquée ;
- **les 5 démos et `01-modifiers`** : gardées pour le parcours sur mesure (elles servent à
  essayer un élément), décochées du tirage au hasard.

### Ce que le multijoueur change (lu dans le code, pas joué)

- Une balle qui n'a pas encore tiré n'est pas solide (`Ball.Solid`) : personne ne bloque le départ.
- Une balle entrée dans le trou ne cogne plus (`Collides`) : le trou ne se bouche pas.
- **Une balle poussée dans le trou par une autre compte** pour son joueur, avec ses coups
  (`rules` dans `sim.go`) : les cadeaux existent.
- **Une balle poussée dans l'eau ou le vide paie +1** et repart de son dernier point de tir ou de
  son dernier `checkpoint`, pas de là où elle était posée. Donc : un `checkpoint` sur chaque
  plate-forme d'arrivée entourée d'eau (plusieurs balles replacées au même point : à observer), et
  `maxStrokes` à 10 ou 12 sur les trous où l'on se pousse à l'eau.
- Le score ne compte que les coups. Finir premier ne rapporte rien, mais lance les 60 s des
  autres : la course est une pression, pas une récompense.
- Une clé, une pièce, un `checkpoint` sont par balle : pas de course au ramassage.
- La flèche de visée oscille de ±3° pour un putt à ±15° à pleine puissance (`swingAmp` dans
  `web/main.js`) : toute ligne qui demande de la puissance est déjà une ligne risquée.

Les trois ressorts qui en sortent, et qu'aucun jeu au tour par tour n'a :

1. **Converger** (C) : amener toutes les balles au même endroit (cuvette, aimant, sommet, point de
   chute d'un canon). Les collisions y font des cadeaux et des drames.
2. **Se croiser** (X) : comme chacun tire quand il veut, les joueurs sont à des étapes différentes.
   Un trou dont le chemin se recoupe ou revient sur lui-même les fait se percuter.
3. **Tirer ensemble** (S, la salve) : un obstacle mobile fait attendre tout le monde la même
   ouverture ; les balles partent en salve.

### Un trou, une vedette, plusieurs actes

C'est la leçon des prototypes. Un trou garde **une vedette et deux soutiens au plus**, mais il la
développe en **deux ou trois actes** : on la montre sans danger, on la complique, on la retourne.
Ce ne sont pas les éléments qui s'ajoutent, c'est la vedette qui change d'emploi (un pad qui porte,
puis des pads qui se croisent ; un canon seul dans le ciel, puis trois dont les arcs se coupent).

- Chaque acte demande **une décision** au joueur ; un trou en a donc deux ou trois, plus le choix
  entre ligne sûre et ligne risquée.
- Le premier acte ne coûte rien : c'est lui qui explique la vedette, puisque le tirage est au
  hasard et qu'aucun trou ne peut compter sur un autre pour l'avoir fait.
- **Par 3 à 5**, plus de par 2. Un acte vaut à peu près un coup.
- **Une minute pour le groupe** : à 10 s le coup environ (visée et roulement ; une estimation, pas
  une mesure), un bon joueur finit un par 4 en 40 s, un joueur moyen en une minute, et les 60 s
  après le premier arrivé laissent finir presque tout le monde. Un par 5 est à la limite : quatre
  seulement dans le pool.
- Ce budget **ne compte pas l'attente**. Il est le plus fragile sur les par 4 où l'on attend un
  obstacle (10, 16, 17, 46, 47), sur la glace (4, 23, 24 : un tir mou glisse longtemps) et sur
  Feu Croisé (38 : trois vols de 3 s). Règle : la ligne sûre n'attend jamais plus de 6 s par acte.
  Si les parties traînent, ce sont les premiers trous à ramener à deux actes et par 3 ; le par
  moyen du pool (3,7) est le bouton à tourner.

### Les règles de conception

- **Une vedette, deux soutiens au plus.** Ne comptent pas : `grass`, `wall` et poteaux,
  `checkpoint`, pièce (`strokes`), ni la règle `gravity`. Tout le reste compte, l'eau (`hazard`)
  comprise.
- **Deux lignes** : une sûre au par, une risquée au par − 1. La pièce va sur une ligne risquée qui
  ne gagne pas déjà un coup par son tracé ; jamais les deux sur la même ligne.
- **Large** : couloirs de 4 unités au moins, greens de 6 × 6, sauf goulot voulu.
- **Aucune source d'énergie en boucle** : un bumper, un pad, un canon, un téléporteur agissent à
  chaque passage. Rien (pente, vent, tapis, rebond) ne doit ramener une balle dessus sans fin :
  `tools/verify` refuse un tir qui roule 30 s. En particulier, **jamais deux bumpers face à face à
  moins de 12 u d'herbe** (un bumper renvoie à 9 u/s, soit 12 u de roulement), et la vitesse d'un pad
  est plafonnée pour qu'aucun circuit ne ramène à un pad.
- **Pas de sol mobile** : le moteur ne laisse jamais une balle s'arrêter sur un sol qui bouge et la
  déclare coincée à 30 s (`world.go`). Un sol mobile ne peut être qu'un passage qui dépose toujours
  la balle ; trop fragile pour ce pool (voir « Au-delà de 75 »).
- **La glace se casse avec du sable ou de l'herbe**, pas seulement des murs : sans rien, une balle
  met environ 18 s à s'arrêter depuis 8 u/s, 30 s à pleine puissance.
- **Du sable, on sort en un coup** : 6,1 u au plus à pleine puissance, à plat. Jamais de sortie de
  sable plus longue. En pente, le sable retient la balle jusqu'à 37° (`holds`) : on peut y grimper
  par étapes, c'est le sujet de La Dune.
- **Le sable tue le rebond, pas la glissade** : une balle qui y tombe garde sa vitesse
  horizontale et glisse encore (2 u à 8 u/s, 2,9 u à 10, 3,9 u à 12).
- **Rien dans la colonne du trou** : ni collider dessous, ni l'enveloppe d'un obstacle mobile
  (`validate.go`). Un green surélevé est un bloc plein jusqu'en bas. Le sol du trou est le seul
  sol plat à sa hauteur sous le trou : on découpe la glace ou la pelouse autour.
- **Deux clés au plus, trois couleurs de téléporteur au plus** par trou.
- **Pas de trou `solo`.** Tout le brief est multijoueur ; `solo` reste l'outil de secours si un
  trou se révèle injouable à 10.

Repères (calculés) : sur l'herbe à plat, une balle roule 2,9 u à 25 % de puissance, 9,9 u à 50 %,
19,4 u à 75 %, 30,6 u à 100 % ; 12 u après un bumper. Sur le sable : 2 u à 50 %, 6,1 u à 100 %.
Une pente d'herbe retient une balle sous 7° environ (26° avec une gravité de 5). Un `jumppad` de
vitesse `s` donne 2s/g secondes de vol et s²/2g de hauteur.

### Les axes de variété

Avec 75 trous, chaque élément est vedette cinq fois en moyenne : la variété ne peut pas venir de
la vedette seule. Chaque trou est placé sur sept axes, et aucune paire de trous ne partage les
cinq premiers (vérifié par script sur le tableau ci-dessous). Ce contrôle a une limite : le tracé
est une étiquette libre. Les paires qui ne diffèrent que par lui sont listées plus bas.

1. **Archétype** : la forme d'ensemble. couloir (16), îles (15), arène (11), étages (7), salles (6), table (5), entonnoir (3), table inclinée (3), butte (2), anneau (2), boucle (1), fourche (1), anneaux (1), treillis (1), étoile (1).
2. **Tracé** : la forme du chemin (droite, coude, aller-retour, sinueux, radial vers un centre,
   fourche, croisé, spirale, treillis, réseau, giratoire, montée, descente, vol, chute…).
3. **Ressort multijoueur** : converger (C) 39, se croiser (X) 25, tirer ensemble (S) 11.
4. **Décision principale** : ce que le joueur tranche. Doser sa puissance (17), choisir un
   chemin ou une issue (18), trouver un angle ou une bande (13), choisir son
   moment (12), enfiler un passage ou tenir une ligne étroite (9), lire une
   dérive (6).
5. **Relief** : plat (39), aérien (19), montée (7), descente (6), vallonné (2), étages (2).
6. **Longueur et par** : par 3 (25), par 4 (46), par 5 (4) ; les par 3 font 20 à 26 u
   de jeu, les par 4 autour de 30, les par 5 jusqu'à 40 et plus.
7. **Identité visuelle** : ce qu'on reconnaît d'un coup d'œil sur l'aperçu, et que le nom dit : un
   cadran, un damier de bassins, trois enceintes, une table de flipper, un rond-point, un sablier,
   un ring, une piste de bowling.

Les éléments se ressemblent parfois plus que leurs noms : le vent et le tapis sont le même code,
le pad et le canon écrasent tous deux le tir. Les trous ont donc été triés par **décision**, pas
par vedette. Pour les éléments qui écrasent le tir, la décision vient de ce qu'ils laissent
intact : un pad et un canon gardent la **position** de la balle (d'où Le Bowling et Les
Cascadeurs, où l'on vise sa place de côté) ; un téléporteur garde la **vitesse et la direction**
mais rend toutes les balles au même point (La Fontaine, où le sens d'entrée choisit la face) ; un jumppad garde la **vitesse
horizontale** (Le Saut Quantique, Les Geysers).

Les familles qui se répètent, et leur plafond à 75 :

- **« attendre son moment »** (chrono) : 12 trous (10, 16, 17, 25, 38, 46, 47, 48, 61, 70, 71, 72), soit un sur six,
  comme à 50. Ils diffèrent par ce que l'obstacle fait d'une balle posée : la ratisser (16),
  l'emporter (17), la jeter à l'eau (46), la mélanger (47), la soulever (48), la faucher ou la
  pousser en avant (61), la laisser passer si elle a la clé (70), la renvoyer en bas d'une rampe
  (71), la ramener au départ (72).
- **« doser un vol »** : 5, 12, 18, 36, 37, 57, 66, 73. Huit, et pas un de plus.
- **« choisir une issue fixe »** (portails, tapis, clous, canons) : 11, 19, 30, 63. Quatre au plus.
- **« raté, on recule sans pénalité »** : 3, 7, 13, 33, 36, 61, 71, 72, 75. Le filet de sécurité
  préféré du pool : il fait rire au lieu de punir.
- **« viser sa place de côté à travers un pad »** : 58, 60. Deux, et pas plus.

Les paires qui ne diffèrent que par le tracé, et ce qui les sépare en vrai :

- **12 / 18 / 37 / 66** (Tombé du Ciel, Clair de Lune, Les Ricochets, Le Saut Quantique) : doser
  un vol au-dessus du vide. Une chute verticale, des sauts flottants d'île en île, un rythme à
  tenir sur plusieurs bonds, un saut coupé en deux par un portail. C'est le groupe le plus chargé.
- **42 / 44** (Le Coffre-Fort, L'Évasion) : une clé dans une petite salle bondée. C'est la paire
  la plus proche du pool. Dans l'une la mêlée est au départ et l'on s'évade ; dans l'autre on y
  entre et l'on en sort par des portails, et l'on peut être éjecté sans la clé. Si l'une doit
  partir après essai, c'est Le Coffre-Fort.
- **15 / 41 / 68** (Aller-Retour, La Pie Voleuse, Pile ou Face) : un couloir, des flux qui se
  croisent, un choix. Des clés et un contresens ; des pièces facultatives ; une clé qu'on a intérêt
  à ne pas prendre.
- **9 / 63** (Tir Groupé, L'Archipel) : la suite assumée : le même tir groupé, en réseau.
- **17 / 72** (Le Passage à Niveau, Le Chasse-Neige) : attendre son moment dans un couloir.
  L'obstacle traverse dans un cas ; dans l'autre il vous court après.
- **60 / 62** (Les Cascadeurs, Les Geysers) : de la précision au-dessus de l'eau. Une place à
  tenir avant un saut imposé ; des sauts à éviter, puis un à prendre.
- **16 / 48** (La Pendule, Les Taupes) : attendre son moment dans une arène. Des aiguilles qui
  ratissent un cadran à traverser ; des pistons qui soulèvent autour du trou.
- **24 / 40** (Pêche sur Glace, La Fronde) : trouver un angle dans une arène. Des bandes sur la
  glace entre des trous d'eau ; des trajectoires courbées par des aimants.

| # | Trou | Archétype | Tracé | Multi | Décision | Relief | Taille |
|---|---|---|---|---|---|---|---|
| 1 | Trois Bandes | table | coude | C | angle | plat | M |
| 2 | La Cuvette | entonnoir | radial | C | doser | descente | M |
| 3 | Le Puy | butte | radial | C | doser | montée | L |
| 4 | Verglas | table | droite | C | doser | plat | M |
| 5 | Le Boulodrome | couloir | lob | C | doser | aérien | M |
| 6 | Coup de Mistral | îles | droite | C | dérive | plat | L |
| 7 | Multibille | table inclinée | montée | X | angle | montée | L |
| 8 | Le Carrefour | boucle | croisé | X | choisir | plat | L |
| 9 | Tir Groupé | îles | vol | C | choisir | aérien | L |
| 10 | Fenêtre de Tir | îles | vol | S | chrono | aérien | L |
| 11 | Bonneteau | salles | fourche | C | choisir | plat | M |
| 12 | Tombé du Ciel | îles | chute | C | doser | aérien | L |
| 13 | Le Saumon | couloir | droite | X | doser | plat | L |
| 14 | Le Siphon | arène | radial | C | précision | plat | M |
| 15 | Aller-Retour | couloir | aller-retour | X | choisir | plat | L |
| 16 | La Pendule | arène | droite | S | chrono | plat | L |
| 17 | Le Passage à Niveau | couloir | droite | S | chrono | plat | L |
| 18 | Clair de Lune | îles | sauts | C | doser | aérien | L |
| 19 | La Planche à Clous | table inclinée | descente | C | choisir | descente | M |
| 20 | La Gouttière | couloir | sinueux | X | angle | vallonné | L |
| 21 | La Cascade | étages | descente | C | doser | descente | L |
| 22 | Le Toboggan | étages | lacets | S | choisir | descente | L |
| 23 | La Luge | couloir | sinueux | C | doser | plat | L |
| 24 | Pêche sur Glace | arène | archipel | C | angle | plat | L |
| 25 | Le Gardien | table | droite | S | chrono | plat | M |
| 26 | La Dune | butte | montée | X | choisir | montée | L |
| 27 | Courant d'Air | îles | vol | C | dérive | aérien | L |
| 28 | L'Œil du Cyclone | arène | spirale | C | dérive | plat | M |
| 29 | La Piste d'Envol | îles | vol | X | choisir | aérien | L |
| 30 | L'Aiguillage | fourche | fourche | X | choisir | plat | M |
| 31 | Le Fronton | table | aller-retour | X | angle | plat | M |
| 32 | Le Videur | îles | coude | C | angle | plat | L |
| 33 | Sens Interdit | couloir | slalom | X | précision | plat | L |
| 34 | Le Viaduc | étages | droite | X | précision | étages | L |
| 35 | Course de Haies | couloir | droite | X | doser | aérien | L |
| 36 | Les Étages | étages | montée | C | doser | montée | L |
| 37 | Les Ricochets | îles | ricochets | C | doser | aérien | L |
| 38 | Feu Croisé | îles | croisé | X | chrono | aérien | L |
| 39 | La Correspondance | salles | enfilade | C | doser | plat | L |
| 40 | La Fronde | arène | courbe | C | angle | plat | L |
| 41 | La Pie Voleuse | couloir | droite | X | choisir | plat | L |
| 42 | Le Coffre-Fort | salles | boucle | C | angle | plat | L |
| 43 | La Trappe | étages | aller-retour | X | angle | étages | L |
| 44 | L'Évasion | salles | coude | C | angle | plat | L |
| 45 | Le Donjon | anneaux | spirale | X | choisir | plat | L |
| 46 | La Boule de Démolition | îles | droite | S | chrono | plat | L |
| 47 | La Porte Tambour | salles | droite | S | chrono | plat | L |
| 48 | Les Taupes | arène | radial | S | chrono | plat | M |
| 49 | Le Goulot | salles | droite | C | précision | plat | M |
| 50 | Les Marais Salants | treillis | treillis | X | choisir | plat | L |
| 51 | Triple Axel | table | zigzag | X | angle | aérien | L |
| 52 | La Cible | arène | radial | C | doser | plat | M |
| 53 | Le Sablier | entonnoir | descente | C | choisir | descente | M |
| 54 | La Régate | arène | boucle | X | dérive | plat | L |
| 55 | Le Tapis à Bagages | anneau | en U | C | dérive | plat | M |
| 56 | Le Grand Magasin | étages | zigzag | X | précision | montée | L |
| 57 | Le Ring | arène | saut | C | doser | aérien | M |
| 58 | Le Bowling | couloir | droite | C | précision | plat | M |
| 59 | Le Rond-Point | anneau | giratoire | X | choisir | plat | L |
| 60 | Les Cascadeurs | îles | vol | C | précision | aérien | L |
| 61 | La Corde à Sauter | couloir | droite | S | chrono | aérien | L |
| 62 | Les Geysers | îles | coude | C | précision | aérien | L |
| 63 | L'Archipel | îles | réseau | C | choisir | aérien | L |
| 64 | La Douane Volante | étages | vol | C | choisir | aérien | L |
| 65 | La Fontaine | arène | radial | C | angle | descente | M |
| 66 | Le Saut Quantique | îles | vol coupé | C | doser | aérien | L |
| 67 | Le Chant des Sirènes | couloir | slalom | C | dérive | plat | L |
| 68 | Pile ou Face | couloir | fourche | X | choisir | plat | L |
| 69 | La Patte d'Oie | étoile | aller-retour | X | choisir | plat | L |
| 70 | Le Vigile | couloir | aller-retour | X | chrono | plat | L |
| 71 | Les Moulins | couloir | montée | S | chrono | montée | L |
| 72 | Le Chasse-Neige | couloir | coude | S | chrono | plat | L |
| 73 | Les Cratères | entonnoir | en chaîne | C | doser | aérien | L |
| 74 | Le Skatepark | arène | libre | X | angle | vallonné | M |
| 75 | La Grenouille | table inclinée | montée | C | précision | montée | M |

Taille : M, un trou de 20 à 26 u de jeu ; L, 30 u et plus.

### Qui est la vedette de quoi

| # | Trou | Vedette | Soutiens | Par | Niveau | À écrire | Pari |
|---|---|---|---|---|---|---|---|
| 1 | Trois Bandes | `wall` (bandes) | – | 3 | facile | facile | A |
| 2 | La Cuvette † | pentes (entonnoir) | – | 3 | facile | moyen | A |
| 3 | Le Puy | pentes (deux buttes) | `sand` | 4 | moyen | moyen | B |
| 4 | Verglas | `ice` | `sand` | 3 | moyen | facile | B |
| 5 | Le Boulodrome | `sand` | pentes, `hazard` | 3 | moyen | moyen | B |
| 6 | Coup de Mistral | `wind` | `hazard` | 4 | moyen | facile | B |
| 7 | Multibille | `bumper` | pentes | 4 | difficile | difficile | C |
| 8 | Le Carrefour † | `speedpad` | `jumppad`, `sand` | 4 | moyen | moyen | B |
| 9 | Tir Groupé † | `launcher` | `sand`, `hazard` | 4 | facile | moyen | B |
| 10 | Fenêtre de Tir | `launcher` | `motion`, `hazard` | 4 | difficile | difficile | B |
| 11 | Bonneteau | `teleport` (trois couleurs) | `sand` | 3 | facile | facile | A |
| 12 | Tombé du Ciel | `teleport` (deux couleurs) | `hazard` | 3 | moyen | facile | B |
| 13 | Le Saumon | tapis (`wind` fin) | `sand` | 4 | moyen | facile | B |
| 14 | Le Siphon | `magnet` (aimant, répulseurs) | – | 3 | facile | facile | A |
| 15 | Aller-Retour | `key` (deux couleurs) | `speedpad`, `hazard` | 4 | difficile | moyen | A |
| 16 | La Pendule | `motion` (rotation) | – | 4 | moyen | moyen | B |
| 17 | Le Passage à Niveau | `motion` (glissière) | `sand` | 4 | moyen | facile | B |
| 18 | Clair de Lune | `jumppad`, règle `gravity` 5 | `sand`, `hazard` (vide) | 3 | difficile | moyen | B |
| 19 | La Planche à Clous | poteaux (`wall`) | pentes | 3 | facile | moyen | B |
| 20 | La Gouttière | pentes (demi-tube) | `sand` | 4 | moyen | moyen | B |
| 21 | La Cascade | pentes (marches) | `sand` | 4 | facile | facile | A |
| 22 | Le Toboggan | pentes (lacets) | `sand` | 3 | facile | difficile | B |
| 23 | La Luge | `ice` | `sand` | 3 | facile | moyen | B |
| 24 | Pêche sur Glace | `ice` | `hazard`, `sand` | 4 | difficile | facile | B |
| 25 | Le Gardien | `ice` | `motion`, `sand` | 3 | facile | facile | A |
| 26 | La Dune | `sand` | pentes | 4 | moyen | moyen | B |
| 27 | Courant d'Air | `wind` (en altitude) | `jumppad`, `hazard` (vide) | 4 | difficile | moyen | C |
| 28 | L'Œil du Cyclone | `wind` (en rond) | `sand` | 3 | moyen | facile | C |
| 29 | La Piste d'Envol | tapis (`wind` fin) | pentes, `hazard` | 4 | moyen | moyen | B |
| 30 | L'Aiguillage | tapis (`wind` fin) | `sand` | 3 | moyen | facile | B |
| 31 | Le Fronton | `bumper` (deux murs) | – | 3 | facile | facile | B |
| 32 | Le Videur | `bumper` | `hazard` | 4 | moyen | facile | B |
| 33 | Sens Interdit | `speedpad` | `sand` | 4 | moyen | facile | A |
| 34 | Le Viaduc | pentes (viaduc, chute) | `sand` | 4 | moyen | moyen | B |
| 35 | Course de Haies | `jumppad` | `hazard` | 4 | facile | facile | B |
| 36 | Les Étages | `jumppad` | – | 4 | moyen | facile | B |
| 37 | Les Ricochets | `jumppad` | `hazard` | 4 | difficile | moyen | B |
| 38 | Feu Croisé | `launcher`, règle `gravity` 8 | `hazard`, `sand` | 4 | moyen | moyen | B |
| 39 | La Correspondance | `teleport` (trois couleurs) | `sand` | 4 | moyen | facile | A |
| 40 | La Fronde | `magnet` (aimants forts) | `sand` | 4 | difficile | facile | C |
| 41 | La Pie Voleuse | `magnet` (répulseurs) | `sand` | 4 | moyen | facile | A |
| 42 | Le Coffre-Fort | `key` | `teleport` | 4 | moyen | facile | A |
| 43 | La Trappe | `key` (portes à plat, deux couleurs) | – | 5 | moyen | moyen | B |
| 44 | L'Évasion | `key` | `jumppad`, `hazard` | 4 | facile | facile | A |
| 45 | Le Donjon | `key` (deux couleurs) | – | 5 | difficile | moyen | A |
| 46 | La Boule de Démolition | `motion` (balancier) | `hazard` | 4 | moyen | moyen | A |
| 47 | La Porte Tambour | `motion` (rotation) | – | 4 | moyen | moyen | C |
| 48 | Les Taupes | `motion` (pistons) | – | 3 | moyen | moyen | A |
| 49 | Le Goulot | `wall` (entonnoir) | – | 3 | facile | facile | A |
| 50 | Les Marais Salants | `hazard` | – | 5 | difficile | facile | A |
| 51 | Triple Axel | `ice` | `jumppad`, `sand` | 4 | moyen | facile | B |
| 52 | La Cible | `sand` (trois sols) | `ice` | 3 | facile | facile | B |
| 53 | Le Sablier | `sand` | pentes | 3 | facile | moyen | B |
| 54 | La Régate | `wind` | `ice`, `key` | 4 | difficile | facile | B |
| 55 | Le Tapis à Bagages | tapis (`wind` fin) | `sand` | 3 | facile | moyen | B |
| 56 | Le Grand Magasin | tapis (`wind` fin) | pentes | 4 | moyen | moyen | B |
| 57 | Le Ring | `bumper` (quatre cordes) | `jumppad`, `sand` | 3 | facile | facile | B |
| 58 | Le Bowling | `speedpad` | `sand` | 3 | facile | facile | A |
| 59 | Le Rond-Point | `speedpad` | `sand` | 4 | moyen | moyen | B |
| 60 | Les Cascadeurs | `speedpad` | pentes, `hazard` | 4 | difficile | moyen | B |
| 61 | La Corde à Sauter | `jumppad` | `motion` | 4 | moyen | facile | B |
| 62 | Les Geysers | `jumppad` | `hazard` | 4 | difficile | facile | B |
| 63 | L'Archipel | `launcher` | `sand`, `hazard` | 4 | moyen | moyen | B |
| 64 | La Douane Volante | `launcher` | `key`, `sand` | 4 | moyen | moyen | B |
| 65 | La Fontaine | `teleport` | pentes, `sand` | 3 | moyen | moyen | B |
| 66 | Le Saut Quantique | `teleport` (deux couleurs) | `jumppad`, `hazard` (vide) | 4 | difficile | moyen | C |
| 67 | Le Chant des Sirènes | `magnet` (aimants faibles) | `hazard` | 4 | moyen | facile | B |
| 68 | Pile ou Face | `key` (portes debout et à plat) | `sand` | 4 | moyen | moyen | B |
| 69 | La Patte d'Oie | `key` (deux couleurs) | – | 5 | moyen | facile | A |
| 70 | Le Vigile | `key` (portes mobiles) | `motion` | 4 | difficile | facile | C |
| 71 | Les Moulins | `motion` (rotation verticale) | pentes | 4 | moyen | moyen | B |
| 72 | Le Chasse-Neige | `motion` (glissière dans l'axe) | – | 4 | moyen | facile | B |
| 73 | Les Cratères | pentes, règle `gravity` 5 | – | 4 | moyen | moyen | B |
| 74 | Le Skatepark | pentes (quarters, funbox) | – | 3 | moyen | difficile | B |
| 75 | La Grenouille | pentes (planche à trous) | – | 3 | facile | difficile | B |

† Le trou construit est plus court (par 2, 3 et 3) ; le par indiqué est celui de la version
enrichie, décrite à la fin. La fiche de ces trois trous, plus bas, est celle d'avant la construction.

Comptes (tirés du tableau par script) :

- **Vedettes** : pentes 9, `key` 8, `motion` 7, `jumppad` 6, `ice` 5, `speedpad` 5, `launcher` 5, `teleport` 5, tapis 5, `sand` 4, `wind` 4, `bumper` 4, `magnet` 4, murs et poteaux 3, `hazard` 1.
- **Pars** : par 3, 25 ; par 4, 46 ; par 5, 4 ; total 279, soit 33,5 en
  moyenne pour 9 trous.
- **Niveaux** : faciles 20, moyens 40, difficiles 15.
- **À écrire** : facile 36, moyen 34, difficile 5.
- **Pièces** : 19 trous (1, 4, 6, 7, 11, 16, 17, 18, 19, 20, 24, 30, 37, 41, 50, 52, 59, 63, 67).
- **Paris moteur** : A, déjà montré par une démo ou une piste de test, 19 trous ; B, lu dans le
  code mais jamais joué, 49 ; C, permis par la lettre du validateur ou connu comme délicat, à
  prouver avant tout, 7 (7, 27, 28, 40, 47, 66, 70).

Des trois mouvements d'obstacle, la rotation (16, 47, 61, 71), la glissière (10, 17, 25, 48, 70,
72) et le balancier (46) ont chacun leurs trous. Les éléments que l'équipe préfère : clés,
8 trous ; jumppads, 6 ; speedpads, canons et téléporteurs, 5 chacun.

### Difficulté et tirage

Le pool : faciles 20, moyens 40, difficiles 15, soit à peu près 3 / 5 / 2. Un tirage de 9 devrait en reproduire la
proportion : **3 faciles, 4 moyens, 2 difficiles**.

Ce que donne un tirage purement au hasard de 9 trous sur ces 75 (simulé, 40 000 tirages) :

- deux trous de la même vedette dans 95 % des parties, trois dans 25 % ;
- aucun trou difficile dans 11 % des parties, quatre ou plus dans 7 % ;
- trois trous « attendre son moment » ou plus dans 16 % ;
- un par total entre 27 et 39.

Ce que le tirage devrait faire, par ordre d'importance (du code à écrire, pas fait ici) :

1. **Le sac** : dans une salle, ne pas retirer un trou tant que tous les autres n'ont pas été
   joués. C'est ce qui supprime la répétition ressentie.
2. **Le quota de difficulté**, 3 / 4 / 2, joué dans cet ordre : on ouvre par un facile, les
   difficiles arrivent en septième et huitième, on finit sur un trou « converger » qui rassemble
   tout le monde.
3. **L'espacement** : pas deux trous de la même vedette dans une partie ; deux « attendre son
   moment » au plus ; un seul par 5 ; pas deux fois de suite le même ressort ; jamais un trou et
   sa suite dans la même partie (2 avec 53 ou 73, 8 avec 59, 9 avec 63, 15 avec 69, 43 avec 68).

Inutile d'équilibrer davantage par élément : neuf trous ne peuvent pas montrer quinze vedettes, et
l'espacement suffit. Ces règles demandent une étiquette par trou (niveau, vedette, ressort,
décision) : le JSON des cartes refuse tout champ inconnu, donc un changement de format ou une
table à côté.

## 2. Les trous

Légende des plans (vue de dessus, le nord en haut, on joue vers le haut) : `T` départ, `O` trou,
`$` pièce, `#` mur, `~` eau ou vide, `:` sable, `=` glace, `o` poteau, `B` bumper, `>` `<` `^` `v` pad,
tapis ou vent (son sens), `C` canon, `@` téléporteur, `*` sa sortie, `K` clé, `‖` porte, `J` jumppad,
`[==]` obstacle mobile. Les plans ne sont pas à l'échelle : les dimensions sont dans le texte, en
unités (une balle fait 0,36 de large).

Les fiches 2, 8 et 9 sont celles d'avant la construction, laissées telles quelles : les cotes
réelles des trois prototypes sont dans leur JSON et dans la dernière section. Toutes les autres
fiches sont écrites en actes.

### 1. Trois Bandes

- **Vedette / soutiens** : `wall` (les bandes) ; aucun.
- **Pitch** : une table de billard en deux salles. Aucun gadget : les murs sont l'outil, et chaque salle demande une bande de plus.
- **Actes** : 1) un paravent laisse un passage de 4 u : tout droit, ou par une bande. 2) dans la seconde salle, le trou est dans une alcôve ouverte seulement vers le fond : il faut une bande sur le mur du nord pour y entrer. 3) pour les artistes, les trois bandes d'un seul tir depuis le départ.
- **À plusieurs** : tout le monde passe par le même passage, et les balles arrêtées derrière se font casser comme un triangle. Dans l'alcôve, une balle posée sert de bande aux autres, ou se fait empocher : cadeau.
- **Lignes** : sûre, le passage (1), la bande du fond (2), putt (3) ; risquée, bande est puis bande nord jusque dans l'alcôve (1), putt (2) ; ou la pièce du coin nord-est, hors de la ligne (3 − 1).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : A.
- **Plan** : table de 12 × 22 ; paravent à 8 u ; alcôve de 3 × 3 à 16 u.

```
#############
#        $  #
#   #   #   #
#   # O #   #   alcôve, ouverte au nord
#   #####   #
#           #
#########   #   paravent
#           #
#     T     #
#############
```

### 2. La Cuvette

- **Vedette / soutiens** : pentes (entonnoir carré) ; aucun.
- **Pitch** : le trou est au fond d'une grande cuvette. Tout y descend, il suffit de pousser la
  balle par-dessus le bord ; trop fort, elle remonte en face et revient comme un balancier.
- **À plusieurs** : le ressort « converger » à l'état pur. Toutes les balles finissent sur les
  3 × 3 du fond ; chaque arrivée casse le paquet, empoche celle d'un autre ou éjecte la sienne.
  On crie « merci ! » aussi souvent que « non ! ».
- **Ligne sûre** : une pichenette depuis le balcon, la pente fait le reste (1), putt (2).
- **Ligne risquée** : viser le trou à la bonne vitesse pour le trou en un ; trop vite, la balle
  saute le trou et remonte.
- **Par** : 2.
- **Plan** : 14 × 14 ; rebord plat à 1 de haut, large de 1,5 (balcon de 6 × 3 au sud) ; quatre
  pentes de 4 u de long (14°, rien ne s'y arrête) ; fond plat de 3 × 3.

```
#################
#  .  rebord  . #
#  +---------+  #
#  | pentes  |  #
#  |  +---+  |  #
#  |  | O |  |  #
#  |  +---+  |  #
#  +---------+  #
#     balcon    #
#       T       #
#################
```

- **Construction** : moyen (quatre dalles tournées ; `bowl` dans `internal/tracks` donne la recette).
- **À valider** : les coutures entre dalles ; qu'un paquet de 8 balles au fond se vide bien.

### 3. Le Puy

- **Vedette / soutiens** : pentes (deux buttes) ; `sand`.
- **Pitch** : deux volcans. Le petit se franchit, le grand porte le trou. Pas assez fort on redescend, trop fort on bascule de l'autre côté.
- **Actes** : 1) le Puy cadet, une bosse de 0,6 u en travers du fairway : par-dessus, au dosage, ou par les cols de sable des côtés. 2) le flanc du grand Puy : 25°, 1,4 u de haut, rien n'y tient. 3) le sommet de 4 × 4 : un muret au nord rattrape les tirs un peu longs, le reste dégringole dans le sable.
- **À plusieurs** : le roi de la colline : qui se pose au sommet se fait déloger par le suivant et redégringole, sans pénalité. Sur les deux buttes, ceux qui redescendent croisent ceux qui montent.
- **Lignes** : sûre, la bosse (1), le pied (2), le sommet (3), putt (4) ; risquée, bosse et pied d'un seul tir (1), sommet (2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (arêtes convexes entre dalles ; fenêtre de puissance depuis le pied, 60 à 75 %).
- **Plan** : 18 × 30 ; bosse de 18 × 6 à 10 u ; grand Puy de 10 × 10, sommet en bloc plein ; croissant de sable derrière.

```
####################
#   : : : : : :    #
#    +--------+    #
#    | /####\ |    #   muret du sommet
#    | | O  | |    #
#    | \____/ |    #
#    +--------+    #
#                  #
#::^^^^^^^^^^^^^^::#   le Puy cadet, cols de sable
#                  #
#        T         #
####################
```

### 4. Verglas

- **Vedette / soutiens** : `ice` ; `sand`.
- **Pitch** : du curling sur deux patinoires. La balle ne freine presque pas sur la glace : on dose pour mourir sur une « maison » d'herbe, ou on tape fort et le palet ricoche jusqu'aux congères de sable.
- **Actes** : 1) première patinoire, large, maison d'étape de 3 × 3 : on apprend le poids. 2) une congère barre tout sauf une porte de 3 u : il faut repartir dans l'axe, ou jouer la bande. 3) seconde patinoire, plus courte : maison finale de 2 × 2 gardée par deux îlots de sable.
- **À plusieurs** : du curling à huit pierres : la balle posée sur une maison se fait sortir par la suivante et repart glisser. Pas de pénalité, des places volées, et deux maisons où l'on se bouscule.
- **Lignes** : sûre, maison d'étape (1), la porte et la seconde maison (2), putt (3) ; risquée, la porte d'un seul tir par la bande est (1), putt (2) ; ou la pièce derrière la maison finale, pour qui glisse trop loin exprès (3 − 1).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : B (tout tir doit s'arrêter en moins de 10 s grâce aux congères).
- **Plan** : tablier de 10 × 3 ; patinoires de 10 × 12 et 10 × 9, bordées de 0,6 de sable ; congère de 1,2 entre les deux.

```
############
#::::$:::::#
#:===++===:#
#:=::|O|::=#   maison finale, îlots de sable
#:===++===:#
#::::  ::::#   congère et sa porte
#:========:#
#:==+--+==:#
#:==|  |==:#   maison d'étape
#:==+--+==:#
#     T    #
############
```

### 5. Le Boulodrome

- **Vedette / soutiens** : `sand` ; pentes, `hazard`.
- **Pitch** : de la pétanque. Un tremplin lance la balle en cloche sur un terrain de sable où elle tombe sans rebond et glisse encore 2 à 3 u, comme une boule qu'on pointe. Le cochonnet est sur la terrasse du haut.
- **Actes** : 1) le lancer : la puissance choisit où l'on tombe sur le premier terrain. 2) la marche : le second terrain est 0,5 u plus haut, derrière un talus de sable où la balle tient ; on le grimpe d'un coup sec. 3) le cochonnet, avec la rigole d'eau juste derrière.
- **À plusieurs** : pointer ou tirer. Les balles restent où elles tombent, chacun voit qui est le plus près, et la suivante peut tomber dessus : un carreau.
- **Lignes** : sûre, lancer au milieu du premier terrain (1), monter (2), putt (3) ; risquée, le grand lancer jusque sur la terrasse du haut (1), putt (2) ; trop long, la rigole.
- **Par** : 3 · **Construction** : moyen · **Pari moteur** : B (portée du lancer ; sable qui tient sur le talus).
- **Plan** : pelouse de 6 × 4 ; tremplin de 6 × 3 à 15° ; terrain bas de 8 × 7 ; talus de 1,5 u ; terrain haut de 8 × 5, trou à 2,5 u du talus ; rigole de 1,5.

```
############
#~~~~~~~~~~#   rigole
#::::::::::#
#::::O:::::#   terrain du haut
#^^^^^^^^^^#   talus de sable
#::::::::::#
#::::::::::#   terrain du bas
#::::::::::#
#  ^^^^^^  #   tremplin
#    T     #
############
```

### 6. Coup de Mistral

- **Vedette / soutiens** : `wind` ; `hazard`.
- **Pitch** : deux jetées, deux vents. Le vent pousse les balles vers une rambarde percée de brèches : il faut viser dans le vent.
- **Actes** : 1) première jetée : vent d'ouest, rambarde à l'est, une brèche. 2) l'îlot du milieu, à l'abri, avec son `checkpoint` : on souffle. 3) seconde jetée : le vent a tourné et forci ; rambarde à l'ouest, deux brèches, une pièce au bord de la dernière.
- **À plusieurs** : le vent (3 puis 4 u/s², plus que le frottement) ne laisse personne au milieu : les balles s'entassent le long de la rambarde comme des feuilles mortes, se poussent le long du rail et envoient la voisine dans une brèche.
- **Lignes** : sûre, chaque jetée en deux bonds le long du rail (1, 2, 3), putt (4) ; risquée, chaque jetée d'un tir, en visant au vent (1, 2), putt (3) ; ou la pièce de la dernière brèche (4 − 1).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B (une balle plaquée contre la rambarde par le vent s'y arrête et se tire).
- **Plan** : quai de 8 × 4 ; jetées de 4 × 10 ; îlot de 6 × 5 ; île du green de 8 × 7.

```
~~~##########~~~
~~~#    O   #~~~
~~~~#    <~~~~~~
~~~~     <~~~~~~   brèche
~~~~#    <~~~~~~
~~~~$    <~~~~~~   brèche et pièce
~~~#      #~~~~~   îlot, à l'abri
~~~~~>    #~~~~~
~~~~~>     ~~~~~   brèche
~~~~~>    #~~~~~
~~~#   T    #~~~
```

### 7. Multibille

- **Vedette / soutiens** : `bumper` ; pentes.
- **Pitch** : un flipper à deux tables inclinées. Tout ce qui rate redescend, d'une table au plus.
- **Actes** : 1) table basse, large : trois bumpers espacés, un couloir sans bumper de chaque côté. 2) le palier, une tablette plate où l'on se pose. 3) table haute, plus étroite : deux bumpers gardent l'entrée de la tablette du trou.
- **À plusieurs** : un vrai multibille : dix balles entre les bumpers, celles qui retombent fauchent celles qui montent, et le palier est un embouteillage joyeux. Rien ne tient sur les pentes : rien n'est jamais perdu.
- **Lignes** : sûre, un couloir latéral jusqu'au palier (1), le couloir de la table haute (2), putt (3), dedans (4) ; risquée, plein centre entre les bumpers, deux fois (1, 2), putt (3) ; ou le détour par la pièce, entre les bumpers du bas (4 − 1).
- **Par** : 4 · **Construction** : difficile · **Pari moteur** : C. Un bumper renvoie à 9 u/s à chaque contact : une balle qui lui retombe dessus rebondirait sans fin. Chaque bumper est coiffé, côté haut, d'un chevron de murs simples ; à prouver avec `verify`.
- **Plan** : gouttière de 12 × 4 ; table basse de 12 × 8 à 12° ; palier de 12 × 3 ; table haute de 8 × 6 ; tablette de 8 × 3,5, en bloc plein.

```
  ##########
  #    O   #    tablette
  #  B   B #    table haute
  #  ^   ^ #
##############
#            #  palier
#  B   B     #
#     B  $   #  table basse
#  ^      ^  #
#     T      #  gouttière
##############
```

### 8. Le Carrefour

- **Vedette / soutiens** : `speedpad` ; `jumppad`, `sand`.
- **Pitch** : le chemin fait une boucle et repasse par son propre croisement : on le traverse
  une fois vers le nord, une fois vers l'ouest, chaque fois lancé par un pad.
- **À plusieurs** : le ressort « se croiser ». Ceux qui en sont au premier passage coupent la
  route de ceux du second, à pleine vitesse de pad. Un choc au croisement envoie dans le mauvais
  bras (la boucle à refaire) ou, coup de chance, directement vers le green.
- **Ligne sûre** : pad nord puis la boucle (1), retour par l'est et pad ouest jusqu'au green (2),
  putt (3).
- **Ligne risquée** : un `jumppad` contre le mur ouest du bras sud fait sauter le coin et
  retomber dans le bras ouest (1), putt (2). Trop mou, on tape le mur ; trop fort, on traverse.
- **Par** : 3.
- **Plan** : environ 22 × 22, couloirs de 4 ; pads de vitesse 10 (14 u de roulement : assez pour
  traverser, pas pour refaire un tour) ; coins de la boucle à 45° ; sable derrière le trou.

```
        ###############
        #   /------\  #
        #   |  ##  |  #
        #   |  ##  |  #
#########   ^  ##  |  #
#:O       <  <-----/  #
#########J  ^  ########
        #   ^  #
        #   T  #
        ########
```

- **Construction** : moyen (murs à 45°, deux pads, un saut).
- **À valider** : qu'aucun circuit ne ramène une balle sur un pad sans fin ; le saut du coin.

### 9. Tir Groupé

- **Vedette / soutiens** : `launcher` ; `sand`, `hazard`.
- **Pitch** : un canon tire toutes les balles en cloche sur la même île de sable, où elles
  s'arrêtent en 2 u. De là, un pont mène au green. Un second canon, au bout d'une planche étroite, tire droit sur
  le green.
- **À plusieurs** : un canon envoie toujours au même endroit : chaque balle tombe sur les
  précédentes. Tirées à deux secondes d'écart, cinq balles se suivent en l'air et se carambolent
  à l'atterrissage. Le sable garde tout le monde sur l'île, ou presque.
- **Ligne sûre** : canon A (1), sortie de sable par le pont (2), putt (3).
- **Ligne risquée** : la planche de 1,2 u jusqu'au canon B, qui pose sur le green (1), putt (2).
  Le risque est d'atteindre le canon, pas le vol.
- **Par** : 3.
- **Plan** : pelouse de 10 × 6 ; 9 u d'eau ; arc raide (1,3 s de vol, 7,5 u/s à l'horizontale,
  4 u de haut) pour une glissade de 2 u à l'arrivée ; île de sable de 6 × 8, dans le sens du
  tir, avec un `checkpoint` ; pont de 2 × 3 ; green de 8 × 6 ; ponton de 2 × 2 à l'est pour le
  canon B.

```
~~############~~~~~~
~~#     O    #~~~~~~   green
~~############~~~~~~
~~~~~~#  #~~~~~~~~~~   pont
~~~~::::::::~~~~~~~~
~~~~::::::::~~~~~~~~   île de sable
~~~~~~~~~~~~~~~~~~~~
~~~~~~~~~~~~~~~~+--+
~~############~~| C|   canon B sur son ponton
~~#     C    #~~+  +
~~#          ======    planche
~~#     T    #~~~~~~
~~############~~~~~~
```

- **Construction** : moyen (deux arcs à régler, sinon des boîtes droites).
- **À valider** : le point de chute et la dispersion à l'arrivée ; qu'une balle poussée à l'eau
  repart bien de l'île.

### 10. Fenêtre de Tir

- **Vedette / soutiens** : `launcher` ; `motion`, `hazard`.
- **Pitch** : deux canons, deux fenêtres. Chaque canon tire par-dessus un fossé, à travers des volets qui glissent : il faut entrer dans la culasse au bon moment.
- **Actes** : 1) premier canon : un seul grand volet, lent ; la fenêtre est ouverte la moitié du temps. 2) la plate-forme du milieu et son `checkpoint`. 3) second canon : deux volets qui se croisent, une fenêtre étroite un tiers du temps, le green derrière.
- **À plusieurs** : tout le monde attend la même ouverture et lâche en même temps : une rafale part, les balles se gênent à l'entrée de la culasse, et chaque volet pris de face se voit de toute la salle.
- **Lignes** : sûre, le couloir qui contourne le premier fossé (1, 2), le second canon (3), putt (4) ; risquée, les deux canons (1, 2), putt (3) ; contre un volet, la balle tombe au fossé (+1).
- **Par** : 4, `maxStrokes` 10 · **Construction** : difficile · **Pari moteur** : B (que `verify` trouve la ligne du canon en attendant).
- **Plan** : pelouse de 8 × 6 ; fossés de 9 u ; plate-forme de 8 × 5 ; green de 8 × 7 ; couloir est de 3 de large.

```
################
#      O       #
#~~~~~~~~~~~~~~#
#~[==]~~[==]~~~#   deux volets
#~~~~~~~~~~~~~~#
#      C    <  #   plate-forme ; le couloir y arrive
#~~~~~~~~~~~#  #
#~~[====]~~~#  #   un volet
#~~~~~~~~~~~#  #
#      C       #
#      T       #
################
```

### 11. Bonneteau

- **Vedette / soutiens** : `teleport` (trois couleurs) ; `sand`.
- **Pitch** : trois portails côte à côte, trois sorties visibles, chacune de sa couleur, et derrière chacune un couloir différent vers le même green.
- **Actes** : 1) le choix, dans la bousculade : le violet est serré entre deux poteaux, l'indigo derrière une bande de sable, le rose grand ouvert. 2) son couloir : le violet sort face au trou ; l'indigo fait tomber sur une pièce, puis demande une bande ; le rose sort dans un bunker, derrière une chicane. 3) le green, où les trois couloirs se rejoignent.
- **À plusieurs** : les balles tirées ensemble se cognent devant les bouches et changent de portail (« ah non, pas le rose ! »). À la sortie violette, chaque balle qui arrive pousse la précédente vers le trou : cadeau, ou trop loin.
- **Lignes** : sûre, le rose (1), sortie de bunker (2), putt (3) ; risquée, le violet, lentement, pour mourir au trou (1 ou 2) ; ou l'indigo et sa pièce (3 − 1).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : A (l'ordre des couleurs suit l'ordre des zones, `PORTALS`).
- **Plan** : salle de 12 × 8 ; arrière-salle de 12 × 14 en trois couloirs de 4.

```
################
#       O      #
#  #         # #
# :#    *    #$#
# *#         #*#
################
#  @    @   @  #
#      o o  :: #
#       T      #
################
```

### 12. Tombé du Ciel

- **Vedette / soutiens** : `teleport` (deux couleurs) ; `hazard`.
- **Pitch** : deux chutes. Chaque portail sort en plein ciel et la balle tombe en gardant sa vitesse : lente, elle tombe court ; rapide, elle tombe loin.
- **Actes** : 1) la piste d'élan et le premier portail. 2) première chute, de 5 u, sur une grande île : facile, on apprend ; au bout de l'île, le second portail. 3) seconde chute, de 8 u, sur un green plus petit, sans rien au fond : à la bonne vitesse, la balle tombe dans le trou.
- **À plusieurs** : il pleut des balles, deux fois. Chacune tombe du même point du ciel sur celles qui sont posées, et tout le monde suit la chute des autres.
- **Lignes** : sûre, première chute (1), entrer lentement dans le second portail (2), putt (3) ; risquée, tomber sur la grande île avec juste l'élan pour rouler dans le second portail : les deux chutes d'un seul tir (1), putt (2).
- **Par** : 3, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B (rebonds à l'atterrissage ; une balle au vol prise par le trou).
- **Plan** : piste de 4 × 9 ; grande île de 8 × 12 ; green de 6 × 10, rambardes sur les côtés ; un `checkpoint` en rideau sous chaque sortie.

```
~~~~~~~~~~~~~~~~~~~~~
~#      #~~~#     #~~
~#   @  #~~~#  O  #~~   second portail | green
~#      #~~~#     #~~
~#      #~~~#  *  #~~   sorties, en plein ciel
~#   *  #~~~~~~~~~~~~
~~~~~~~~~~~~~~~~~~~~~
~~~# @ #~~~~~~~~~~~~~
~~~#   #~~~~~~~~~~~~~   piste d'élan
~~~# T #~~~~~~~~~~~~~
```

### 13. Le Saumon

- **Vedette / soutiens** : tapis (`wind` fin) ; `sand`.
- **Pitch** : deux échelles à saumon. Le chemin court remonte un tapis à contre-courant ; raté, le courant ramène en bas. Aucune pénalité : on perd du terrain, pas des coups.
- **Actes** : 1) première échelle, courte (5 u, 4 u/s²) : la moitié de la puissance suffit. 2) le bassin du milieu, calme. 3) seconde échelle : 9 u à 6 u/s², deux rochers de sable où l'on tient contre le courant ; à côté, un tapis dans le bon sens fait le tour par l'est.
- **À plusieurs** : ceux qui redescendent, emportés, percutent de face ceux qui montent. Une remontée parfaite peut être ruinée par l'échec d'un autre ; un rocher occupé se dispute.
- **Lignes** : sûre, première échelle (1), le tapis de l'est (2), contourner la chicane (3), putt (4) ; risquée, chaque échelle d'un seul tir (1, 2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B (`holds` dit que le sable tient contre 6 u/s² ; une balle ramenée doit s'arrêter dans le bassin).
- **Plan** : bassins de 10 × 4 ; échelles de 4 de large ; tapis est de 3 × 9 (4 u/s²) ; pelouse d'arrivée de 10 × 5.

```
##############
#   O    #   #
###    ##### #
  #v v:#   #^#
  #:v v#   #^#   seconde échelle | tapis de l'est
  #v v:#   #^#
###    #####^#
#            #   bassin du milieu
####vvvv######
   #vvvv#        première échelle
####    ######
#     T      #
##############
```

### 14. Le Siphon

- **Vedette / soutiens** : `magnet` (un aimant, cinq répulseurs) ; aucun.
- **Pitch** : autour du trou, un aimant avale tout ce qui entre dans son disque : les balles tournent comme une pièce dans un entonnoir de collecte, puis tombent. Devant, deux portes de répulseurs.
- **Actes** : 1) première porte : deux répulseurs, un couloir de calme de 1,5 u. 2) seconde porte : trois répulseurs en ligne, deux couloirs de 1,2 u, décalés du premier. 3) le siphon.
- **À plusieurs** : trois à dix balles en orbite autour du même trou, qui se cognent, s'éjectent et se font avaler ; devant, les balles recrachées par les répulseurs traversent tout le plateau.
- **Lignes** : sûre, contourner chaque porte par le bord (1, 2), entrer dans le disque (3) ; risquée, enfiler les deux portes en biais d'un seul tir : le disque fait le reste (1 ou 2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : A (aimant au trou et répulseur de démo ; vérifier qu'une balle rapide tombe en bien moins de 30 s).
- **Plan** : plateau de 14 × 24 ; répulseurs de rayon 2 (−8 u/s²) ; aimant de rayon 3,5 (5 u/s²) centré sur le trou.

```
################
#    .-----.   #
#   (   O   )  #   aimant
#    '-----'   #
#  ( ) ( ) ( ) #   seconde porte
#              #
#   (  ) (  )  #   première porte
#              #
#      T       #
################
```

### 15. Aller-Retour

- **Vedette / soutiens** : `key` et portes (les deux couleurs) ; `speedpad`, `hazard`.
- **Pitch** : la clé bleue est tout au bout à l'ouest, la porte bleue à l'est : il faut aller la chercher et revenir par le même couloir. La clé vermillon, sur un îlot au milieu d'une mare, ouvre une voie privée.
- **Actes** : 1) l'aller, 14 u de couloir. 2) l'alcôve : la clé bleue au sol, la vermillon sur son îlot au bout d'une planche. 3) le retour : à contresens jusqu'à la porte bleue, ou par la voie privée dont le pad ramène d'un trait au green.
- **À plusieurs** : ceux qui reviennent avec la clé foncent sur ceux qui y vont. L'alcôve est une mêlée. Et celui qui a oublié la clé rebondit sur la porte devant tout le monde.
- **Lignes** : sûre, l'alcôve et la clé bleue (1), le retour (2), la porte et le green (3), putt (4) ; risquée, s'aligner (1), puis la planche, l'îlot, la porte vermillon et le pad d'un seul tir (2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : A.
- **Plan** : couloir de 4 × 30 ; alcôve de 6 × 6 ; mare de 3 × 3, îlot de 1,2, planche de 1 ; voie privée de 2 × 26, pad de vitesse 14, sable à l'arrivée ; green de 6 × 6.

```
######################################
#K                              ‖    #
#           T                   ‖  O #
#~~~                            ‖    #
#~K~###########################   ::##
#~~~‖ >  >  >  >  >  >  >  >  >  >   #
######################################
```

### 16. La Pendule

- **Vedette / soutiens** : `motion` (rotation) ; aucun.
- **Pitch** : deux cadrans à traverser. Les aiguilles balaient tout ce qui s'y trouve ; le trou est de l'autre côté.
- **Actes** : 1) le réveil : un petit cadran, une seule aiguille lente (12 s), de larges bords hors d'atteinte. 2) l'horloge : grande aiguille en 9 s, petite à l'envers en 24 s, et seulement 0,8 u de bord sûr. 3) le green, que rien n'atteint.
- **À plusieurs** : les aiguilles ratissent les balles posées comme le râteau d'un croupier et les poussent les unes dans les autres. Tout le monde guette le même créneau et part en salve.
- **Lignes** : sûre, les bords des deux cadrans (1, 2, 3), putt (4) ; risquée, chaque cadran tout droit, près du moyeu (1, 2), putt (3) ; ou la pièce à 9 heures de l'horloge, là où passent les deux aiguilles (4 − 1).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (ce que fait une aiguille à une balle posée contre un mur). Le trou et le départ sont hors des disques balayés : le moteur refuse un obstacle mobile dont l'enveloppe touche la colonne du trou.
- **Plan** : 12 × 30 ; réveil de rayon 3, horloge de rayon 5,2 ; moyeux de 0,5 ; green de 12 × 5.

```
################
#       O      #
#    .----.    #
#   /  |   \   #
#  | $ o--  |  #   l'horloge
#   \      /   #
#    '----'    #
#     .--.     #
#    ( o- )    #   le réveil
#     '--'     #
#       T      #
################
```

### 17. Le Passage à Niveau

- **Vedette / soutiens** : `motion` (glissière) ; `sand`.
- **Pitch** : trois passages à niveau. Sur chaque voie, un convoi rayé va et vient et l'ouverture change de côté. Les voies sont en ballast de sable : s'y arrêter est facile, et une mauvaise idée.
- **Actes** : 1) voie lente (6 s), large ouverture. 2) voie rapide (3,6 s). 3) double voie : deux convois sur deux rails voisins, en sens opposés, une pièce entre les deux.
- **À plusieurs** : le convoi emporte tout ce qui traîne sur les rails et le tasse au bout de la voie. Les balles attendent ensemble sur les terre-pleins et partent en salve ; une balle déviée par un convoi fauche les autres.
- **Lignes** : sûre, une voie par coup, de terre-plein en terre-plein (1, 2, 3), putt (4) ; risquée, deux voies d'un tir quand les ouvertures s'alignent (1, 2), putt (3) ; ou la pièce entre les deux rails (4 − 1).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B (une balle coincée entre un convoi et un mur : le moteur la pousse de côté).
- **Plan** : fairway de 8 × 30 ; voies de 1,2 ; convois de 4 de long qui glissent de 2,6, à 0,7 des murs ; terre-pleins de 4 u.

```
##########
#   O    #
#[====]  #
#  $[====]   double voie
#        #
# [====] #   voie rapide
#        #
#[====]  #   voie lente
#        #
#   T    #
##########
```

### 18. Clair de Lune

- **Vedette / soutiens** : `jumppad`, sous la règle `gravity` 5 ; `sand`, `hazard` (le vide).
- **Pitch** : sur la Lune, un saut dure deux secondes. Un `jumppad` au bord de chaque île : la vitesse d'élan choisit où l'on retombe.
- **Actes** : 1) le premier saut passe au-dessus d'une mer de sable : trop court, on y tombe sans pénalité, et un pad au pied de la falaise remonte. 2) la grande île, en sable pour qu'on s'y arrête, au-dessus du vide cette fois. 3) le green, large de 4 u seulement ; ou le piton et sa pièce.
- **À plusieurs** : deux secondes de vol, c'est un ciel plein de balles au ralenti. Elles se touchent en l'air, et l'arrivée sur une petite île déloge ceux qui s'y reposaient.
- **Lignes** : sûre, la grande île (1), le green (2), putt (3) ; risquée, le grand pas, du départ au green (1), putt (2) ; ou le piton de 2,5 × 2,5 (3 − 1).
- **Par** : 3, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : B (une balle qui retombe sur un pad presque sans élan ; le dosage depuis le sable).
- **Plan** : île de départ de 8 × 6 ; pads de vitesse 5 (portée : 2 s × la vitesse d'élan) ; mer de sable de 8 × 5, 1 u plus bas ; grande île de 8 × 5 ; piton à 14 u du premier pad ; green de 4 × 8 à 19 u, muret au fond ; `checkpoint` sur la grande île et le green.

```
~~~~######~~~~
~~~~#  O #~~~~
~~~~#    #~~~~
~~~~~~~~~~~JJ~
~~~~~~~~~~~$ ~   piton
~~JJJJJJJJ~~~~
~~::::::::~~~~   grande île, en sable
~~JJJJJJJJ~~~~   pad au pied de la falaise
~#::::::::#~~~   mer de sable, 1 u plus bas
~~JJJJJJJJ~~~~
~~    T   ~~~~
```

### 19. La Planche à Clous

- **Vedette / soutiens** : poteaux (`wall`) ; pentes.
- **Pitch** : une planche de Galton en deux étages. La planche penche et la balle dégringole entre les clous : on choisit où lâcher, les clous font le reste.
- **Actes** : 1) première planche : clous espacés, trois couloirs en bas. 2) la tablette du milieu : on s'y arrête dans le couloir que les clous ont choisi, et on relâche d'où l'on est. 3) seconde planche : clous serrés, et en bas trois sorties : le green au milieu, une pelouse lointaine à gauche, la pièce à droite.
- **À plusieurs** : dix balles dans les clous se dévient les unes les autres : personne ne maîtrise rien et tout le monde commente. La respiration « chance » du pool.
- **Lignes** : sûre, lâcher au centre, deux fois (1, 2), putt (3) ; risquée, viser la sortie de droite pour sa pièce, plus loin du trou (4 − 1) ; le coup de deux existe pour qui tombe droit.
- **Par** : 3 · **Construction** : moyen · **Pari moteur** : B (une balle calée contre un clou sur la pente doit repartir ou pouvoir être tirée).
- **Plan** : 12 × 28 ; planches de 12 × 8 à 14° ; clous de rayon 0,25 ; tablette de 12 × 3 ; pelouse du bas de 12 × 6.

```
##############
#     T      #   balcon, en haut
# o   o   o  #
#   o   o    #   première planche
#   #    #   #
#            #   tablette
# o o o o o  #
#  o o o o   #   seconde planche
#   #    #  $#
#      O     #   pelouse du bas
##############
```

### 20. La Gouttière

- **Vedette / soutiens** : pentes (un demi-tube) ; `sand`.
- **Pitch** : un demi-tube de 30 u. Pour passer ce qui barre le fond, il faut monter sur les parois : un tir en biais fait onduler la balle d'un bord à l'autre, comme un skateur.
- **Actes** : 1) un seul bloc au fond : on apprend l'ondulation. 2) une fosse de sable sur toute la largeur du fond : il faut être sur une paroi au moment de la passer. 3) deux blocs décalés, à droite puis à gauche, et le trou juste derrière.
- **À plusieurs** : des ondulations décalées se recoupent au fond à chaque demi-période : chocs de côté garantis. Une balle arrêtée devant un bloc sert d'appui aux autres.
- **Lignes** : sûre, un obstacle par coup (1, 2, 3), putt (4) ; risquée, une ondulation qui en passe deux (1, 2), putt (3) ; ou la pièce tout en haut de la paroi est (4 − 1).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (la période de l'ondulation, donc l'écart entre les obstacles).
- **Plan** : 8 × 30 ; fond plat de 2 ; parois de 3 de large à 18° (1 de haut) ; blocs de 2 × 1,5 ; fosse de 2 × 2.

```
############
#//  O   \\#
#// [#   \\#
#//   #] \\#   deux blocs décalés
#//      \\#
#// :::: \\$   fosse de sable
#//      \\#
#// [##] \\#   un bloc
#//  T   \\#
############
```

### 21. La Cascade

- **Vedette / soutiens** : pentes (des marches) ; `sand`.
- **Pitch** : six terrasses en escalier, chacune 1 u plus bas, le trou sur la dernière. Doucement, on descend marche par marche ; fort, la balle saute des marches.
- **Actes** : 1) deux marches libres : on apprend la chute. 2) deux marches à muret : chaque bord est fermé, sauf une ouverture de 3 u, une fois à gauche, une fois à droite ; ou bien on arrive d'assez haut pour sauter le muret. 3) le dernier saut, sur un green bordé de sable.
- **À plusieurs** : il pleut des balles d'une terrasse sur l'autre. Ici se faire pousser est une chance : on tombe d'une marche, donc on avance. Les ouvertures sont des goulots où l'on se fait passer devant.
- **Lignes** : sûre, les marches libres (1), les ouvertures (2, 3), putt (4) ; risquée, un tir tendu qui saute les deux murets (2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : A (la piste `drop`).
- **Plan** : 8 × 30, 5 u de dénivelé ; terrasses de 4 ; murets de 0,3 ; green de 8 × 7, 1,5 de sable devant le mur du fond.

```
##########
#::::::::#
#   O    #   green (0)
#---  ---#   dernier saut
#        #
#######  #   muret, ouverture à droite
#        #
#  #######   muret, ouverture à gauche
#        #
#--------#   marches libres
#   T    #   départ (5)
##########
```

### 22. Le Toboggan

- **Vedette / soutiens** : pentes (des lacets) ; `sand`.
- **Pitch** : un circuit de billes. Une pichenette et la pente fait tout : des lacets à 12° entre des murs, où la balle se stabilise vers 8 u/s.
- **Actes** : 1) premier lacet, doux, jusqu'à un palier plat où l'on s'arrête. 2) la fourche : à gauche un lacet long qui dépose devant le green ; à droite un toboggan raide. 3) le saut : le toboggan raide finit en tremplin par-dessus un fossé de sable et pose à 1 u du trou, ou dedans.
- **À plusieurs** : une vraie course de billes : tout le monde lâche en même temps, on se double à coups d'épaule dans les virages, et un choc à la fourche décide pour vous.
- **Lignes** : sûre, le palier (1), la gauche (2), putt (3) ; risquée, traverser le palier sans s'arrêter et prendre la droite (1), putt (2).
- **Par** : 3 · **Construction** : difficile (six dalles tournées, virages à 45°) · **Pari moteur** : B (rien ne doit s'arrêter dans un lacet).
- **Plan** : 14 × 22, 4 u de dénivelé ; couloirs de 3 ; palier de 6 × 4 ; green de 8 × 6 en bas.

```
################
# T  > > > > \ #   premier lacet
#            v #
#  [ palier ]  #
#  v        \  #   fourche
#  v         v #
#  \ > O ::  ^ #   green ; le saut arrive par l'est
################
```

(Ici les flèches donnent le sens de la pente.)

### 23. La Luge

- **Vedette / soutiens** : `ice` ; `sand`.
- **Pitch** : une piste de luge : un couloir de glace large de 3, des virages à 45°. Sur la glace tout tir va jusqu'au bout ; seule compte la vitesse à l'arrivée.
- **Actes** : 1) la piste haute, deux virages, qui finit dans 1,5 u de neige (du sable) : on s'y arrête, ou on la traverse. 2) la piste basse : une chicane serrée, par l'intérieur (une porte de 1,5 u) ou par l'extérieur. 3) l'aire d'arrivée : encore de la neige, puis le green.
- **À plusieurs** : en file indienne. Une balle lente se fait rattraper et pousser jusqu'en bas (merci), et les deux aires de neige sont des carambolages permanents.
- **Lignes** : sûre, la neige du milieu (1), la piste basse (2), putt (3) ; risquée, assez d'élan pour traverser la neige et enchaîner (1), putt (2).
- **Par** : 3 · **Construction** : moyen · **Pari moteur** : B (temps de glisse d'un tir mou : viser moins de 12 s).
- **Plan** : pistes de 3 × 16 chacune ; neiges de 1,5 ; green de 6 × 6, sable et mur au fond.

```
##########
#::::::::#
#   O    #   green
#::::::::#   neige
#  /==#==#   piste basse, porte intérieure
#  \=====#
#::::::::#   neige du milieu
#  /=====#
#  \====\#   piste haute
#   T ===#
##########
```

### 24. Pêche sur Glace

- **Vedette / soutiens** : `ice` ; `hazard`, `sand`.
- **Pitch** : un lac gelé à traverser. Sur la glace rien ne s'arrête, sauf sur les îlots d'herbe, dans les congères du bord et sur la rive d'en face.
- **Actes** : 1) la moitié proche : deux îlots rapprochés, aucun danger. 2) la moitié lointaine : quatre trous de pêche (+1) entre les îlots, qui s'espacent. 3) la rive : une bande d'herbe de 3 u, le trou derrière un dernier trou de pêche.
- **À plusieurs** : les îlots font 2 × 2 : qui arrive déloge qui s'y trouve, et le délogé repart glisser… parfois jusqu'à un trou de pêche.
- **Lignes** : sûre, par les congères, de bord en bord (1, 2, 3), putt (4) ; risquée, tout droit d'îlot en îlot entre les trous (1, 2), putt (3) ; ou la pièce, collée au trou central (4 − 1).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B.
- **Plan** : lac de 14 × 24, congères de 0,6 ; îlots de 2 × 2 ; trous de pêche de rayon 0,8 ; rive de 14 × 3.

```
################
#       O      #   rive
#:=====~======:#
#:== ~ ==[]===:#
#:=====~$=====:#
#:=[]====== ~ :#   moitié lointaine
#:============:#
#:===[]====[]=:#   moitié proche
#:============:#
#      T       #
################
```

(`[]` : un îlot d'herbe.)

### 25. Le Gardien

- **Vedette / soutiens** : `ice` ; `motion`, `sand`.
- **Pitch** : une patinoire de hockey. Au fond, une cage de 3 u s'ouvre sur un carré d'herbe où est le trou.
- **Actes** : 1) le centre de la glace : deux poteaux fixes et un défenseur qui glisse lentement en travers. 2) le banc : une bande de sable le long de la bande est, seul endroit où s'arrêter à mi-chemin. 3) la cage : un gardien rayé passe devant en 3 s.
- **À plusieurs** : tout le monde tire au but à la même ouverture : les palets se percutent devant la cage, les tirs manqués ricochent dans la foule, et celui qui campe devant le but se fait balayer par le gardien.
- **Lignes** : sûre, le banc (1), se placer à côté de la cage (2), pousser quand le gardien s'écarte (3) ; risquée, le tir direct à travers la défense (1 ou 2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : A (porte coulissante et glace des démos).
- **Plan** : patinoire de 10 × 20, congères de 0,6 ; défenseur et gardien de 2 de large ; cage d'herbe de 3 × 3, le gardien à 1,5 u devant.

```
####+---+####
#:::| O |:::#   cage
#:==     ==:#
#:== [==] =:#   gardien
#:=========:#
#:=o=[==]o::#   défenseur, poteaux, banc
#:=========:#
#     T     #
#############
```

### 26. La Dune

- **Vedette / soutiens** : `sand` ; pentes.
- **Pitch** : sur le sable une balle tient même dans une pente raide, mais n'avance que de 3 à 4 u par coup ; sur l'herbe elle file, et redescend dès qu'elle s'arrête. Lent et sûr, ou rapide et exposé.
- **Actes** : 1) la plage : un caillebotis d'herbe de 2 u entre deux étendues de sable. 2) la petite dune (1,2 u) : face de sable ou rampe d'herbe. 3) la grande dune (2,4 u), le trou au sommet : face de sable à 30°, ou rampe d'herbe à 10° avec un virage.
- **À plusieurs** : sur les rampes, ceux qui redescendent fauchent ceux qui montent. Sur le sable, les balles restent plantées comme des piquets : personne ne peut vous y bousculer.
- **Lignes** : sûre, le sable partout (1, 2, 3), putt (4) ; risquée, les deux rampes d'herbe, chacune d'un tir dosé (1, 2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (`holds` dit que le sable retient jusqu'à 37° ; jamais joué).
- **Plan** : 16 × 30 ; faces de sable de 8 de large ; rampes d'herbe de 3 ; sommet de 5 × 5 en bloc plein, muret au fond.

```
################
#  +------+ ^  #
#  |  O   |<^  #   sommet ; la rampe arrive par l'est
#  +------+ ^  #
#  :::::::: ^  #   grande dune
#  :::::::: ^  #
#  ::::::::^^  #   petite dune
#  :::  :::    #
#  :::  :::    #   plage et caillebotis
#      T       #
################
```

### 27. Courant d'Air

- **Vedette / soutiens** : `wind` (en altitude) ; `jumppad`, `hazard` (le vide).
- **Pitch** : le vent ne souffle qu'en haut, entre 1,5 et 4 u : un petit saut passe dessous, un grand saut monte dedans et se fait emporter sur le côté.
- **Actes** : 1) un petit saut, sous le vent, vers l'île d'en face : on apprend le pad. 2) le grand pad : le courant emporte vers l'est jusqu'à la deuxième île, décalée de 4 u. 3) encore un grand saut, mais le courant souffle vers l'ouest et plus fort : le green est à gauche.
- **À plusieurs** : le ciel a deux étages. Les balles prises dans le courant dérivent ensemble et retombent groupées ; celles du bas les regardent passer.
- **Lignes** : sûre, un saut par coup (1, 2, 3), putt (4) ; risquée, retomber d'un grand saut en roulant droit sur le pad suivant : deux vols d'un tir (1, 2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : C. Une zone en altitude n'est permise qu'au-dessus du vide (aucun sol dessous), et son dessin, des ventilateurs en l'air, n'a pas été vu.
- **Plan** : îles de 8 × 5 ; 6 u de vide entre elles ; pads de vitesse 5 (petit) et 10 (grand) ; vents de 10 puis 12 u/s² ; green de 6 × 8, muret au fond ; un `checkpoint` par île. On retombe du courant avec 7 à 9 u/s de travers : chaque île d'arrivée a une rambarde du côté où le vent pousse, pour rattraper la glissade.

```
~+-----+~~~~~~~~~~~
~|  O  |~~~~~~~~~~~   green
~+-----+~~~~~~~~~~~
~ < < < < < < < < ~   courant vers l'ouest
~~~~~~~~~+--JJ--+~~
~~~~~~~~~|      |~~   deuxième île
~ > > > > > > > > ~   courant vers l'est
~+--JJ--+~~~~~~~~~~
~|      |~~~~~~~~~~   île d'en face
~+--jj--+~~~~~~~~~~
~|  T   |~~~~~~~~~~
```

(`jj` : le petit pad.)

### 28. L'Œil du Cyclone

- **Vedette / soutiens** : `wind` (en rond) ; `sand`.
- **Pitch** : deux anneaux de vent tournent autour du trou, en sens contraires. Rien n'y tient en place : une balle arrêtée dérive jusqu'au sable. Au centre, l'œil : 4 × 4 de calme.
- **Actes** : 1) l'anneau extérieur tourne dans le sens des aiguilles d'une montre : on se laisse porter ou on vise en amont. 2) le « mur de l'œil », un cercle de sable entre les deux anneaux : le seul endroit où souffler. 3) l'anneau intérieur tourne à l'envers, et il est plus étroit : moins de temps pour corriger ; l'œil est derrière.
- **À plusieurs** : tout le monde tourne dans le même manège, puis dans l'autre sens, et se retrouve dans l'œil. Les positions changent pendant qu'on vise.
- **Lignes** : sûre, le mur de l'œil (1), l'œil (2), putt (3) ; risquée, droit sur l'œil depuis le départ, avec une avance d'un côté puis de l'autre (1), putt (2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : C. Un vent en rond redonne de l'énergie à chaque tour ; le sable (bord et mur de l'œil) doit tout arrêter : calculé pour 3 u/s² : 4 u/s au plus, 0,8 u de sable pour s'arrêter, 2,9 u de roulement dans l'œil ; jamais joué.
- **Plan** : arène de 20 × 20, sable de 1,2 au bord ; anneaux de 4 et 2,5 de large, à 3 u/s² tous les deux ; mur de l'œil de 1,2 ; tablier calme de 20 × 3.

```
##################
#::::::::::::::::#
#:  > > > > >   :#
#:  ^ :::::: v  :#   mur de l'œil
#:  ^ :v<<<: v  :#
#:  ^ :v O^: v  :#   l'œil
#:  ^ :>>>^: v  :#
#:  ^ :::::: v  :#
#:   < < < < <  :#
#        T       #
##################
```

### 29. La Piste d'Envol

- **Vedette / soutiens** : tapis (`wind` fin) ; pentes, `hazard`.
- **Pitch** : un tapis roulant finit sur un tremplin. Une pelouse le longe : on y monte où l'on veut, d'un putt de côté. Monter tôt, c'est partir vite et tomber loin. La puissance ne compte presque pas : c'est l'endroit qui dose.
- **Actes** : 1) la petite piste (6 u) saute un fossé de sable : trop court, on tombe dans le sable, sans pénalité. 2) la grande piste (14 u), au-dessus de l'eau : monter tard pour l'îlot de sable, à 4 u. 3) ou monter au bon mètre pour le green, à 8 u.
- **À plusieurs** : plusieurs balles sur le même tapis : celle qui est montée tôt rattrape et percute celle qui est montée tard, et les deux s'envolent ailleurs que prévu.
- **Lignes** : sûre, la petite piste (1), l'îlot de sable (2), le pont (3), putt (4) ; risquée, le green directement depuis la grande piste (2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (la table « mètre d'embarquement → portée » est à mesurer).
- **Plan** : tapis de 3 de large (12 u/s²), pelouses de 5 à côté ; tremplins de 3 × 3 à 15° ; fossé de 3 ; îlot de 3 × 3 ; green de 7 × 7.

```
~~~~+-----+~~~
~~~~|  O  |~~~   green
~~~~+-----+~~~
~~~~~~|:|~~~~~   îlot de sable et pont
#####^^^######   tremplin
#    ^^^     #
#    ^^^     #   grande piste
#::::::::::::#   fossé de sable
#####^^^######
# T  ^^^     #   petite piste
##############
```

### 30. L'Aiguillage

- **Vedette / soutiens** : tapis (`wind` fin) ; `sand`.
- **Pitch** : un large tapis emporte tout vers le nord et se divise deux fois. On choisit sa file au départ, puis on est passager.
- **Actes** : 1) première pointe : gauche ou droite. 2) seconde pointe, sur la branche de droite : encore. 3) les sorties : au milieu, la pelouse du trou ; à droite, un bac à sable et sa pièce ; à gauche, un tapis de retour qui ramène devant la première pointe, pour une seconde chance.
- **À plusieurs** : le tapis est une foule en marche. Côte à côte, on se pousse de l'autre côté de la ligne juste avant la pointe : la queue de poisson est le coup du trou.
- **Lignes** : sûre, viser large à droite, puis recentrer depuis le sable (1, 2), putt (3) ; risquée, la bande étroite qui mène à la sortie du milieu (1), putt (2) ; ou la pièce de droite (3 − 1).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : B (le tapis de retour ne doit pas faire de boucle sans fin : il finit sur un sol fixe).
- **Plan** : tapis de 6 × 14 (4 u/s²) ; pointes à 5 et 10 u ; green de 8 × 6.

```
################
#      O    :$:#
#  ##  ^  # ^  #
#  v   ^ /\ ^  #   seconde pointe
#  v   ^^^^^^  #
#  v  /\^^^^^  #   première pointe
#  v>  ^^^^^^  #   tapis de retour
#       T      #
################
```

### 31. Le Fronton

- **Vedette / soutiens** : `bumper` (deux murs) ; aucun.
- **Pitch** : de la pelote. Un mur bumper renvoie la balle droit devant lui à 9 u/s, quelle que soit la force du tir, et elle roule alors exactement 12 u. Ce qui compte, c'est le point du mur qu'on vise.
- **Actes** : 1) le grand fronton, au nord : le retour finit dans une cour large. On apprend la règle des 12 u. 2) le petit fronton, à l'est, se joue depuis la cour : son retour vise un enclos ouvert d'un seul côté, à 12 u du mur, où est le trou. 3) l'enclos : 2 × 2, on y entre par le fronton ou pas du tout.
- **À plusieurs** : les retours croisent les allers à pleine vitesse, et toutes les balles reviennent mourir sur les mêmes lignes : c'est là qu'on se cogne, et qu'on se fait rentrer.
- **Lignes** : sûre, le grand fronton (1), se placer face à l'enclos (2), putt (3) ; risquée, le petit fronton droit dans l'enclos (2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : B (renvoi d'un bumper et effacement de la vitesse de côté lus dans `world.go`, `kick` et `sideScrub`). Les deux frontons ne se font jamais face.
- **Plan** : 16 × 20 ; grand fronton de 10 u au nord ; petit fronton de 6 u à l'est ; enclos fermé au nord, au sud et à l'ouest.

```
#BBBBBBBBBBBB###
#              #
#              B
#  # O         B   enclos, ouvert à l'est
#  ###         B
#       cour   #
#   T          #
################
```

### 32. Le Videur

- **Vedette / soutiens** : `bumper` ; `hazard`.
- **Pitch** : le trou est au fond d'une île, derrière un gros bumper planté devant lui comme un videur. Le toucher, c'est être jeté à 12 u.
- **Actes** : 1) le physionomiste : un petit bumper sur la pelouse de départ, large, sans eau : le toucher ne coûte que du terrain. 2) le pont, 3 u de large : un bumper collé à la rambarde ouest laisse 2 u de passage, et de l'eau. 3) le videur, rayon 1, à 2 u devant le trou, dans le coin nord-est de l'île : on le contourne et on rentre par la bande du fond.
- **À plusieurs** : la file d'attente devant la boîte. Les balles se garent autour du videur ; la moindre poussette envoie quelqu'un contre lui, et il le renvoie à travers tous les autres.
- **Lignes** : sûre, le pied du pont (1), le pont (2), le côté du videur (3), la bande du fond et dedans (4) ; risquée, pont et contournement d'un seul tir (2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B. Trois bumpers dans un même trou : aucun n'est dans l'axe d'un autre (le physionomiste est à l'ouest, le videur à l'est du pont), et 2 u de sable au pied et au débouché du pont arrêtent une balle renvoyée. À prouver : aucun aller-retour entre deux bumpers.
- **Plan** : pelouse de 10 × 8 ; pont de 3 × 10 ; île de 10 × 10, mur au nord et à l'est ; `checkpoint` à l'entrée de l'île.

```
~############~
~         O #~
~        B  #~   le videur
~           #~
~~~~~|::|~~~~~
~~~~~|B |~~~~~   pont
~~~~~|::|~~~~~
~#          #~
~# B        #~   le physionomiste
~#    T     #~
~############~
```

### 33. Sens Interdit

- **Vedette / soutiens** : `speedpad` ; `sand`.
- **Pitch** : des pads barrent le fairway, chevrons pointés vers vous. Toucher un chevron, c'est repartir en arrière à 8 u/s. Aucune pénalité : seulement le trajet de la honte.
- **Actes** : 1) une rangée, des passages de 2,5 u : on comprend. 2) deux rangées décalées, passages de 1,5 u, une bande calme de 3 u entre elles. 3) la dernière rangée cache un ami : un seul pad pointe vers l'avant, entre deux qui refoulent ; lui, il envoie sur le green.
- **À plusieurs** : les refoulés redescendent le couloir à contresens dans ceux qui montent, et peuvent vous pousser sur un pad au passage.
- **Lignes** : sûre, de bande calme en bande calme (1, 2, 3), putt (4) ; risquée, la diagonale qui enfile deux rangées (1), puis le pad ami (2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : A (un refoulé doit s'arrêter avant de retrouver un pad : 8 u/s, c'est 10 u de roulement, et du sable au pied du mur sud).
- **Plan** : couloir de 10 × 30 ; rangées à 8, 14, 18 et 23 u ; le pad ami est à 8 u/s ; green de 10 × 7 fini par 1,5 u de sable, pour qu'aucun rebond sur le mur du fond ne revienne sur lui.

```
############
#     O    #
#vvvv^vvvvv#   le pad ami
#          #
#vvvvvvv vv#
#          #
#vvvv vvvvv#
#          #
#vv  vvv  v#   première rangée
#:::T::::::#
############
```

### 34. Le Viaduc

- **Vedette / soutiens** : pentes (un viaduc, des chutes) ; `sand`.
- **Pitch** : deux routes vers le même green. En haut, un viaduc sans rambarde, large de 1,6 u. En bas, une route large qui serpente entre des bacs à sable. Tomber du viaduc ne coûte rien : on continue en bas.
- **Actes** : 1) le viaduc tout droit, 10 u : on apprend sa largeur. 2) le pont coupé : une brèche de 2 u que seul un tir rapide franchit, grâce à une petite lèvre ; en bas, à cet endroit, une rampe permet de remonter. 3) le plongeon : le viaduc s'arrête 3 u avant le trou.
- **À plusieurs** : sur le viaduc on se bouscule, et le perdant change de route sans pénalité. En bas, il pleut des balles sur ceux qui marchent.
- **Lignes** : sûre, l'escalier du départ puis la route (1, 2, 3), putt (4) ; risquée, tout le viaduc, brèche comprise (1, 2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (une passerelle au-dessus d'un sol jouable ; le saut de la brèche).
- **Plan** : 10 × 30 ; viaduc à 2,5 de haut ; route de 4 de large, trois virages ; green de 10 × 6.

```
##########
#   O    #   green
#   |    #
# ::|  /-#
#      / #   pont coupé ; rampe pour remonter
# /-|-/ :#
# | |    #
# \-T    #   départ en haut, escalier vers la route
##########
```

(`|` : le viaduc, en haut ; `/` `-` : la route, en bas.)

### 35. Course de Haies

- **Vedette / soutiens** : `jumppad` ; `hazard`.
- **Pitch** : un couloir de 8 u, des haies, un jumppad collé devant chacune. Assez vite, on saute ; trop mou, on tape la haie et on recule.
- **Actes** : 1) une haie basse (0,3 u) : même mal partie, la balle passe. 2) la rivière : une haie de 0,5 u suivie de 2 u d'eau, comme au steeple. 3) le double : deux haies à 3 u d'écart ; il faut retomber entre les deux avec assez d'élan pour le second pad.
- **À plusieurs** : un 110 mètres haies : tout le monde saute de front, on se touche en l'air, et ceux qui butent repartent en arrière dans les suivants.
- **Lignes** : sûre, un obstacle par coup (1, 2, 3), putt (4) ; risquée, enchaîner deux obstacles d'un tir (1, 2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B. Sorti du banc de touche : le pad est maintenant collé au muret ; une balle trop lente tape le muret et ressort du pad en arrière, au lieu d'y rebondir sur place. À prouver.
- **Plan** : 8 × 32 ; pads de 8 × 0,6, vitesse 6 (1 u de haut, 0,67 s de vol) ; green de 8 × 7.

```
##########
#   O    #
#--------#
#JJJJJJJJ#
#--------#   le double
#JJJJJJJJ#
#~~~~~~~~#
#--------#   la rivière
#JJJJJJJJ#
#--------#   haie basse
#JJJJJJJJ#
#   T    #
##########
```

### 36. Les Étages

- **Vedette / soutiens** : `jumppad` ; aucun.
- **Pitch** : quatre niveaux en marches de 1,5 u, le trou sur le toit. Au pied de chaque mur, un jumppad puissant. Il faut y entrer doucement : trop vite, on tape le mur avant d'être assez haut.
- **Actes** : 1) premier mur : un pad sur toute la largeur, impossible à manquer. 2) deuxième mur : le pad ne fait plus que 3 u, et l'étage est plus court. 3) troisième mur : deux petits pads de 1,2 u, et le toit n'a pas de rebord à l'arrière.
- **À plusieurs** : les balles surgissent d'en dessous dans celles qui attendent, et celle qu'on pousse au bord retombe d'un étage, sans pénalité. Le toit est petit : on s'y déloge.
- **Lignes** : sûre, un étage par coup (1, 2, 3), putt (4) ; risquée, retomber sur un étage avec juste l'élan pour le pad suivant : deux étages d'un tir (1, 2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B (fenêtre de vitesse d'entrée calculée : 1,5 à 8 u/s pour un pad de vitesse 11 à 1,5 u du mur).
- **Plan** : 8 de large ; sol de 8 × 7, étages de 8 × 7, 8 × 5 et toit de 8 × 6 ; chaque niveau est un bloc plein.

```
##########
#   O    #   toit (4,5)
#########
#  JJ JJ #
#        #   deuxième étage (3)
#########
#  JJJ   #
#        #   premier étage (1,5)
#########
#JJJJJJJJ#
#   T    #   sol (0)
##########
```

### 37. Les Ricochets

- **Vedette / soutiens** : `jumppad` ; `hazard`.
- **Pitch** : des plaques à ressort flottent sur un étang. Une balle qui retombe sur une plaque repart aussitôt : elle ricoche comme un galet. La vitesse d'élan fixe la longueur du bond ; il faut celle qui tombe sur la plaque suivante.
- **Actes** : 1) un seul ricochet, sur une grande plaque, jusqu'à un banc de sable : on apprend. 2) deux grandes plaques de suite : le rythme doit tenir deux bonds. 3) ou quatre petites, avec une pièce sur la troisième.
- **À plusieurs** : on ricoche de front, et le moindre contact en l'air casse le rythme : plouf.
- **Lignes** : sûre, le premier ricochet (1), puis la digue qui contourne le reste de l'étang (2, 3), putt (4) ; risquée, les grandes plaques (2), putt (3) ; ou les petites et leur pièce (3 − 1).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : B (une plaque relance bien une balle qui lui tombe dessus en vol).
- **Plan** : quai de 8 × 4 ; étang de 26 u ; grandes plaques de 2,5 u tous les 5 u (élan de 7,5 u/s), petites de 1,2 u tous les 3,2 u (4,8 u/s) ; banc de sable de 8 × 3 avec un `checkpoint` ; digue de 2 à l'ouest ; green de 8 × 6.

```
##############
#      O     #
#  ~~~~~~~~~~#
#  ~~~J~~~JJ~#
#  ~~~$~~~~~~#   petites plaques | grandes plaques
#  ~~~J~~~JJ~#
#  ~~~J~~~~~~#
#::::::::::::#   banc de sable ; la digue part à l'ouest
#~~~~~~JJ~~~~#   un seul ricochet
#  JJJJJJJJJ #
#      T     #
##############
```

### 38. Feu Croisé

- **Vedette / soutiens** : `launcher`, sous la règle `gravity` 8 ; `hazard`, `sand`.
- **Pitch** : trois canons qui se répondent par-dessus une lagune. Leurs arcs se coupent au milieu, à la même hauteur, et la gravité allégée les fait durer trois secondes.
- **Actes** : 1) canon A, du quai vers la plate-forme du nord-est : seul dans le ciel, on apprend. 2) canon B, du sud-est vers le nord-ouest : son arc coupe celui de A. 3) canon C, du nord-ouest vers le green du sud : il recoupe l'arc de A, et part de là où B arrive.
- **À plusieurs** : les joueurs en sont à des étapes différentes : les balles d'un canon croisent en l'air celles des deux autres. Qui se touche tombe : sur le banc de sable du milieu si la chance s'en mêle, dans la lagune sinon.
- **Lignes** : sûre, un canon par coup (1, 2, 3), putt (4) ; risquée, un quatrième canon, au bout d'une planche étroite sur le quai, tire droit sur le green à travers les arcs (1), putt (2).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : B (le client lit la gravité du trou pour dessiner les arcs ; à voir).
- **Plan** : 26 × 26 ; plates-formes de sable de 5 × 5 à l'arrivée de chaque canon, reliées au canon suivant par une allée à rambardes ; banc de sable de 3 × 3 sous le croisement, avec un gué vers le green ; un `checkpoint` par plate-forme.

```
~+--+~~~~~~~~~~~+--+~
~|:C|~~~~~~~~~~~|::|~   arrivée de B et canon C | arrivée de A
~+--+~~~\~~~/~~~|  |~
~~~~~~~~~~::~~~~|  |~   banc de sable, sous les croisements
~~~~~~~/~~~~~\~~|  |~
~+---+~~+--+~~~~|  |~
~|T C|~~| O|~~~~|C |~   quai et canon A | green | canon B
~+---+~~+--+~~~~+--+~
```

### 39. La Correspondance

- **Vedette / soutiens** : `teleport` (trois couleurs) ; `sand`.
- **Pitch** : quatre salles sans porte, reliées par trois portails en enfilade : chaque sortie fait face au portail suivant. La vitesse est gardée : avec assez d'élan on enchaîne ; sinon on attend sur le quai.
- **Actes** : 1) violet : 6 u de quai jusqu'au suivant, tout droit. 2) rose : le quai fait 9 u et passe entre deux bacs à sable. 3) indigo : la sortie fait face au trou, mais en biais ; trop d'élan et l'on finit dans le sable du fond.
- **À plusieurs** : chaque balle qui sort d'un portail pousse celle qui attendait sur le quai : droit dans le portail suivant (correspondance offerte), ou hors de la ligne.
- **Lignes** : sûre, une salle par coup (1, 2, 3), putt (4) ; risquée, le train direct : enchaîner deux portails, ou les trois, d'un seul tir (2 ou 3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : A (téléporteur avec `turn` de la démo).
- **Plan** : quatre salles de 10 × 10 en carré ; sable de 1,5 derrière le trou.

```
#######################
#   * > > > @#:  O    #
#  ::     :: #   ^    #   salle 3 (rose → indigo) | salle 4
#            #   *    #
#######################
#     @      #   @    #
#            #   ^    #   salle 1 (départ) | salle 2 (violet → rose)
#     T      #   *    #
#######################
```

### 40. La Fronde

- **Vedette / soutiens** : `magnet` (aimants forts posés sur du sable) ; `sand`.
- **Pitch** : des « planètes » : un rond de sable au centre d'un aimant fort. Passez à la bonne distance et la trajectoire se courbe, comme une sonde autour d'une planète. Trop près, on est capturé : posé sur le sable, il faut la moitié de la puissance pour repartir.
- **Actes** : 1) une planète, un mur : la fronde contourne le bout du mur ; sinon deux lignes droites. 2) deux planètes en S : la seconde renvoie dans l'autre sens, autour d'un second mur. 3) le trou, dans l'ombre de la dernière planète : on peut s'en servir pour finir, ou la subir.
- **À plusieurs** : les capturés s'entassent sur un rond de 0,7 u ; le suivant les éjecte en orbite. Les frondes réussies arrivent toutes par le même côté.
- **Lignes** : sûre, des lignes droites autour des murs (1, 2, 3), putt (4) ; risquée, une fronde par mur (1, 2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : C. Le validateur n'accepte un aimant fort hors du trou que parce que son centre est sur du sable ; sa raison d'être (« une balle tourne sans fin ») reste à démentir en jouant.
- **Plan** : plateau de 16 × 30 ; murs de 10 u ; aimants de rayon 3,5 à 8 u/s² ; ronds de sable de rayon 0,7.

```
################
#   O   (  )   #
#       ( :)   #   troisième planète
#  ##########  #
#         (  ) #
#         ( :) #   deuxième planète
#  ##########  #
# (  )         #
# ( :)         #   première planète
#    T         #
################
```

### 41. La Pie Voleuse

- **Vedette / soutiens** : `magnet` (des répulseurs) ; `sand`.
- **Pitch** : un fairway sans histoire, en coude. Mais trois pièces brillent, chacune au centre d'un répulseur. Pour en voler une il faut foncer droit sur le centre : de travers, on est recraché dans la gouttière de sable.
- **Actes** : 1) première pièce : répulseur faible (−6), sur la ligne ou presque. 2) deuxième pièce : plus fort (−9), à l'écart, juste avant le coude. 3) troisième pièce : le plus fort (−12), collé au green : en sortant on peut finir au trou, ou très loin.
- **À plusieurs** : les recrachés traversent le fairway dans les prudents ; deux pies sur la même pièce se percutent dans le champ.
- **Lignes** : sûre, l'axe, trois coups et un putt (4) ; risquée, chaque pièce volée sur une ligne qui continue vers le trou est gratuite (4 − 1, − 2, − 3) ; ratée, elle coûte un coup.
- **Par** : 4 · **Construction** : facile · **Pari moteur** : A (répulseur de démo). Seul trou à plusieurs pièces : c'est son sujet.
- **Plan** : 12 × 30 en L ; répulseurs de rayon 2 ; il faut 6 à 8 u/s au bord pour atteindre un centre ; gouttières de sable de 1,5.

```
######################
#:        ( $ )   O :#
#:  ( $ )           :#
#:      ##############
#:      #
#:( $ ) #
#:      #
#:   T  #
#########
```

### 42. Le Coffre-Fort

- **Vedette / soutiens** : `key` ; `teleport` (deux couleurs).
- **Pitch** : la clé est dans un coffre de 4 × 4 sans porte. Un portail y entre, un autre en sort, et la porte du green attend dehors.
- **Actes** : 1) trouver l'entrée : le portail violet, au fond de la pelouse. 2) le coffre : la clé est dans un coin, le portail de sortie dans l'autre ; mal rebondir, c'est ressortir sans la clé. 3) la sortie : le portail rose recrache face à la porte ; avec la clé on la traverse sur son élan.
- **À plusieurs** : une balle entre dans le coffre toutes les quelques secondes et bouscule celles qui y sont : on se fait éjecter par la sortie avant d'avoir la clé, et il faut refaire le tour.
- **Lignes** : sûre, entrer (1), la clé (2), sortir et passer la porte (3), putt (4) ; risquée, entrer avec la bande qui passe par la clé puis par la sortie, d'un seul tir (1), putt (2 ou 3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : A.
- **Plan** : pelouse de 14 × 10 ; coffre muré au nord-ouest ; porte de 2 u ; green de 6 × 6 à l'est.

```
######################
#K   @#        ‖     #
#  *  #  * >   ‖  O  #
#######        ‖     #
#   @                #
#        T     #######
################
```

### 43. La Trappe

- **Vedette / soutiens** : `key` (deux portes posées à plat) ; aucun.
- **Pitch** : le trou est à la cave, deux niveaux plus bas. Dans le sol, une trappe de la couleur d'une clé : sans la clé c'est un sol, on roule dessus ; avec la clé on passe à travers.
- **Actes** : 1) la terrasse : la clé bleue est au fond, la trappe bleue au milieu ; on lui roule dessus à l'aller, on y tombe au retour. 2) l'entresol : même jeu en plus serré, clé vermillon derrière un poteau, trappe vermillon dans un coin. 3) la cave : on tombe à 2 u du trou.
- **À plusieurs** : ceux qui vont chercher une clé roulent sur la trappe, ceux qui reviennent y disparaissent, parfois au milieu d'un choc. Aux étages du dessous, il pleut des balles.
- **Lignes** : sûre, clé bleue (1), trappe (2), clé vermillon (3), trappe (4), putt (5) ; risquée, une clé et sa trappe d'un seul tir, par la bande du fond (4), ou les deux fois (3).
- **Par** : 5, `maxStrokes` 12 · **Construction** : moyen · **Pari moteur** : B (`contact.go` ignore toute porte, sol compris, pour une balle qui a la clé ; jamais joué). Sous chaque trappe il y a du sol jouable, jamais de l'eau.
- **Plan** : terrasse de 8 × 18 à 4 de haut ; entresol de 8 × 12 à 2 ; cave de 8 × 8 ; trappes de 2,5 × 2,5.

```
##########
#   K    #
#        #
#  +--+  #
#  |//|  #   trappe bleue ; dessous, l'entresol, puis la cave
#  +--+  #
#        #
#   T    #
##########
```

### 44. L'Évasion

- **Vedette / soutiens** : `key` ; `jumppad`, `hazard`.
- **Pitch** : on commence enfermé. Le départ est dans une cellule de 6 × 6 ; le trou est de l'autre côté du mur sud.
- **Actes** : 1) la cellule : la clé est dans un coin, derrière un poteau ; la porte est au nord. 2) la cour : par la porte, il faut faire tout le tour de la cellule. 3) la douve : devant le green, 1,5 u d'eau, un pont étroit ; ou, depuis la cellule, le petit jumppad du coin qui saute le mur sud et la douve.
- **À plusieurs** : le seul trou où l'on converge au départ : dès le premier tir la cellule est une mêlée de ricochets, pendant qu'on essaie d'aligner une clé puis une porte.
- **Lignes** : sûre, la clé (1), la porte (2), le tour (3), putt (4) ; risquée, s'aligner (1), le pad et le saut du mur (2), putt (3) ; trop court, la douve.
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : A.
- **Plan** : cellule de 6 × 6 ; cour de 4 de large tout autour ; pad de 0,8 × 0,8, vitesse 6 ; green de 14 × 5.

```
################
#              #
#   ###‖‖###   #
#   #K o   #   #
#   #   T  #   #
#   #J     #   #
#   ########   #
#   ~~~~~~~~   #
#       O      #
################
```

### 45. Le Donjon

- **Vedette / soutiens** : `key` (les deux couleurs) ; aucun.
- **Pitch** : trois enceintes emboîtées. On choisit son sens à chaque tour.
- **Actes** : 1) la basse-cour : la clé bleue est à l'opposé du départ, sa porte juste à côté du départ : un tour complet. 2) la seconde enceinte, plus étroite : même jeu avec la clé vermillon. 3) le donjon : 6 × 6, le trou au milieu.
- **À plusieurs** : les uns tournent à gauche, les autres à droite : on se croise de face à mi-parcours, deux fois. Le trou-feuilleton du pool.
- **Lignes** : sûre, coin par coin (5) ; risquée, deux coins d'un tir par les pans coupés à 45° (4).
- **Par** : 5, `maxStrokes` 12 · **Construction** : moyen · **Pari moteur** : A.
- **Plan** : 22 × 22 ; basse-cour de 4 de large, seconde enceinte de 3 ; coins à pans coupés.

```
######################
#         K          #
#  ################  #
#  #      K       #  #
#  #  ##########  #  #
#  #  #   O    #  #  #
#  #  ####‖‖####  #  #
#  #              #  #
#  #######‖‖#######  #
#         T          #
######################
```

### 46. La Boule de Démolition

- **Vedette / soutiens** : `motion` (balancier) ; `hazard`.
- **Pitch** : un long pont, des boules de démolition qui le balaient en travers.
- **Actes** : 1) une boule lente (4,5 s) sur un tronçon large, à rambardes : elle bouscule, elle ne jette personne à l'eau. 2) deux boules déphasées sur 3 u de large, sans rambarde ; un abri entre les deux. 3) la dernière boule balance dans l'axe du pont : elle vient à votre rencontre.
- **À plusieurs** : tout le monde attend le même battement et part en salve ; la boule cueille les retardataires et les jette à l'eau, parfois à travers un abri bondé.
- **Lignes** : sûre, d'abri en abri (1, 2, 3), putt (4) ; risquée, deux boules d'un tir (1, 2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : A (balancier de démo).
- **Plan** : quai de 6 × 4 ; pont de 24 u ; abris de 2 × 2 ; boules de 1,2 pendues à 4 u ; green de 8 × 6, hors de portée de la dernière boule.

```
~~########~~
~~#  O   #~~
~~~~|[]|~~~~   boule dans l'axe
~~~~|  |#~~~   abri
~[==|==|]~~~
~~~#|  |~~~~   abri
~~[=|==|=]~~
~~#      #~~
~~#[====]#~~   boule lente, rambardes
~~~~# T#~~~~
```

### 47. La Porte Tambour

- **Vedette / soutiens** : `motion` (rotation) ; aucun.
- **Pitch** : une porte tambour à quatre battants tourne dans sa cage. On entre dans un quartier, le battant vous emmène, et on ressort par la première ouverture venue : devant, ou derrière.
- **Actes** : 1) première porte, lente (10 s). 2) le hall, entre les deux. 3) seconde porte, plus rapide (6 s), qui tourne dans l'autre sens.
- **À plusieurs** : la porte ramasse tout le monde, mélange, et recrache les uns devant et les autres derrière. Dans un même quartier, on se bouscule pour la sortie.
- **Lignes** : sûre, entrer dans le bon quartier et se laisser porter, deux fois (1, 2, 3), putt (4) ; risquée, traverser une porte d'un trait quand deux battants s'alignent sur l'axe (1, 2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : C. Il faut qu'une balle poussée par un battant sorte en moins d'un tour, toujours. À prouver avant tout le reste.
- **Plan** : couloir de 4 × 34 ; cages de 7 × 7 à pans coupés ; battants de 3,2 u ; ouvertures de 2,4 u ; green de 8 × 6.

```
##########
#   O    #
###    ###
# \  |  / #
# ---o--- #   seconde porte
# /  |  \ #
###    ###
#        #   hall
###    ###
# ---o--- #   première porte
###    ###
#   T    #
##########
```

### 48. Les Taupes

- **Vedette / soutiens** : `motion` (des pistons) ; aucun.
- **Pitch** : des taupes rayées sortent du sol et y rentrent. Baissée, on lui roule dessus ; levée, c'est un poteau. Et celle qui sort sous une balle l'envoie promener.
- **Actes** : 1) l'allée : une rangée de six taupes qui se lèvent l'une après l'autre : l'ouverture se promène de gauche à droite. 2) le grand cercle, quatre taupes lentes à 3,5 u du trou. 3) le petit cercle, huit taupes rapides à 2 u du trou.
- **À plusieurs** : les balles posées près du trou se font soulever et éparpiller les unes dans les autres ; une taupe peut aussi vous pousser dedans.
- **Lignes** : sûre, passer l'allée (1), s'arrêter entre les deux cercles (2), putt quand la ligne est libre (3) ; risquée, l'allée et les deux cercles d'un seul tir (1 ou 2).
- **Par** : 3 · **Construction** : moyen (dix-huit mouvements à déphaser) · **Pari moteur** : A (pistons de démo).
- **Plan** : allée de 8 × 10 ; green de 10 × 10 ; taupes de rayon 0,45 ; périodes de 2 à 4 s.

```
############
#   o  o   #
# o  o   o #
#  o  O  o #   les deux cercles
# o  o   o #
#   o  o   #
##        ##
 # oooooo #    l'allée
 #   T    #
 ##########
```

### 49. Le Goulot

- **Vedette / soutiens** : `wall` (des entonnoirs de murs) ; aucun.
- **Pitch** : des murs en entonnoir se resserrent jusqu'à une fente à peine plus large qu'une balle. Bien centré, on passe ; sinon on reste dans l'entonnoir, avec les autres.
- **Actes** : 1) première fente, 1 u : généreuse. 2) l'antichambre : 5 u pour se replacer, et la seconde fente est décalée. 3) seconde fente, 0,6 u, le trou 3 u derrière.
- **À plusieurs** : l'embouteillage est le jeu. Les balles s'entassent devant la fente ; chaque tir dans le tas en fait passer une ou deux, pas toujours la sienne, et celles qui passent roulent vers le trou.
- **Lignes** : sûre, une fente par coup (1, 2), putt (3) ; risquée, les deux fentes d'un seul tir en biais (1), putt (2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : A (un passage de 0,5 est dans le corpus de `verify`).
- **Plan** : 10 × 24 ; entonnoirs de 5 u de long ; green de 10 × 6.

```
##########
#   O    #
###### ###   seconde fente
#   /  \ #
#  /    \#
#        #   antichambre
###  #####   première fente
# /    \ #
#/      \#
#   T    #
##########
```

### 50. Les Marais Salants

- **Vedette / soutiens** : `hazard` ; aucun.
- **Pitch** : un damier de bassins séparés par des digues sans rambarde. Départ dans un coin, trou dans le coin opposé, et une dizaine de chemins possibles.
- **Actes** : 1) les premières digues, larges de 2 u. 2) le cœur du marais : elles tombent à 1,5 u, et les carrefours se croisent à angle droit. 3) la dernière digue, 1,2 u, mène au green.
- **À plusieurs** : les joueurs se répartissent sur le treillis et se retrouvent aux carrefours. Une digue ne se partage pas : on s'y pousse au bassin.
- **Lignes** : sûre, de carrefour en carrefour (1, 2, 3, 4), putt (5) ; risquée, de longues digues à pleine puissance, deux carrefours d'un coup (4) ; ou le tas de sel au bout de sa planche, pour la pièce (5 − 1).
- **Par** : 5, `maxStrokes` 12 · **Construction** : facile · **Pari moteur** : A.
- **Plan** : 24 × 24 ; quatre bassins par côté ; le bassin du coin nord-est remplacé par un green de 4 × 4.

```
+-------------------+
|~~~~ ~~~~ ~~~~  O  |
|~~~~ ~~~~ ~~~~     |
|                   |
|~~~~ ~$~~ ~~~~ ~~~~|
|~~~~ ~~~~ ~~~~ ~~~~|
|                   |
|~~~~ ~~~~ ~~~~ ~~~~|
|~~~~ ~~~~ ~~~~ ~~~~|
|                   |
|~~~~ ~~~~ ~~~~ ~~~~|
|T                  |
+-------------------+
```

### Les 25 trous de plus (51 à 75)

Même format, mêmes règles : aucun changement du moteur, pas de
sol mobile, pas de `solo`. Ce qu'ils sont, sans fard :

- **11 croisements** d'une vedette avec un soutien qu'elle n'avait pas encore (51, 52, 54, 56, 57,
  60, 61, 64, 66, 70, 71) ;
- **8 idées neuves** (55, 58, 62, 65, 67, 72, 74, 75) ;
- **5 suites** : de La Cuvette (53), du Carrefour (59) et de Tir Groupé (63), qui ont été joués et
  aimés ; d'Aller-Retour (69) et de La Trappe (68), qui ne l'ont pas encore été : ce document
  recommandait d'attendre, la décision a été de construire tout de suite ;
- **1 trou lunaire** de plus (73), qui est aussi une suite de La Cuvette.

Chaque fiche dit son origine. Si l'on doit s'arrêter avant 25, voici l'ordre où je les construirais,
du plus sûr au moins sûr ; les cinq derniers sont ceux que je couperais :

| Rang | Trou | Rang | Trou | Rang | Trou |
|---|---|---|---|---|---|
| 1 | 69. La Patte d'Oie | 10 | 54. La Régate | 19 | 74. Le Skatepark |
| 2 | 58. Le Bowling | 11 | 60. Les Cascadeurs | 20 | 75. La Grenouille |
| 3 | 63. L'Archipel | 12 | 59. Le Rond-Point | 21 | 52. La Cible |
| 4 | 68. Pile ou Face | 13 | 61. La Corde à Sauter | 22 | 66. Le Saut Quantique |
| 5 | 72. Le Chasse-Neige | 14 | 73. Les Cratères | 23 | 70. Le Vigile |
| 6 | 57. Le Ring | 15 | 64. La Douane Volante | 24 | 67. Le Chant des Sirènes |
| 7 | 62. Les Geysers | 16 | 53. Le Sablier | 25 | 56. Le Grand Magasin |
| 8 | 55. Le Tapis à Bagages | 17 | 51. Triple Axel |  |  |
| 9 | 65. La Fontaine | 18 | 71. Les Moulins |  |  |

### 51. Triple Axel

- **Vedette / soutiens** : `ice` ; `jumppad`, `sand`.
- **Pitch** : une patinoire coupée par trois murets, un jumppad devant chacun. Sur la glace on ne s'arrête pas : il faut que la glissade passe par les pads.
- **Actes** : 1) premier muret : le pad fait toute la largeur ; n'importe quelle glissade saute. 2) deuxième muret : le pad ne couvre que la moitié gauche ; à droite on rebondit sur le muret. 3) troisième muret : un pad de 2 u, tout à droite ; il faut une bande, ou s'arrêter dans un banc de sable pour repartir dans l'axe.
- **À plusieurs** : on glisse et on saute en formation ; celui qui tape un muret repart en arrière dans les suivants, et la maison d'arrivée se dispute comme au curling.
- **Lignes** : sûre, un muret par coup, d'un banc de sable à l'autre (1, 2, 3), putt (4) ; risquée, une seule glissade en biais qui prend deux pads par la bande (1), le troisième (2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B (un pad sur la glace ; le petit rebond à la réception) · **Origine** : croisement glace et jumppad.
- **Plan** : patinoire de 10 × 28, congères de 0,6 ; murets de 0,5 u ; pads de vitesse 6 ; maison d'herbe de 3 × 3.

```
############
#:=+---+==:#
#:=| O |==:#   maison
#:=+---+==:#
#----------#   troisième muret
#:======JJ:#   pad de 2 u, à droite
#::=======:#   banc de sable
#----------#   deuxième muret
#:JJJJJ===:#   pad à gauche
#:=======::#   banc de sable
#----------#   premier muret
#:JJJJJJJJ:#   pad sur toute la largeur
#     T    #
############
```

### 52. La Cible

- **Vedette / soutiens** : `sand` ; `ice`.
- **Pitch** : une grande cible posée à plat : un anneau de glace, un anneau d'herbe, un anneau de sable, et le mille. Trois sols, trois façons de perdre sa vitesse : aucune, un peu, presque toute.
- **Actes** : 1) la glace : on y entre par un coin et on ne s'y arrête pas ; quatre poteaux dévient les glissades. 2) l'herbe : le seul anneau où l'on se pose pour viser. 3) le sable, puis le mille : 2 u de sable mangent 8 u/s.
- **À plusieurs** : tout le monde attend sur l'anneau d'herbe ; ceux qui déboulent de la glace les poussent dans le sable, ou les renvoient glisser. Au mille, on se fait rentrer.
- **Lignes** : sûre, la glace jusqu'à l'herbe (1), le sable jusqu'au mille (2), putt (3) ; risquée, les trois anneaux d'un seul tir dosé (1 ou 2) ; ou la pièce, de l'autre côté de l'anneau de glace : il faut en faire le tour (3 − 1).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : B (une glissade le long de l'anneau de glace doit finir dans un coin de sable en moins de 10 s) · **Origine** : croisement sable et glace.
- **Plan** : cible de 18 × 18 ; anneaux de 3 (glace, coins en sable), 2,5 (herbe) et 2 (sable) ; mille de 3 × 3 ; le sol du trou est découpé à part.

```
################
#:======$=====:#
#=            =#
#= :::::::::: =#
#= :  +--+  : =#
#= :  |O |  : =#   glace, herbe, sable, le mille
#= :  +--+  : =#
#= :::::::::: =#
#=            =#
#:============:#
#T             #
################
```

### 53. Le Sablier

- **Vedette / soutiens** : `sand` ; pentes.
- **Pitch** : un sablier couché. En haut, un entonnoir de sable à 45° : assez raide pour que la balle y coule lentement, comme un grain, jusqu'au col. En bas, un tas de sable à 30° où elle tient.
- **Actes** : 1) le haut : on tombe dans l'entonnoir et le sable vous emmène au col ; ou l'on prend le bord du verre, un chemin d'herbe en pente douce qui fait le tour. 2) le col : 1 u de large, une petite marche, et l'on se pose, sans rebond, au sommet du tas. 3) le tas : on le descend d'un putt appuyé jusqu'à l'herbe du fond, où est le trou.
- **À plusieurs** : les balles coulent ensemble vers le col et s'y bousculent une par une ; au sommet du tas, chaque arrivée tombe sur les précédentes.
- **Lignes** : sûre, le bord du verre (1, 2), putt (3) ; risquée, le sablier (1), puis du sommet du tas droit au trou (2).
- **Par** : 3 · **Construction** : moyen · **Pari moteur** : B (à 45° le sable doit laisser couler la balle, pas la retenir : `holds` donne 37° de limite) · **Origine** : suite de La Cuvette.
- **Plan** : 12 × 26, 4 u de dénivelé en tout ; entonnoir de 8 × 6 (trois faces à 45°, 2 u de haut) ; col de 1 × 2 ; tas de 8 × 6 (1,7 u de haut) ; fond d'herbe de 10 × 5 ; le chemin du bord, large de 2, descend ces 4 u en deux rampes d'herbe à 12° où la balle roule seule.

```
############
#    O     #
# /::::::\ #
#  /::::\  #   le bas : un tas de sable
#   /::\   #
####|  |####   le col
#   \::/   #
#  \::::/  #   le haut : un entonnoir de sable
# \::::::/ #
#    T     #
############
```

### 54. La Régate

- **Vedette / soutiens** : `wind` ; `ice`, `key` (les deux couleurs).
- **Pitch** : un lac gelé et un vent régulier d'ouest (1,5 u/s²). Sur la glace ce vent emporte tout ; sur l'herbe il ne déplace rien. Trois ports d'herbe, deux bouées à virer : une clé sur chacune, et les deux portes à l'entrée du port d'arrivée.
- **Actes** : 1) le près : remonter au vent jusqu'à la bouée ouest et sa clé bleue ; il faut tirer franchement, un tir mou est emporté. 2) le vent arrière : traverser tout le lac jusqu'à la bouée est et sa clé vermillon ; le vent pousse, on arrive toujours trop loin. 3) le retour au port, vent de travers, entre les deux portes.
- **À plusieurs** : des bateaux sur trois bords différents se coupent la route, et un choc sur la glace vous fait dériver jusqu'à la rive sous le vent. Les ports sont petits : on s'y déloge.
- **Lignes** : sûre, un bord par coup, de port en port (1, 2, 3), putt (4) ; risquée, les deux bouées d'une seule glissade, par une bande sur la rive (1), le port (2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B (rien ne tient sur une glace ventée, la limite est 0,33 u/s² : tout doit finir sur l'herbe, rives et ports, en quelques secondes) · **Origine** : croisement vent et glace.
- **Plan** : lac de 20 × 20 bordé de 1,5 u d'herbe ; ports de 4 × 3 ; un îlot d'herbe de 2 × 2 ; bouées de rayon 0,4 ; port d'arrivée muré, ouvert au sud.

```
######################
#       #  O   #     #
#  =====#      #==== #   port d'arrivée
#  =====##‖‖‖‖##==== #   les deux portes, l'une derrière l'autre
#  ================= #
#  ============oK=== #   bouée est, clé vermillon
#  ====[]=========== #   îlot
#  =Ko============== #   bouée ouest, clé bleue
#  ================= #
#          T         #   port de départ
######################
```

(Le vent souffle de gauche à droite sur tout le lac.)

### 55. Le Tapis à Bagages

- **Vedette / soutiens** : tapis (`wind` fin) ; `sand`.
- **Pitch** : un large tapis en U fait le tour d'une île où est le trou. Le mur de l'île a trois sorties. Pour entrer il faut traverser le tapis pendant qu'il vous emporte : on vise en amont de la sortie.
- **Actes** : 1) la traversée : depuis la pelouse, tirer en travers du tapis vers la sortie ouest, avec de l'avance. 2) raté : on tape le mur de l'île et le tapis emmène plus loin ; une écope à 45°, en aval de chaque sortie, ramasse ce qui longe le mur et le fait entrer. 3) au large du mur, rien ne vous ramasse : on fait tout le tour, jusqu'aux objets trouvés.
- **À plusieurs** : un carrousel plein de balles : on se fait pousser vers le mur (et entrer), ou vers le large (et partir pour le grand tour). On descend rarement où l'on voulait.
- **Lignes** : sûre, viser le mur de l'île et se laisser ramasser par l'écope suivante, loin du trou (1), deux putts sur l'île (2, 3) ; risquée, la sortie nord, face au trou, en traversant au bon endroit (1), putt (2).
- **Par** : 3 · **Construction** : moyen · **Pari moteur** : B (un tapis ne plaque rien contre un mur, il pousse dans son sens : ce sont les écopes qui font entrer ; et il n'est pas une boucle, il finit sur un sol fixe, en sable) · **Origine** : idée neuve.
- **Plan** : 20 × 18 ; tapis de 5 de large, 6 u/s² (1,5 u de dérive pour une traversée à 8 u/s) ; île de 8 × 8 ; sorties de 2 u, écopes de 1 u ; objets trouvés : un bac à sable relié à l'île par une porte de derrière.

```
####################
#/ > > > > > > > >\#
#^  ####/ ######  v#
#^  #          #  v#
#^  /    O     /  v#   trois sorties, une écope en aval de chacune
#^  #          #  v#
#^  ############  v#
#^               ::#
#  T            :::#   objets trouvés
####################
```

### 56. Le Grand Magasin

- **Vedette / soutiens** : tapis (`wind` fin) ; pentes.
- **Pitch** : trois niveaux décalés et des escalators : des tapis posés sur des rampes à 25°, trop raides pour être montées autrement. À côté de chaque montée, une descente sans tapis qui ramène un étage plus bas.
- **Actes** : 1) le premier escalator est droit devant le départ : on monte, c'est tout. 2) au premier palier, l'escalator suivant est de l'autre côté, derrière la bouche de la descente. 3) au second palier, deux escalators : un large et lent, un étroit et rapide qui dépose près du trou.
- **À plusieurs** : montées et descentes se longent ; ceux qui ratent redescendent sur ceux qui montent, et les paliers sont des halls où l'on se bouscule devant la bonne bouche.
- **Lignes** : sûre, un niveau par coup (1, 2, 3), putt (4) ; risquée, sortir d'un escalator avec l'élan et l'angle qu'il faut pour entrer dans le suivant (2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (un tapis sur une pente : la poussée doit suivre la rampe ; calculé, 14 u/s² pour monter 25°) · **Origine** : croisement tapis et pentes.
- **Plan** : 12 × 30 ; niveaux à 0, 2 et 4, décalés vers le nord pour qu'aucun n'en cache un autre ; rampes de 4,3 de long ; paliers de 12 × 6 ; le toit est un bloc plein.

```
############
#    O     #   le toit (4)
#  ^^  ^   #   deux escalators : large et lent, étroit et rapide
#          #
#   vv  ^^ #   second palier (2) : la descente, puis la montée
#          #
#  ^^      #   premier escalator
#   T      #   rez-de-chaussée (0)
############
```

### 57. Le Ring

- **Vedette / soutiens** : `bumper` ; `jumppad`, `sand`.
- **Pitch** : un ring de boxe. Les quatre cordes sont des bumpers ; au pied des cordes, 2,5 u de sable où tout renvoi meurt. On entre en sautant par-dessus, et plus personne ne sort.
- **Actes** : 1) le saut : un jumppad, puis 2,5 u de sable, puis la corde ; trop mou, on retombe dans ce sable ou l'on tape la corde, qui renvoie mourir dans le même sable. 2) le tapis : du sable au bord, de l'herbe au centre ; une corde renvoie toujours à 2,4 u, on peut s'en servir pour se replacer. 3) le trou, au centre, entre quatre petits poteaux.
- **À plusieurs** : tout le monde finit dans le même carré fermé : une mêlée de billard dont personne ne peut être éjecté, puisque les cordes vous rendent.
- **Lignes** : sûre, un saut court dans le sable (1), sortie de sable vers le centre (2), putt (3) ; risquée, un saut long dosé pour mourir au centre (1), putt (2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : B (quatre bumpers face à face : le sable doit arrêter chaque renvoi, dedans comme dehors ; calculé, 9 u/s meurent en 2,4 u. Dehors, sans ce sable, une balle renvoyée repasserait sur le pad et sauterait le mur du fond) · **Origine** : croisement bumper et sable.
- **Plan** : pelouse de 16 × 6 ; pad de vitesse 7 ; 2,5 u de sable entre le pad et la corde sud ; ring de 14 × 14 ; cordes de 0,5 u de haut ; centre d'herbe de 9 × 9. Il faut 4 u/s sur le pad pour passer.

```
##################
# BBBBBBBBBBBBBB #
# B::::::::::::B #
# B::        ::B #
# B::  o  o  ::B #
# B::   O    ::B #   cordes, sable, herbe
# B::  o  o  ::B #
# B::        ::B #
# B::::::::::::B #
# BBBBBBBBBBBBBB #
# :::::::::::::: #
#  JJJJJJJJJJJJ  #   le saut
#       T        #
##################
```

### 58. Le Bowling

- **Vedette / soutiens** : `speedpad` ; `sand`.
- **Pitch** : une piste de bowling. Un pad barre toute la largeur : où qu'on le franchisse on part tout droit à 16 u/s, mais on garde sa place de côté. C'est elle qu'on vise, pas la force.
- **Actes** : 1) l'élan : se placer devant la ligne, ou la franchir en courant. 2) les quilles : dix poteaux en triangle ; deux couloirs seulement mènent à la fosse, les autres renvoient dans les gouttières. 3) la fosse : du sable, le trou au milieu, et les balles des autres, qui sont des quilles de plus.
- **À plusieurs** : chaque balle arrive comme une boule de bowling sur celles qui attendent dans la fosse : des strikes, et des balles empochées pour leur propriétaire.
- **Lignes** : sûre, se poser devant la ligne, bien en face d'un couloir (1), lancer (2), putt (3) ; risquée, franchir la ligne au bon endroit depuis le départ (1), putt (2).
- **Par** : 3 · **Construction** : facile · **Pari moteur** : A (speedpad de démo ; le sable de la fosse doit arrêter un retour avant le pad) · **Origine** : idée neuve.
- **Plan** : approche de 8 × 6 ; piste de 8 × 16, gouttières de sable de 1 u ; quilles de rayon 0,25 tous les 1,2 u ; fosse de 8 × 5.

```
##########
#::::::::#
#:::O::::#   la fosse
#::::::::#
#:o o o o#
#: o o o:#   les quilles
#:  o o :#
#:   o  :#
#:      :#
#:      :#   la piste et ses gouttières
#^^^^^^^^#   la ligne de pad
#        #
#   T    #
##########
```

### 59. Le Rond-Point

- **Vedette / soutiens** : `speedpad` ; `sand`.
- **Pitch** : un rond-point à la française, sens unique. Un pad lance chaque quart d'anneau, un ralentisseur de sable l'arrête devant chaque sortie. On entre par le sud ; le green est à la sortie nord.
- **Actes** : 1) l'entrée : s'insérer dans l'anneau, où ceux qui tournent arrivent à 10 u/s. 2) la sortie est : un cul-de-sac avec une pièce ; en ressortir, c'est se réinsérer. 3) la sortie nord : le green. La manquer, c'est un tour de plus.
- **À plusieurs** : ceux qui tournent percutent ceux qui s'insèrent, ceux qui ressortent de la pièce et ceux qui hésitent devant leur sortie. De la circulation, donc des accrochages.
- **Lignes** : sûre, un quart d'anneau par coup (1, 2), la sortie nord (3), putt (4) ; risquée, couper tout droit par la sente de 1 u qui traverse l'îlot central (1), l'approche (2), putt (3) ; ou la pièce de la sortie est (4 − 1).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (chaque quart finit par 3,5 u de sable : un pad à 10 u/s ne peut pas renvoyer une balle jusqu'au pad suivant) · **Origine** : suite du Carrefour.
- **Plan** : 22 × 22 ; anneau de 4 de large, coins à 45° ; quatre pads de vitesse 10 ; îlot central de 8 × 8 ; routes de 4 de large.

```
        #####
        # O #            sortie nord : le green
#########   #########
#  /  <  <  ::  <  \ #
#  v  +----|----+  ^ #
#  v  |    |    |  ::    $   sortie est : la pièce
#  :: |    |    |  ^ #
#  v  +----|----+  ^ #       l'îlot et sa sente
#  \  >  ::  >  >  / #
#########   #########
        # T #
        #####
```

### 60. Les Cascadeurs

- **Vedette / soutiens** : `speedpad` ; pentes, `hazard`.
- **Pitch** : trois sauts de cascadeur. Un pad large fixe la vitesse, un tremplin fait le reste : la longueur du saut est toujours la même. Ce qui change, c'est la largeur de la réception, et la place de côté qu'on avait en franchissant le pad.
- **Actes** : 1) premier saut : 3 u d'eau, une réception de 4 u de large ; il suffit d'être sur le pad. 2) deuxième saut : réception de 2,5 u, décalée à droite : il faut se replacer avant. 3) troisième saut : 5 u d'eau, 1,5 u de réception.
- **À plusieurs** : on saute en formation et l'on se retrouve à plusieurs sur des réceptions de plus en plus petites ; le dernier arrivé pousse les autres à l'eau.
- **Lignes** : sûre, un saut par coup (1, 2, 3), putt (4) ; risquée, enchaîner le deuxième et le troisième, qui sont dans le même axe (2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : B (la portée d'un pad suivi d'un tremplin : calculée à 4 et 5,5 u, à mesurer) · **Origine** : croisement speedpad et pentes.
- **Plan** : 12 × 34 ; pads de 4 u de large, à 12 puis 14 u/s ; tremplins de 2,2 u à 15° ; réceptions de 8 u de long, un muret au bout ; un `checkpoint` par réception.

```
~~~~~~+------+~~~~
~~~~~~|  O   |~~~~
~~~~~~~~+--+~~~~~~   réception de 1,5 u
~~~~~~~~~~~~~~~~~~
~~~~~~~~/^^\~~~~~~   tremplin, pad à 14 u/s
~~~~~~+------+~~~~   réception de 2,5 u, décalée
~~~~~~~~~~~~~~~~~~
~~~/^^^^\~~~~~~~~~   tremplin
~~+------+~~~~~~~~   réception de 4 u
~~~~~~~~~~~~~~~~~~
~~~/^^^^\~~~~~~~~~   tremplin, pad large à 12 u/s
~~+--T---+~~~~~~~~
```

### 61. La Corde à Sauter

- **Vedette / soutiens** : `jumppad` ; `motion`.
- **Pitch** : des cordes à sauter géantes tournent en travers du couloir. Quand la corde rase le sol, on saute par-dessus grâce au pad ; quand elle est en l'air, on passe dessous. Elle fauche ceux qui se trompent de moment.
- **Actes** : 1) une corde lente (4 s le tour), avec un couloir sans pad sur le côté pour passer dessous à son rythme. 2) une corde rapide (2,4 s), un pad sur toute la largeur : on sautera, reste à choisir quand. 3) deux cordes à 2 u d'écart qui tournent en sens contraires ; la seconde pousse vers l'avant ceux qu'elle ramasse.
- **À plusieurs** : tout le monde regarde la même corde et part ensemble ; les fauchés repartent en arrière dans ceux qui attendent.
- **Lignes** : sûre, une corde par coup (1, 2, 3), putt (4) ; risquée, deux cordes d'un tir (2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B (une barre qui tourne autour d'un axe horizontal et balaie le sol ; pour le trou, l'enveloppe retenue est une sphère, sans doute du demi-longueur de la barre : le garder à plus de 5 u de toute corde) · **Origine** : croisement jumppad et obstacle mobile.
- **Plan** : couloir de 8 × 36 ; cordes de 1,2 u de rayon ; pads de vitesse 6 ; départ à 6 u de la première corde ; green de 8 × 8, le trou à 6 u de la dernière.

```
##########
#   O    #
#        #
#(======)#
#(======)#   deux cordes, en sens contraires
#JJJJJJJJ#
#        #
#(======)#   corde rapide
#JJJJJJJJ#
#        #
#(====)  #   corde lente, couloir libre à droite
#JJJJJJ  #
#   T    #
##########
```

### 62. Les Geysers

- **Vedette / soutiens** : `jumppad` ; `hazard`.
- **Pitch** : une chaussée de 3 u au-dessus de l'eau, semée de petits jumppads ronds. En toucher un, c'est bondir 4 ou 5 u plus loin sans l'avoir voulu.
- **Actes** : 1) la chaussée est droite : trois geysers sur les bords, on passe au milieu ; un bond retombe encore sur la chaussée. 2) la chaussée fait un coude : le geyser posé juste avant envoie tout droit à l'eau. 3) la chaussée est coupée : 3 u d'eau, et un geyser au bord de la coupure. On s'en méfiait, on en a besoin.
- **À plusieurs** : des balles qui jaillissent sans prévenir et retombent sur les autres ; une poussette sur un geyser envoie un rival à l'eau, ou lui fait gagner 5 u.
- **Lignes** : sûre, le milieu de la chaussée (1), le coude (2), le geyser de la coupure (3), putt (4) ; risquée, se servir d'un geyser du premier acte pour couper le coude par-dessus l'eau (1), la coupure (2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B (une balle qui retombe sur un second geyser) · **Origine** : idée neuve.
- **Plan** : chaussée de 3 × 28 en L ; geysers de rayon 0,5, vitesse 7 (0,78 s de vol) ; green de 6 × 6 ; un `checkpoint` après le coude.

```
~~~~######~~~~~~
~~~~# O  #~~~~~~
~~~~~|  |~~~~~~~
~~~~~|J |~~~~~~~   le geyser dont on a besoin
~~~~~~~~~~~~~~~~   la coupure
~~~~~|  |~~~~~~~
~~~~~|  +-----+~
~~~~~|       J|~   le coude
~~~~~+-----+  |~
~~~~~~~~~~~|J |~
~~~~~~~~~~~| J|~   trois geysers
~~~~~~~~~~~|J |~
~~~~~~~~~~#  T #
```

### 63. L'Archipel

- **Vedette / soutiens** : `launcher` ; `sand`, `hazard`.
- **Pitch** : un réseau d'îles reliées par des canons. Sur chaque île on tombe dans le sable, toujours au même point, entre deux canons qui tirent vers deux îles différentes. Le choix se fait là : 2 u à gauche, ou 2 u à droite.
- **Actes** : 1) le départ : canon de gauche ou de droite, vers deux îles moyennes. 2) de là, vers la grande île du milieu (sûre), l'îlot à pièce (à l'ouest) ou l'îlot minuscule (à l'est). 3) le dernier tir : le green a un anneau de sable autour du trou. De la grande île on tombe à l'entrée du green ; de l'îlot minuscule, dans l'anneau, à moins de 2 u du trou.
- **À plusieurs** : un tir groupé à chaque étape, et des arcs qui se croisent d'une route à l'autre. Sur l'îlot minuscule, 2 × 2, celui qui arrive jette celui qui attend à l'eau.
- **Lignes** : sûre, par la grande île (1, 2, 3), putt (4) ; risquée, par l'îlot minuscule, dont le canon pose dans le sable au bord du trou (3 ou 4) ; ou l'îlot à pièce (4 − 1).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen (neuf arcs à régler) · **Pari moteur** : B · **Origine** : suite de Tir Groupé.
- **Plan** : 22 × 34 ; îles de sable de 5 × 5, grande île de 7 × 7, îlot de 2 × 2 ; un `checkpoint` par île ; green de 8 × 8, dont un anneau de sable de 2 u autour d'un carré d'herbe de 3 × 3 (le sol du trou, découpé à part).

```
~~~~~~~+-----+~~~~~~~
~~~~~~~|  O  |~~~~~~~   green
~~~~~~~+-----+~~~~~~~
~+--+~~~+---+~~~+-+~~
~|C$|~~~|:C:|~~~|C|~~   îlot à pièce | grande île | îlot minuscule
~+--+~~~+---+~~~+-+~~
~~~+----+~~~+----+~~~
~~~|C::C|~~~|C::C|~~~   deux îles, deux canons chacune
~~~+----+~~~+----+~~~
~~~~~~+-------+~~~~~~
~~~~~~| C T C |~~~~~~   départ : canon de gauche ou de droite
~~~~~~+-------+~~~~~~
```

### 64. La Douane Volante

- **Vedette / soutiens** : `launcher` ; `key`, `sand`.
- **Pitch** : le dernier canon tire à travers une grande porte dressée en plein vol. Avec la clé, on passe au travers. Sans elle, on s'écrase dessus et l'on tombe dans la cour de sable, en contrebas, d'où un petit canon de rattrapage renvoie au bord du green.
- **Actes** : 1) le petit canon : il tire par-dessus la cour jusqu'à la terrasse d'en face ; rien à déclarer. 2) la clé : elle est au bout d'un quai étroit, à droite de la terrasse ; le grand canon est à gauche. 3) la douane.
- **À plusieurs** : les pressés s'écrasent sur la porte devant tout le monde et tombent sur ceux qui peinent dans le sable. Sur la terrasse, on se bouscule entre le quai et le canon.
- **Lignes** : sûre, le petit canon (1), la clé (2), le grand canon (3), putt (4) ; risquée, la clé puis, par la bande du bout du quai, le grand canon d'un seul tir (2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (une porte loin du sol : le moteur ignore toute porte pour qui a la clé, quelle que soit sa place ; jamais joué) · **Origine** : croisement canon et clé.
- **Plan** : 16 × 30 ; terrasses à 2 de haut ; cour de sable de 16 × 10 en bas, à ciel ouvert ; porte de 4 × 3, à 2 u au-dessus de la cour ; canon de rattrapage au fond de la cour.

```
################
#      O       #   green, en haut
#:C::::::::::::#   canon de rattrapage, dans la cour de sable, en bas
#    ::[‖‖‖‖]::#   la douane : une porte en plein vol
#    ::::::::::#
#  C         K #   terrasse : grand canon, quai de la clé
#::::::::::::::#   cour de sable, en bas
#      C       #
#      T       #
################
```

### 65. La Fontaine

- **Vedette / soutiens** : `teleport` ; pentes, `sand`.
- **Pitch** : un portail au milieu d'un bassin, et sa sortie juste au-dessus de la pointe d'une pyramide. Un portail change la place de la balle, pas sa direction : elle retombe sur la face qui correspond au sens dans lequel elle est entrée, et la dévale.
- **Actes** : 1) le bassin : le portail est au centre d'un carré de quatre poteaux ; on y entre facilement par l'est ou l'ouest, plus difficilement vers le nord, entre deux poteaux serrés. 2) le jet : la balle jaillit au sommet et choisit sa face. 3) les quartiers : la face nord mène au green ; l'est et l'ouest à des pelouses d'où il faut contourner un muret ; la sud ramène vers le bassin, dans le sable.
- **À plusieurs** : une fontaine de balles : elles jaillissent toutes du même point et dévalent dans quatre directions, sur ceux qui attendent en bas. Et tout le monde converge d'abord vers le même portail.
- **Lignes** : sûre, entrer par le côté (1), contourner le muret (2), putt (3) ; risquée, entrer plein nord entre les deux poteaux (1), putt (2).
- **Par** : 3 · **Construction** : moyen · **Pari moteur** : B (une sortie au-dessus d'une pointe : de quel côté tombe une balle presque sans vitesse ; et 3 u de sable au pied de la face sud, pour qu'aucune balle ne redescende de la pyramide jusque dans le portail) · **Origine** : idée neuve.
- **Plan** : bassin de 12 × 10 ; portail de rayon 0,7, poteaux à 1,2 u ; pyramide de 8 × 8, 2 u de haut (27°) ; green de 8 × 6 au nord, sable derrière le trou ; pelouses de côté de 4 × 8.

```
################
#  #   O    #  #   le green ; pelouses de côté derrière des murets
#  #        #  #
#     /^^\     #
#    <  * >    #   la pyramide ; la sortie est au-dessus de sa pointe
#     \vv/     #
#::::::::::::::#   sable
#     o  o     #
#      @       #   le portail, entre quatre poteaux
#     o  o     #
#      T       #
################
```

### 66. Le Saut Quantique

- **Vedette / soutiens** : `teleport` (deux couleurs) ; `jumppad`, `hazard` (le vide).
- **Pitch** : un jumppad lance la balle dans un portail suspendu au-dessus du vide. Elle ressort ailleurs en gardant sa vitesse, et finit son saut là-bas : un saut en deux morceaux. La vitesse d'élan, que le pad ne touche pas, décide où il finit.
- **Actes** : 1) un grand portail, à 3 u du pad : presque tout élan passe dedans. 2) un petit portail, à 5 u : il faut 7 à 9 u/s. 3) sa sortie est tournée d'un quart de tour : le saut finit de côté, sur un green en long.
- **À plusieurs** : des balles surgissent de nulle part au-dessus d'une île et tombent sur celles qui visent. Deux balles dans le même portail ressortent l'une sur l'autre.
- **Lignes** : sûre, le grand portail (1), la passerelle étroite qui contourne le second vide (2, 3), putt (4) ; risquée, le petit portail (2), putt (3).
- **Par** : 4, `maxStrokes` 10 · **Construction** : moyen · **Pari moteur** : C. Un portail en altitude n'est permis qu'au-dessus du vide (aucun sol dessous) et n'a jamais été vu dessiné ; sa sortie, elle, doit être au-dessus d'un sol.
- **Origine** : croisement téléporteur et jumppad.
- **Plan** : îles de 8 × 6 ; pads de vitesse 8 (1,8 u de haut) ; portails de rayon 1,2 puis 0,6, à 1,5 u de haut ; passerelle de 1,2 × 12 ; green de 12 × 4 ; un `checkpoint` par île.

```
~~~~~~~~~~~~~~~~~~
~+------------+~~~
~|  O      *  |~~~   green en long ; sortie tournée d'un quart
~+------------+~~~
~~~~~~~~~~~~@~~~~~   petit portail, en l'air
~~+--JJ--+~~~~~~~~
~~|  *   |~~~~~~~~   deuxième île
~~+------+~~~~~~~~
~~~~~@~~~~~~~~~~~~   grand portail, en l'air
~~+--JJ--+~~~~~~~~
~~|  T   |~~~~~~~~
```

### 67. Le Chant des Sirènes

- **Vedette / soutiens** : `magnet` (des aimants faibles) ; `hazard`.
- **Pitch** : des sirènes au bord du fairway : un aimant faible autour d'un écueil, un petit trou d'eau. Il ne déplace pas une balle posée, mais il courbe tout ce qui roule : plus on passe lentement, plus on dérive.
- **Actes** : 1) une sirène, à gauche : la ligne droite dérive d'un bon mètre ; on vise à droite. 2) deux sirènes en quinconce : une courbe à gauche, puis une à droite. 3) le green est entre deux sirènes : le putt aussi dérive.
- **À plusieurs** : les balles posées près d'un écueil sont à une poussette de l'eau. Le fairway est large, mais tout le monde suit la même courbe.
- **Lignes** : sûre, le long du mur opposé à chaque sirène (1, 2, 3), putt (4) ; risquée, tout droit en dosant l'avance (2), putt (3) ; ou la pièce, au bord d'un écueil (4 − 1).
- **Par** : 4, `maxStrokes` 10 · **Construction** : facile · **Pari moteur** : B (un aimant de 2 u/s², sous le frottement, est permis partout ; l'effet doit se voir assez pour qu'on le lise) · **Origine** : idée neuve.
- **Plan** : fairway de 12 × 30 ; aimants de rayon 3,5, jamais deux qui se recouvrent ; écueils de rayon 0,6.

```
##############
#  (~)  O (~)#   le green, entre deux sirènes
#            #
#        (~) #
#            #
#  (~)$      #   deux sirènes, en quinconce
#            #
#  (~)       #   une sirène
#            #
#     T      #
##############
```

### 68. Pile ou Face

- **Vedette / soutiens** : `key` (une porte debout, deux portes à plat) ; `sand`.
- **Pitch** : une clé ouvre les portes de sa couleur, toutes : celles qui sont debout, et celles qui sont posées à plat. Avec la clé on traverse la porte, et l'on passe aussi à travers la dalle. Toutes les clés ne sont pas bonnes à prendre.
- **Actes** : 1) la leçon : une clé bleue au bord du chemin, puis une dalle bleue au-dessus d'un bac à sable. Qui a pris la clé tombe dans le bac ; qui l'a évitée roule dessus. 2) le choix : avec la clé vermillon, la porte du chemin large s'ouvre, mais le pont vermillon ne vous porte plus. Sans elle, le pont tient et la porte reste fermée. 3) le green, où les deux routes se rejoignent : le pont est plus court.
- **À plusieurs** : sur la même dalle, l'un roule et l'autre disparaît. Et l'on peut pousser un rival sur une clé dont il ne voulait pas.
- **Lignes** : sûre, éviter la clé bleue (1), la clé vermillon (2), la porte (3), putt (4) ; risquée, le pont, étroit et sans rambarde (2), putt (3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (une porte à plat, comme La Trappe). Sous le pont il y a un ravin de sable d'où l'on remonte, jamais de l'eau : une balle replacée sur un sol qu'elle traverse serait perdue.
- **Origine** : suite de La Trappe, qui n'a pas encore été jouée.
- **Plan** : 16 × 28 ; dalle de 2,5 × 2,5 ; bac et ravin à 1,5 u sous le chemin, avec une rampe de sortie ; pont de 1,5 × 6 ; porte de 2 u.

```
################
#  O           #
#::::::|  ###‖‖#   le pont vermillon | la porte vermillon
#::[]::|  #    #
#::[]::|  # K  #   la clé vermillon, sur le chemin large
#::::::|       #
#      [//]    #   la dalle bleue, au-dessus d'un bac à sable
#       K      #   la clé bleue : à éviter
#       T      #
################
```

### 69. La Patte d'Oie

- **Vedette / soutiens** : `key` (les deux couleurs) ; aucun.
- **Pitch** : un carrefour à trois branches. Une clé au bout de chacune des deux premières, les deux portes sur la troisième. L'ordre est libre.
- **Actes** : 1) la branche ouest : la clé bleue derrière deux chicanes. 2) la branche est : la clé vermillon au fond d'un cul-de-sac évasé, dont le mur renvoie droit vers le carrefour. 3) la branche nord : la porte bleue, la porte vermillon, le green.
- **À plusieurs** : chacun repasse quatre fois par le carrefour, dans un ordre et un sens qui lui sont propres : on s'y percute de tous les côtés, tout le long du trou.
- **Lignes** : sûre, une branche à la fois, aller puis retour (1, 2, 3, 4), putt (5) ; risquée, prendre chaque clé et revenir au carrefour d'un seul tir, par le mur du fond (4).
- **Par** : 5, `maxStrokes` 12 · **Construction** : facile · **Pari moteur** : A · **Origine** : suite d'Aller-Retour, qui n'a pas encore été joué.
- **Plan** : carrefour de 6 × 6 ; branches de 4 × 14 ; green de 6 × 6 ; départ sur un moignon de 4 × 6 au sud.

```
        #######
        #  O  #
        # ‖‖‖ #   porte vermillon
        # ‖‖‖ #   porte bleue
#########     #########
#K  # #             \K#
#########     #########
        #  T  #
        #######
```

### 70. Le Vigile

- **Vedette / soutiens** : `key` ; `motion`.
- **Pitch** : deux vigiles font les cent pas en travers du couloir : des blocs qui glissent, et qui sont des portes. Sans la clé, ce sont des obstacles mobiles. Avec, ils n'existent plus.
- **Actes** : 1) le premier vigile, lent (6 s) : passer quand il a le dos tourné. 2) le second, rapide (3,5 s), garde la clé, tout au fond. 3) le retour, clé en poche : on traverse les deux vigiles comme des fantômes, jusqu'à la porte du green, à côté du départ.
- **À plusieurs** : ceux qui vont chercher la clé esquivent, ceux qui reviennent passent tout droit, et se garent volontiers dans le passage d'un vigile qui ne peut plus rien contre eux.
- **Lignes** : sûre, un vigile par coup (1, 2), le retour (3), putt (4) ; risquée, les deux vigiles et la clé d'un seul tir (1), le retour (2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : C. Un collider à la fois porte et mobile : le contact l'ignore pour qui a la clé (lu), mais son réveil des balles au repos n'a pas été lu. Et il aura l'air d'une porte qui glisse, pas d'un obstacle rayé jaune : il enfreint la règle « le jaune rayé, c'est ce qui bouge ».
- **Origine** : croisement clé et obstacle mobile.
- **Plan** : couloir de 8 × 24 ; vigiles de 2 × 1, à 8 et 16 u ; clé au fond ; green de 6 × 6 à l'est du départ, derrière une porte fixe.

```
############
#     K    #
#          #
#  [‖‖]    #   second vigile, rapide
#          #
#    [‖‖]  #   premier vigile, lent
#          #
#  T   ‖ O #   la porte du green, à côté du départ
############
```

### 71. Les Moulins

- **Vedette / soutiens** : `motion` (rotation, pales verticales) ; pentes.
- **Pitch** : le moulin à vent, la figure classique du minigolf, deux fois. Des pales qui tournent devant une porte : passer entre deux pales.
- **Actes** : 1) le petit moulin, à plat : une pale toutes les 1,5 s, une porte de 2 u. 2) le grand moulin, en haut d'une rampe à 10° : il faut l'élan pour monter et le bon moment ; raté, la pale renvoie et la rampe ramène en bas. 3) dans le moulin : un tunnel coudé qui ressort sur le green.
- **À plusieurs** : tout le monde vise le même intervalle entre deux pales ; les refusés redescendent la rampe dans la file d'attente.
- **Lignes** : sûre, le petit moulin (1), le pied de la rampe (2), le grand moulin (3), putt (4) ; risquée, les deux moulins d'un seul tir, quand leurs pales s'accordent (1), putt (2 ou 3).
- **Par** : 4 · **Construction** : moyen · **Pari moteur** : B (des pales dans un plan vertical : ce qu'elles font d'une balle prise dessous ; trou et départ hors de leur sphère) · **Origine** : croisement obstacle mobile et pentes.
- **Plan** : 8 × 30 ; pales de 2,5 u ; rampe de 8 × 6 ; tunnel de 2 de large avec un pan à 45° ; green de 8 × 6.

```
##########
#   O    #
#   |    #
###[+]####   le grand moulin, en haut de la rampe
#  ^^^^  #
#  ^^^^  #   la rampe
#        #
###[+]####   le petit moulin
#        #
#   T    #
##########
```

### 72. Le Chasse-Neige

- **Vedette / soutiens** : `motion` (une glissière, dans l'axe du couloir) ; aucun.
- **Pitch** : un chasse-neige large comme le couloir le descend en 12 s, en poussant tout devant lui jusqu'au départ, puis remonte. On avance pendant qu'il remonte, et l'on se cache dans les niches avant qu'il ne revienne. Aucune pénalité : on perd du terrain.
- **Actes** : 1) premier tronçon : une niche tous les 6 u, larges. 2) deuxième tronçon : une niche tous les 9 u, pour deux balles seulement. 3) le sprint : 10 u sans abri jusqu'à la sortie vers le green, sur le côté, que le chasse-neige dépasse sans y entrer.
- **À plusieurs** : tout le monde court quand il fait demi-tour. Les niches sont trop petites : le dernier arrivé en fait sortir un autre, juste devant la lame. Des chaises musicales.
- **Lignes** : sûre, de niche en niche (1, 2, 3), putt (4) ; risquée, partir dans son sillage dès le demi-tour et tout remonter en deux tirs (2), putt (3).
- **Par** : 4 · **Construction** : facile · **Pari moteur** : B (un mur qui pousse une balle pendant 10 s ; il s'arrête à 3 u du mur du départ et relâche tout là) · **Origine** : idée neuve.
- **Plan** : couloir de 8 × 30 ; lame de 6,5 u (0,75 de jeu de chaque côté), course de 22 u en 24 s ; niches de 2 × 2 ; sortie de 3 u dans le mur est, green de 8 × 6 ; départ et trou hors de sa course.

```
##############
#[======]    #####   son garage, au fond
#             O  #   la sortie, et le green à l'est
#        #########
###      #
#        ###         des niches, de chaque côté
###      #
#        #
#[======]#           il descend et pousse tout
#      ###
#        #
#   T    #
##########
```

### 73. Les Cratères

- **Vedette / soutiens** : pentes (trois cuvettes), sous la règle `gravity` 5 ; aucun.
- **Pitch** : trois cratères lunaires en enfilade, d'un mur à l'autre du couloir. Sur la Lune on y descend au ralenti, et la paroi d'en face sert de tremplin : deux secondes de vol.
- **Actes** : 1) le premier cratère : descendre, remonter en face, s'envoler. 2) le deuxième, plus petit : doser le vol pour y retomber, ou le survoler. 3) le dernier, le plus profond, avec le trou au fond : tout y descend.
- **À plusieurs** : on converge au ralenti au fond de chaque cratère, et l'on en repart en cloche les uns par-dessus les autres. Le dernier est une Cuvette en apesanteur.
- **Lignes** : sûre, un cratère par coup en roulant (1, 2), descendre dans le dernier (3), putt (4) ; risquée, s'envoler du premier par-dessus le deuxième jusque dans le dernier (1 ou 2), putt (3).
- **Par** : 4 · **Construction** : moyen (douze dalles, trois fois la même recette) · **Pari moteur** : B (avec une gravité de 5, l'herbe retient une balle jusqu'à 26° : les parois sont à 45°, pour qu'elle descende toujours) · **Origine** : règle `gravity`, et suite de La Cuvette.
- **Plan** : couloir de 8 × 36 ; cratères de 8 × 8, 5 × 5 (entre deux murs) et 8 × 8, profonds de 1,5, 1 et 2,5, toutes parois à 45° ; fonds plats de 5 × 5, 3 × 3 et 3 × 3 ; 3 u de plaine entre eux.

```
############
#+--------+#
#| \    / |#
#|  | O|  |#   troisième cratère, le plus profond
#| /    \ |#
#+--------+#
#          #
####+--+####
####|\/|####   deuxième, plus petit, entre deux murs
####+--+####
#          #
#+--------+#
#| \    / |#   premier cratère
#| /    \ |#
#+--------+#
#    T     #
############
```

### 74. Le Skatepark

- **Vedette / soutiens** : pentes (plans inclinés, quarters, funbox) ; aucun.
- **Pitch** : une place de skate. Un quarter (une rampe raide contre un mur) rend la balle comme elle est venue, un peu plus lente : c'est un mur qui dose à votre place. Le trou est sur la funbox, une butte à sommet plat.
- **Actes** : 1) le plan incliné du départ : on se lance. 2) la mini-rampe, en travers : descendre et remonter, il faut de l'élan. 3) la funbox : la grimper de face au dosage ; ou la dépasser, monter dans le quarter du fond et la reprendre au retour, à vitesse réduite.
- **À plusieurs** : une arène sans couloir : les lignes se croisent dans tous les sens, les balles rendues par les quarters reviennent sur celles qui arrivent, et le sommet de la funbox se dispute.
- **Lignes** : sûre, la mini-rampe (1), le quarter du fond et le retour sur la funbox (2), putt (3) ; risquée, le rail : un muret plat de 0,8 u de large qui mène droit au sommet (1), putt (2).
- **Par** : 3 · **Construction** : difficile (une dizaine de dalles tournées) · **Pari moteur** : B (une balle ne doit s'arrêter sur aucune pente : toutes à plus de 10°) · **Origine** : idée neuve.
- **Plan** : place de 18 × 24 ; quarters à 45° (1,5 de haut) ; mini-rampe de 18 × 5 (0,8 de creux) ; funbox de 6 × 6, sommet de 2,5 × 2,5 à 0,8, en bloc plein.

```
####################
#//////////////////#   quarter du fond
#                  #
#      +----+      #
#      | O  |======#   la funbox, et le rail qui y mène
#      +----+      #
#                  #
#\\\\\\\\\\\\\\\\\\#
#//////////////////#   la mini-rampe, en travers
#                  #
#        T         #   le plan incliné du départ
####################
```

### 75. La Grenouille

- **Vedette / soutiens** : pentes (une planche à trous) ; aucun.
- **Pitch** : le jeu de la grenouille. Une planche inclinée, percée de cinq trous : on y fait monter la balle, et elle tombe dans celui qu'on a visé, ou redescend. Sous la planche, chaque trou a son toboggan et sa sortie.
- **Actes** : 1) le bas de la planche : deux grands trous qui rendent la balle au départ ; on apprend à les contourner. 2) le haut : deux trous moyens, qui déposent sur les pelouses de côté, à un coup du trou. 3) la gueule de la grenouille : 1 u, tout en haut, au milieu ; son toboggan mène au pied du trou.
- **À plusieurs** : ça monte, ça redescend, ça se cogne ; et chaque toboggan dépose toutes les balles au même point.
- **Lignes** : sûre, un trou moyen (1), contourner le muret (2), putt (3) ; risquée, la gueule (1), putt (2).
- **Par** : 3 · **Construction** : difficile (la planche en morceaux autour de cinq trous, cinq toboggans dessous) · **Pari moteur** : B (rien ne doit s'arrêter sous la planche : tous les toboggans à plus de 10° ; une balle y est cachée une seconde) · **Origine** : idée neuve.
- **Plan** : planche de 12 × 12 à 10° (2 u de haut au fond) ; trous de 2, 1,5 et 1 u ; sorties à ciel ouvert au nord ; enclos du trou de 6 × 5.

```
################
#  #   O    #  #   enclos du trou, pelouses de côté
#  #        #  #
#==============#   le haut de la planche (2 u)
#   ()  <>  () #   trou moyen, la gueule, trou moyen
#              #
#    ()    ()  #   les deux trous du bas : retour au départ
#^^^^^^^^^^^^^^#   la planche monte
#      T       #
################
```

## 3. Prototypes : où l'on en est, et la suite

Construits et joués : **La Cuvette** (converger), **Le Carrefour** (se croiser), **Tir Groupé** (un
élément déterministe fait un point de rencontre). Verdict : bons, différents, trop courts. Leur
version longue est à la fin du document.

Les suivants, dans cet ordre, parce que chacun éprouve autre chose :

1. **La Pendule** (16) : le troisième ressort, « tirer ensemble », et le premier obstacle mobile
   qui balaie des balles au repos.
2. **Un des trois prototypes, enrichi** : pour vérifier que trois actes tiennent dans la minute.
3. **Les sept paris C, un par un**, avant de construire quoi que ce soit qui leur ressemble :
   La Porte Tambour (47), La Fronde (40), L'Œil du Cyclone (28), Courant d'Air (27), Multibille (7),
   Le Saut Quantique (66), Le Vigile (70). Si l'un tombe, son trou tombe avec lui.
4. **La Trappe** (43) : une porte posée à plat n'a jamais été vue à l'écran.

## 4. Au-delà de 75

**La réserve sans changement du moteur est vide.** Ce document annonçait 20 à 25 trous de plus :
les 25 sont écrits (51 à 75), croisements et suites compris. Un 76e trou sans rien changer serait
un décalque : les six décisions, les trois ressorts et la douzaine d'archétypes ont tous servi
plusieurs fois, et les familles plafonnées (« Les axes de variété ») sont à leur plafond. Ce qui
reste honnêtement, sans toucher au code : **les suites des trous qui auront fait rire en vrai**,
une fois les 75 joués. Pas avant.

Ce qui ouvrirait de vraies familles nouvelles, de la moins chère à la plus chère :

| Changement | Nature | Ce que ça ouvre |
|---|---|---|
| Étiquettes par trou et tirage en sac | format et serveur | rien de neuf à jouer, mais c'est ce qui fait qu'on ne ressent pas la répétition ; à 75 trous, à faire maintenant |
| Un outil qui pose des dalles et des murs le long d'une courbe (`internal/tracks` a déjà `slab` et `rail`) | outil, pas moteur | toboggans, virages relevés, vélodromes : la famille des pentes devient bon marché à écrire ; 6 à 8 trous, et les trous à dalles de ce pool (22, 74, 75) coûtent moins |
| Dessiner un vent vertical | client | le moteur accepte déjà une poussée vers le haut, le client ne dessine que la partie horizontale : geysers d'air, ascenseurs, balles en lévitation ; 4 ou 5 trous |
| Montrer un niveau caché sous un autre | client | les trous à étages empilés (43, 75) ne reposent plus sur une balle qu'on perd de vue |
| D'autres habillages pour `hazard` (lave, vide, ronces) | client | rien à jouer, mais des séries à thème et plus d'identité visuelle |
| Des zones à horloge (allumées et éteintes selon l'heure du trou, comme les obstacles) | moteur, déterministe | rafales, marée, pads qui clignotent, feux tricolores : 6 à 8 trous |
| Une balle au repos sur un sol qui bouge | moteur (repos et `Stuck`) et `verify` | bacs, ascenseurs, manèges, ponts-levis : la plus grande famille manquante, 8 à 10 trous |
| Un état partagé : un bouton qu'une balle presse pour tout le monde | contrat des effets (aujourd'hui un effet ne dépend que de la balle) | le plus riche à plusieurs : tenir la porte, couper le pont, ouvrir pour l'autre ; 8 à 10 trous |
| Des zones accrochées à un obstacle mobile | moteur | canon qui se balance, portail qui glisse ; 4 trous |

Aucun retour d'un élément retiré (boue, frein, trampoline, pouvoirs) ni du mur amortisseur que
l'équipe n'a pas voulu : rien dans cette liste n'en a besoin.

Mon ordre : les étiquettes et le sac, l'outil à dalles, le vent vertical ; puis un seul gros
chantier, choisi d'après ce que les parties auront montré : l'état partagé si « se croiser » est
le ressort qui fait le plus rire, le sol mobile si ce sont les manèges. Avec ces quatre-là, cent
trous sans remplissage sont à portée ; sans eux, non.

## 5. Où ce pool est le plus faible

Parmi les 50 premiers, à couper en premier ou à remplacer après essai :

- **L'Aiguillage** (30) : une fois la file choisie on est passager ; l'intérêt repose entièrement
  sur les bousculades avant la pointe.
- **La Planche à Clous** (19) : de la chance assumée ; drôle une fois par partie, pas deux.
- **La Luge** (23) et **Le Toboggan** (22) : plus des manèges que des trous ; le second est aussi
  le plus cher à écrire.
- **La Pie Voleuse** (41) : son équilibre (jusqu'à trois pièces) est impossible à juger sur le
  papier.
- **Course de Haies** (35) : revient du banc sur une correction non prouvée.
- **Les cinq paris C** (7, 27, 28, 40, 47) : bons trous si le moteur suit, rien sinon.

Par famille : les **speedpads** ont cinq trous vedettes, mais un pad écrase le tir et ne laisse
que quatre décisions (lequel, quand, l'éviter, ou sa place de côté en le franchissant) : elles
sont toutes prises. Le **sable** et l'**eau** sont de bons soutiens et de pauvres vedettes ; le
**vent** et le **tapis** sont le même code, et leurs neuf trous doivent leur différence au décor
et au tracé.

Et pour tout le pool : les accroches à plusieurs sont des paris tant qu'on n'a pas joué. Trois
sur soixante-quinze ont été vérifiées.

Parmi les 25 trous de plus (51 à 75), les cinq que je couperais en premier :

- **Le Grand Magasin** (56) : une fois sur l'escalator on est passager, et c'est un trou à étages
  de plus (il y en a sept).
- **Le Chant des Sirènes** (67) : un aimant faible courbe peu ; l'effet risque de ne pas se lire,
  et l'accroche à plusieurs est mince.
- **Le Vigile** (70) et **Le Saut Quantique** (66) : deux paris C de plus ; le premier enfreint
  aussi la règle des couleurs (une porte qui bouge n'est pas rayée jaune).
- **La Cible** (52) : une seule idée, le dosage à travers trois sols ; joli, court.

Et deux réserves sur l'ensemble : cinq trous sont des **suites**, dont deux d'originaux pas encore
joués (68, 69) ; et les trous où un niveau en cache un autre (43, 75, et un instant 68) reposent
sur une vue qui n'a pas été vérifiée.

## Banc de touche

Écartés, avec la raison :

- **L'Onde Verte** (un pad lance à travers trois portes synchronisées) : c'est Le Passage à Niveau
  avec un pad ; même archétype, même tracé, même décision.
- **L'Enfilade** (des chicanes dont les passages s'alignent) : même décision et même tracé que
  Sens Interdit, qui a la meilleure accroche à plusieurs.
- **La Blouse** (une table à poches où l'on empoche les autres) : Verglas fait déjà les sorties de
  balles, et cinq trous punissent déjà la poussée à l'eau.
- **Le Boomerang** (un coin de murs qui renvoie la balle) : Le Fronton fait la même chose en mieux.
- **Le Relais** (des canons qui s'enchaînent) : même point de chute commun que Tir Groupé, et
  aucune décision.
- **Le Gué** (un tapis en travers, à traverser) : Coup de Mistral, redécoré.
- **Le Passe-Muraille** (des portails comme trous dans des murs) : encore un enfilage de passages.
- **L'Échangeur** (une boucle qui se recroise par un pont) : Le Carrefour en relief ; à reprendre
  seulement si Le Carrefour enrichi en redemande.
- **Passe-Droit** (une clé facultative ouvre un raccourci) : fondu dans Aller-Retour.
- **Le Fil** (une poutre étroite en `solo`) : aucun ressort à plusieurs.
- **Le Manège** (plateau tournant) et **le tapis en boucle** : une balle n'y est jamais au repos
  et finit coincée à 30 s ; `verify` les refuse.
- **La Pendule avec le trou au pivot** : refusée par le moteur (enveloppe d'un obstacle mobile
  dans la colonne du trou).
- **Les Pas Japonais**, **Le Gruyère** (des îlots ou une pelouse trouée où l'on se pousse à l'eau) :
  de la pure nuisance, sans ligne.
- **Le Dévers** (un fairway penché à lire) : rien à plusieurs.
- **La Plage** (traverser un grand sable) : lent ; La Dune en garde l'idée utile.
- **La Galerie des Glaces** (des portails qui renvoient la balle) : `turn` fait tourner la vitesse,
  il ne la reflète pas ; ce qui reste est Le Fronton sans sa règle des 12 u.
- **Retour à la Case Départ** (des fosses dont le portail ramène au début de l'acte) : même
  décision et même sanction que Sens Interdit.
- **Le Cratère** (un canon au sommet d'une butte) : Le Puy jusqu'au sommet, Tir Groupé ensuite.
- **Saut à Ski** (une piste d'élan en glace) : la gravité fait tout ; un manège de plus.
- **Les Oasis** (des pads en réseau sur une mer de sable) : L'Archipel, moins bien.
- **Les Montagnes Russes** (une suite de bosses) : Le Saumon en relief.
- **La Balle Brossée** (un aimant qui courbe le vol d'un canon) : joli à voir, rien à décider.
- **Le Tour du Monde** (sortir par un bord, rentrer par l'autre) : une fois le tracé forcé, ce sont
  des salles reliées par des portails qu'on enchaîne à l'élan : La Correspondance.

## Enrichir les trois prototypes

Le retour : bons, mais simples et courts. Pour chacun : ce qui marche et qu'on garde tel quel, ce
qui manque, et un plan en actes avec les cotes du JSON construit (`maps/p02`, `p08`, `p09`). Rien
de ceci n'est construit ni joué ; les nombres sont calculés.

### La Cuvette : deux bassins et un déversoir (par 2 → par 3)

**Construit** : cuvette de 14 × 14 (x de −7 à 7, z de −3 à −17), rebord à 1 de haut, quatre pentes
à 14° (4 de long), fond plat de 3 × 3 centré en (0, −10), balcon de 6 × 3 (z de 0 à −3), départ
sur le balcon. **Ce qui marche** : tout converge au fond, les cadeaux, les drames. **Ce qui
manque** : un seul geste (pousser la balle par-dessus le bord), aucune décision avant le putt.

Le plan garde la cuvette **sans y toucher** et lui ajoute un premier bassin en amont :

1. **Acte 1, la soucoupe** (neuve, au sud) : un petit bassin de 9 × 9 centré en (0, 7,5), rebord à
   1,6 de haut, pentes de 2,5 de long (0,6 de dénivelé, 13,5°), fond plat de 3 × 3 à 1 de haut. Le
   départ passe sur un balcon plat de 4 × 2 collé à son rebord sud (z de 12 à 14, à 1,6 de haut),
   en (0, 1,78, 13). On y converge une première fois, sur un
   fond de 3 × 3 où l'on ne peut pas ne pas se toucher.
2. **Acte 2, le déversoir** : le rebord nord de la soucoupe a une échancrure de 2 u. Pour sortir
   il faut remonter la pente nord (5,7 u/s au fond, soit 36 % de puissance : jamais un piège) et
   viser l'échancrure ; derrière, une goulotte de 3 u descend de 1,6 à 1 et débouche sur le balcon
   actuel, dont le mur sud (z = 0) est ouvert sur 2 u. Les balles arrivent dans la grande cuvette
   une par une, par la même ligne.
3. **Acte 3, la cuvette** (construite) : deux poteaux de rayon 0,3 sur le bord nord du balcon, en
   (−1,2, −2,7) et (1,2, −2,7), font entrer les balles en biais plutôt que droit sur le trou. Une
   pièce sur le rebord nord, en (0, −16,25) : pour la prendre il faut traverser le fond et
   remonter la pente d'en face (6,5 u/s au fond), puis redescendre.

**Lignes** : sûre, le fond de la soucoupe (1), le déversoir (2), putt (3) ; risquée, traverser la
soucoupe et sortir par l'échancrure d'un seul tir (1), putt (2) ; ou la pièce (3 − 1).
**À plusieurs** : deux points de convergence au lieu d'un, et entre les deux un goulot qui met les
balles en file : la grande cuvette reçoit un tir groupé. **Taille** : 14 × 31. **À écrire** :
quatre dalles tournées de plus, sur la recette des quatre premières (angle de 0,2355 rad au lieu
de 0,245), une goulotte, deux poteaux, une zone. **À vérifier** : qu'une balle sortie de travers
par l'échancrure ne se coince pas sur le rebord.

### Le Carrefour : une seconde boucle et un pont de saut (par 3 → par 4)

**Construit** : bras sud (x de −2 à 2, z de 2 à −8), croisement en (0, −10), boucle de 12 × 14 au
nord-est, pad nord (z = −6) et pad ouest (x = 3,5) à 12 u/s, jumppad de vitesse 7 en (−1,4, −3,5),
bras ouest de 20 u, trou en (−20, −10), sable derrière. **Ce qui marche** : les deux flux qui se
coupent au croisement, le raccourci par le saut. **Ce qui manque** : après le croisement, 20 u de
ligne droite où il ne se passe rien, et un seul endroit où l'on se rencontre.

Le plan garde le bras sud, le croisement, la boucle, les deux pads et le saut, et **donne un rôle
au bras ouest** :

1. **Actes 1 et 2** (construits) : le pad nord, la boucle, le pad ouest, le croisement.
2. **Acte 3, la seconde boucle** : le trou quitte le bras ouest. Au bout du bras (x de −24 à
   −20, à la place du sable), un pad vers le nord, vitesse 12 : la balle monte un couloir de 4
   (z de −12 à −20), prend un pan coupé à 45°, revient vers l'est le long de z = −20 à −24 jusqu'à
   x = −10, prend un second pan coupé et redescend vers le sud (x de −14 à −10). Elle y arrive à
   3 ou 4 u/s (calculé : 12 u/s, deux bandes à 45° et 18 u de roulement).
3. **Acte 4, le pont de saut** : ce dernier couloir retombe sur le bras ouest par le nord. Un pad
   vers le sud, vitesse 9 (z de −15 à −14), puis un jumppad de vitesse 7 (z de −13,4 à −12,6) :
   0,78 s de vol, 7 u de portée. La balle **passe au-dessus du bras ouest et de ceux qui y
   roulent**, à 1,1 u de haut au-dessus du muret de 0,45 qui ferme le côté sud du bras, et retombe
   vers z = −6 dans une poche de 8 × 10 (x de −16 à −8, z de −8 à 2). Le trou est sur le côté, en
   (−9,5, −3), et les 3 dernières unités de la poche sont en sable.

**Lignes** : sûre, la boucle (1), le pad ouest et le bras ouest, où la balle meurt vers x = −16
(2), un putt dans le pad du bout, et tout s'enchaîne jusqu'à la poche (3), putt (4) ; risquée,
comme aujourd'hui, le saut du coin dans le bras ouest (1), le pad du bout (2), putt (3). Une porte
dérobée existe : depuis le bras ouest, tirer vers le nord dans le dernier couloir ; le pad sud
retourne la balle et elle saute dans le bon sens. **À plusieurs** : le croisement d'aujourd'hui,
plus un second où l'un des deux flux passe **par-dessus** l'autre, et une poche d'arrivée où tout
le monde retombe au même endroit (un tir groupé). Le bras ouest porte désormais ceux du deuxième
coup et ceux du troisième. Les pads y changent d'emploi : porter, se croiser, puis lancer un saut.
**Taille** : 34 × 26. **À vérifier** : la règle « aucune source d'énergie en boucle » (la poche est
fermée par le muret et le sable : une balle n'en ressort pas vers un pad) ; la portée du saut, qui
ne dépend plus de l'élan puisque le pad sud fixe la vitesse ; que le muret arrête bien un tir roulé
depuis le bras ouest.

### Tir Groupé : un second tir groupé, au bord du trou (par 3 → par 4)

**Construit** : parcours de 13 × 30 ; pelouse de départ, canon A en (0, −4,5) (1,3 s de vol,
chute vers z = −14), île de sable de 6 × 8 avec sa bande de `checkpoint`, pont de 2 × 3, green de
8 × 6 (z de −23 à −29), trou en (0, −27) ; planche de 1,2 de large, ponton et canon B en
(5,6, −13), qui pose en (−1,4, −23,4). **Ce qui marche** : tout le monde tombe au même endroit, la
planche qu'on hésite à prendre. **Ce qui manque** : le tir groupé n'arrive qu'une fois, loin du
trou, et après l'île il ne reste qu'un pont et un putt.

Le plan garde **tout ce qui est construit** et ne déplace que le trou :

1. **Acte 1** (construit) : canon A, l'île de sable, le premier carambolage, sans conséquence.
2. **Acte 2, la plate-forme** : le green actuel devient une étape. On y arrive par le pont, ou
   directement par le canon B. Le trou y laisse la place à un canon C, en (0, −27,5).
3. **Acte 3, le second tir groupé** : le canon C (1,33 s de vol, 12,7 u de portée) tire sur une
   dernière île de 8 × 8 (z de −38 à −46) : un anneau de sable autour d'un carré d'herbe de
   3 × 3 où est le trou, en (0, −44,5). Les balles tombent vers z = −40, glissent de 2,6 u dans
   le sable et s'arrêtent à moins de 2 u du trou, **toutes au même endroit** : cette fois, le
   carreau empoche. Une bande de `checkpoint` sur l'anneau.

**Lignes** : sûre, canon A (1), le pont (2), canon C (3), putt (4) ; risquée, la planche et le
canon B, qui pose déjà sur la plate-forme (1), canon C (2), putt (3). **À plusieurs** : le même
ressort deux fois, mais retourné : sur la première île se faire toucher ne change rien, sur la
dernière cela décide du trou. **Taille** : 13 × 47. **À écrire** : un canon, une île (quatre
boîtes de sable autour du sol du trou, qui doit rester le seul sol à sa hauteur sous le trou),
des zones d'eau, un `checkpoint` ; le fond d'eau ne passe pas sous le trou. **À vérifier** : la
glissade à l'arrivée (le trou doit être juste au-delà, pas dessous) ; qu'une balle poussée à
l'eau depuis la dernière île y revient bien.
