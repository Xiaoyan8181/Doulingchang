// --- 線上鬥靈功能 ---

// Socket.IO 連線
const socket = io('https://fog-erratic-paw.glitch.me'); 
let isSocketConnected = false; 
let currentUser = null;
let isAdmin = false; 
let currentRoomId = null;

// DOMContentLoaded確保在操作DOM前，頁面已載入
document.addEventListener('DOMContentLoaded', (event) => {
    const loadingPopup = document.getElementById('loading-popup');
    
    // Socket.IO 連線事件監聽器
    socket.on('connect', () => {
        console.log('成功連接到伺服器！ID:', socket.id);
        isSocketConnected = true;
        
        // 隱藏載入畫面，顯示登入頁面
        loadingPopup.style.display = 'none'; 
        document.getElementById('login-page').style.display = 'block';
    });

    socket.on('disconnect', () => {
        console.log('與伺服器斷線');
        isSocketConnected = false;
        alert('與伺服器斷線，請重新整理頁面！');
    });

    socket.on('connect_error', (err) => {
        console.error('連線錯誤:', err.message);
        loadingPopup.style.display = 'none';
        alert('無法連接到伺服器，請稍後再試。');
    });

    // --- V2 新增監聽器 ---
    socket.on('forceDisconnect', (message) => {
        alert(message);
        isSocketConnected = false;
        socket.disconnect();
        window.location.reload();
    });

    socket.on('updateOnlineUsers', (userList) => {
        const listDiv = document.getElementById('online-players-list');
        if (!listDiv) return;
        listDiv.innerHTML = '';
        userList.forEach(username => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-list-item';
            playerDiv.textContent = username;
            if (username === '黑鷺鷺') playerDiv.textContent += ' (管理員)';
            listDiv.appendChild(playerDiv);
        });
    });

    socket.on('playerListUpdate', (playerList) => {
        const listDiv = document.getElementById('in-room-players-list');
        if (!listDiv) return;
        listDiv.innerHTML = '';
        playerList.forEach(username => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-list-item';
            playerDiv.textContent = username;
            listDiv.appendChild(playerDiv);
        });
    });

    socket.on('roomClosed', (closedRoomId) => {
        if (currentRoomId === closedRoomId) {
            alert('您所在的房間已被房主或管理員關閉。');
            document.getElementById('room-page').style.display = 'none';
            document.getElementById('lobby-page').style.display = 'block';
            currentRoomId = null;
            loadRoomList();
        } else {
            // 如果不在該房間，只需從列表中移除
            const roomElement = document.getElementById(`room-${closedRoomId}`);
            if (roomElement) {
                roomElement.remove();
            }
        }
    });
    // ----------------------

    // ================== 事件監聽器 ==================
    document.getElementById('login-submit').addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        socket.emit('login', { username, password }, (response) => {
            if (response.success) {
                currentUser = username;
                isAdmin = response.isAdmin;
                document.getElementById('login-page').style.display = 'none';
                document.getElementById('lobby-page').style.display = 'block';
                loadRoomList();
            } else {
                alert(response.message);
            }
        });
    });

    document.getElementById('show-register').addEventListener('click', () => {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('register-page').style.display = 'block';
    });

    document.getElementById('back-to-login').addEventListener('click', () => {
        document.getElementById('register-page').style.display = 'none';
        document.getElementById('login-page').style.display = 'block';
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
                document.getElementById('register-page').style.display = 'none';
                document.getElementById('login-page').style.display = 'block';
            }
        });
    });

    document.getElementById('back-to-menu-from-lobby').addEventListener('click', () => {
        socket.emit('logout', { username: currentUser });
        // 直接導航回主頁面
        window.location.href = 'index.html';
    });

    document.getElementById('create-room').addEventListener('click', () => {
        document.getElementById('lobby-page').style.display = 'none';
        document.getElementById('create-room-page').style.display = 'block';
    });

    document.getElementById('room-public').addEventListener('change', (e) => {
        document.getElementById('room-password').style.display = e.target.value === 'false' ? 'block' : 'none';
    });

    document.getElementById('cancel-create').addEventListener('click', () => {
        document.getElementById('create-room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'block';
    });

    document.getElementById('confirm-create').addEventListener('click', () => {
        const room = {
            name: document.getElementById('room-name').value || `玩家 ${currentUser} 的房間`,
            isPublic: document.getElementById('room-public').value === 'true',
            password: document.getElementById('room-password').value,
            limit: parseInt(document.getElementById('room-limit').value),
            feedTime: parseInt(document.getElementById('feed-time').value),
            betTime: parseInt(document.getElementById('bet-time').value),
            owner: currentUser,
            players: [currentUser],
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
            if (room.password) {
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
        socket.emit('leaveRoom', { roomId: currentRoomId, username: currentUser });
        document.getElementById('room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'block';
        currentRoomId = null;
        loadRoomList();
    });
    
    document.getElementById('start-game').addEventListener('click', () => {
        socket.emit('startGame', currentRoomId);
    });

    // ================== 功能函式 ==================

    function tryJoinRoom(roomId, password) {
        socket.emit('joinRoom', { roomId, username: currentUser, password }, (response) => {
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
                
                let headerHTML = room.password ? '<span>🔑 </span>' : '';
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
                    if (room.password) {
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
                            socket.emit('adminCloseRoom', { roomId: id, username: currentUser }, (res) => {
                                if (!res.success) alert(res.message);
                            });
                        }
                    });
                }
                
                roomListDiv.appendChild(roomDiv);
            });
        });
    }

    function enterRoom(roomId) {
        document.getElementById('create-room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'none';
        document.getElementById('room-page').style.display = 'block';
        
        socket.emit('getRoomInfo', roomId, (room) => {
            if(room) {
                document.getElementById('room-title').textContent = room.name;
                document.getElementById('start-game').style.display = room.owner === currentUser ? 'block' : 'none';
                
                const listDiv = document.getElementById('in-room-players-list');
                listDiv.innerHTML = '';
                room.players.forEach(username => {
                    const playerDiv = document.createElement('div');
                    playerDiv.className = 'player-list-item';
                    playerDiv.textContent = username;
                    listDiv.appendChild(playerDiv);
                });
            } else {
                alert('無法獲取房間資訊，可能已被關閉。');
                document.getElementById('room-page').style.display = 'none';
                document.getElementById('lobby-page').style.display = 'block';
            }
        });
    }
    
    // ... 此處應包含您原有的其他遊戲邏輯，例如 'gameStarted', displaySpirits(), startFeedPhase() 等等 ...
});