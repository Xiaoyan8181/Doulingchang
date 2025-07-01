// --- 線上鬥靈功能 (V3.3 - 頁面管理重構版) ---

// Socket.IO 連線
const socket = io('https://fog-erratic-paw.glitch.me', { auth: {} }); 
let isSocketConnected = false; 
let currentUser = null;
let isAdmin = false; 
let currentRoomId = null;
let currentRoomOwner = null; 

// 將所有主要頁面容器的ID存成陣列，方便管理
const pageIds = ['login-page', 'register-page', 'lobby-page', 'create-room-page', 'room-page', 'game-page'];
const loadingPopup = document.getElementById('loading-popup');

/**
 * 新增：一個專門用來切換頁面的函式
 * @param {string} pageIdToShow 要顯示的頁面的ID
 */
function showPage(pageIdToShow) {
    // 先隱藏所有頁面
    pageIds.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.style.display = 'none';
        }
    });
    // 然後只顯示指定的頁面
    const targetPage = document.getElementById(pageIdToShow);
    if (targetPage) {
        targetPage.style.display = 'block'; // 使用 block 或 flex 取決於頁面佈局
        if (targetPage.classList.contains('page-layout')) {
             targetPage.style.display = 'flex';
        }
    }
}


document.addEventListener('DOMContentLoaded', (event) => {

    // 初始狀態下，所有頁面都應該是隱藏的，除了載入畫面
    pageIds.forEach(id => {
        const page = document.getElementById(id);
        if (page) page.style.display = 'none';
    });
    loadingPopup.style.display = 'flex';
    
    // Socket.IO 連線事件監聽器
    socket.on('connect', () => {
        console.log('成功連接到伺服器！ID:', socket.id);
        isSocketConnected = true;
        if (!currentUser) {
            loadingPopup.style.display = 'none'; 
            showPage('login-page');
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
            loadingPopup.style.display = 'none'; 
            alert(`無法連接到伺服器，請確認伺服器狀態或稍後再試。\n錯誤訊息: ${err.message}`);
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

    socket.on('updateOnlineUsers', (userList) => {
        const listDiv = document.getElementById('online-players-list');
        if (!listDiv) return;
        userList.sort((a, b) => {
            if (a === currentUser) return -1;
            if (b === currentUser) return 1;
            if (a === '黑鷺鷺') return -1;
            if (b === '黑鷺鷺') return 1;
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
    });

    socket.on('playerListUpdate', (playerList) => {
        updateInRoomPlayerList(playerList);
    });

    socket.on('roomClosed', (closedRoomId) => {
        if (currentRoomId === closedRoomId) {
            alert('房間已關閉');
            showPage('lobby-page');
            currentRoomId = null;
            currentRoomOwner = null;
            loadRoomList();
        } else {
            const roomElement = document.getElementById(`room-${closedRoomId}`);
            if (roomElement) {
                roomElement.remove();
            }
        }
    });
    
    socket.on('kicked', () => {
        alert('你已被房主踢掉');
        showPage('lobby-page');
        currentRoomId = null;
        currentRoomOwner = null;
        loadRoomList();
    });

    socket.on('gameStarted', (gameData) => {
        console.log("伺服器發送了遊戲開始信號！", gameData);
        if (typeof Game !== 'undefined' && typeof Game.init === 'function') {
            showPage('game-page');
            Game.init();
        } else {
            console.error("Game object or Game.init function not found! 請確認 merge-game.js 已正確載入。");
        }
    });

    // ================== 事件監聽器（使用 showPage 函式重構） ==================
    document.getElementById('login-submit').addEventListener('click', () => {
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
    });

    document.getElementById('show-register').addEventListener('click', () => {
        showPage('register-page');
    });

    document.getElementById('back-to-login').addEventListener('click', () => {
        showPage('login-page');
    });

    document.getElementById('register-submit').addEventListener('click', () => {
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
    });

    document.getElementById('back-to-menu-from-lobby').addEventListener('click', () => {
        currentUser = null;
        socket.auth = {};
        socket.disconnect();
        window.location.href = 'index.html';
    });

    document.getElementById('create-room').addEventListener('click', () => {
        showPage('create-room-page');
    });

    document.getElementById('cancel-create').addEventListener('click', () => {
        showPage('lobby-page');
    });

    document.getElementById('confirm-create').addEventListener('click', () => {
        const roomNameInput = document.getElementById('room-name');
        const roomIsPublic = document.getElementById('room-public').value === 'true';
        const roomPasswordInput = document.getElementById('room-password');
        const room = {
            name: roomNameInput.value || `玩家 ${currentUser} 的房間`,
            isPublic: roomIsPublic,
            password: (roomIsPublic && roomPasswordInput.value) ? roomPasswordInput.value : null,
            limit: parseInt(document.getElementById('room-limit').value),
            feedTime: parseInt(document.getElementById('feed-time').value),
            betTime: parseInt(document.getElementById('bet-time').value),
            status: 'open'
        };
        socket.emit('createRoom', room, (response) => {
            if (response.success) {
                currentRoomId = response.roomId;
                enterRoom(response.roomId);
            } else {
                alert(response.message);
            }
        });
    });

    document.getElementById('join-room').addEventListener('click', () => {
        const roomId = document.getElementById('join-room-id').value;
        if (!roomId) return alert('請輸入房間號');
        socket.emit('getRoomInfo', roomId, (room) => {
            if (!room) {
                return alert('房間不存在');
            }
            if (!room.isPublic) {
                const joinPassword = prompt('此為私人房間，請輸入房間密碼:');
                if (joinPassword === null) return;
                tryJoinRoom(roomId, joinPassword);
            } else if (room.password) {
                const joinPassword = prompt('請輸入房間密碼:');
                if (joinPassword === null) return;
                tryJoinRoom(roomId, joinPassword);
            } else {
                tryJoinRoom(roomId, null);
            }
        });
    });
    
    document.getElementById('refresh-rooms').addEventListener('click', loadRoomList);

    document.getElementById('back-to-lobby').addEventListener('click', () => {
        if (currentUser === currentRoomOwner) {
            if (!confirm('您是房主，離開將會關閉房間，確定嗎？')) {
                return;
            }
        }
        socket.emit('leaveRoom', { roomId: currentRoomId });
        showPage('lobby-page');
        currentRoomId = null;
        currentRoomOwner = null;
        loadRoomList();
    });
    
    document.getElementById('start-game').addEventListener('click', () => {
        const playerList = document.getElementById('in-room-players-list').children;
        if (playerList.length >= 2) {
            socket.emit('startGame', currentRoomId);
        } else {
            alert("房間人數需要兩人(含)以上才能開始遊戲！");
        }
    });

    // ================== 功能函式 ==================
    // ... 其他功能函式保持不變 ...
    function tryJoinRoom(roomId, password) {
        socket.emit('joinRoom', { roomId, password }, (response) => {
            if (response.success) {
                currentRoomId = roomId;
                enterRoom(roomId);
            } else {
                alert(response.message);
            }
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
                roomDiv.innerHTML = `
                    <div class="room-item-header">${headerHTML}</div>
                    <div class="room-item-players">房主: ${room.owner} | 人數: ${room.players.length}/${room.limit || '∞'}</div>
                    <div class="room-item-actions">
                        <button class="join-btn">加入</button>
                        ${isAdmin ? `<button class="admin-close-btn">關閉</button>` : ''}
                    </div>
                `;
                roomDiv.querySelector('.join-btn').addEventListener('click', () => {
                     if (!room.isPublic) {
                        const joinPassword = prompt('此為私人房間，請輸入房間密碼:');
                        if (joinPassword === null) return;
                        tryJoinRoom(id, joinPassword);
                    } else if (room.password) {
                        const joinPassword = prompt('請輸入房間密碼:');
                        if (joinPassword === null) return;
                        tryJoinRoom(id, joinPassword);
                    } else {
                        tryJoinRoom(id, null);
                    }
                });
                if (isAdmin) {
                    roomDiv.querySelector('.admin-close-btn').addEventListener('click', (e) => {
                        e.stopPropagation(); 
                        if (confirm(`確定要強制關閉房間 "${room.name}" 嗎？`)) {
                            socket.emit('adminCloseRoom', { roomId: id }, (res) => {
                                if (!res.success) alert(res.message);
                            });
                        }
                    });
                }
                roomListDiv.appendChild(roomDiv);
            });
        });
    }

    function updateInRoomPlayerList(playerList) {
        const listDiv = document.getElementById('in-room-players-list');
        if (!listDiv) return;
        listDiv.innerHTML = '';
        const isCurrentUserOwner = currentUser === currentRoomOwner;
        
        if (isCurrentUserOwner) {
            const startGameBtn = document.getElementById('start-game');
            if (playerList.length >= 2) {
                startGameBtn.disabled = false;
                startGameBtn.style.opacity = 1;
            } else {
                startGameBtn.disabled = true;
                startGameBtn.style.opacity = 0.5;
            }
        }

        playerList.forEach(username => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-list-item';
            let playerText = username;
            if (username === currentRoomOwner) playerText += ' (房主)';
            if (isCurrentUserOwner && username !== currentUser && username !== '黑鷺鷺') {
                playerDiv.innerHTML = `
                    <span>${playerText}</span>
                    <button class="kick-btn" data-username="${username}">X</button>
                `;
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

    function enterRoom(roomId) {
        showPage('room-page');
        socket.emit('getRoomInfo', roomId, (room) => {
            if(room) {
                currentRoomOwner = room.owner;
                document.getElementById('room-title').textContent = room.name;
                document.getElementById('room-id-display').textContent = `房號: ${roomId}`;
                document.getElementById('start-game').style.display = room.owner === currentUser ? 'block' : 'none';
                updateInRoomPlayerList(room.players);
            } else {
                alert('無法獲取房間資訊，可能已被關閉。');
                showPage('lobby-page');
                currentRoomId = null;
                currentRoomOwner = null;
            }
        });
    }
});
