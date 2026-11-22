# Vérification des cartes

Statut : **construit** (`tools/verify`, `internal/game/verify.go`, 2026-11-20), lancé par le
`Dockerfile` ; les deux défauts du moteur qu'il a trouvés sont corrigés (zone manquée après un
rebond ; balle écrasée par un obstacle contre un mur, désormais poussée de côté). Reste l'étape 2. Les chiffres viennent de prototypes mesurés sur ce
portable (voir « Le corpus »).

## L'idée

**Un seul outil, une seule façon de vérifier :** `go run ./tools/verify`. Il joue chaque trou comme
un joueur, avec le vrai moteur et les vraies règles, et dit pour chacun s'il est bon, et sinon
pourquoi, avec les tirs qui le montrent. Il ne dépend que de la carte et du code : le même résultat
partout où on le lance (vérifié : l'image de construction donne exactement la même physique que
ce portable).

Le `Dockerfile` le lance à chaque construction : une image ne se construit pas avec un trou refusé.
On peut aussi le lancer à la main. Rien d'autre : pas de hook, pas de mode approfondi, pas de
certificat. La même construction redessine tous les aperçus des trous.

S'il ne trouve pas comment finir un trou, un joueur non plus : le trou est refusé.

## Ce qu'il vérifie, dans l'ordre

1. **Les règles de forme** (millisecondes) : celles de `internal/physics/validate.go` (puits du trou,
   chevauchement des zones, départ et points de reprise, clés et portes, aimants…), appliquées au
   chargement de chaque carte.
2. **Le chemin** : une suite de tirs qui finit le trou dans son par. Depuis chaque position de repos,
   des tirs vers le trou, vers chaque zone, puis tout autour (72 directions, 6 forces) ; là où des
   obstacles bougent, les tirs visés sont aussi essayés après avoir attendu (une seconde d'écart au
   plus, sur toute la période des obstacles), comme un joueur qui attend qu'une porte s'ouvre. Les
   états (clés, zones « une fois » prises) jouent à tour de rôle, et on alterne la position la plus
   proche du trou et la plus éloignée de ce qui a été tenté. Budget : 200 000 tirs par trou.
3. **Les pièges** : depuis chaque position atteinte (le chemin, plus 5 000 tirs de couverture qui
   partent de l'éventail du départ), une suite de tirs qui ramène vers une position qui finit ; les
   positions où la balle a le plus de clés passent d'abord. Une position sans sortie est revérifiée
   par un éventail dense (360 × 20) ; elle n'est déclarée piège que si toutes les positions ont pu être
   regardées dans le budget (sinon le trou est refusé comme « non vérifié »).
4. **La physique** : pendant tous ces tirs, chaque image est regardée : balle dans une zone qui avait
   quelque chose à faire et n'a pas agi, centre de la balle dans un collider (fixe ou mobile, même
   quand elle était au repos), mur traversé entre deux images, vitesse ou position hors bornes, tir
   qui roule jusqu'au filet de 30 s, balle remise en place après une pénalité et de nouveau hors jeu
   moins de 2 s après (hors jeu pour toujours). Un obstacle qui envoie une balle au repos hors du
   parcours est un choix de la carte, pas une faute. Une seule occurrence refuse le trou.
5. **Les zones** : chaque zone qui agit à l'entrée doit avoir agi au moins une fois ; sinon aucune
   balle ne peut y entrer.

Les positions sont regroupées par cases de 0,5 au sol et de 5 cm en hauteur (une balle dans une fosse
n'est pas celle du bord) ; les tirs partent sur les images que joue le serveur (une sur deux).

Le rapport, par trou : bon ou refusé ; le chemin (coups, tirs) ; ce qui a été vu, où, et les tirs
exacts qui le reproduisent depuis le départ.

## Ce que le moteur garde

Le chargement des cartes ne refuse que ce qui menace le serveur : JSON strict et nombres bornés (déjà
faits), et des plafonds à ajouter (taille du fichier, nombre de colliders, d'obstacles mobiles, de
zones, longueur des noms). Le reste est le travail de l'outil.

## Mesuré

- **Aucun trou faisable refusé** : les 14 trous livrés et 8 trous difficiles faits à la main (zigzag,
  passage de 0,5, portes coulissantes, clé derrière le départ, deux clés) sont trouvés ; le plus dur en
  25 000 tirs sur 200 000.
- **Pièges** : aucun sur les trous livrés ni sur les fosses de 0,1 à 0,17 (dont on sort) ; toutes les
  fosses de 0,18 à 0,3 et la boîte au bout d'un téléporteur sont trouvées.
- **Temps** : ~8 s pour les 14 trous sur ce portable (20 cœurs) ; un trou refusé faute de chemin
  coûte le budget entier, une à deux minutes.
- **Défauts du moteur** vus sur 5 des 7 cartes JSON livrées (zone manquée après un rebond, balle qui
  rebondit 30 s sur un `jumppad`, orbites entre bumpers, obstacle qui pousse une balle à travers un
  mur) : ils se corrigent dans le moteur ; tant qu'ils ne le sont pas, l'outil refuserait ces cartes.

## Ce qui reste ouvert

- Le temps par trou (3 min) n'est pas modélisé.
- Les pièges et les défauts rares restent vus par échantillon : ce que l'outil n'a pas croisé, il ne
  le voit pas.

## L'ordre de construction

1. `tools/verify` : règles de forme, chemin, pièges, moniteurs, rapport ; testé sur le corpus. Il
   remplace `tools/check` et `internal/game/solve.go` ; le hook ne lance plus de vérification.
   Le `Dockerfile` le lance une fois l'étape 3 faite : avant, les moniteurs refuseraient 5 cartes
   livrées.
2. Les règles de forme sortent du moteur ; plafonds au chargement.
3. Les corrections du moteur, une par une (chacune acceptée quand son moniteur tombe à zéro).

## Le corpus

Les cartes fausses, les trous faisables faits à la main, les prototypes mesurés et les comparaisons
octet par octet du moteur et de la salle sont gardés hors du dépôt, dans
`../trou-normand-prototype/lean-tests/verifier-corpus/` (voir son README) : c'est le banc d'essai de
l'outil.
