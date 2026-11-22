# Le nouveau pool : 20 idées de trous

Statut : **construits**, troisième version (2026-11-22), `tools/maps/holes/p01` à `p20`, tous acceptés
par `tools/verify` ; à rejouer. Ils suivent
les règles de `docs/recherche-parcours.md` § 4 et ne demandent rien de nouveau au moteur : des pièces
du kit (`path`, `plate`, `green`, `bowl`, chutes) et les éléments gardés (herbe, glace, sable, eau, murs et poteaux, bumpers, accélérateurs, tremplins, canons, téléporteurs,
tapis roulants, vent, aimants et répulseurs, clé et porte, pièce, point de reprise, obstacles mobiles).
Aucune ne reprend un trou d'un autre jeu.

Chaque trou a : un **niveau** pour le tirage (F facile, M moyen, D dur, S spectacle), une **vedette**,
une **ligne sûre** et une **ligne risquée**, et un **moment à plusieurs** (là où les balles se
retrouvent). Les par sont indicatifs : la longueur se règle en jouant (question ouverte, § 4 règle 3).

| # | Nom | Par | Éléments | Meilleur | Trou en un | Sortis |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | La Passerelle | 3 | mole, moving | 2 | 0 | 3,7 % |
| 2 | Le Grand Entonnoir | 2 | strokes, bumper | 1 | 5,8 % | 31,0 % |
| 3 | Le Lacet | 3 | strokes, mole | 3 | 0 | 0,9 % |
| 4 | Les Dunes | 3 | jumppad, hazard, sand | 1 | 0,1 % | 14,3 % |
| 5 | Le Billard | 2 | strokes, bumper | 2 | 0 | 0 |
| 6 | Le Trottoir Roulant | 3 | conveyor, strokes, moving, mole | 2 | 0 | 0 |
| 7 | L'Archipel | 4 | checkpoint, jumppad, launcher, hazard | 2 | 0 | 18,0 % |
| 8 | La Patinoire | 3 | sand, ice, moving | 2 | 0 | 0 |
| 9 | L'Autoroute | 3 | speedpad, launcher, mole | 2 | 0 | 4,8 % |
| 10 | Le Col du Vent | 4 | wind, checkpoint | 3 | 0 | 5,9 % |
| 11 | L'Aimant | 3 | repeller, magnet, strokes | 1 | 1,3 % | 0 |
| 12 | Le Flipper | 3 | strokes, bumper | 1 | 0 | 0 |
| 13 | Les Portails | 3 | strokes, teleport, moving | 1 | 0 | 0 |
| 14 | La Clé des Champs | 3 | key, wind, gate, moving | 2 | 0 | 0 |
| 15 | Les Moulins | 4 | moving, mole | 2 | 0 | 0,8 % |
| 16 | Les Terrasses | 3 | jumppad, strokes, sand | 1 | 0,3 % | 1,1 % |
| 17 | La Corniche | 4 | checkpoint, mole, moving | 3 | 0 | 3,4 % |
| 18 | Le Tremplin | 3 | speedpad, sand | 2 | 0 | 0 |
| 19 | Le Canon | 3 | launcher, sand | 2 | 0 | 0 |
| 20 | Le Grand Huit | 4 | speedpad | 2 | 0 | 0 |

**Troisième version (2026-11-22, après la deuxième partie jouée)** : « des trous qui se ressemblent, pas
assez durs ni arcade, et on n'utilise presque aucun élément ». Les gardiens (anneaux de poteaux autour
du trou) sont retirés ; chaque trou a reçu un ou deux éléments de plus, sur sa ligne principale quand
c'est possible (poussoirs, barres tournantes, taupes, geysers, canons, bandes rebondissantes, vents),
des par de 2 à 4 ; L'Île est devenue L'Archipel (des îles sans route : chaussée, geyser, canon,
passerelle). Ce que fait chaque trou est dit en tête de son script (`tools/maps/holes/`) ; les
fiches ci-dessous sont celles de la première version.

« Meilleur » : le moins de coups trouvés par `tools/verify` (un joueur parfait ; une pièce compte −1).
`mapcheck -sweep` (120 directions × 19 puissances depuis le départ) : la part des tirs qui font un
trou en un, et de ceux qui sortent. Éléments : ce que le JSON du trou contient (mole : une taupe,
moving : un obstacle qui glisse ou tourne, strokes : une pièce, launcher : un canon, jumppad : un
geyser).

## Les faciles

**1. La Passerelle** (construit). Plateau de départ, trou au fond d'une cuvette en contrebas. Sûre : un
large chemin qui descend en sinuant. Risquée : une passerelle étroite sans murs au-dessus du vide (−1
coup). À plusieurs : tout le monde finit dans la cuvette.

**2. Le Grand Entonnoir.** Le départ est sur le rebord d'une très grande cuvette ; le trou au fond. On
peut tirer droit dedans (la balle tourne et descend) ou faire le tour par une piste sur le rebord pour
entrer doucement. Risquée : la pièce sur un petit balcon du rebord, à atteindre par la piste. À
plusieurs : le trou le plus « auto-tamponneuses » du pool, voulu court (par 2) pour respirer entre
deux trous durs.

**3. Le Lacet.** Une longue descente en lacets (lignes droites en pente, épingles plates), le green en
bas. Sûre : suivre les lacets, deux tirs. Risquée : à l'intérieur d'une épingle, le mur s'ouvre sur une
chute vers le lacet du dessous : on coupe un virage, si on dose. À plusieurs : les balles qui coupent
retombent devant celles qui suivent la route.

**4. Les Dunes.** Un fairway large qui ondule (bosses en pente douce), des bunkers de sable sur la
ligne directe, un green rond protégé par une lèvre de sable. Sûre : contourner par la droite, plus
long. Risquée : passer entre deux bunkers. On sort toujours du sable en un coup (règle du moteur :
6 u au plus). À plusieurs : le goulet entre les bunkers.

**5. Le Billard.** Une grande table aux coins arrondis, rien que des murs, le trou derrière un écran
courbe : on y entre par la bande. Lisible (les bandes, pas de hasard), court. Risquée : la pièce dans
une alcôve qui demande deux bandes. À plusieurs : les balles se croisent sur les rebonds.

**6. Le Trottoir Roulant.** Deux tapis roulants parallèles, l'un vers le trou, l'autre en sens inverse,
séparés par un muret bas avec des passages. Sûre : poser la balle sur le bon tapis, qui la porte.
Risquée : remonter le mauvais tapis, plus court, avec de la puissance. À plusieurs : on se croise
d'un tapis à l'autre.

## Les moyens

**7. L'Île.** Le green est une île au milieu d'un lac. Sûre : un chemin à murs qui fait le tour et
entre par un pont. Risquée : une chaussée étroite et droite à travers le lac, un point de reprise à
mi-chemin. À plusieurs : le pont, où les deux lignes se rejoignent.

**8. La Patinoire.** Un ovale de glace bordé de bandes de sable qui freinent ; le trou sur un petit
green d'herbe au bout. Sûre : longer la bande extérieure (le sable tue la vitesse). Risquée : traverser
la glace en ligne droite, au dosage exact. Jamais de glace qui finit dans l'eau. À plusieurs : sur la
glace, un choc envoie loin (et parfois au bon endroit).

**9. L'Autoroute.** Une grande boucle plate à murs ; des accélérateurs sur la voie express font faire
le tour en un coup. Sûre : la voie lente, sans pads, deux coups. Risquée : la voie express, qui finit
sur une épingle (trop vite : on rebondit dans le mur et on revient). À plusieurs : la sortie de
l'épingle.

**10. Le Col du Vent.** Une crête sans murs balayée par un vent de côté (ventilateurs visibles, traits
de vent) ; le green abrité derrière. Sûre : un chemin creusé à flanc, à murs, à l'abri. Risquée : la
crête, en visant au vent. À plusieurs : les balles déportées se retrouvent sur la même bande d'herbe.

**11. L'Aimant.** Un aimant sous le green attire vers le trou ; deux répulseurs gardent la ligne
directe et renvoient les tirs trop droits. Sûre : entrer par le côté, l'aimant fait le reste. Risquée :
passer entre les répulseurs. À plusieurs : tout converge vers le trou, on se bouscule dessus.

**12. Le Flipper.** Une arène ronde, des poteaux bumpers en losange devant le trou (qui renvoient à
vitesse fixe : lisible). Sûre : contourner par la bande. Risquée : traverser les bumpers. Règle du
moteur : jamais deux bumpers face à face à moins de 12 u d'herbe. À plusieurs : ricochets en chaîne.

**13. Les Portails.** Deux niveaux ; le trou en haut. Sûre : une rampe en lacet. Risquée : un
téléporteur au départ dont on voit la sortie (même couleur) sur un balcon près du trou, étroit. À
plusieurs : les balles qui sortent du portail tombent sur celles qui montent par la rampe.

## Les durs

**14. La Clé des Champs.** Une porte ferme le chemin court ; sa clé est sur une petite boucle à côté.
Sûre : le grand tour, sans clé. Risquée : faire le crochet par la clé (un coup de plus) pour passer la
porte (deux de moins). La clé est par balle. À plusieurs : la boucle de la clé, étroite.

**15. Les Moulins.** Une place ronde ; deux bras tournent lentement autour du trou, cycle court et
régulier (on voit quand passer). Sûre : attendre l'ouverture au bord. Risquée : passer entre les bras.
Jamais d'obstacle au départ ni dans le trou. À plusieurs : la salve, tout le monde attend la même
ouverture.

**16. Les Terrasses.** Une colline en marches : chaque terrasse finit par une chute vers la suivante ;
une rampe fait le tour sur le côté. Sûre : la rampe. Risquée : descendre de terrasse en terrasse en
s'arrêtant sur chacune (dosage). Une chute ratée retombe sur la terrasse du dessous, jamais dans le
vide. À plusieurs : les atterrissages sur les petites terrasses.

**17. La Corniche.** Des chemins sans murs, pas plus étroits que 2,5 u, le long d'une falaise au-dessus
du vide ; un point de reprise à chaque palier. Sûre : la corniche large et longue. Risquée : la
corniche étroite et courte. Un seul trou « tout ou rien » par partie : c'est lui (la recherche en
conseille un ou deux).

## Les spectacles

**18. Le Tremplin.** Le chemin finit au bord d'un ravin ; un tremplin envoie par-dessus vers un grand
green plus bas (arc visible). Sûre : la descente à pied, par un chemin. Risquée : le tremplin, le
green large pour que l'atterrissage pardonne. À plusieurs : on regarde les autres voler.

**19. Le Canon.** Départ sur une île haute ; un canon sur le côté tire vers un green flottant au loin,
qui retombe dans une cuvette. Sûre : un long chemin qui descend puis remonte. Risquée : le canon, un
coup. À plusieurs : tous les boulets tombent dans la même cuvette.

**20. Le Grand Huit.** Le trou de fin de partie : une descente express (pentes, deux accélérateurs, un
tremplin), le green en bas dans une cuvette. Sûre : freiner sur les paliers. Risquée : tout d'un trait.
À plusieurs : l'arrivée commune.

## Ce qu'il faut après

- **Le tirage par niveaux** (serveur) : chaque trou porte son niveau ; une partie de 9 suit un gabarit
  (F, F/M, M, M, D, F, M, D, S), jamais la même vedette deux fois de suite, un seul trou « tout ou
  rien ».
- **Retirer les 75 anciens trous** du tirage une fois les nouveaux construits.

