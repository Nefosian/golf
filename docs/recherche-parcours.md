# Recherche : ce qui fait un bon trou de minigolf arcade

Statut : recherche du 2026-11-22, avant de refaire le pool (une vingtaine de trous au lieu de 75).
Sources : jeux (Walkabout Mini Golf, Golf With Your Friends, Golf It!, Kirby's Dream Course, Zany
Golf, Party Golf, Super Battle Golf, What the Golf?, Super Stickman Golf…), avis Steam et critiques,
interviews de concepteurs (jeux et minigolfs réels). Reddit n'a pas pu être lu. Ce qui est marqué
*(déduit)* est une conclusion pour notre jeu, sans source directe. **On en tire des principes, on ne
recopie aucun trou d'un autre jeu.** Les citations sont des paraphrases ; les sources [6] et [9] n'ont été
lues que dans un résumé de recherche, pas sur la page.

## 1. Ce que les joueurs aiment

- **Un trou qu'on lit** : on voit le trou (ou un repère au-dessus) depuis le départ, on comprend ce
  que fera la balle. Les parcours les mieux notés de Walkabout le sont pour des tirs « précis » et
  des bandes possibles ; les moins bien notés pour des tirs « à l'aveugle » ou des rebonds qui
  semblent au hasard. [1][2]
- **Une idée par trou, développée** : « quelle est la mécanique propre à ce parcours ? » ; montrer,
  compliquer, retourner (montrer → développer → twister → abandonner). [3][4]
- **Deux lignes** : une sûre et longue, une risquée et courte ; plusieurs routes (Pirate Cove,
  Alfheim). Un raccourci **répétable**, pas un pari. [2][5][6]
- **Un grand moment par trou** : un tir à pleine puissance, un saut, un canon dont on voit l'arc.
  « Send it » (Ice Lair), les grands trous d'Ancient. [2][5]
- **Des trous faciles mêlés aux durs** : « que chacun se sente bon au golf » ; le trou le plus réussi
  en un coup de Walkabout est un trou facile, et il est aimé. [3][7][8]
- **Un sol qui aide à juger** : le damier de Kirby's Dream Course aide à lire distance et pente. [9]

## 2. Ce qui frustre (et qu'on retrouve dans nos 75 trous)

- **Des couloirs courts, plats, pleins d'obstacles et d'angles droits** : la plainte, presque mot
  pour mot, d'un joueur de Walkabout (« a million 90 degree turns », il demande des collines et de
  longs tirs). C'est le reproche fait à nos trous. [1]
- **Le hasard plutôt que le geste** : tuyaux, rochers, convoyeur qui « rend la balle imprévisible »
  (Golf With Your Friends, Forêt 18 : un joueur trouve l'astuce, l'autre fait 14). [1][2][10]
- **Ne pas voir où aller**, devoir tourner la caméra pour viser. [2][11]
- **Une erreur qui ruine le trou** : chute sans retour, balle coincée, sortie injuste. [12][13]
- **Des obstacles qui ne font que bloquer** (Haunted : beaucoup de coups, aucun plaisir). [5]
- **Un par atteignable seulement au pixel près.** [12]
- **Des trous trop longs pour le chrono.** [12][13]

## 3. Jouer tous en même temps, avec les collisions

- Jouer en même temps est le cœur du plaisir (« le chaos dans le meilleur sens ») ; le revers : on
  rate les beaux coups des autres. [11][14]
- Les collisions sont voulues pour le sabotage amical (« Step 1 : collision on »). [15][16]
- Mais le chaos doit reposer sur un tir lisible et un geste qui demande de l'adresse. [17]
- Couloirs étroits = embouteillages ; à 8, « bien trop chaotique ». [18]
- *(déduit)* **Une zone où les balles convergent** (cuvette, entonnoir, approche commune du trou),
  une seule par trou ; ailleurs, assez large pour éviter les autres si on veut.
- *(déduit)* Ne jamais laisser une collision près du trou décider seule du score.

## 4. Les règles qu'on se donne pour les ~20 trous

1. **Le trou se voit du départ** (ou un repère clair au-dessus), la caméra de départ cadre la ligne.
2. **Une vedette par trou**, présentée sans danger, puis développée ; deux soutiens au plus.
3. **La longueur reste à trancher en jouant.** La recherche pousse vers des par 2 à 3 (une minute par
   trou à plusieurs) ; l'équipe avait trouvé les trois prototypes joués « simples et courts ». Le
   pilote (par 3, 2 par la passerelle) sert à décider. Dans tous les cas : un trou en un rare mais
   possible.
4. **Deux lignes** : sûre et risquée ; le raccourci est répétable.
5. **Un grand moment** par trou (saut, canon, longue pente, tir plein pot).
6. **Une zone de convergence** pour se cogner, une seule ; ailleurs, des pistes larges (≥ 16 balles
   de large) ; aucun goulot d'une balle.
7. **Une erreur coûte un coup**, pas plus : une balle ratée revient vers le joueur, l'eau rend +1 et
   un point de reprise proche ; rien ne coince une balle.
8. **Aucun hasard** dans la ligne de score : obstacles mobiles à cycle court, visible et régulier.
9. **Courbes plutôt qu'angles droits** : virages arrondis, pentes, cuvettes.
10. **Pas de looping, pas de demi-tube** : imprévisibles pour le joueur [10] et, chez nous,
    impossibles à faire lisses avec des boîtes (voir § 5). Un saut ou un canon à l'arc visible les
    remplace.
11. **Un tirage équilibré** : chaque trou a un niveau (facile, moyen, dur, spectacle) ; une partie
    de 9 en mêle (2 faciles au début, un facile au milieu, un spectacle à la fin). Demande un
    changement du tirage au serveur.

## 5. Les pièces de parcours (mesuré dans notre moteur)

Le moteur ne connaît que des boîtes et des cylindres verticaux. Mesuré le 2026-11-22 : une balle tirée
315 fois (2 700 sur le pilote) dans une piste faite de petites boîtes, en comptant les rebonds sur le
sol après le départ (le moteur n'en fait qu'au-dessus de 1,5 u/s ; `mapcheck -sweep` les compte
maintenant) :

| Pièce | Rebonds parasites par tir | Verdict |
| --- | --- | --- |
| piste droite (une boîte, référence) | 0 | — |
| virage plat (facettes de 5°) ; pente adoucie de 0,5 u en 0,5 u (montée ou descente) | 0 | **lisse** |
| le pilote entier (plateau, chemin, passerelle, cuvette), 2 700 tirs | 0,01 | lisse (les quelques rebonds sont dans la cuvette : sans doute des atterrissages après le rebord, pas vérifié un à un) |
| virage relevé à 10°, puis à 20°, le relevé venant dans le virage (facettes de 2,5°) | 0,09 puis 0,28 | à éviter |
| virage relevé constant à 10°, la vrille faite avant, sur une ligne droite (pas de 0,25 u puis 0,1 u) | 0,70 puis 0,35 | à éviter |

Une boîte plate ne se vrille pas : tout passage du plat au relevé fait une marche à chaque jointure.
Sur les murs des virages plats, la balle touche environ 1,2 fois par tir, que les facettes fassent
10°, 5° ou 2,5° : pas de crépitement. Une pente dans un virage se vrille aussi : les pentes vont sur
les lignes droites. Virages plats, rampes, plateaux, chutes et cuvettes sont donc la boîte à outils
(`path`, `plate`, `green`, `bowl` dans `tools/maps/lib.mjs`) ; un vrai virage relevé ou un demi-tube
demanderait une nouvelle forme dans le moteur. Pas encore essayé : un virage plat bordé, côté
extérieur, d'une bande en pente (comme les pentes de la cuvette, sans vrille) ; ses deux bouts sont la
difficulté.

Proportions proposées (D = diamètre de la balle, 0,36) : piste 16 D (≈ 6 u), zone de bagarre 24 D
(≈ 9 u), passerelle risquée 6 à 8 D (≈ 2,5 u), départ ≥ 12 × 12 D, murs 1,5 à 2 D. Pour mémoire, une
piste de minigolf réelle fait ≈ 31 D de large et 300 D de long. [19]

## Sources

1. Steam, Walkabout Mini Golf : https://steamcommunity.com/app/1408230/discussions/1/4038101970208889939/
2. LowEndBox, classement des parcours de Walkabout : https://lowendbox.com/blog/lowendgaming-walkabout-mini-golf-course-tier-list-updated/
3. Don Carson (Walkabout), interview : https://developers.meta.com/horizon/blog/walkabout-mini-golf-don-carson-interview-20000-leagues/
4. Kishōtenketsu chez Nintendo : https://mcvuk.com/business-news/publishing/video-nintendos-level-design-secrets-in-four-steps/
5. TheGamer, parcours de Golf With Your Friends classés : https://www.thegamer.com/golf-with-your-friends-all-official-courses-ranked/
6. Guide Super Battle Golf (raccourci répétable) : https://steamcommunity.com/sharedfiles/filedetails/?id=3733285235
7. Mighty Coconut, cinq ans en chiffres : https://www.mightycoconut.com/blog/5-years-numbers
8. Harris Miniature Golf, erreurs de conception : https://www.harrisminigolf.com/common-mistakes-in-mini-golf-course-design-layouts/ ; Freakonomics : https://freakonomics.com/podcast/miniature-golf/
9. Kirby's Dream Course, avis : https://gamefaqs.gamespot.com/snes/588427-kirbys-dream-course/reviews/159221
10. Steam, GWYF Forêt 18 : https://steamcommunity.com/app/431240/discussions/0/3415430580678322395/
11. Gamerant, GWYF : https://gamerant.com/golf-with-your-friends-review-xbox-ps4/
12. Avis Steam négatifs GWYF : https://steamcommunity.com/app/431240/negativereviews/?browsefilter=toprated ; SuperPhillip : https://www.superphillipcentral.com/2020/05/golf-with-your-friends-nsw-ps4-xb1.html
13. Xbox Hub, GWYF : https://www.thexboxhub.com/golf-with-your-friends-review/
14. Noisy Pixel, GWYF : https://noisypixel.net/golf-with-your-friends-review-switch/
15. Steam, demande de collisions GWYF : https://steamcommunity.com/app/431240/discussions/0/412447331651804484
16. Avis Steam Golf It! : https://steamcommunity.com/app/571740/reviews/?browsefilter=toprated
17. Steam, Golf It! contre GWYF : https://steamcommunity.com/app/571740/discussions/1/2994296376468290047
18. Nintendo World Report, Party Golf : http://www.nintendoworldreport.com/review/45670/party-golf-switch-review
19. Règles WMF des pistes : https://gov.minigolfsport.com/rules/2_4.pdf
