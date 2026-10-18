const PIECES = {
    'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
    'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

let peer = null;
let conn = null;
let isHost = false;
let myColor = null;
let chess = new Chess();
let selectedSquare = null;
let pendingPromotion = null;

const screens = {
    main: document.getElementById('mainMenu'),
    waiting: document.getElementById('waitingScreen'),
    connecting: document.getElementById('connectingScreen'),
    game: document.getElementById('gameScreen')
};

function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// Инициализация PeerJS (бесплатный публичный сервер, регистрация не нужна)
function initPeer(callback) {
    peer = new Peer({
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        },
        debug: 2
    });
    
    peer.on('open', (id) => {
        console.log('Мой Peer ID:', id);
        callback();
    });
    
    peer.on('error', (err) => {
        console.error('Peer error:', err.type, err);
        alert('Ошибка: ' + err.type + '. Подробности в консоли (F12)');
    });
}

// === СОЗДАНИЕ ИГРЫ ===
document.getElementById('createGameBtn').addEventListener('click', () => {
    isHost = true;
    myColor = Math.random() < 0.5 ? 'white' : 'black';
    
    initPeer(() => {
        const link = `${window.location.origin}${window.location.pathname}?peer=${peer.id}`;
        document.getElementById('roomLinkInput').value = link;
        document.getElementById('yourColorDisplay').textContent = 
            myColor === 'white' ? 'Белые' : 'Чёрные';
        showScreen('waiting');
        
        peer.on('connection', (connection) => {
            conn = connection;
            setupConnection();
            conn.on('open', () => {
                conn.send({ 
                    type: 'init', 
                    color: myColor === 'white' ? 'black' : 'white' 
                });
                startGame();
            });
        });
    });
});

// === ПРИСОЕДИНЕНИЕ ПО ССЫЛКЕ ===
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const hostId = params.get('peer');
    
    if (hostId) {
        isHost = false;
        showScreen('connecting');
        
        initPeer(() => {
            conn = peer.connect(hostId);
            setupConnection();
        });
    }
});

function setupConnection() {
    conn.on('data', (data) => {
        if (data.type === 'init') {
            myColor = data.color;
            startGame();
        } else if (data.type === 'move') {
            chess.move(data.move);
            updateAfterMove(data.move, data.result);
        } else if (data.type === 'chat') {
            addChatMessage(data.color, data.message);
        } else if (data.type === 'resign') {
            showGameOver(data.result);
        } else if (data.type === 'rematch') {
            chess = new Chess();
            document.getElementById('movesList').innerHTML = '';
            document.getElementById('gameOverModal').classList.remove('active');
            renderBoard();
            updateStatus();
        }
    });
    
    conn.on('close', () => {
        document.getElementById('gameStatus').textContent = '⚠️ Соперник отключился';
    });
}

function startGame() {
    document.getElementById('yourColor').textContent = myColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('yourColor').className = `color-indicator ${myColor}`;
    
    const oppColor = myColor === 'white' ? 'black' : 'white';
    document.getElementById('opponentColor').textContent = oppColor === 'white' ? 'Белые' : 'Чёрные';
    document.getElementById('opponentColor').className = `color-indicator ${oppColor}`;
    
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
        } else {
            attemptMove(selectedSquare, squareId);
        }
    }
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
        const winner = move.color === 'w' ? 'Белые' : 'Чёрные';
        result = `Мат! Победили: ${winner}`;
    } else if (chess.in_draw()) {
        result = 'Ничья';
    }
    
    conn.send({ type: 'move', move: { from, to, promotion }, result });
    updateAfterMove({ from, to }, result);
}

function updateAfterMove(move, result) {
    renderBoard();
    updateStatus();
    addMoveToHistory(chess.history().slice(-1)[0]);
    
    setTimeout(() => {
        highlightSquare(move.from, 'last-move');
        highlightSquare(move.to, 'last-move');
    }, 50);
    
    if (result) {
        showGameOver(result);
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

function addMoveToHistory(san) {
    const list = document.getElementById('movesList');
    const item = document.createElement('div');
    item.className = 'move-item';
    item.textContent = san;
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
}

function highlightSquare(squareId, className) {
    const el = document.querySelector(`[data-square="${squareId}"]`);
    if (el) el.classList.add(className);
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(sq => {
        sq.classList.remove('selected', 'last-move', 'check');
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
    const winner = myColor === 'white' ? 'Чёрные' : 'Белые';
    const result = `${winner} победили (соперник сдался)`;
    conn.send({ type: 'resign', result });
    showGameOver(result);
});

function showGameOver(result) {
    document.getElementById('gameOverMessage').textContent = result;
    document.getElementById('gameOverModal').classList.add('active');
}

function requestRematch() {
    chess = new Chess();
    document.getElementById('movesList').innerHTML = '';
    document.getElementById('gameOverModal').classList.remove('active');
    conn.send({ type: 'rematch' });
    renderBoard();
    updateStatus();
}

document.getElementById('rematchBtn').addEventListener('click', requestRematch);
document.getElementById('modalRematchBtn').addEventListener('click', requestRematch);

document.getElementById('modalHomeBtn').addEventListener('click', () => {
    window.location.href = window.location.pathname;
});

document.getElementById('sendChatBtn').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
});

function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    
    conn.send({ type: 'chat', color: myColor, message });
    addChatMessage(myColor, message);
    input.value = '';
}

function addChatMessage(color, message) {
    const container = document.getElementById('chatMessages');
    const el = document.createElement('div');
    el.className = 'chat-message';
    const colorText = color === 'white' ? 'Белые' : 'Чёрные';
    el.innerHTML = `<span class="sender">${colorText}:</span> ${message}`;
    container.appendChild(el);
    container.scrollTop = container.scrollHeight;
}
