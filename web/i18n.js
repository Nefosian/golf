// The words of the game, in French and in English: every text a player reads is here, as
// key: [French, English]. An entry is a string, or a function of what it says (a number, a name)
// that gives a string, or the parts of a sentence (strings and elements) when it holds a name in bold.
// The language is the one chosen on the home page, else the browser's first French or English one,
// else English.
const LANGS = ['fr', 'en'];

export let lang = (() => {
  try { const saved = localStorage.getItem('tn-lang'); if (LANGS.includes(saved)) return saved; } catch {}
  for (const l of navigator.languages ?? [navigator.language]) {
    const two = l.slice(0, 2).toLowerCase();
    if (LANGS.includes(two)) return two;
  }
  return 'en';
})();

// n and the word, which takes an s: from 2 in French, but for 1 in English
const fr = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`;
const en = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const bold = text => Object.assign(document.createElement('b'), { textContent: text });
// score: what a ball in the hole is called, the golf way, from its strokes and the par of the hole;
// beyond the names golf has, a cheer for a ball that made it at last
const score = words => (n, par) => n === 1 ? words.ace : words[Math.max(n - par, -4)] ?? words.more;

// each language by its own name, for the language menu
export const NAMES = { fr: 'Français', en: 'English' };

const W = {
  // the home
  'me.title': ['Ton joueur', 'Your player'],
  'me.name': ['Pseudo', 'Nickname'],
  'me.colors': ['Couleur de ta balle', 'Your ball color'],
  'me.color': [i => `Couleur ${i}`, i => `Color ${i}`],
  'player': [n => `Joueur ${n}`, n => `Player ${n}`],
  'play.title': ['Jouer', 'Play'],
  'create': ['Créer une salle', 'Create a room'],
  'code.label': ['Code de la salle', 'Room code'],
  'join': ['Rejoindre', 'Join'],
  'rooms.title': ['Salles publiques', 'Public rooms'],
  'rooms.empty': ['Aucune salle publique pour l’instant.', 'No public rooms right now.'],
  'rooms.playing': ['En jeu', 'Playing'],
  'rooms.lobby': ['Au salon', 'In lobby'],
  'rooms.full': ['Complète', 'Full'],
  'lang': ['Langue', 'Language'],
  'status.connecting': ['Connexion…', 'Connecting…'],
  'pc.title': ['Le jeu se joue sur ordinateur', 'This game is played on a computer'],
  'pc.text': ['P’tits Trous se joue à la souris. Ouvre ce lien sur un ordinateur pour jouer avec tes potes :', 'P’tits Trous is played with a mouse. Open this link on a computer to play with your friends:'],
  // the room
  'room': [c => `Salle ${c}`, c => `Room ${c}`],
  'room.name': ['Nom de la salle', 'Room name'],
  'room.code': ['Code', 'Code'],
  'invite': ['Copier le lien', 'Copy link'],
  'copied': ['Lien copié !', 'Link copied!'],
  'leave': ['Quitter', 'Leave'],
  'players': ['Joueurs', 'Players'],
  'players.count': [(n, max) => `Joueurs ${n}/${max}`, (n, max) => `Players ${n}/${max}`],
  'away': [' · absent', ' · away'],
  'absent': ['absent', 'away'],
  'owner': ['propriétaire', 'owner'],
  'game.title': ['La partie', 'The game'],
  'private': ['Privée', 'Private'],
  'public': ['Publique', 'Public'],
  'set.max': ['Joueurs au plus', 'Max players'],
  'less': ['Moins', 'Less'],
  'more': ['Plus', 'More'],
  'set.collisions': ['Les balles se cognent', 'Balls collide'],
  'yes': ['Oui', 'Yes'],
  'no': ['Non', 'No'],
  'set.strokes': ['Coups par trou', 'Strokes per hole'],
  'strokes.hole': ['Selon le trou', 'Hole’s own'],
  'set.countdown': ['Temps après le premier arrivé', 'Time after the first finish'],
  'set.countdown.label': ['Temps après le premier arrivé, en secondes', 'Time after the first finish, in seconds'],
  'set.limit': ['Temps par trou', 'Time per hole'],
  'set.limit.label': ['Temps par trou, en minutes', 'Time per hole, in minutes'],
  'random': ['Au hasard', 'Random'],
  'custom': ['Sur mesure', 'Custom'],
  'set.holes': ['Nombre de trous', 'Number of holes'],
  'draw.of': [(k, n) => `${k > 1 ? 'trous' : 'trou'} parmi ${n}`, (k, n) => `${k === 1 ? 'hole' : 'holes'} out of ${n}`],
  'course.drawn': [(k, n) => `${fr(k, 'trou')} tiré${k > 1 ? 's' : ''} au hasard parmi ${n}`, (k, n) => `${en(k, 'hole')} drawn at random from ${n}`],
  'course.of': [n => `Parcours de ${fr(n, 'trou')}`, n => `${n}-hole course`],
  'course.nopool': ['Aucun trou dans la réserve', 'No hole to draw from'],
  'course.none': ['Aucun trou choisi', 'No hole chosen'],
  'pick.random': ['Choisir parmi quels trous', 'Choose the holes'],
  'pick.custom': ['Composer le parcours', 'Build the course'],
  'start': ['Lancer la partie', 'Start the game'],
  'waiting': [name => `En attente de ${name}`, name => `Waiting for ${name}`],
  'waiting.game': ['En attente de la partie', 'Waiting for the game'],
  // the holes to choose
  'close': ['Fermer', 'Close'],
  'done': ['Terminé', 'Done'],
  'search': ['Chercher un trou', 'Search for a hole'],
  'all': ['Tous', 'All'],
  'none': ['Aucun', 'None'],
  'holes': [n => fr(n, 'trou'), n => en(n, 'hole')],
  'draw.title': ['Tirer au hasard parmi', 'Draw at random from'],
  'all.holes': ['Tous les trous', 'All holes'],
  'course.count': [n => `Le parcours · ${fr(n, 'trou')}`, n => `The course · ${en(n, 'hole')}`],
  'up': ['Monter', 'Move up'],
  'down': ['Descendre', 'Move down'],
  'remove': ['Retirer', 'Remove'],
  // questions
  'cancel': ['Annuler', 'Cancel'],
  'leave.ask': ['Quitter la salle ?', 'Leave the room?'],
  'leave.heir': [name => ['Tu reviens à l’accueil. La salle passe à ', bold(name), '.'], name => ['You go back to the home page. The room goes to ', bold(name), '.']],
  'leave.home': ['Tu reviens à l’accueil.', 'You go back to the home page.'],
  'leave.kept': ['Tu reviens à l’accueil. Si tu reviens avec le lien, les trous déjà joués et celui-ci comptent le maximum de coups.', 'You go back to the home page. If you come back with the link, the holes already played and this one count as the most strokes.'],
  'stay': ['Rester', 'Stay'],
  'kick': ['Exclure', 'Kick'],
  'kick.ask': [name => `Exclure ${name} ?`, name => `Kick ${name}?`],
  'kick.text': [name => [bold(name), ' quitte la salle et pourra revenir avec le lien.'], name => [bold(name), ' leaves the room and can come back with the link.']],
  // the end of a game
  'end.title': ['Fin de la partie', 'Game over'],
  'strokes': [n => fr(n, 'coup'), n => en(n, 'stroke')],
  'end.scores': ['Voir le classement', 'See the scores'],
  'player.col': ['Joueur', 'Player'],
  'total': ['Total', 'Total'],
  'end.back': ['Retour au salon', 'Back to the lobby'],
  'scores.title': [n => `Classement · ${fr(n, 'trou')}`, n => `Ranking · ${en(n, 'hole')}`],
  // during a game
  'menu': ['Menu', 'Menu'],
  'ranking.full': ['Classement complet', 'Full ranking'],
  'hud.strokes': ['Coups', 'Strokes'],
  'hud.timer': ['Fin du trou', 'Hole ends'],
  'hole': [(n, name) => `Trou ${n} · ${name}`, (n, name) => `Hole ${n} · ${name}`],
  'hole.of': [(n, of) => `Trou ${n}/${of}`, (n, of) => `Hole ${n}/${of}`],
  'hole.of.long': [(n, of) => `Trou ${n} sur ${of}`, (n, of) => `Hole ${n} of ${of}`],
  'finished': [(d, n) => `${d}/${n} ont fini`, (d, n) => `${d}/${n} done`],
  'rank': [n => n === 1 ? '1er' : n + 'e', n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')],
  'hole.rules': [(par, max) => `Par ${par} · ${fr(max, 'coup')} max`, (par, max) => `Par ${par} · ${en(max, 'stroke')} max`],
  'gravity.low': ['Gravité faible : la balle vole loin', 'Low gravity: the ball flies far'],
  'gravity.high': ['Gravité forte', 'Strong gravity'],
  'resume': ['Reprendre', 'Resume'],
  'settings': ['Réglages', 'Settings'],
  'invite.players': ['Inviter des joueurs', 'Invite players'],
  'giveup.button': ['Abandonner ce trou', 'Give up this hole'],
  'giveup.ask': ['Abandonner ce trou ?', 'Give up this hole?'],
  'giveup.text': [n => `Tu comptes ${fr(n, 'coup')} sur ce trou et ta balle reste là où elle est, en fantôme. Les autres continuent.`, n => `You score ${en(n, 'stroke')} on this hole and your ball stays where it is, as a ghost. The others play on.`],
  'giveup': ['Abandonner', 'Forfeit'],
  'leave.button': ['Quitter la salle', 'Leave the room'],
  'stop.button': ['Arrêter la partie', 'Stop the game'],
  'stop.ask': ['Arrêter la partie ?', 'Stop the game?'],
  'stop.text': [over => `Tout le monde revient au salon. ${over === 1 ? 'Le score du trou terminé est gardé, le' : over ? `Les scores des ${over} trous terminés sont gardés, le` : 'Le'} trou en cours ne compte pas.`,
    over => `Everyone goes back to the lobby. ${over === 1 ? 'The score of the finished hole is kept; the' : over ? `The scores of the ${over} finished holes are kept; the` : 'The'} hole being played does not count.`],
  'stop': ['Arrêter', 'Stop'],
  'back.menu': ['Retour au menu', 'Back to the menu'],
  'volume': ['Volume', 'Volume'],
  'sensitivity': ['Sensibilité de la caméra', 'Camera sensitivity'],
  'names': ['Noms au-dessus des balles', 'Names above the balls'],
  'fullscreen': ['Plein écran', 'Full screen'],
  'ranking': ['Classement', 'Ranking'],
  'ranking.title': [(n, of) => `Classement · trou ${n} sur ${of}`, (n, of) => `Ranking · hole ${n} of ${of}`],
  // what the server says
  'why.notfound': ['Cette salle n’existe pas, ou plus.', 'This room does not exist, or no longer does.'],
  'why.full': ['Cette salle est complète.', 'This room is full.'],
  'why.busy': ['Le serveur est plein, réessaie plus tard.', 'The server is full, try again later.'],
  'why.locked': ['Trop de codes essayés, réessaie plus tard.', 'Too many codes tried, try again later.'],
  'why.private': ['Cette salle est devenue privée.', 'This room has become private.'],
  'why.nocourse': ['Choisis au moins un trou pour lancer la partie.', 'Pick at least one hole to start the game.'],
  'left.closed': ['La salle a fermé.', 'The room has closed.'],
  'left.kicked': ['Tu as été exclu de la salle.', 'You were kicked from the room.'],
  'stopped': ['La partie a été arrêtée.', 'The game was stopped.'],
  'replaced': ['La partie continue dans un autre onglet.', 'The game goes on in another tab.'],
  // what happens to a ball
  'teleported': ['Téléporté !', 'Teleported!'],
  'score': [score({ ace: 'Trou en un !', '-4': 'Condor !', '-3': 'Albatros !', '-2': 'Eagle !', '-1': 'Birdie !', 0: 'Par !', 1: 'Bogey', 2: 'Double bogey', 3: 'Triple bogey', 4: 'Quadruple bogey', more: 'Enfin !' }),
    score({ ace: 'Hole in one!', '-4': 'Condor!', '-3': 'Albatross!', '-2': 'Eagle!', '-1': 'Birdie!', 0: 'Par!', 1: 'Bogey', 2: 'Double bogey', 3: 'Triple bogey', 4: 'Quadruple bogey', more: 'Finally!' })],
  'out': ['Hors limites ! +1', 'Out of bounds! +1'],
  'maxed': ['Plus de coups !', 'Out of strokes!'],
  'gaveup': ['Abandon !', 'Forfeit!'],
  // what a zone did to our ball, in the banner
  'speedpad': [s => `Accélérateur ${s}`, s => `Booster ${s}`],
  'jumppad': [s => `Saut ${s}`, s => `Jump ${s}`],
  'launcher': [s => `Canon ${s}`, s => `Cannon ${s}`],
  'teleport': ['Téléporteur', 'Teleporter'],
  'teleport.turn': [d => `Téléporteur, tourne de ${d}°`, d => `Teleporter, turns ${d}°`],
  'hazard': ['Danger', 'Hazard'],
  'checkpoint': ['Checkpoint', 'Checkpoint'],
  'bonus': [n => `Bonus -${fr(n, 'coup')}`, n => `Bonus -${en(n, 'stroke')}`],
  'key': [k => `Clé ${k}`, k => `Key ${k}`],
  'wind': [s => `Vent ${s}`, s => `Wind ${s}`],
  'conveyor': [s => `Tapis roulant ${s}`, s => `Conveyor ${s}`],
  'magnet': [s => `Aimant ${s}`, s => `Magnet ${s}`],
  'repeller': [s => `Répulseur ${s}`, s => `Repeller ${s}`],
};

// t is the text of key in the language, made with args when it says something
export function t(key, ...args) {
  const v = W[key][LANGS.indexOf(lang)];
  return typeof v === 'function' ? v(...args) : v;
}

// translate fills what the page itself holds: data-t is the key of an element's text, data-t-label
// of its aria-label, data-t-placeholder of its placeholder.
export function translate() {
  document.documentElement.lang = lang;
  for (const e of document.querySelectorAll('[data-t]')) e.textContent = t(e.dataset.t);
  for (const e of document.querySelectorAll('[data-t-label]')) e.setAttribute('aria-label', t(e.dataset.tLabel));
  for (const e of document.querySelectorAll('[data-t-placeholder]')) e.placeholder = t(e.dataset.tPlaceholder);
}

export function setLang(l) {
  lang = l;
  try { localStorage.setItem('tn-lang', l); } catch {}
  translate();
}
