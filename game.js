/* ===================== FIREBASE ===================== */
const firebaseConfig = {
  apiKey: "AIzaSyBd5v7EObJ9IZjD96HSnEnJJ_-A9t53sQ",
  authDomain: "chess-online-friend.firebaseapp.com",
  projectId: "chess-online-friend",
  storageBucket: "chess-online-friend.firebasestorage.app",
  messagingSenderId: "423448689920",
  appId: "1:423448689920:web:50a2fb9df81ca39faac7e5",
  measurementId: "G-TYTNM5B08S"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const FV = firebase.firestore.FieldValue;
const INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/* ===================== STATE ===================== */
let myId = localStorage.getItem('cf_playerId');
if(!myId){
  myId = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem('cf_playerId', myId);
}
let myProfile = null;
let currentLang = localStorage.getItem('cf_lang') || 'ru';
let regSkill = null;
let currentRoomId = null;
let roomUnsub = null;
let invitesUnsub = null;
let reqUnsub = null;
let chatUnsub = null;
let myColorChar = 'w'; // 'w' or 'b'
let gameMode = null; // 'online' | 'ai'
let aiLevel = 'medium';
let chessGame = new Chess();
let selectedSquare = null;
let legalTargets = [];
let captureTargets = [];
let lastMove = null;
let statsCounted = false;
let friendsRefreshInterval = null;
let currentChatPartnerId = null;
let pendingAddFriendTarget = null;
let pendingPlayerAction = null;
let audioCtx = null;

/* ===================== UTILS ===================== */
function $(id){ return document.getElementById(id); }
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}
function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.add('hidden'), 2600);
}
function escapeHtml(str){
  const d = document.createElement('div'); d.textContent = str; return d.innerHTML;
}
/* ---- защита от старых/битых профилей (отсутствующие поля) ---- */
function pname(p){ return (p && (p.name || p.nickname)) ? (p.name || p.nickname) : 'Player'; }
function plogin(p){ return (p && (p.login || p.nicknameLower || p.nickname)) ? (p.login || p.nicknameLower || p.nickname).toLowerCase() : ''; }
function pskill(p){ return (p && (p.skill || p.skillLevel)) || 'beginner'; }
function pprivacy(p){ return (p && (p.privacy || p.messagePrivacy)) || 'all'; }
function normalizeProfile(raw){
  if(!raw) return null;
  return {
    login: plogin(raw),
    name: pname(raw),
    skill: pskill(raw),
    theme: raw.theme || 'dark',
    lang: raw.lang || 'ru',
    sound: raw.sound !== false,
    privacy: pprivacy(raw),
    wins: raw.wins || 0,
    losses: raw.losses || 0,
    draws: raw.draws || 0,
    friends: raw.friends || [],
    lastSeen: raw.lastSeen || 0
  };
}

/* ===================== TRANSLATIONS ===================== */
const TRANSLATIONS = {
  ru:{
    reg_login_title:"Придумай логин", reg_login_hint:"Только латинские буквы, цифры и _. От 3 до 16 символов. По нему тебя будут находить друзья.",
    reg_name_title:"Как тебя зовут?", reg_name_hint:"Это имя увидят другие игроки. Можно на любом языке.",
    reg_skill_title:"Твой уровень игры", reg_skill_hint:"Это нужно для подбора соперника и советов",
    skill_none:"Вообще не умею", skill_beginner:"Новичок", skill_intermediate:"Средний", skill_advanced:"Продвинутый",
    btn_next:"Далее", btn_back:"Назад", btn_save:"Сохранить", btn_cancel:"Отмена", btn_copy:"Копировать",
    btn_add:"Добавить", btn_accept:"Принять", btn_decline:"Отклонить", btn_resign:"Сдаться",
    btn_rematch:"Реванш", btn_to_menu:"В меню", btn_reset_profile:"Сбросить профиль",
    btn_play_friend:"Играть с другом", btn_play_ai:"Играть с ИИ",
    nav_friends:"Друзья", nav_leaders:"Лидеры", nav_learn:"Учиться", nav_settings:"Настройки",
    waiting_title:"Ждём соперника...", waiting_hint:"Отправь эту ссылку другу:",
    connecting_title:"Подключаемся к игре...",
    ai_setup_title:"Выбери сложность", ai_easy:"Лёгкая", ai_medium:"Средняя", ai_hard:"Тяжёлая",
    settings_title:"Настройки", settings_name:"Отображаемое имя", settings_theme:"Тема", settings_lang:"Язык",
    settings_sound:"Звук", settings_privacy:"Кто может мне писать", settings_share:"Поделиться профилем",
    settings_stats:"Статистика", stat_wins:"Победы", stat_losses:"Поражения", stat_draws:"Ничьи",
    privacy_all:"Все", privacy_friends:"Только друзья", privacy_nobody:"Никто",
    leaders_title:"Лидерборд", friends_title:"Друзья", tab_friends:"Друзья", tab_requests:"Заявки",
    learn_title:"Научиться играть", learn_tab_lessons:"Уроки", learn_tab_ai:"Спроси помощника",
    promo_title:"Выбери фигуру", action_write:"✉️ Написать", action_add_friend:"➕ Добавить в друзья",
    add_link_title:"Добавить в друзья?", invite_title:"Приглашение на игру",
    ph_friend_login:"логин друга", ph_message:"Сообщение...", ph_ask:"Спроси про правила...",
    you_white:"Вы играете белыми", you_black:"Вы играете чёрными",
    turn_you:"Ваш ход", turn_opp:"Ход соперника", turn_ai:"Ход ИИ",
    checkmate_win:"Мат! Вы выиграли 🎉", checkmate_lose:"Мат! Вы проиграли",
    draw_text:"Ничья", resigned_you:"Вы сдались", resigned_opp:"Соперник сдался, вы победили!",
    login_taken:"Этот логин уже занят", login_invalid:"Логин: 3-16 символов, латиница/цифры/_",
    name_invalid:"Введите имя от 2 до 20 символов", privacy_blocked:"Этот игрок запретил личные сообщения",
    already_friends:"Вы уже друзья", request_sent:"Заявка в друзья отправлена", request_accepted:"Заявка принята",
    no_friends:"Пока нет друзей", no_requests:"Нет заявок", cant_add_self:"Нельзя добавить самого себя",
    room_full:"Эта комната уже занята", invite_waiting:"Ждём, когда друг примет приглашение...",
    invite_declined:"Друг отклонил приглашение", opp_disconnected:"Соперник покинул игру",
  },
  en:{
    reg_login_title:"Choose a login", reg_login_hint:"Latin letters, digits and _ only. 3-16 characters. Friends find you by this.",
    reg_name_title:"What's your name?", reg_name_hint:"Other players will see this name. Any language is fine.",
    reg_skill_title:"Your skill level", reg_skill_hint:"Used for matchmaking and tips",
    skill_none:"Can't play at all", skill_beginner:"Beginner", skill_intermediate:"Intermediate", skill_advanced:"Advanced",
    btn_next:"Next", btn_back:"Back", btn_save:"Save", btn_cancel:"Cancel", btn_copy:"Copy",
    btn_add:"Add", btn_accept:"Accept", btn_decline:"Decline", btn_resign:"Resign",
    btn_rematch:"Rematch", btn_to_menu:"To menu", btn_reset_profile:"Reset profile",
    btn_play_friend:"Play with a friend", btn_play_ai:"Play with AI",
    nav_friends:"Friends", nav_leaders:"Leaders", nav_learn:"Learn", nav_settings:"Settings",
    waiting_title:"Waiting for opponent...", waiting_hint:"Send this link to your friend:",
    connecting_title:"Connecting to game...",
    ai_setup_title:"Choose difficulty", ai_easy:"Easy", ai_medium:"Medium", ai_hard:"Hard",
    settings_title:"Settings", settings_name:"Display name", settings_theme:"Theme", settings_lang:"Language",
    settings_sound:"Sound", settings_privacy:"Who can message me", settings_share:"Share profile",
    settings_stats:"Statistics", stat_wins:"Wins", stat_losses:"Losses", stat_draws:"Draws",
    privacy_all:"Everyone", privacy_friends:"Friends only", privacy_nobody:"Nobody",
    leaders_title:"Leaderboard", friends_title:"Friends", tab_friends:"Friends", tab_requests:"Requests",
    learn_title:"Learn to play", learn_tab_lessons:"Lessons", learn_tab_ai:"Ask the helper",
    promo_title:"Choose a piece", action_write:"✉️ Message", action_add_friend:"➕ Add friend",
    add_link_title:"Add as friend?", invite_title:"Game invitation",
    ph_friend_login:"friend's login", ph_message:"Message...", ph_ask:"Ask about the rules...",
    you_white:"You play White", you_black:"You play Black",
    turn_you:"Your move", turn_opp:"Opponent's move", turn_ai:"AI's move",
    checkmate_win:"Checkmate! You won 🎉", checkmate_lose:"Checkmate! You lost",
    draw_text:"Draw", resigned_you:"You resigned", resigned_opp:"Opponent resigned, you won!",
    login_taken:"This login is taken", login_invalid:"Login: 3-16 chars, latin/digits/_",
    name_invalid:"Enter a name 2-20 characters", privacy_blocked:"This player disabled direct messages",
    already_friends:"Already friends", request_sent:"Friend request sent", request_accepted:"Request accepted",
    no_friends:"No friends yet", no_requests:"No requests", cant_add_self:"Can't add yourself",
    room_full:"This room is already full", invite_waiting:"Waiting for friend to accept...",
    invite_declined:"Friend declined the invite", opp_disconnected:"Opponent left the game",
  }
};
function t(key){
  return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) || key;
}
function applyTranslations(){
  document.querySelectorAll('[data-t]').forEach(el=>{
    el.textContent = t(el.getAttribute('data-t'));
  });
  document.querySelectorAll('[data-tph]').forEach(el=>{
    el.placeholder = t(el.getAttribute('data-tph'));
  });
  $('langToggle').textContent = currentLang.toUpperCase();
}

/* ===================== BAD WORDS / VALIDATION ===================== */
const BAD_WORDS = ["fuck","shit","bitch","ass","nigger","porn","sex","penis","cunt","whore","retard","blyat","suka","huy","pizda","hui","ebat"];
function isLoginValid(v){
  if(!/^[A-Za-z0-9_]{3,16}$/.test(v)) return false;
  const low = v.toLowerCase();
  return !BAD_WORDS.some(w=>low.includes(w));
}
function isNameValid(v){
  return v.trim().length>=2 && v.trim().length<=20;
}

/* ===================== LEARN CONTENT ===================== */
const LEARN_CONTENT = {
  ru:[
    {title:"Цель игры", body:"Цель шахмат — поставить мат королю соперника. Мат — ситуация, когда король под атакой (шах) и нет ни одного хода, чтобы уйти от атаки."},
    {title:"Как ходят пешки", body:"Пешка ходит вперёд на одну клетку, а с начальной позиции — на одну или две. Бьёт по диагонали на одну клетку вперёд. Пешка никогда не ходит и не бьёт назад."},
    {title:"Взятие на проходе (en passant)", body:"Если пешка соперника только что пошла на 2 клетки и встала рядом с вашей пешкой, вы можете взять её так, будто она сходила на одну клетку. Сделать это можно только сразу следующим ходом."},
    {title:"Превращение пешки", body:"Когда пешка доходит до последней горизонтали (8-й для белых, 1-й для чёрных), она превращается в ферзя, ладью, слона или коня — на выбор игрока. Чаще всего выбирают ферзя."},
    {title:"Как ходит конь", body:"Конь ходит буквой «Г»: две клетки в одну сторону и одна в перпендикулярную. Конь — единственная фигура, которая может перепрыгивать через другие фигуры."},
    {title:"Как ходит слон", body:"Слон ходит по диагоналям на любое число клеток, но не может перепрыгивать через фигуры. Слон всегда остаётся на клетках одного цвета."},
    {title:"Как ходит ладья", body:"Ладья ходит по горизонтали или вертикали на любое число клеток, не может перепрыгивать через фигуры."},
    {title:"Как ходит ферзь", body:"Ферзь — самая сильная фигура. Он ходит как ладья и слон одновременно: по горизонтали, вертикали и диагонали на любое число клеток."},
    {title:"Как ходит король", body:"Король ходит на одну клетку в любом направлении. Короля нельзя подставлять под шах — такой ход запрещён правилами."},
    {title:"Рокировка", body:"Особый ход короля и ладьи одновременно. Король передвигается на 2 клетки к ладье, ладья встаёт рядом с ним с другой стороны. Условия: ни король, ни ладья ещё не ходили, между ними нет фигур, король не под шахом и не проходит через битые поля."},
    {title:"Шах, мат и пат", body:"Шах — король атакован. Мат — шах, от которого нет защиты — игра окончена. Пат — у игрока нет шаха, но и нет ни одного легального хода — это ничья."},
    {title:"Ничья", body:"Партия завершается вничью при пате, троекратном повторении позиции, правиле 50 ходов без взятий и движений пешек, или при нехватке материала для мата у обеих сторон."}
  ],
  en:[
    {title:"Goal of the game", body:"The goal of chess is to checkmate the opponent's king — a situation where the king is under attack (check) and there is no legal move to escape it."},
    {title:"How pawns move", body:"A pawn moves forward one square, or two from its starting position. It captures diagonally one square forward. Pawns never move or capture backward."},
    {title:"En passant", body:"If an opponent's pawn just moved two squares and landed beside your pawn, you may capture it as if it had moved only one square. This can only be done immediately on the next move."},
    {title:"Pawn promotion", body:"When a pawn reaches the last rank (8th for White, 1st for Black), it promotes to a queen, rook, bishop or knight — the player's choice. Queen is the most common choice."},
    {title:"How the knight moves", body:"The knight moves in an L-shape: two squares in one direction and one perpendicular. It's the only piece that can jump over other pieces."},
    {title:"How the bishop moves", body:"The bishop moves diagonally any number of squares, but cannot jump over pieces. It always stays on squares of one color."},
    {title:"How the rook moves", body:"The rook moves horizontally or vertically any number of squares, and cannot jump over pieces."},
    {title:"How the queen moves", body:"The queen is the strongest piece. It moves like a rook and bishop combined: horizontally, vertically and diagonally any number of squares."},
    {title:"How the king moves", body:"The king moves one square in any direction. The king can never move into check — such a move is illegal."},
    {title:"Castling", body:"A special move of the king and rook together. The king moves two squares toward the rook, and the rook jumps to the other side of the king. Conditions: neither piece has moved before, no pieces between them, the king isn't in check and doesn't pass through attacked squares."},
    {title:"Check, checkmate, stalemate", body:"Check — the king is attacked. Checkmate — a check with no way to escape — the game ends. Stalemate — no check, but no legal moves at all — this is a draw."},
    {title:"Draws", body:"A game is drawn by stalemate, threefold repetition, the 50-move rule, or insufficient material to deliver checkmate for both sides."}
  ]
};

const AI_TUTOR_QA = {
  ru:[
    {kw:["пешк"], a:"Пешка ходит вперёд на одну клетку (с начальной позиции можно на две), а бьёт по диагонали на одну клетку вперёд. Назад пешка никогда не ходит."},
    {kw:["конь","коня","конём"], a:"Конь ходит буквой «Г» — две клетки в одну сторону, одна в перпендикулярную. Он единственный может перепрыгивать через фигуры."},
    {kw:["слон"], a:"Слон ходит по диагонали на любое количество клеток, но не может перепрыгивать фигуры. Остаётся всегда на клетках одного цвета."},
    {kw:["ладь"], a:"Ладья ходит по горизонтали или вертикали на любое число клеток."},
    {kw:["ферз","королев"], a:"Ферзь ходит как ладья и слон вместе — по горизонтали, вертикали и диагонали на любое число клеток. Это самая сильная фигура."},
    {kw:["корол"], a:"Король ходит на одну клетку в любую сторону, но не может ходить под шах."},
    {kw:["рокиров"], a:"Рокировка — одновременный ход короля и ладьи. Король делает 2 клетки в сторону ладьи, ладья перепрыгивает на клетку рядом с королём. Условия: фигуры ещё не ходили, между ними пусто, король не под шахом и не проходит через битые поля."},
    {kw:["взятие на проходе","en passant","проход"], a:"Если пешка соперника только что пошла на 2 клетки и встала рядом с твоей пешкой — можно её взять, как будто она сходила на 1 клетку. Делается это только следующим ходом сразу."},
    {kw:["превращ","превращение","достигла","последн"], a:"Когда пешка доходит до последней горизонтали, она превращается в ферзя, ладью, слона или коня — выбираешь ты. Чаще всего выбирают ферзя, так как он сильнее всех."},
    {kw:["шах"], a:"Шах — это когда король под атакой. Нужно срочно защититься: закрыться фигурой, съесть атакующую фигуру или увести короля."},
    {kw:["мат","чекмейт"], a:"Мат — это шах, от которого нет защиты. Игра сразу заканчивается, тот, кто поставил мат — победил."},
    {kw:["пат"], a:"Пат — когда шаха нет, но у игрока вообще нет легальных ходов. Это ничья, а не поражение."},
    {kw:["ничья","ничь"], a:"Ничья бывает при пате, повторении позиции трижды, правиле 50 ходов без взятий/пешек, или если фигур не хватает для мата ни у кого."},
    {kw:["цель","выиграть","побед"], a:"Цель — поставить мат королю соперника. Как только король не может уйти от шаха — игра окончена."},
    {kw:["кто ходит перв","первый ход"], a:"Первыми всегда ходят белые."},
    {kw:["через фигур","перепрыг"], a:"Через фигуры может перепрыгивать только конь. Все остальные фигуры (кроме короля и пешки, которые ходят на 1 клетку) должны иметь свободный путь."},
  ],
  en:[
    {kw:["pawn"], a:"A pawn moves forward one square (two from the starting position), and captures diagonally one square forward. It never moves backward."},
    {kw:["knight"], a:"The knight moves in an L-shape — two squares one way, one perpendicular. It's the only piece that can jump over others."},
    {kw:["bishop"], a:"The bishop moves diagonally any distance but can't jump over pieces. It always stays on one color of square."},
    {kw:["rook"], a:"The rook moves horizontally or vertically any distance."},
    {kw:["queen"], a:"The queen moves like a rook and bishop combined — horizontally, vertically and diagonally any distance. The strongest piece."},
    {kw:["king"], a:"The king moves one square in any direction, but can never move into check."},
    {kw:["castl"], a:"Castling moves the king and rook together. The king moves 2 squares toward the rook, the rook jumps beside it. Conditions: neither piece moved before, nothing between them, king isn't in check and doesn't pass attacked squares."},
    {kw:["en passant","passant"], a:"If an opponent's pawn just moved 2 squares landing beside yours, you may capture it as if it moved 1 square. Must be done immediately on the next move."},
    {kw:["promot"], a:"When a pawn reaches the last rank, it promotes to a queen, rook, bishop or knight — your choice. Queen is most common since it's strongest."},
    {kw:["check","shah"], a:"Check means the king is under attack. You must respond: block, capture the attacker, or move the king."},
    {kw:["checkmate","mate"], a:"Checkmate is a check with no escape. The game ends immediately, the one who delivered mate wins."},
    {kw:["stalemate"], a:"Stalemate is when there's no check but also no legal moves. It's a draw, not a loss."},
    {kw:["draw"], a:"A draw happens on stalemate, threefold repetition, the 50-move rule, or insufficient material for mate."},
    {kw:["goal","win","winning"], a:"The goal is to checkmate the opponent's king — once it can't escape check, the game is over."},
    {kw:["first move","who moves first"], a:"White always moves first."},
    {kw:["jump","through pieces"], a:"Only the knight can jump over pieces. All others need a clear path."},
  ]
};

/* ===================== SOUND ===================== */
function playTone(freq, dur, type='sine'){
  if(myProfile && myProfile.sound===false) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime+dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}
function soundMove(){ playTone(420,.1); }
function soundCapture(){ playTone(260,.15,'square'); }
function soundCheck(){ playTone(700,.2,'sawtooth'); }
function soundEnd(){ playTone(180,.4,'triangle'); }

/* ===================== REGISTRATION ===================== */
$('regLoginInput').addEventListener('input', ()=>{ $('regLoginError').textContent=''; });
$('regLoginNext').addEventListener('click', async ()=>{
  const v = $('regLoginInput').value.trim();
  if(!isLoginValid(v)){ $('regLoginError').textContent = t('login_invalid'); return; }
  $('regLoginNext').disabled = true;
  const snap = await db.collection('players').where('login','==',v.toLowerCase()).get();
  $('regLoginNext').disabled = false;
  if(!snap.empty){ $('regLoginError').textContent = t('login_taken'); return; }
  window._regLogin = v;
  goRegStep('name');
});
$('regNameBack').addEventListener('click', ()=>goRegStep('login'));
$('regNameNext').addEventListener('click', ()=>{
  const v = $('regNameInput').value.trim();
  if(!isNameValid(v)){ $('regNameError').textContent = t('name_invalid'); return; }
  window._regName = v;
  goRegStep('skill');
});
$('regSkillBack').addEventListener('click', ()=>goRegStep('name'));
document.querySelectorAll('.skill-card').forEach(card=>{
  card.addEventListener('click', async ()=>{
    regSkill = card.dataset.skill;
    await finishRegistration();
  });
});
function goRegStep(step){
  document.querySelectorAll('.reg-step').forEach(s=>s.classList.remove('active'));
  document.querySelector(`.reg-step[data-step="${step}"]`).classList.add('active');
}
async function finishRegistration(){
  const profile = {
    login: window._regLogin.toLowerCase(),
    name: window._regName,
    skill: regSkill,
    theme:'dark', lang:'ru', sound:true, privacy:'all',
    wins:0, losses:0, draws:0, friends:[],
    createdAt: Date.now(), lastSeen: Date.now()
  };
  await db.collection('players').doc(myId).set(profile);
  myProfile = normalizeProfile(profile);
  applyTheme(); currentLang = 'ru'; localStorage.setItem('cf_lang','ru'); applyTranslations();
  afterProfileReady();
}

/* ===================== LOAD PROFILE ===================== */
async function loadMyProfile(){
  const doc = await db.collection('players').doc(myId).get();
  if(!doc.exists){
    showScreen('screen-register');
    goRegStep('login');
    return;
  }
  myProfile = normalizeProfile(doc.data());
  currentLang = myProfile.lang || 'ru';
  localStorage.setItem('cf_lang', currentLang);
  applyTheme();
  applyTranslations();
  afterProfileReady();
  updateLastSeen();
  setInterval(updateLastSeen, 30000);
}
function updateLastSeen(){
  db.collection('players').doc(myId).update({lastSeen: Date.now()}).catch(()=>{});
}

function applyTheme(){
  if(myProfile && myProfile.theme==='light'){ document.body.classList.add('light-theme'); }
  else { document.body.classList.remove('light-theme'); }
}

/* ===================== AFTER PROFILE READY (routing) ===================== */
function afterProfileReady(){
  renderMenu();
  listenFriendRequests();
  listenInvites();
  const params = new URLSearchParams(location.search);
  if(params.get('room')){
    joinRoomByLink(params.get('room'));
    return;
  }
  if(params.get('addfriend')){
    const targetLogin = params.get('addfriend').toLowerCase();
    if(targetLogin !== myProfile.login){
      pendingAddFriendTarget = targetLogin;
      $('addFriendLinkText').textContent = currentLang==='ru' ? `Добавить "${targetLogin}" в друзья?` : `Add "${targetLogin}" as a friend?`;
      showModal('modalAddFriendLink');
    }
    history.replaceState(null,'',location.pathname);
    showScreen('screen-menu');
    return;
  }
  showScreen('screen-menu');
}

function renderMenu(){
  const name = pname(myProfile);
  const login = plogin(myProfile);
  $('menuName').textContent = name;
  $('menuLogin').textContent = login ? '@'+login : '';
  $('menuAvatar').textContent = name.charAt(0).toUpperCase();
  const skillMap = {none:'skill_none',beginner:'skill_beginner',intermediate:'skill_intermediate',advanced:'skill_advanced'};
  $('menuSkillBadge').textContent = t(skillMap[pskill(myProfile)] || 'skill_beginner');
}

/* ===================== MODALS ===================== */
function showModal(id){ $(id).classList.remove('hidden'); }
function hideModal(id){ $(id).classList.add('hidden'); }
document.querySelectorAll('.modal-overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if(e.target===ov) hideModal(ov.id); });
});

/* ===================== NAV ===================== */
$('navFriends').addEventListener('click', ()=>openFriends());
$('navLeaders').addEventListener('click', ()=>openLeaderboard());
$('navLearn').addEventListener('click', ()=>openLearn());
$('navSettings').addEventListener('click', ()=>openSettings());
$('friendsBack').addEventListener('click', ()=>{ clearInterval(friendsRefreshInterval); showScreen('screen-menu'); });
$('leaderboardBack').addEventListener('click', ()=>showScreen('screen-menu'));
$('learnBack').addEventListener('click', ()=>showScreen('screen-menu'));
$('settingsBack').addEventListener('click', ()=>showScreen('screen-menu'));
$('aiBack').addEventListener('click', ()=>showScreen('screen-menu'));
$('chatBack').addEventListener('click', ()=>{ if(chatUnsub) chatUnsub(); showScreen('screen-friends'); openFriends(); });
$('gameExitBtn').addEventListener('click', exitGameToMenu);

/* ===================== SETTINGS ===================== */
function openSettings(){
  $('setNameInput').value = pname(myProfile);
  $('themeToggle').textContent = myProfile.theme==='light' ? '☀️' : '🌙';
  $('langToggle').textContent = currentLang.toUpperCase();
  $('soundToggle').textContent = myProfile.sound===false ? '🔇' : '🔊';
  $('privacySelect').value = myProfile.privacy || 'all';
  $('shareProfileLink').value = `${location.origin}${location.pathname}?addfriend=${plogin(myProfile)}`;
  $('statWins').textContent = myProfile.wins||0;
  $('statLosses').textContent = myProfile.losses||0;
  $('statDraws').textContent = myProfile.draws||0;
  showScreen('screen-settings');
}
$('setNameSave').addEventListener('click', async ()=>{
  const v = $('setNameInput').value.trim();
  if(!isNameValid(v)){ toast(t('name_invalid')); return; }
  myProfile.name = v;
  await db.collection('players').doc(myId).update({name:v});
  renderMenu();
  toast(currentLang==='ru'?'Сохранено':'Saved');
});
$('themeToggle').addEventListener('click', async ()=>{
  myProfile.theme = myProfile.theme==='light' ? 'dark' : 'light';
  applyTheme();
  $('themeToggle').textContent = myProfile.theme==='light' ? '☀️' : '🌙';
  await db.collection('players').doc(myId).update({theme:myProfile.theme});
});
$('langToggle').addEventListener('click', async ()=>{
  currentLang = currentLang==='ru' ? 'en' : 'ru';
  localStorage.setItem('cf_lang', currentLang);
  applyTranslations();
  openSettings();
  await db.collection('players').doc(myId).update({lang:currentLang});
});
$('soundToggle').addEventListener('click', async ()=>{
  myProfile.sound = myProfile.sound===false ? true : false;
  $('soundToggle').textContent = myProfile.sound===false ? '🔇' : '🔊';
  await db.collection('players').doc(myId).update({sound:myProfile.sound});
});
$('privacySelect').addEventListener('change', async ()=>{
  myProfile.privacy = $('privacySelect').value;
  await db.collection('players').doc(myId).update({privacy:myProfile.privacy});
});
$('copyProfileBtn').addEventListener('click', ()=>{
  $('shareProfileLink').select();
  navigator.clipboard?.writeText($('shareProfileLink').value);
  toast(currentLang==='ru'?'Ссылка скопирована':'Link copied');
});
$('resetProfileBtn').addEventListener('click', async ()=>{
  if(!confirm(currentLang==='ru' ? 'Точно сбросить профиль?' : 'Really reset profile?')) return;
  await db.collection('players').doc(myId).delete();
  localStorage.removeItem('cf_playerId');
  location.reload();
});

/* ===================== LEADERBOARD ===================== */
async function openLeaderboard(){
  showScreen('screen-leaderboard');
  const list = $('leaderboardList');
  list.innerHTML = '<p class="hint">...</p>';
  const snap = await db.collection('players').orderBy('wins','desc').limit(50).get();
  list.innerHTML = '';
  let rank = 0;
  snap.forEach(doc=>{
    rank++;
    const raw = doc.data();
    const p = normalizeProfile(raw);
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <span class="rank-num">${rank}</span>
      <span class="avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</span>
      <div class="li-info">
        <div class="li-name">${escapeHtml(p.name)}</div>
        <div class="li-sub">@${escapeHtml(p.login)} · ${p.wins||0}W/${p.losses||0}L/${p.draws||0}D</div>
      </div>`;
    if(doc.id !== myId){
      row.style.cursor='pointer';
      row.addEventListener('click', ()=>openPlayerAction(doc.id, p));
    }
    list.appendChild(row);
  });
  if(rank===0) list.innerHTML = `<p class="hint">${currentLang==='ru'?'Пока никого нет':'Nobody here yet'}</p>`;
}
function openPlayerAction(targetId, targetProfile){
  pendingPlayerAction = {id:targetId, profile:targetProfile};
  $('modalPlayerName').textContent = targetProfile.name + (targetProfile.login ? ' (@'+targetProfile.login+')' : '');
  showModal('modalPlayerAction');
}
$('actionCancelBtn').addEventListener('click', ()=>hideModal('modalPlayerAction'));
$('actionWriteBtn').addEventListener('click', async ()=>{
  hideModal('modalPlayerAction');
  if(!pendingPlayerAction) return;
  await tryOpenChat(pendingPlayerAction.id, pendingPlayerAction.profile);
});
$('actionAddFriendBtn').addEventListener('click', async ()=>{
  hideModal('modalPlayerAction');
  if(!pendingPlayerAction) return;
  await sendFriendRequest(pendingPlayerAction.id, pendingPlayerAction.profile);
});

/* ===================== FRIENDS ===================== */
async function sendFriendRequest(targetId, targetProfile){
  if(targetId===myId){ toast(t('cant_add_self')); return; }
  if((myProfile.friends||[]).includes(targetId)){ toast(t('already_friends')); return; }
  const existing = await db.collection('friendRequests')
    .where('fromId','==',myId).where('toId','==',targetId).where('status','==','pending').get();
  if(!existing.empty){ toast(t('request_sent')); return; }
  await db.collection('friendRequests').add({
    fromId: myId, fromLogin: plogin(myProfile), fromName: pname(myProfile),
    toId: targetId, toLogin: plogin(targetProfile), status:'pending', createdAt: Date.now()
  });
  toast(t('request_sent'));
}
$('addFriendBtn').addEventListener('click', async ()=>{
  const login = $('addFriendLoginInput').value.trim().toLowerCase();
  $('addFriendMsg').textContent = '';
  if(!login) return;
  if(login === myProfile.login){ $('addFriendMsg').textContent = t('cant_add_self'); return; }
  const snap = await db.collection('players').where('login','==',login).get();
  if(snap.empty){ $('addFriendMsg').textContent = currentLang==='ru' ? 'Игрок не найден' : 'Player not found'; return; }
  const doc = snap.docs[0];
  await sendFriendRequest(doc.id, normalizeProfile(doc.data()));
  $('addFriendLoginInput').value = '';
});
$('addFriendLinkConfirm').addEventListener('click', async ()=>{
  hideModal('modalAddFriendLink');
  if(!pendingAddFriendTarget) return;
  const snap = await db.collection('players').where('login','==',pendingAddFriendTarget).get();
  if(!snap.empty){
    const doc = snap.docs[0];
    await sendFriendRequest(doc.id, normalizeProfile(doc.data()));
  }
  pendingAddFriendTarget = null;
});
$('addFriendLinkCancel').addEventListener('click', ()=>{ hideModal('modalAddFriendLink'); pendingAddFriendTarget = null; });

$('tabFriends').addEventListener('click', ()=>{
  $('tabFriends').classList.add('active'); $('tabRequests').classList.remove('active');
  $('friendsList').classList.remove('hidden'); $('requestsList').classList.add('hidden');
});
$('tabRequests').addEventListener('click', ()=>{
  $('tabRequests').classList.add('active'); $('tabFriends').classList.remove('active');
  $('requestsList').classList.remove('hidden'); $('friendsList').classList.add('hidden');
});

async function openFriends(){
  showScreen('screen-friends');
  await renderFriendsList();
  await renderRequestsList();
  clearInterval(friendsRefreshInterval);
  friendsRefreshInterval = setInterval(renderFriendsList, 15000);
}
async function renderFriendsList(){
  const list = $('friendsList');
  const ids = myProfile.friends || [];
  if(ids.length===0){ list.innerHTML = `<p class="hint">${t('no_friends')}</p>`; return; }
  const now = Date.now();
  const items = [];
  for(const fid of ids){
    try{
      const doc = await db.collection('players').doc(fid).get();
      if(!doc.exists) continue;
      const p = normalizeProfile(doc.data());
      const online = p.lastSeen && (now - p.lastSeen < 90000);
      items.push({id:fid, p, online});
    }catch(e){ console.warn('friend load error', fid, e); }
  }
  list.innerHTML = '';
  items.forEach(({id,p,online})=>{
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <span class="avatar">${escapeHtml(p.name.charAt(0).toUpperCase())}</span>
      <div class="li-info">
        <div class="li-name">${escapeHtml(p.name)}</div>
        <div class="li-sub"><span class="online-dot ${online?'online':''}"></span>${online ? (currentLang==='ru'?'в сети':'online') : (p.login ? '@'+escapeHtml(p.login) : '')}</div>
      </div>
      <div class="li-actions">
        <button class="btn btn-primary" data-act="play">🎮</button>
        <button class="btn btn-secondary" data-act="chat">💬</button>
      </div>`;
    row.querySelector('[data-act="play"]').addEventListener('click', ()=>inviteFriendToPlay(id, p));
    row.querySelector('[data-act="chat"]').addEventListener('click', ()=>tryOpenChat(id, p));
    list.appendChild(row);
  });
}
async function renderRequestsList(){
  const list = $('requestsList');
  list.innerHTML = '';
  const snap = await db.collection('friendRequests').where('toId','==',myId).where('status','==','pending').get();
  if(snap.empty){ list.innerHTML = `<p class="hint">${t('no_requests')}</p>`; }
  snap.forEach(doc=>{
    const r = doc.data();
    const fromName = r.fromName || 'Player';
    const fromLogin = r.fromLogin || '';
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <span class="avatar">${escapeHtml(fromName.charAt(0).toUpperCase())}</span>
      <div class="li-info">
        <div class="li-name">${escapeHtml(fromName)}</div>
        <div class="li-sub">${fromLogin ? '@'+escapeHtml(fromLogin) : ''}</div>
      </div>
      <div class="li-actions">
        <button class="btn btn-primary" data-act="acc">✓</button>
        <button class="btn btn-secondary" data-act="dec">✕</button>
      </div>`;
    row.querySelector('[data-act="acc"]').addEventListener('click', async ()=>{
      await db.collection('friendRequests').doc(doc.id).update({status:'accepted'});
      await db.collection('players').doc(myId).update({friends: FV.arrayUnion(r.fromId)});
      await db.collection('players').doc(r.fromId).update({friends: FV.arrayUnion(myId)});
      myProfile.friends = myProfile.friends || []; myProfile.friends.push(r.fromId);
      toast(t('request_accepted'));
      renderRequestsList(); updateFriendReqBadge();
    });
    row.querySelector('[data-act="dec"]').addEventListener('click', async ()=>{
      await db.collection('friendRequests').doc(doc.id).update({status:'declined'});
      renderRequestsList(); updateFriendReqBadge();
    });
    list.appendChild(row);
  });
}
function listenFriendRequests(){
  if(reqUnsub) reqUnsub();
  reqUnsub = db.collection('friendRequests').where('toId','==',myId).where('status','==','pending')
    .onSnapshot(snap=>{ updateFriendReqBadgeFromSnap(snap.size); }, ()=>{});
}
function updateFriendReqBadgeFromSnap(count){
  const b1 = $('friendReqBadge'), b2 = $('reqCountBadge');
  [b1,b2].forEach(b=>{
    if(count>0){ b.textContent = count; b.classList.remove('hidden'); }
    else { b.classList.add('hidden'); }
  });
}
async function updateFriendReqBadge(){
  const snap = await db.collection('friendRequests').where('toId','==',myId).where('status','==','pending').get();
  updateFriendReqBadgeFromSnap(snap.size);
}

/* ===================== MESSAGE PRIVACY ===================== */
async function tryOpenChat(targetId, targetProfile){
  const privacy = pprivacy(targetProfile);
  const isFriend = (myProfile.friends||[]).includes(targetId);
  if(privacy==='nobody' && targetId!==myId){ toast(t('privacy_blocked')); return; }
  if(privacy==='friends' && !isFriend && targetId!==myId){ toast(t('privacy_blocked')); return; }
  openDirectChat(targetId, targetProfile);
}

/* ===================== DIRECT CHAT ===================== */
function chatIdFor(a,b){ return [a,b].sort().join('__'); }
function openDirectChat(targetId, targetProfile){
  currentChatPartnerId = targetId;
  $('chatPartnerName').textContent = pname(targetProfile);
  showScreen('screen-chat');
  const cid = chatIdFor(myId, targetId);
  if(chatUnsub) chatUnsub();
  chatUnsub = db.collection('directChats').doc(cid).onSnapshot(doc=>{
    const msgs = doc.exists ? (doc.data().messages||[]) : [];
    renderChatMessages($('chatMessages'), msgs);
  });
}
function renderChatMessages(container, msgs){
  container.innerHTML = '';
  msgs.slice().sort((a,b)=>a.time-b.time).forEach(m=>{
    const div = document.createElement('div');
    div.className = 'msg ' + (m.from===myId ? 'msg-mine' : 'msg-theirs');
    div.textContent = m.text;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}
$('chatSendBtn').addEventListener('click', sendDirectMessage);
$('chatInput').addEventListener('keydown', e=>{ if(e.key==='Enter') sendDirectMessage(); });
async function sendDirectMessage(){
  const text = $('chatInput').value.trim();
  if(!text || !currentChatPartnerId) return;
  $('chatInput').value = '';
  const cid = chatIdFor(myId, currentChatPartnerId);
  await db.collection('directChats').doc(cid).set({
    participants:[myId,currentChatPartnerId],
    messages: FV.arrayUnion({from:myId, text, time:Date.now()})
  }, {merge:true});
}

/* ===================== GAME INVITES (friends) ===================== */
function listenInvites(){
  if(invitesUnsub) invitesUnsub();
  invitesUnsub = db.collection('invites').where('toId','==',myId).where('status','==','pending')
    .onSnapshot(snap=>{
      snap.docChanges().forEach(ch=>{
        if(ch.type==='added'){
          const inv = ch.doc.data();
          window._incomingInvite = {id: ch.doc.id, ...inv};
          const fromName = inv.fromName || 'Player';
          $('inviteText').textContent = currentLang==='ru'
            ? `${fromName} приглашает вас на партию` : `${fromName} invites you to a game`;
          showModal('modalInvite');
        }
      });
    }, ()=>{});
}
$('inviteAccept').addEventListener('click', async ()=>{
  hideModal('modalInvite');
  const inv = window._incomingInvite;
  if(!inv) return;
  await db.collection('invites').doc(inv.id).update({status:'accepted'});
  await db.collection('rooms').doc(inv.roomId).update({status:'playing'});
  enterOnlineRoom(inv.roomId);
});
$('inviteDecline').addEventListener('click', async ()=>{
  hideModal('modalInvite');
  const inv = window._incomingInvite;
  if(!inv) return;
  await db.collection('invites').doc(inv.id).update({status:'declined'});
});
async function inviteFriendToPlay(friendId, friendProfile){
  const roomRef = db.collection('rooms').doc();
  const hostColor = Math.random()<0.5 ? 'w' : 'b';
  await roomRef.set({
    hostId: myId, hostLogin: plogin(myProfile), hostName: pname(myProfile), hostColor,
    guestId: friendId, guestLogin: plogin(friendProfile), guestName: pname(friendProfile),
    fen: INITIAL_FEN, status:'invited', chat:[], winner:null, reason:null, createdAt: Date.now()
  });
  await db.collection('invites').add({
    roomId: roomRef.id, fromId: myId, fromName: pname(myProfile), toId: friendId, status:'pending', createdAt: Date.now()
  });
  showScreen('screen-waiting');
  $('waitingLinkBlock').classList.add('hidden');
  $('waitingTitle').textContent = t('invite_waiting');
  if(roomUnsub) roomUnsub();
  roomUnsub = db.collection('rooms').doc(roomRef.id).onSnapshot(doc=>{
    const d = doc.data();
    if(!d) return;
    if(d.status==='playing'){ enterOnlineRoom(roomRef.id); }
  });
  $('cancelWaitBtn').onclick = async ()=>{
    if(roomUnsub) roomUnsub();
    await roomRef.delete().catch(()=>{});
    showScreen('screen-menu');
  };
}

/* ===================== PLAY WITH FRIEND (LINK) ===================== */
$('btnPlayFriend').addEventListener('click', createRoomWithLink);
async function createRoomWithLink(){
  const roomRef = db.collection('rooms').doc();
  const hostColor = Math.random()<0.5 ? 'w' : 'b';
  await roomRef.set({
    hostId: myId, hostLogin: plogin(myProfile), hostName: pname(myProfile), hostColor,
    guestId: null, guestLogin: null, guestName: null,
    fen: INITIAL_FEN, status:'waiting', chat:[], winner:null, reason:null, createdAt: Date.now()
  });
  currentRoomId = roomRef.id;
  const link = `${location.origin}${location.pathname}?room=${roomRef.id}`;
  showScreen('screen-waiting');
  $('waitingLinkBlock').classList.remove('hidden');
  $('waitingTitle').textContent = t('waiting_title');
  $('waitingLinkInput').value = link;
  if(roomUnsub) roomUnsub();
  roomUnsub = db.collection('rooms').doc(roomRef.id).onSnapshot(doc=>{
    const d = doc.data();
    if(!d) return;
    if(d.status==='playing' && d.guestId){ enterOnlineRoom(roomRef.id); }
  });
  $('cancelWaitBtn').onclick = async ()=>{
    if(roomUnsub) roomUnsub();
    await roomRef.delete().catch(()=>{});
    showScreen('screen-menu');
  };
}
$('copyLinkBtn').addEventListener('click', ()=>{
  $('waitingLinkInput').select();
  navigator.clipboard?.writeText($('waitingLinkInput').value);
  toast(currentLang==='ru'?'Ссылка скопирована':'Link copied');
});

async function joinRoomByLink(roomId){
  showScreen('screen-connecting');
  const ref = db.collection('rooms').doc(roomId);
  const doc = await ref.get();
  if(!doc.exists){ toast(currentLang==='ru'?'Комната не найдена':'Room not found'); history.replaceState(null,'',location.pathname); showScreen('screen-menu'); return; }
  const d = doc.data();
  if(d.hostId === myId){
    history.replaceState(null,'',location.pathname);
    enterOnlineRoom(roomId);
    return;
  }
  if(d.guestId && d.guestId !== myId){
    toast(t('room_full'));
    history.replaceState(null,'',location.pathname);
    showScreen('screen-menu');
    return;
  }
  await ref.update({
    guestId: myId, guestLogin: plogin(myProfile), guestName: pname(myProfile), status:'playing'
  });
  history.replaceState(null,'',location.pathname);
  enterOnlineRoom(roomId);
}

/* ===================== ONLINE GAME ===================== */
function enterOnlineRoom(roomId){
  currentRoomId = roomId;
  gameMode = 'online';
  statsCounted = false;
  selectedSquare = null; legalTargets = []; captureTargets = []; lastMove = null;
  showScreen('screen-game');
  $('gameChatPanel').classList.add('hidden');
  if(roomUnsub) roomUnsub();
  roomUnsub = db.collection('rooms').doc(roomId).onSnapshot(doc=>{
    const d = doc.data();
    if(!d){ toast(t('opp_disconnected')); exitGameToMenu(); return; }
    handleRoomUpdate(d);
  });
}
function handleRoomUpdate(d){
  myColorChar = (d.hostId === myId) ? d.hostColor : (d.hostColor==='w'?'b':'w');
  const amHost = d.hostId === myId;
  const myName = (amHost ? d.hostName : d.guestName) || pname(myProfile);
  const oppName = (amHost ? d.guestName : d.hostName) || '...';
  $('playerBottom').querySelector('.p-name').textContent = myName;
  $('playerBottom').querySelector('.p-avatar').textContent = myName.charAt(0).toUpperCase();
  $('playerTop').querySelector('.p-name').textContent = oppName;
  $('playerTop').querySelector('.p-avatar').textContent = oppName.charAt(0).toUpperCase();

  if(chessGame.fen() !== d.fen){
    chessGame.load(d.fen);
    if(d.lastMove) soundMove();
    selectedSquare = null; legalTargets = []; captureTargets = [];
    lastMove = d.lastMove || null;
    renderBoard();
  }
  updateTurnIndicator();
  renderChatMessages($('gameChatMessages'), d.chat || []);

  if(d.status==='finished' && !statsCounted){
    statsCounted = true;
    showGameOverOnline(d);
  }
}
function updateTurnIndicator(){
  const turn = chessGame.turn();
  if(gameMode==='online'){
    $('turnIndicator').textContent = (turn===myColorChar) ? t('turn_you') : t('turn_opp');
  } else {
    $('turnIndicator').textContent = (turn===myColorChar) ? t('turn_you') : t('turn_ai');
  }
  if(chessGame.in_check()) soundCheck();
}
function isMyTurn(){
  if(gameMode==='online') return chessGame.turn()===myColorChar;
  if(gameMode==='ai') return chessGame.turn()===myColorChar;
  return false;
}

/* ===================== AI GAME ===================== */
$('btnPlayAI').addEventListener('click', ()=>showScreen('screen-ai-setup'));
document.querySelectorAll('.ai-card').forEach(card=>{
  card.addEventListener('click', ()=>{
    aiLevel = card.dataset.level;
    startAIGame();
  });
});
function startAIGame(){
  gameMode = 'ai';
  statsCounted = false;
  chessGame = new Chess();
  myColorChar = Math.random()<0.5 ? 'w' : 'b';
  selectedSquare = null; legalTargets = []; captureTargets = []; lastMove = null;
  showScreen('screen-game');
  $('gameChatPanel').classList.add('hidden');
  const myName = pname(myProfile);
  $('playerBottom').querySelector('.p-name').textContent = myName;
  $('playerBottom').querySelector('.p-avatar').textContent = myName.charAt(0).toUpperCase();
  $('playerTop').querySelector('.p-name').textContent = 'AI (' + t('ai_'+aiLevel) + ')';
  $('playerTop').querySelector('.p-avatar').textContent = '🤖';
  renderBoard();
  updateTurnIndicator();
  if(myColorChar==='b'){ setTimeout(makeAIMove, 500); }
}
function makeAIMove(){
  if(chessGame.game_over()) return;
  const move = getAIMove(chessGame, aiLevel);
  if(!move) return;
  const wasCapture = !!move.captured;
  chessGame.move(move);
  lastMove = {from: move.from, to: move.to};
  renderBoard();
  updateTurnIndicator();
  if(wasCapture) soundCapture(); else soundMove();
  checkGameOverLocalAI();
}
function checkGameOverLocalAI(){
  if(!chessGame.game_over()) return;
  const info = getGameOverInfo(chessGame);
  soundEnd();
  let title, text;
  if(info.reason==='checkmate'){
    const iWon = info.winner===myColorChar;
    title = iWon ? '🎉' : '😔';
    text = iWon ? t('checkmate_win') : t('checkmate_lose');
    updateMyStats(iWon?'win':'loss');
  } else {
    title = '🤝'; text = t('draw_text');
    updateMyStats('draw');
  }
  $('gameOverTitle').textContent = title;
  $('gameOverText').textContent = text;
  $('rematchBtn').classList.remove('hidden');
  $('rematchBtn').onclick = ()=>{ hideModal('modalGameOver'); startAIGame(); };
  showModal('modalGameOver');
}

/* ===================== AI ENGINE ===================== */
const PIECE_VALUES = {p:1,n:3,b:3,r:5,q:9,k:0};
function evaluateBoard(game){
  const board = game.board();
  let score = 0;
  for(const row of board){
    for(const sq of row){
      if(sq){
        const val = PIECE_VALUES[sq.type];
        score += sq.color==='w' ? val : -val;
      }
    }
  }
  return score;
}
function minimax(game, depth, alpha, beta, isMax){
  if(depth===0 || game.game_over()) return evaluateBoard(game);
  const moves = game.moves();
  if(isMax){
    let best = -Infinity;
    for(const m of moves){
      game.move(m);
      best = Math.max(best, minimax(game, depth-1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if(beta<=alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for(const m of moves){
      game.move(m);
      best = Math.min(best, minimax(game, depth-1, alpha, beta, true));
      game.undo();
      beta = Math.min(beta, best);
      if(beta<=alpha) break;
    }
    return best;
  }
}
function getAIMove(game, level){
  const verboseMoves = game.moves({verbose:true});
  if(verboseMoves.length===0) return null;
  if(level==='easy' && Math.random()<0.45){
    return verboseMoves[Math.floor(Math.random()*verboseMoves.length)];
  }
  const depth = level==='hard' ? 3 : level==='medium' ? 2 : 1;
  const aiIsWhite = game.turn()==='w';
  let bestMove = null;
  let bestScore = aiIsWhite ? -Infinity : Infinity;
  for(const m of verboseMoves){
    game.move(m);
    const score = minimax(game, depth-1, -Infinity, Infinity, !aiIsWhite);
    game.undo();
    if(aiIsWhite && score > bestScore){ bestScore = score; bestMove = m; }
    if(!aiIsWhite && score < bestScore){ bestScore = score; bestMove = m; }
  }
  return bestMove || verboseMoves[0];
}
function getGameOverInfo(game){
  if(!game.game_over()) return null;
  if(game.in_checkmate()) return {reason:'checkmate', winner: game.turn()==='w' ? 'b' : 'w'};
  return {reason:'draw', winner:null};
}

/* ===================== STATS ===================== */
async function updateMyStats(result){
  const field = result==='win' ? 'wins' : result==='loss' ? 'losses' : 'draws';
  myProfile[field] = (myProfile[field]||0) + 1;
  await db.collection('players').doc(myId).update({[field]: FV.increment(1)}).catch(()=>{});
}

/* ===================== BOARD RENDER & MOVE LOGIC ===================== */
const FILES = ['a','b','c','d','e','f','g','h'];
function squareAt(displayRow, displayCol, flipped){
  const rank = flipped ? displayRow+1 : 8-displayRow;
  const fileIdx = flipped ? 7-displayCol : displayCol;
  return FILES[fileIdx] + rank;
}
const UNICODE_PIECES = {
  w:{p:'♙',n:'♘',b:'♗',r:'♖',q:'♕',k:'♔'},
  b:{p:'♟',n:'♞',b:'♝',r:'♜',q:'♛',k:'♚'}
};
function renderBoard(){
  const boardArr = chessGame.board();
  const flipped = myColorChar === 'b';
  const boardEl = $('board');
  boardEl.innerHTML = '';
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const boardRow = flipped ? 7-r : r;
      const boardCol = flipped ? 7-c : c;
      const piece = boardArr[boardRow][boardCol];
      const sq = squareAt(r,c,flipped);
      const cell = document.createElement('div');
      const isLight = (boardRow + boardCol) % 2 === 0;
      cell.className = 'square ' + (isLight ? 'light' : 'dark');
      cell.dataset.square = sq;
      if(lastMove && (sq===lastMove.from)) cell.classList.add('last-from');
      if(lastMove && (sq===lastMove.to)) cell.classList.add('last-to');
      if(selectedSquare === sq) cell.classList.add('selected');
      if(piece){
        const span = document.createElement('span');
        span.className = 'piece ' + (piece.color==='w' ? 'piece-w' : 'piece-b');
        span.textContent = UNICODE_PIECES[piece.color][piece.type];
        cell.appendChild(span);
      }
      if(legalTargets.includes(sq) && !captureTargets.includes(sq)){
        const dot = document.createElement('div'); dot.className = 'dot'; cell.appendChild(dot);
      }
      if(captureTargets.includes(sq)){
        const ring = document.createElement('div'); ring.className = 'capture-ring'; cell.appendChild(ring);
      }
      cell.addEventListener('click', ()=>handleSquareClick(sq));
      boardEl.appendChild(cell);
    }
  }
  renderCoordLabels(flipped);
}
function renderCoordLabels(flipped){
  const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
  const files = flipped ? ['h','g','f','e','d','c','b','a'] : FILES;
  $('rankLabels').innerHTML = ranks.map(r=>`<span>${r}</span>`).join('');
  $('fileLabels').innerHTML = files.map(f=>`<span>${f}</span>`).join('');
}
function handleSquareClick(sq){
  if(gameMode==='online' || gameMode==='ai'){
    if(!isMyTurn()) return;
  } else return;
  if(selectedSquare){
    if(legalTargets.includes(sq)){
      attemptMove(selectedSquare, sq);
      return;
    }
    const piece = chessGame.get(sq);
    if(piece && piece.color===myColorChar){
      selectSquare(sq);
    } else {
      clearSelection(); renderBoard();
    }
  } else {
    const piece = chessGame.get(sq);
    if(piece && piece.color===myColorChar){
      selectSquare(sq);
    }
  }
}
function selectSquare(sq){
  selectedSquare = sq;
  const moves = chessGame.moves({square:sq, verbose:true});
  legalTargets = moves.map(m=>m.to);
  captureTargets = moves.filter(m=>m.flags.includes('c')||m.flags.includes('e')).map(m=>m.to);
  renderBoard();
}
function clearSelection(){
  selectedSquare = null; legalTargets = []; captureTargets = [];
}
let pendingPromotion = null;
function attemptMove(from, to){
  const piece = chessGame.get(from);
  if(piece && piece.type==='p' && (to[1]==='8' || to[1]==='1')){
    pendingPromotion = {from, to};
    openPromotionModal(piece.color);
    return;
  }
  doMove(from, to, undefined);
}
function openPromotionModal(color){
  const row = $('promoRow');
  row.innerHTML = '';
  ['q','r','b','n'].forEach(pt=>{
    const btn = document.createElement('button');
    btn.className = 'piece-btn';
    btn.textContent = UNICODE_PIECES[color][pt];
    btn.addEventListener('click', ()=>{
      hideModal('modalPromotion');
      if(pendingPromotion){
        doMove(pendingPromotion.from, pendingPromotion.to, pt);
        pendingPromotion = null;
      }
    });
    row.appendChild(btn);
  });
  showModal('modalPromotion');
}
function doMove(from, to, promotion){
  const moveObj = {from, to};
  if(promotion) moveObj.promotion = promotion;
  const move = chessGame.move(moveObj);
  clearSelection();
  if(!move){ renderBoard(); return; }
  lastMove = {from, to};
  renderBoard();
  if(move.captured) soundCapture(); else soundMove();
  updateTurnIndicator();

  if(gameMode==='online'){
    syncMoveToRoom();
  } else if(gameMode==='ai'){
    if(chessGame.game_over()){
      checkGameOverLocalAI();
    } else {
      setTimeout(makeAIMove, 450);
    }
  }
}
async function syncMoveToRoom(){
  if(!currentRoomId) return;
  const over = chessGame.game_over();
  const updateData = {
    fen: chessGame.fen(), lastMove, updatedAt: Date.now()
  };
  if(over){
    const info = getGameOverInfo(chessGame);
    updateData.status = 'finished';
    updateData.winner = info.winner;
    updateData.reason = info.reason;
  }
  await db.collection('rooms').doc(currentRoomId).update(updateData);
}
function showGameOverOnline(d){
  soundEnd();
  let title, text;
  if(d.reason==='checkmate'){
    const iWon = d.winner === myColorChar;
    title = iWon ? '🎉' : '😔';
    text = iWon ? t('checkmate_win') : t('checkmate_lose');
    updateMyStats(iWon ? 'win' : 'loss');
  } else if(d.reason==='resign'){
    const iWon = d.winner === myColorChar;
    title = iWon ? '🎉' : '🏳️';
    text = iWon ? t('resigned_opp') : t('resigned_you');
    updateMyStats(iWon ? 'win' : 'loss');
  } else {
    title = '🤝'; text = t('draw_text');
    updateMyStats('draw');
  }
  $('gameOverTitle').textContent = title;
  $('gameOverText').textContent = text;
  const amHost = d.hostId === myId;
  $('rematchBtn').classList.toggle('hidden', !amHost);
  $('rematchBtn').onclick = async ()=>{
    hideModal('modalGameOver');
    const newHostColor = d.hostColor==='w' ? 'b' : 'w';
    await db.collection('rooms').doc(currentRoomId).update({
      fen: INITIAL_FEN, status:'playing', hostColor:newHostColor, winner:null, reason:null, chat:[], lastMove:null
    });
    statsCounted = false;
  };
  showModal('modalGameOver');
}
$('resignBtn').addEventListener('click', async ()=>{
  if(gameMode!=='online'){ exitGameToMenu(); return; }
  if(!confirm(currentLang==='ru'?'Сдаться?':'Resign?')) return;
  const oppColor = myColorChar==='w' ? 'b' : 'w';
  await db.collection('rooms').doc(currentRoomId).update({
    status:'finished', winner: oppColor, reason:'resign'
  });
});
$('gameOverMenuBtn').addEventListener('click', ()=>{
  hideModal('modalGameOver');
  exitGameToMenu();
});
function exitGameToMenu(){
  if(roomUnsub){ roomUnsub(); roomUnsub = null; }
  currentRoomId = null; gameMode = null;
  showScreen('screen-menu');
  renderMenu();
}

/* ===================== IN-GAME CHAT ===================== */
$('toggleChatBtn').addEventListener('click', ()=>{
  $('gameChatPanel').classList.toggle('hidden');
});
$('gameChatSendBtn').addEventListener('click', sendGameChatMessage);
$('gameChatInput').addEventListener('keydown', e=>{ if(e.key==='Enter') sendGameChatMessage(); });
async function sendGameChatMessage(){
  const text = $('gameChatInput').value.trim();
  if(!text || !currentRoomId) return;
  $('gameChatInput').value = '';
  await db.collection('rooms').doc(currentRoomId).update({
    chat: FV.arrayUnion({from:myId, name:pname(myProfile), text, time:Date.now()})
  });
}

/* ===================== LEARN SCREEN ===================== */
function openLearn(){
  showScreen('screen-learn');
  $('learnTabLessons').classList.add('active');
  $('learnTabAI').classList.remove('active');
  $('lessonsList').classList.remove('hidden');
  $('aiTutorBox').classList.add('hidden');
  renderLessons();
}
$('learnTabLessons').addEventListener('click', ()=>{
  $('learnTabLessons').classList.add('active'); $('learnTabAI').classList.remove('active');
  $('lessonsList').classList.remove('hidden'); $('aiTutorBox').classList.add('hidden');
});
$('learnTabAI').addEventListener('click', ()=>{
  $('learnTabAI').classList.add('active'); $('learnTabLessons').classList.remove('active');
  $('aiTutorBox').classList.remove('hidden'); $('lessonsList').classList.add('hidden');
  renderAITutorChips();
});
function renderLessons(){
  const list = $('lessonsList');
  list.innerHTML = '';
  LEARN_CONTENT[currentLang].forEach((lesson,i)=>{
    const item = document.createElement('div');
    item.className = 'accordion-item';
    item.innerHTML = `<div class="accordion-head">${lesson.title}<span>▾</span></div><div class="accordion-body">${lesson.body}</div>`;
    item.querySelector('.accordion-head').addEventListener('click', ()=>{
      item.classList.toggle('open');
    });
    list.appendChild(item);
  });
}
function renderAITutorChips(){
  const chips = $('aiTutorChips');
  const topics = currentLang==='ru'
    ? ['Как ходит конь?','Что такое рокировка?','Что такое мат?','Взятие на проходе']
    : ['How does the knight move?','What is castling?','What is checkmate?','En passant'];
  chips.innerHTML = '';
  topics.forEach(tp=>{
    const chip = document.createElement('div');
    chip.className = 'chip'; chip.textContent = tp;
    chip.addEventListener('click', ()=>{ $('aiTutorInput').value = tp; sendAITutorMessage(); });
    chips.appendChild(chip);
  });
  if($('aiTutorMessages').children.length===0){
    const intro = document.createElement('div');
    intro.className = 'msg msg-theirs';
    intro.textContent = currentLang==='ru'
      ? 'Привет! Я помощник по шахматным правилам. Спроси меня про ходы фигур, рокировку, взятие на проходе, шах, мат и другое.'
      : "Hi! I'm your chess rules helper. Ask me about piece moves, castling, en passant, check, checkmate and more.";
    $('aiTutorMessages').appendChild(intro);
  }
}
$('aiTutorSendBtn').addEventListener('click', sendAITutorMessage);
$('aiTutorInput').addEventListener('keydown', e=>{ if(e.key==='Enter') sendAITutorMessage(); });
function sendAITutorMessage(){
  const text = $('aiTutorInput').value.trim();
  if(!text) return;
  $('aiTutorInput').value = '';
  const container = $('aiTutorMessages');
  const mine = document.createElement('div'); mine.className = 'msg msg-mine'; mine.textContent = text;
  container.appendChild(mine);
  const answer = findTutorAnswer(text);
  const reply = document.createElement('div'); reply.className = 'msg msg-theirs'; reply.textContent = answer;
  container.appendChild(reply);
  container.scrollTop = container.scrollHeight;
}
function findTutorAnswer(question){
  const low = question.toLowerCase();
  const qa = AI_TUTOR_QA[currentLang];
  for(const entry of qa){
    if(entry.kw.some(k=>low.includes(k))) return entry.a;
  }
  return currentLang==='ru'
    ? 'Я пока не знаю ответа на это. Попробуй спросить про: ходы фигур, рокировку, взятие на проходе, превращение пешки, шах, мат, пат или ничью.'
    : "I don't know the answer to that yet. Try asking about: piece moves, castling, en passant, pawn promotion, check, checkmate, stalemate or draws.";
}

/* ===================== INIT ===================== */
loadMyProfile();
