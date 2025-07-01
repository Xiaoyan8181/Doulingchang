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
            // 第一次連接時，隱藏載入畫面並顯示登入頁
            const loginPage = document.getElementById('login-page');
            if (loginPage) {
                loadingPopup.style.display = 'none';
                loginPage.style.display = 'block';
            }
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
            const resultsPopup = document.getElementById('results-popup');
            if (resultsPopup && resultsPopup.style.display === 'flex') {
                resultsPopup.style.display = 'none';
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

    // 【新增】監聽經典模式的狀態更新
    socket.on('classic:stateUpdate', (state) => {
        if (typeof ClassicGame !== 'undefined' && document.getElementById('classic-game-page').style.display !== 'none') {
            ClassicGame.render(state);
        }
    });

    // 【新增】監聽經典模式的錯誤訊息
    socket.on('classic:error', (message) => {
        alert(message);
    });


    // ================== 頁面元素事件監聽器 ==================
    // 確保所有元素都存在再綁定事件
    const elementsToBind = {
        'login-submit': login,
        'show-register': () => showPage('register-page'),
        'back-to-login': () => showPage('login-page'),
        'register-submit': register,
        'back-to-menu-from-lobby': logout,
        'create-room': () => {
            showPage('create-room-page');
            toggleCreateRoomOptions();
        },
        'cancel-create': () => showPage('lobby-page'),
        'confirm-create': createRoom,
        'join-room': joinRoomById,
        'refresh-rooms': loadRoomList,
        'back-to-lobby': leaveRoom,
        'start-game': () => socket.emit('startGame', currentRoomId),
        'back-to-room-btn': returnToRoomFromGame,
        'leave-game-btn': handleLeaveGame,
    };

    for (const id in elementsToBind) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', elementsToBind[id]);
        }
    }
    
    const roomPublicSelect = document.getElementById('room-public');
    if (roomPublicSelect) {
        roomPublicSelect.addEventListener('change', (e) => {
            const roomPasswordInput = document.getElementById('room-password');
            if (roomPasswordInput) {
                roomPasswordInput.style.display = e.target.value === 'false' ? 'block' : 'none';
            }
        });
        // 初始化密碼框狀態
        const roomPasswordInput = document.getElementById('room-password');
        if (roomPasswordInput) {
            roomPasswordInput.style.display = roomPublicSelect.value === 'false' ? 'block' : 'none';
        }
    }

    const gameModeSelect = document.getElementById('room-game-mode');
    if (gameModeSelect) {
        gameModeSelect.addEventListener('change', toggleCreateRoomOptions);
    }
    

    // ================== 功能函式 ==================

    function toggleCreateRoomOptions() {
        const mode = document.getElementById('room-game-mode').value;
        const classicFeedLabel = document.getElementById('game-time-classic-feed-label');
        const classicBetLabel = document.getElementById('game-time-classic-bet-label');
        const mergeLabel = document.getElementById('game-time-merge-label');

        if (mode === 'classic') {
            classicFeedLabel.style.display = 'flex';
            classicBetLabel.style.display = 'flex';
            mergeLabel.style.display = 'none';
        } else { // 'merge'
            classicFeedLabel.style.display = 'none';
            classicBetLabel.style.display = 'none';
            mergeLabel.style.display = 'flex';
        }
    }

    function showPage(pageId) {
        const pages = ['login-page', 'register-page', 'lobby-page', 'create-room-page', 'room-page', 'game-page', 'classic-game-page'];
        pages.forEach(id => {
            const pageElement = document.getElementById(id);
            if (pageElement) {
                pageElement.style.display = (id === pageId) ? ( (id.includes('page-layout') || id.includes('game-page')) ? 'flex' : 'block' ) : 'none';
            }
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
        const gameMode = document.getElementById('room-game-mode').value;
        const isPublic = document.getElementById('room-public').value === 'true';

        const room = {
            name: document.getElementById('room-name').value || `玩家 ${currentUser} 的房間`,
            isPublic: isPublic,
            password: !isPublic ? document.getElementById('room-password').value : null,
            limit: parseInt(document.getElementById('room-limit').value),
            status: 'open',
            gameMode: gameMode, 
        };

        if (gameMode === 'classic') {
            room.feedTime = parseInt(document.getElementById('feed-time').value, 10);
            room.betTime = parseInt(document.getElementById('bet-time').value, 10);
        } else if (gameMode === 'merge') {
            const gameTimeInput = document.getElementById('room-game-time').value;
            room.gameTime = gameTimeInput ? parseInt(gameTimeInput, 10) * 60 : 0;
        }

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
                if (password === null) return;
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
                const startGameBtn = document.getElementById('start-game');
                if (startGameBtn) {
                    startGameBtn.style.display = room.owner === currentUser ? 'block' : 'none';
                }
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

        const isGamePlaying = document.getElementById('game-page').style.display === 'flex' || document.getElementById('classic-game-page').style.display === 'flex';
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
    
    function handleGameStart(gameData) {
        console.log("處理遊戲開始...", gameData);

        if (gameData.gameMode === 'merge') {
            showPage('game-page');
            Game.init();
            
            if (!gameData.initialTime || gameData.initialTime <= 0) {
                document.getElementById('game-timer').textContent = "∞";
            } else {
                Game.updateTimer(gameData.initialTime);
            }

            scoreUpdateInterval = setInterval(() => {
                if (isSocketConnected) {
                    socket.emit('updateScore', { score: Game.getScore() });
                }
            }, 1000);

        } else { // 預設或 'classic'
            showPage('classic-game-page');
            gameData.currentUser = currentUser;
            ClassicGame.init(gameData);
        }
    }

    function handleGameEnd(finalScores) {
        console.log("處理遊戲結束...");
        if (scoreUpdateInterval) clearInterval(scoreUpdateInterval);
        scoreUpdateInterval = null;
        Game.endGame(finalScores);
    }
    
    function returnToRoomFromGame() {
        const resultsPopup = document.getElementById('results-popup');
        if (resultsPopup) resultsPopup.style.display = 'none';
        
        const buyBtn = document.getElementById('buy-character-btn');
        if (buyBtn) buyBtn.disabled = false;
        
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
            if (!roomListDiv) return;
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
                const gameModeText = room.gameMode === 'merge' ? '鬥靈合成' : '經典鬥靈';
                roomDiv.innerHTML = `<div class="room-item-header">${headerHTML}</div><div style="font-size: 0.8em; color: #ffc107; margin-bottom: 5px;">模式: ${gameModeText}</div><div class="room-item-players">房主: ${room.owner} | 人數: ${room.players.length}/${room.limit || '∞'}</div><div class="room-item-actions"><button class="join-btn">加入</button>${isAdmin ? `<button class="admin-close-btn">關閉</button>` : ''}</div>`;
                
                roomDiv.querySelector('.join-btn').addEventListener('click', () => {
                    if (room.password) {
                        const password = prompt('請輸入房間密碼:');
                        if (password === null) return;
                        tryJoinRoom(id, password);
                    } else {
                        tryJoinRoom(id, null);
                    }
                });

                if (isAdmin) {
                    const adminBtn = roomDiv.querySelector('.admin-close-btn');
                    if(adminBtn) {
                        adminBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (confirm(`確定要強制關閉房間 "${room.name}" 嗎？`)) {
                                socket.emit('adminCloseRoom', { roomId: id });
                            }
                        });
                    }
                }
                roomListDiv.appendChild(roomDiv);
            });
        });
    }
});