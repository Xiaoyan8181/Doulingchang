// --- 線上鬥靈功能 (V3.0 - JWT 安全認證版) ---

const socket = io('https://fog-erratic-paw.glitch.me', { auth: {} });
let isSocketConnected = false;
let currentUser = null;
let isAdmin = false;
let currentRoomId = null;
let currentRoomOwner = null;
let scoreUpdateInterval = null; // 用於存放分數更新的計時器

document.addEventListener('DOMContentLoaded', (event) => {
    const loadingPopup = document.getElementById('loading-popup');
    
    // ================== Socket.IO 事件監聽器 ==================
    socket.on('connect', () => {
        console.log('成功連接到伺服器！ID:', socket.id);
        isSocketConnected = true;
        if (!currentUser) {
            loadingPopup.style.display = 'none';
            document.getElementById('login-page').style.display = 'block';
        }
    });

    socket.on('disconnect', () => {
        console.log('與伺服器斷線');
        isSocketConnected = false;
        alert('與伺服器斷線，正在嘗試重新連接...');
    });
    
    socket.on('connect_error', (err) => {
        if (err.message === "Authentication error") {
            console.error('驗證錯誤，請重新登入');
            currentUser = null;
            socket.auth = {};
            alert('您的登入已過期，請重新登入。');
            window.location.reload();
        } else {
            console.error('連線錯誤:', err.message);
        }
    });

    socket.on('forceDisconnect', (message) => {
        alert(message);
        isSocketConnected = false;
        currentUser = null;
        socket.auth = {};
        socket.disconnect();
        window.location.reload();
    });

    socket.on('updateOnlineUsers', updateUserList);
    socket.on('playerListUpdate', updateInRoomPlayerList);

    socket.on('roomClosed', (closedRoomId) => {
        if (currentRoomId === closedRoomId) {
            alert('房間已關閉');
            // 如果遊戲結束彈窗是可見的，先隱藏它
            if (document.getElementById('results-popup').style.display === 'flex') {
                document.getElementById('results-popup').style.display = 'none';
            }
            navigateToLobby();
        } else {
            const roomElement = document.getElementById(`room-${closedRoomId}`);
            if (roomElement) roomElement.remove();
        }
    });
    
    socket.on('kicked', () => {
        alert('你已被房主踢掉');
        navigateToLobby();
    });

    // === 遊戲流程 Socket 事件 ===
    socket.on('gameStarted', handleGameStart);
    socket.on('timerTick', (timeLeft) => Game.updateTimer(timeLeft));
    socket.on('scoreboardUpdate', (scores) => Game.updateScoreboard(scores));
    socket.on('gameEnded', handleGameEnd);

    // ================== 頁面元素事件監聽器 ==================
    document.getElementById('login-submit').addEventListener('click', login);
    document.getElementById('show-register').addEventListener('click', () => showPage('register-page'));
    document.getElementById('back-to-login').addEventListener('click', () => showPage('login-page'));
    document.getElementById('register-submit').addEventListener('click', register);
    document.getElementById('back-to-menu-from-lobby').addEventListener('click', logout);
    document.getElementById('create-room').addEventListener('click', () => showPage('create-room-page'));
    document.getElementById('cancel-create').addEventListener('click', () => showPage('lobby-page'));
    document.getElementById('confirm-create').addEventListener('click', createRoom);
    document.getElementById('join-room').addEventListener('click', joinRoomById);
    document.getElementById('refresh-rooms').addEventListener('click', loadRoomList);
    document.getElementById('back-to-lobby').addEventListener('click', leaveRoom);
    document.getElementById('start-game').addEventListener('click', () => socket.emit('startGame', currentRoomId));
    document.getElementById('back-to-room-btn').addEventListener('click', returnToRoomFromGame);
    document.getElementById('leave-game-btn').addEventListener('click', handleLeaveGame);
    
    document.getElementById('room-public').addEventListener('change', (e) => {
        document.getElementById('room-password').style.display = e.target.value === 'true' ? 'block' : 'none';
    });
    document.getElementById('room-password').style.display = 'none';

    // ================== 功能函式 ==================

    function showPage(pageId) {
        const pages = ['login-page', 'register-page', 'lobby-page', 'create-room-page', 'room-page', 'game-page'];
        pages.forEach(id => {
            document.getElementById(id).style.display = (id === pageId) ? ( (id === 'lobby-page' || id === 'room-page' || id === 'game-page') ? 'flex' : 'block' ) : 'none';
        });
    }

    function login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        socket.emit('login', { username, password }, (response) => {
            if (response.success) {
                currentUser = username;
                isAdmin = response.isAdmin;
                socket.auth = { token: response.token };
                socket.disconnect();
                socket.connect();
                showPage('lobby-page');
                loadRoomList();
            } else {
                alert(response.message);
            }
        });
    }

    function logout() {
        currentUser = null;
        socket.auth = {};
        socket.disconnect();
        window.location.href = 'index.html';
    }

    function register() {
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        if (password !== confirmPassword) {
            alert('密碼與確認密碼不一致');
            return;
        }
        socket.emit('register', { username, password }, (response) => {
            alert(response.message);
            if (response.success) {
                showPage('login-page');
            }
        });
    }
    
    function createRoom() {
        const isPublic = document.getElementById('room-public').value === 'true';
        const room = {
            name: document.getElementById('room-name').value || `玩家 ${currentUser} 的房間`,
            isPublic: isPublic,
            password: isPublic ? (document.getElementById('room-password').value || null) : null,
            limit: parseInt(document.getElementById('room-limit').value),
            feedTime: parseInt(document.getElementById('feed-time').value),
            betTime: parseInt(document.getElementById('bet-time').value),
            status: 'open'
        };

        if (!isPublic && !room.password) {
            room.password = prompt("您正在創建私人房間，請為您的房間設定一個密碼：");
            if (!room.password) {
                alert("私人房間必須設定密碼！");
                return;
            }
        }

        socket.emit('createRoom', room, (response) => {
            if (response.success) {
                enterRoom(response.roomId);
            } else {
                alert(response.message);
            }
        });
    }
    
    function joinRoomById() {
        const roomId = document.getElementById('join-room-id').value;
        if (!roomId) return alert('請輸入房間號');

        socket.emit('getRoomInfo', roomId, (room) => {
            if (!room) return alert('房間不存在');
            const needsPassword = !room.isPublic || (room.isPublic && room.password);

            if (needsPassword) {
                const promptMessage = !room.isPublic ? '此為私人房間，請輸入房間密碼:' : '請輸入房間密碼:';
                const password = prompt(promptMessage);
                if (password === null) {
                    return;
                }
                tryJoinRoom(roomId, password);
            } else {
                tryJoinRoom(roomId, null);
            }
        });
    }

    function tryJoinRoom(roomId, password) {
        socket.emit('joinRoom', { roomId, password }, (response) => {
            if (response.success) {
                enterRoom(response.roomId);
            } else {
                alert(response.message);
            }
        });
    }

    function enterRoom(roomId) {
        currentRoomId = roomId;
        showPage('room-page');
        socket.emit('getRoomInfo', roomId, (room) => {
            if (room) {
                currentRoomOwner = room.owner;
                document.getElementById('room-title').textContent = room.name;
                document.getElementById('room-id-display').textContent = `房號: ${roomId}`;
                document.getElementById('start-game').style.display = room.owner === currentUser ? 'block' : 'none';
                updateInRoomPlayerList(room.players);
            } else {
                alert('無法獲取房間資訊，可能已被關閉。');
                navigateToLobby();
            }
        });
    }

    function handleLeaveGame() {
        if (confirm('確定要離開目前正在進行的遊戲嗎？\n（您將無法重新加入，但遊戲會繼續進行）')) {
            if (scoreUpdateInterval) {
                clearInterval(scoreUpdateInterval);
                scoreUpdateInterval = null;
            }
            socket.emit('leaveRoom', { roomId: currentRoomId });
            navigateToLobby();
        }
    }

    function leaveRoom() {
        if (!currentRoomId) return;

        const isGamePlaying = document.getElementById('game-page').style.display === 'flex';
        if (!isGamePlaying && currentUser === currentRoomOwner) {
            if (!confirm('您是房主，離開將會關閉房間，確定嗎？')) return;
        }

        socket.emit('leaveRoom', { roomId: currentRoomId });
        navigateToLobby();
    }

    function navigateToLobby() {
        showPage('lobby-page');
        currentRoomId = null;
        currentRoomOwner = null;
        loadRoomList();
    }
    
    function handleGameStart() {
        console.log("處理遊戲開始...");
        showPage('game-page');
        Game.init();
        scoreUpdateInterval = setInterval(() => {
            if (isSocketConnected) {
                socket.emit('updateScore', { score: Game.getScore() });
            }
        }, 1000);
    }

    function handleGameEnd(finalScores) {
        console.log("處理遊戲結束...");
        if (scoreUpdateInterval) clearInterval(scoreUpdateInterval);
        scoreUpdateInterval = null;
        Game.endGame(finalScores);
    }
    
    function returnToRoomFromGame() {
        document.getElementById('results-popup').style.display = 'none';
        document.getElementById('buy-character-btn').disabled = false;
        showPage('room-page');
        if(currentRoomId) {
            enterRoom(currentRoomId);
        }
    }

    function updateUserList(userList) {
        const listDiv = document.getElementById('online-players-list');
        if (!listDiv) return;
        userList.sort((a, b) => {
            if (a === currentUser) return -1; if (b === currentUser) return 1;
            if (a === '黑鷺鷺') return -1; if (b === '黑鷺鷺') return 1;
            return a.localeCompare(b);
        });
        listDiv.innerHTML = '';
        userList.forEach(username => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-list-item';
            if (username === currentUser) {
                playerDiv.textContent = `${username} (您)`;
                playerDiv.classList.add('player-self');
            } else if (username === '黑鷺鷺') {
                playerDiv.textContent = `${username} (管理員)`;
                playerDiv.classList.add('player-admin');
            } else {
                playerDiv.textContent = username;
            }
            listDiv.appendChild(playerDiv);
        });
    }

    function updateInRoomPlayerList(playerList) {
        const listDiv = document.getElementById('in-room-players-list');
        if (!listDiv) return;
        listDiv.innerHTML = '';
        const isCurrentUserOwner = currentUser === currentRoomOwner;
        playerList.forEach(username => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-list-item';
            let playerText = username;
            if (username === currentRoomOwner) playerText += ' (房主)';
            if (isCurrentUserOwner && username !== currentUser && username !== '黑鷺鷺') {
                playerDiv.innerHTML = `<span>${playerText}</span><button class="kick-btn" data-username="${username}">X</button>`;
                playerDiv.querySelector('.kick-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    const userToKick = e.target.getAttribute('data-username');
                    if (confirm(`確定要踢掉玩家 "${userToKick}" 嗎？`)) {
                        socket.emit('kickPlayer', { roomId: currentRoomId, userToKick: userToKick });
                    }
                });
            } else {
                playerDiv.textContent = playerText;
            }
            listDiv.appendChild(playerDiv);
        });
    }

    function loadRoomList() {
        socket.emit('getRooms', (rooms) => {
            const roomListDiv = document.getElementById('public-room-list');
            roomListDiv.innerHTML = '';
            const publicRooms = Object.entries(rooms).filter(([id, room]) => room.isPublic && room.status === 'open');
            if (publicRooms.length === 0) {
                roomListDiv.innerHTML = '<p style="text-align: center; width: 100%;">目前沒有公開房間。</p>';
                return;
            }
            publicRooms.forEach(([id, room]) => {
                const roomDiv = document.createElement('div');
                roomDiv.className = 'room-item';
                roomDiv.id = `room-${id}`;
                let headerHTML = (room.password) ? '<span>🔑 </span>' : '';
                headerHTML += room.name;
                roomDiv.innerHTML = `<div class="room-item-header">${headerHTML}</div><div class="room-item-players">房主: ${room.owner} | 人數: ${room.players.length}/${room.limit || '∞'}</div><div class="room-item-actions"><button class="join-btn">加入</button>${isAdmin ? `<button class="admin-close-btn">關閉</button>` : ''}</div>`;
                
                roomDiv.querySelector('.join-btn').addEventListener('click', () => {
                    if (room.password) {
                        const password = prompt('請輸入房間密碼:');
                        if (password === null) {
                            return; 
                        }
                        tryJoinRoom(id, password);
                    } else {
                        tryJoinRoom(id, null);
                    }
                });

                if (isAdmin) {
                    roomDiv.querySelector('.admin-close-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`確定要強制關閉房間 "${room.name}" 嗎？`)) {
                            socket.emit('adminCloseRoom', { roomId: id });
                        }
                    });
                }
                roomListDiv.appendChild(roomDiv);
            });
        });
    }
});