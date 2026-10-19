console.log('✅ game.js загружен');

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

const debugEl = document.getElementById('debugInfo');
if (typeof firebase === 'undefined') {
  debugEl.textContent = '⚠️ Ошибка: Firebase не загрузился';
} else if (typeof Chess === 'undefined') {
  debugEl.textContent = '⚠️ Ошибка: библиотека chess.js не загрузилась';
} else {
  debugEl.textContent = '✅ Firebase подключен';
  setTimeout(() => debugEl.classList.add('hidden'), 2000);
}

const PIECES = {
    'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

let roomId = null;
let roomRef = null;
let myColor = null;
let isHost = false;
let chess = new Chess();
let selectedSquare = null;
let pendingPromotion = null;
let lastChatLength = 0;
let statsRecordedLocally = false;

function getPlayerId() {
    let id = localStorage.getItem('chessPlayerId');
    if (!id) {
        id = 'p_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('chessPlayerId', id);
    }
    return id;
}
const playerId = getPlayerId();

function getNickname() {
    return localStorage.getItem('chessNickname') || null;
}

function setAvatarLetter(el, name) {
    el.textContent = name ? name.trim().charAt(0).toUpperCase() : '?';
}

async function ensureProfile() {
    const ref = db.collection('players').doc(playerId);
    const doc = await ref.get();
    let nickname = getNickname();

    if (!doc.exists) {
        if (!nickname) {
            nickname = 'Игрок' + Math.floor(Math.random() * 9000 + 1000);
            localStorage.setItem('chessNickname', nickname);
        }
        await ref.set({ nickname, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 });
    } else {
        const data = doc.data();
        if (!nickname) {
            nickname = data.nickname;
            localStorage.setItem('chessNickname', nickname);
        } else if (nickname !== data.nickname) {
            await ref.update({ nickname });
        }
    }

    document.getElementById('currentNickname').textContent = nickname;
    setAvatarLetter(document.getElementById('avatarInitial'), nickname);
    document.getElementById('nicknameInput').value = nickname;
    setAvatarLetter(document.getElementById('settingsAvatarPreview'), nickname);

    refreshStatsDisplay();
}

async function refreshStatsDisplay() {
    const ref = db.collection('players').doc(playerId);
    const doc = await ref.get();
    if (doc.exists) {
        const d = doc.data();
        document.getElementById('statWins').textContent = d.wins || 0;
        document.getElementById('statLosses').textContent = d.losses || 0;
        document.getElementById('statDraws').textContent = d.draws || 0;
    }
}

ensureProfile();

document.getElementById('openSettingsBtn').addEventListener('click', () => {
    refreshStatsDisplay();
    showScreen('settings');
});
document.getElementById('backFromSettings').addEventListener('click', () => showScreen('main'));

document.getElementById('saveNicknameBtn').addEventListener('click', async () => {
    const input = document.getElementById('nicknameInput');
    let name = input.value.trim();
    if (!name) { alert('Введите ник!'); return; }
    if (name.length > 16) name = name.slice(0, 16);

    localStorage.setItem('chessNickname', name);
    const ref = db.collection('players').doc(playerId);
    const doc = await ref.get();
    if (doc.exists) {
        await ref.update({ nickname: name });
    } else {
        await ref.set({ nickname: name, wins: 0, losses: 0, draws: 0, gamesPlayed: 0 });
    }
    document.getElementById('currentNickname').textContent = name;
    setAvatarLetter(document.getElementById('avatarInitial'), name);
    setAvatarLetter(document.getElementById('settingsAvatarPreview'), name);

    const btn = document.getElementById('saveNicknameBtn');
    btn.textContent = '✅ Сохранено!';
    setTimeout(() => btn.textContent = '💾 Сохранить', 1500);
});

document.getElementById('openLeaderboardBtn').addEventListener('click', async () => {
    showScreen('leaderboard');
    const container = document.getElementById('leaderboardList');
    container.innerHTML = '<p class="hint">Загрузка...</p>';

    try {
        const snapshot = await db.collection('players')
            .orderBy('wins', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="hint">Пока нет данных. Сыграйте первую игру!</p>';
            return;
        }

        container.innerHTML = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const d = doc.data();
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            if (doc.id === playerId) row.classList.add('me');
            row.innerHTML = `
                <span class="lb-rank">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}</span>
                <span class="avatar">${d.nickname ? d.nickname.charAt(0).toUpperCase() : '?'}</span>
                <span class="lb-name">${d.nickname || 'Игрок'}</span>
                <span class="lb-stat">🏆 ${d.wins || 0}</span>
                <span class="lb-stat">💀 ${d.losses || 0}</span>
                <span class="lb-stat">🤝 ${d.draws || 0}</span>
            `;
            container.appendChild(row);
            rank++;
        });
    } catch (err) {
        console.error('Ошибка загрузки лидерборда:', err);
        container.innerHTML = '<p class="hint">Не удалось загрузить лидерборд</p>';
    }
});
document.getElementById('backFromLeaderboard').addEventListener('click', () => showScreen('main'));

const screens = {
    main: document.getElementById('mainMenu'),
    settings: document.getElementById('settingsScreen'),
    leaderboard: document.getElementById('leaderboardScreen'),
    waiting: document.getElementById('waitingScreen'),
    connecting: document.getElementById('connectingScreen'),
    game: document.getElementById('gameScreen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

document.getElementById('createGameBtn').addEventListener('click', async () => {
    console.log('Кнопка "Создать игру" нажата');
    try {
        isHost = true;
        myColor = Math.random() < 0.5 ? 'white' : 'black';
        roomId = Math.random().toString(36).substr(2, 8);
        roomRef = db.collection('rooms').doc(roomId);
        const hostNickname = getNickname() || 'Игрок';

        await roomRef.set({
            fen: chess.fen(),
            hostId: playerId,
            hostColor: myColor,
            hostNickname,
            guestId: null,
            guestNickname: null,
            guestJoined: false,
            moveHistory: [],
            lastMove: null,
            result: null,
            statsRecorded: false,
            chat: [],
            rematchVotes: []
        });

        console.log('Комната создана:', roomId, 'мой цвет:', myColor);

        const link = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        document.getElementById('roomLinkInput').value = link;
        document.getElementById('yourColorDisplay').textContent =
            myColor === 'white' ? 'Белые' : 'Чёрные';
        showScreen('waiting');

        listenToRoom();
    } catch (err) {
        console.error('Ошибка при создании игры:', err);
        alert('Ошибка: ' + err.message);
    }
});

window.addEventListener('load', async () => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('room');

    if (rid) {
        console.log('Присоединяемся к комнате:', rid);
        roomId = rid;
        roomRef = db.collection('rooms').doc(roomId);
        isHost = false;
        showScreen('connecting');

        try {
            const doc = await roomRef.get();
            if (!doc.exists) {
                alert('Комната не найдена. Возможно, ссылка устарела.');
                showScreen('main');
                return;
            }

            const data = doc.data();
            myColor = data.hostColor === 'white' ? 'black' : 'white';
            const guestNickname = getNickname() || 'Игрок';

            if (!data.guestJoined) {
                await roomRef.update({
                    guestId: playerId,
                    guestNickname,
                    guestJoined: true
                });
            }

            listenToRoom();
        } catch (err) {
            console.error('Ошибка при присоединении:', err);
            alert('Ошибка подключения: ' + err.message);
        }
    }
});

function listenToRoom() {
    roomRef.onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        console.log('Обновление комнаты:', data);

        const gameIsActive = screens.game.classList.contains('active');

        if (isHost && data.guestJoined && !gameIsActive) {
            startGame(data);
        }
        if (!isHost && !gameIsActive) {
            startGame(data);
        }

        if (data.fen && data.fen !== chess.fen()) {
            chess.load(data.fen);
            renderBoard();
            updateStatus();

            if (data.lastMove) {
                setTimeout(() => {
                    highlightSquare(data.lastMove.from, 'last-move');
                    highlightSquare(data.lastMove.to, 'last-move');
                }, 50);
            }
        }

        renderMoveHistory(data.moveHistory || []);
        renderChat(data.chat || []);

        if (data.result) {
            showGameOver(data.result.text);

            if (isHost && !data.statsRecorded && !statsRecordedLocally) {
                statsRecordedLocally = true;
                recordResult(data.result, data);
                roomRef.update({ statsRecorded: true });
            }
        }

        if (data.rematchVotes && data.rematchVotes.length >= 2) {
            chess = new Chess();
            statsRecordedLocally = false;
            document.getElementById('gameOverModal').classList.remove('active');
            roomRef.update({
                fen: chess.fen(),
                moveHistory: [],
                lastMove: null,
                result: null,
                statsRecorded: false,
                rematchVotes: []
            });
        }
    }, (err) => {
        console.error('Ошибка слушателя комнаты:', err);
    });
}

async function updatePlayerStats(pid, field) {
    if (!pid) return;
    const ref = db.collection('players').doc(pid);
    const doc = await ref.get();
    if (doc.exists) {
        await ref.update({
            [field]: firebase.firestore.FieldValue.increment(1),
            gamesPlayed: firebase.firestore.FieldValue.increment(1)
        });
    } else {
        await ref.set({
            nickname: 'Игрок',
            wins: field === 'wins' ? 1 : 0,
            losses: field === 'losses' ? 1 : 0,
            draws: field === 'draws' ? 1 : 0,
            gamesPlayed: 1
        });
    }
}

async function recordResult(result, data) {
    if (!result || !result.winner) return;
    if (result.winner === 'draw') {
        await updatePlayerStats(data.hostId, 'draws');
        await updatePlayerStats(data.guestId, 'draws');
    } else {
        const winnerId = result.winner === data.hostColor ? data.hostId : data.guestId;
        const loserId = result.winner === data.hostColor ? data.guestId : data.hostId;
        await updatePlayerStats(winnerId, 'wins');
        await updatePlayerStats(loserId, 'losses');
    }
    refreshStatsDisplay();
}

function startGame(data) {
    const yourNick = myColor === data.hostColor ? data.hostNickname : data.guestNickname;
    const oppColor = myColor === 'white' ? 'black' : 'white';
    const oppNick = myColor === data.hostColor ? data.guestNickname : data.hostNickname;

    document.getElementById('yourNickname').textContent = yourNick || 'Вы';
    document.getElementById('yourColor').textContent = myColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('yourColor').className = `color-indicator ${myColor}`;
    setAvatarLetter(document.getElementById('yourAvatar'), yourNick);

    document.getElementById('opponentNickname').textContent = oppNick || 'Соперник';
    document.getElementById('opponentColor').textContent = oppColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('opponentColor').className = `color-indicator ${oppColor}`;
    setAvatarLetter(document.getElementById('oppAvatar'), oppNick);

    showScreen('game');
    renderBoard();
    updateStatus();
}

function renderBoard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';

    const fen = chess.fen().split(' ')[0];
    const rows = fen.split('/');
    const isFlipped = myColor === 'black';
    const rowOrder = isFlipped ? [...rows].reverse() : rows;

    for (let r = 0; r < 8; r++) {
        let fileIdx = 0;
        for (const char of rowOrder[r]) {
            if (isNaN(char)) {
                board.appendChild(createSquare(r, fileIdx, char, isFlipped));
                fileIdx++;
            } else {
                for (let i = 0; i < parseInt(char); i++) {
                    board.appendChild(createSquare(r, fileIdx, null, isFlipped));
                    fileIdx++;
                }
            }
        }
    }
}

function createSquare(rankIdx, fileIdx, piece, isFlipped) {
    const square = document.createElement('div');
    const actualRank = isFlipped ? 7 - rankIdx : rankIdx;
    const actualFile = isFlipped ? 7 - fileIdx : fileIdx;
    const file = String.fromCharCode(97 + actualFile);
    const rank = 8 - actualRank;
    const squareId = `${file}${rank}`;

    const isLight = (actualRank + actualFile) % 2 === 0;
    square.className = `square ${isLight ? 'light' : 'dark'}`;
    square.dataset.square = squareId;

    if (piece) {
        const color = piece === piece.toUpperCase() ? 'w' : 'b';
        const symbol = PIECES[`${color}${piece.toLowerCase()}`];
        const pieceEl = document.createElement('span');
        pieceEl.className = `piece ${color === 'w' ? 'white' : 'black'}`;
        pieceEl.textContent = symbol;
        square.appendChild(pieceEl);
    }

    square.addEventListener('click', () => handleSquareClick(squareId));
    return square;
}

function handleSquareClick(squareId) {
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    if (turn !== myColor) return;

    const piece = chess.get(squareId);

    if (!selectedSquare) {
        if (piece && isPieceMine(piece)) {
            selectedSquare = squareId;
            highlightSquare(squareId, 'selected');
            showMoveHints(squareId);
        }
    } else {
        if (selectedSquare === squareId) {
            clearHighlights();
            selectedSquare = null;
            return;
        }
        if (piece && isPieceMine(piece)) {
            clearHighlights();
            selectedSquare = squareId;
            highlightSquare(squareId, 'selected');
            showMoveHints(squareId);
        } else {
            attemptMove(selectedSquare, squareId);
        }
    }
}

function showMoveHints(squareId) {
    const moves = chess.moves({ square: squareId, verbose: true });
    moves.forEach(m => {
        const isCapture = m.flags.includes('c') || m.flags.includes('e');
        highlightSquare(m.to, isCapture ? 'capture-hint' : 'move-hint');
    });
}

function isPieceMine(piece) {
    const color = piece.color === 'w' ? 'white' : 'black';
    return color === myColor;
}

function attemptMove(from, to) {
    const piece = chess.get(from);
    const isLastRank = (to[1] === '8' || to[1] === '1');

    if (piece && piece.type === 'p' && isLastRank) {
        pendingPromotion = { from, to };
        document.getElementById('promotionModal').classList.add('active');
        clearHighlights();
        selectedSquare = null;
        return;
    }

    doMove(from, to);
}

document.querySelectorAll('.promotion-piece').forEach(el => {
    el.addEventListener('click', () => {
        const piece = el.dataset.piece;
        if (pendingPromotion) {
            doMove(pendingPromotion.from, pendingPromotion.to, piece);
            pendingPromotion = null;
        }
        document.getElementById('promotionModal').classList.remove('active');
    });
});

function doMove(from, to, promotion = 'q') {
    const move = chess.move({ from, to, promotion });

    if (!move) {
        alert('Невозможный ход!');
        clearHighlights();
        selectedSquare = null;
        return;
    }

    clearHighlights();
    selectedSquare = null;

    let result = null;
    if (chess.in_checkmate()) {
        const winnerColor = move.color === 'w' ? 'white' : 'black';
        const winnerText = move.color === 'w' ? 'Белые' : 'Чёрные';
        result = { text: `Мат! Победили: ${winnerText}`, winner: winnerColor };
    } else if (chess.in_draw()) {
        result = { text: 'Ничья', winner: 'draw' };
    }

    renderBoard();
    updateStatus();

    setTimeout(() => {
        highlightSquare(from, 'last-move');
        highlightSquare(to, 'last-move');
    }, 50);

    roomRef.update({
        fen: chess.fen(),
        lastMove: { from, to },
        moveHistory: firebase.firestore.FieldValue.arrayUnion(move.san),
        result: result
    });

    if (result) {
        showGameOver(result.text);
    }
}

function updateStatus() {
    const el = document.getElementById('gameStatus');
    const turn = chess.turn() === 'w' ? 'white' : 'black';
    const turnText = turn === 'white' ? 'белые' : 'чёрные';

    if (chess.in_checkmate()) {
        el.textContent = 'Мат!';
    } else if (chess.in_check()) {
        el.textContent = `Шах! Ход: ${turnText}`;
    } else {
        el.textContent = `Ход: ${turnText}`;
    }
}

function renderMoveHistory(list) {
    const container = document.getElementById('movesList');
    container.innerHTML = '';
    list.forEach((san, i) => {
        const item = document.createElement('div');
        item.className = 'move-item';
        item.textContent = `${i + 1}. ${san}`;
        container.appendChild(item);
    });
    container.scrollTop = container.scrollHeight;
}

function highlightSquare(squareId, className) {
    const el = document.querySelector(`[data-square="${squareId}"]`);
    if (el) el.classList.add(className);
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'last-move', 'check', 'move-hint', 'capture-hint');
    });
}

document.getElementById('copyLinkBtn').addEventListener('click', () => {
    const input = document.getElementById('roomLinkInput');
    input.select();
    document.execCommand('copy');
    const btn = document.getElementById('copyLinkBtn');
    btn.textContent = '✅ Скопировано!';
    setTimeout(() => btn.textContent = '📋 Копировать', 2000);
});

document.getElementById('resignBtn').addEventListener('click', () => {
    if (!confirm('Сдаться?')) return;
    const winnerColor = myColor === 'white' ? 'black' : 'white';
    const winnerText = myColor === 'white' ? 'Чёрные' : 'Белые';
    const result = { text: `${winnerText} победили (соперник сдался)`, winner: winnerColor };
    roomRef.update({ result });
    showGameOver(result.text);
});

function showGameOver(text) {
    document.getElementById('gameOverMessage').textContent = text;
    document.getElementById('gameOverModal').classList.add('active');
}

function requestRematch() {
    document.getElementById('gameOverModal').classList.remove('active');
    roomRef.update({
        rematchVotes: firebase.firestore.FieldValue.arrayUnion(playerId)
    });
}

document.getElementById('rematchBtn').addEventListener('click', requestRematch);
document.getElementById('modalRematchBtn').addEventListener('click', requestRematch);

document.getElementById('modalHomeBtn').addEventListener('click', () => {
    window.location.href = window.location.pathname;
});

document.getElementById('sendChatBtn').addEventListener('click', sendChatMessage);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    roomRef.update({
        chat: firebase.firestore.FieldValue.arrayUnion({
            color: myColor,
            nickname: getNickname(),
            message
        })
    });
    input.value = '';
}

function renderChat(list) {
    if (list.length === lastChatLength) return;
    lastChatLength = list.length;
    const container = document.getElementById('chatMessages');
    container.innerHTML = '';
    list.forEach(msg => {
        const el = document.createElement('div');
        el.className = 'chat-message';
        const name = msg.nickname || (msg.color === 'white' ? 'Белые' : 'Чёрные');
        el.innerHTML = `<span class="sender">${name}:</span> ${msg.message}`;
        container.appendChild(el);
    });
    container.scrollTop = container.scrollHeight;
}
