// --- 線上鬥靈功能 (V3.0 - JWT 安全認證版) ---

// Socket.IO 連線
// 初始連線時 auth 為空
const socket = io('https://fog-erratic-paw.glitch.me', { auth: {} }); 
let isSocketConnected = false; 
let currentUser = null;
let isAdmin = false; 
let currentRoomId = null;
let currentRoomOwner = null; 

document.addEventListener('DOMContentLoaded', (event) => {
    const loadingPopup = document.getElementById('loading-popup');
    
    // Socket.IO 連線事件監聽器
    socket.on('connect', () => {
        console.log('成功連接到伺服器！ID:', socket.id);
        isSocketConnected = true;
        // 只有在還沒有 currentUser (即未登入) 時才顯示登入畫面
        // 這可以處理斷線重連後不用再登入一次的情況
        if (!currentUser) {
            loadingPopup.style.display = 'none'; 
            document.getElementById('login-page').style.display = 'block';
        }
    });

    socket.on('disconnect', () => {
        console.log('與伺服器斷線');
        isSocketConnected = false;
        // 不再自動重載，讓 socket.io 自動重連
        alert('與伺服器斷線，正在嘗試重新連接...');
    });
    
    // 新增：處理驗證錯誤
    socket.on('connect_error', (err) => {
        // 如果是驗證錯誤，表示 token 過期或無效
        if (err.message === "Authentication error") {
            console.error('驗證錯誤，請重新登入');
            // 清除本地用戶數據並強制重載到登入頁面
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
        socket.auth = {}; // 清除 token
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
            document.getElementById('room-page').style.display = 'none';
            document.getElementById('lobby-page').style.display = 'block';
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
        document.getElementById('room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'block';
        currentRoomId = null;
        currentRoomOwner = null;
        loadRoomList();
    });

    // === 新增：監聽遊戲開始事件 ===
    socket.on('gameStarted', () => {
        console.log("伺服器發送 gameStarted 事件，準備初始化遊戲...");
        Game.init();
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
                
                // 修正：儲存 token 以供後續連線使用
                socket.auth = { token: response.token };
                
                // 連線並傳送驗證資料
                socket.disconnect(); // 先斷開
                socket.connect();   // 再重連，這次會帶上 token
                
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
        // 登出時也應該清理 token
        currentUser = null;
        socket.auth = {};
        socket.disconnect();
        window.location.href = 'index.html';
    });

    document.getElementById('create-room').addEventListener('click', () => {
        document.getElementById('lobby-page').style.display = 'none';
        document.getElementById('create-room-page').style.display = 'block';
    });

    document.getElementById('room-public').addEventListener('change', (e) => {
        document.getElementById('room-password').style.display = e.target.value === 'true' ? 'block' : 'none';
    });
    document.getElementById('room-password').style.display = document.getElementById('room-public').value === 'true' ? 'block' : 'none';

    document.getElementById('cancel-create').addEventListener('click', () => {
        document.getElementById('create-room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'block';
    });

    // 修正：創建房間時不再需要傳遞 owner 和 players
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
            // owner 和 players 會由伺服器根據 token 自動設定
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
            if (room.isPublic && room.password) {
                const joinPassword = prompt('請輸入房間密碼:');
                if (joinPassword === null) return;
                tryJoinRoom(roomId, joinPassword);
            } else if (!room.isPublic){
                const joinPassword = prompt('此為私人房間，請輸入房間密碼:');
                if (joinPassword === null) return;
                tryJoinRoom(roomId, joinPassword);
            }
             else {
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
        // 修正：不再需要傳遞 username，伺服器會從 token 讀取
        socket.emit('leaveRoom', { roomId: currentRoomId });
        
        document.getElementById('room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'block';
        currentRoomId = null;
        currentRoomOwner = null;
        loadRoomList();
    });
    
    document.getElementById('start-game').addEventListener('click', () => {
        // 通知伺服器，此房間遊戲開始。伺服器應向房間內所有人廣播 'gameStarted'
        socket.emit('startGame', currentRoomId);
    });

    // ================== 功能函式 ==================

    // 修正：加入房間時不再需要傳遞 username
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
        // ... 此部分邏輯不變 ...
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
                let headerHTML = (room.isPublic && room.password) ? '<span>🔑 </span>' : '';
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
                    if (room.isPublic && room.password) {
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
                            socket.emit('adminCloseRoom', { roomId: id }, (res) => { // 不再需要傳 username
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
        document.getElementById('create-room-page').style.display = 'none';
        document.getElementById('lobby-page').style.display = 'none';
        document.getElementById('room-page').style.display = 'block';
        socket.emit('getRoomInfo', roomId, (room) => {
            if(room) {
                currentRoomOwner = room.owner;
                document.getElementById('room-title').textContent = room.name;
                document.getElementById('room-id-display').textContent = `房號: ${roomId}`;
                document.getElementById('start-game').style.display = room.owner === currentUser ? 'block' : 'none';
                updateInRoomPlayerList(room.players);
            } else {
                alert('無法獲取房間資訊，可能已被關閉。');
                document.getElementById('room-page').style.display = 'none';
                document.getElementById('lobby-page').style.display = 'block';
                currentRoomId = null;
                currentRoomOwner = null;
            }
        });
    }

    // === 整合進來的合成遊戲邏輯 ===
    const Game = {
        // 遊戲狀態
        state: {
            gold: 500,
            gridLevel: 1,
            currentXP: 0,
            xpToNextLevel: 10,
            gridSize: 3,
            grid: [], // 儲存格子的數據，例如 [{ level: 1, id: 'char-12345' }, null, ...]
            charactersOnBoard: 0,
            gameLoopInterval: null,
            uniqueIdCounter: 0,
        },
    
        // DOM 元素快取
        elements: {},
    
        // 初始化遊戲
        init() {
            console.log("開始初始化合成遊戲...");
            this.cacheDOMElements();
            this.resetState();
            this.renderInitialUI();
            this.setupEventListeners();
            this.state.gameLoopInterval = setInterval(this.gameLoop.bind(this), 1000); // 每秒執行一次遊戲循環
            document.getElementById('room-page').style.display = 'none';
            this.elements.gamePage.style.display = 'flex';
        },
        
        // 初始化/重置遊戲狀態
        resetState() {
            this.state.gold = 500;
            this.state.gridLevel = 1;
            this.state.currentXP = 0;
            this.state.xpToNextLevel = 10;
            this.state.gridSize = 3;
            this.state.grid = Array(9).fill(null);
            this.state.charactersOnBoard = 0;
            this.state.uniqueIdCounter = 0;
            if (this.state.gameLoopInterval) {
                clearInterval(this.state.gameLoopInterval);
            }
        },
    
        // 快取常用的 DOM 元素
        cacheDOMElements() {
            this.elements.gamePage = document.getElementById('game-page');
            this.elements.goldDisplay = document.getElementById('gold-display');
            this.elements.gridLevelDisplay = document.getElementById('grid-level-display');
            this.elements.xpBar = document.getElementById('xp-bar-fill');
            this.elements.xpText = document.getElementById('xp-text');
            this.elements.gameGrid = document.getElementById('game-grid');
            this.elements.buyButton = document.getElementById('buy-character-btn');
            this.elements.leaveGameButton = document.getElementById('leave-game-btn');
        },
    
        // 渲染初始介面
        renderInitialUI() {
            this.updateStatsUI();
            this.renderGrid();
        },
        
        // 更新頂部狀態 UI
        updateStatsUI() {
            this.elements.goldDisplay.textContent = this.state.gold;
            this.elements.gridLevelDisplay.textContent = this.state.gridLevel;
            const xpPercentage = (this.state.currentXP / this.state.xpToNextLevel) * 100;
            this.elements.xpBar.style.width = `${xpPercentage}%`;
            this.elements.xpText.textContent = `${this.state.currentXP} / ${this.state.xpToNextLevel}`;
        },
    
        // 渲染整個遊戲格子
        renderGrid() {
            this.elements.gameGrid.innerHTML = '';
            this.elements.gameGrid.style.gridTemplateColumns = `repeat(${this.state.gridSize}, 1fr)`;
            this.elements.gameGrid.style.gridTemplateRows = `repeat(${this.state.gridSize}, 1fr)`;
    
            for (let i = 0; i < this.state.gridSize * this.state.gridSize; i++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.index = i;
    
                const characterData = this.state.grid[i];
                if (characterData) {
                    const characterDiv = this.createCharacterElement(characterData);
                    cell.appendChild(characterDiv);
                }
                this.elements.gameGrid.appendChild(cell);
            }
        },
    
        // 創建一個角色(圖片)的 DOM 元素
        createCharacterElement(characterData) {
            const characterDiv = document.createElement('div');
            characterDiv.className = 'character';
            characterDiv.draggable = true;
            characterDiv.id = characterData.id;
            characterDiv.dataset.level = characterData.level;
            
            const img = document.createElement('img');
            img.src = this.getCharacterImage(characterData.level);
            // 防止圖片本身被拖曳，我們只拖曳外層的 div
            img.ondragstart = (e) => e.preventDefault();
            
            characterDiv.appendChild(img);
            return characterDiv;
        },
        
        // 根據等級獲取圖片路徑
        getCharacterImage(level) {
            const imageNumber = 34 - level; // 等級1對應033.png, 等級33對應001.png
            return `images/${String(imageNumber).padStart(3, '0')}.png`; // [修正] 新增 images/ 路徑
        },
    
        // 設定事件監聽器
        setupEventListeners() {
            this.elements.buyButton.addEventListener('click', this.handleBuy.bind(this));
            this.elements.leaveGameButton.addEventListener('click', this.handleLeaveGame.bind(this));

            // Drag and Drop 事件
            let dragSrcElement = null;
    
            this.elements.gameGrid.addEventListener('dragstart', (e) => {
                if (e.target.classList.contains('character')) {
                    dragSrcElement = e.target;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/html', e.target.innerHTML);
                    // 讓拖曳時的 ghost 圖片稍微透明
                    setTimeout(() => e.target.classList.add('dragging'), 0);
                }
            });
    
            this.elements.gameGrid.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
    
            this.elements.gameGrid.addEventListener('dragenter', (e) => {
                const targetCell = e.target.closest('.grid-cell');
                if(targetCell) {
                    targetCell.classList.add('drag-over');
                }
            });
    
            this.elements.gameGrid.addEventListener('dragleave', (e) => {
                const targetCell = e.target.closest('.grid-cell');
                if(targetCell) {
                    targetCell.classList.remove('drag-over');
                }
            });
    
            this.elements.gameGrid.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const dropTarget = e.target;
                const targetCell = dropTarget.closest('.grid-cell');
                if(targetCell) {
                    targetCell.classList.remove('drag-over');
                }
                if (dragSrcElement) {
                    this.handleDrop(dragSrcElement, dropTarget);
                }
            });
    
            this.elements.gameGrid.addEventListener('dragend', (e) => {
                if (dragSrcElement) {
                    dragSrcElement.classList.remove('dragging');
                    dragSrcElement = null;
                }
            });
        },
    
        // 處理購買按鈕
        handleBuy() {
            const cost = 10;
            if (this.state.gold < cost) {
                alert("金幣不足！");
                return;
            }
            if (this.state.charactersOnBoard >= this.state.grid.length) {
                alert("格子已滿！");
                return;
            }
    
            this.state.gold -= cost;
            
            // 找到一個空格子
            let emptyCells = [];
            this.state.grid.forEach((cell, index) => {
                if (cell === null) {
                    emptyCells.push(index);
                }
            });
            
            const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            
            // 隨機生成角色等級
            const characterLevel = Math.floor(Math.random() * this.state.gridLevel) + 1;
            
            const newCharacter = {
                level: characterLevel,
                id: `char-${this.state.uniqueIdCounter++}`
            };
    
            this.state.grid[randomIndex] = newCharacter;
            this.state.charactersOnBoard++;
    
            this.updateStatsUI();
            this.renderGrid();
        },
    
        // 處理拖放邏輯
        handleDrop(draggedElement, dropTarget) {
            const srcIndex = parseInt(draggedElement.parentElement.dataset.index, 10);
            let destIndex;
            
            const destCell = dropTarget.closest('.grid-cell');
            if (!destCell) return; // 無效的放置目標
            destIndex = parseInt(destCell.dataset.index, 10);
            
            const srcChar = this.state.grid[srcIndex];
            const destChar = this.state.grid[destIndex];
    
            if (srcIndex === destIndex) return; // 沒移動
    
            // 情況一：合併 (等級相同且都不是最高級)
            if (destChar && srcChar.level === destChar.level && srcChar.level < 33) {
                const newLevel = srcChar.level + 1;
                this.state.grid[destIndex].level = newLevel; // 目標格子升級
                this.state.grid[srcIndex] = null; // 來源格子清空
                this.state.charactersOnBoard--;
    
                this.addXP(newLevel); // 增加經驗值
    
            // 情況二：交換位置
            } else {
                [this.state.grid[srcIndex], this.state.grid[destIndex]] = 
                [this.state.grid[destIndex], this.state.grid[srcIndex]];
            }
            
            this.renderGrid();
        },
        
        // 處理離開遊戲
        handleLeaveGame() {
            if (!confirm('確定要結束遊戲並返回大廳嗎？遊戲進度不會儲存。')) {
                return;
            }
            // 1. 清理遊戲狀態
            clearInterval(this.state.gameLoopInterval);
            this.state.gameLoopInterval = null;
            // 2. 隱藏遊戲頁面，顯示大廳頁面
            this.elements.gamePage.style.display = 'none';
            document.getElementById('lobby-page').style.display = 'block';
            // 3. 通知伺服器離開房間
            if (socket && currentRoomId) {
                socket.emit('leaveRoom', { roomId: currentRoomId });
                currentRoomId = null;
                currentRoomOwner = null;
                loadRoomList();
            }
        },

        // 增加經驗值並檢查升級
        addXP(amount) {
            this.state.currentXP += amount;
            while (this.state.currentXP >= this.state.xpToNextLevel) {
                this.state.currentXP -= this.state.xpToNextLevel;
                this.state.gridLevel++;
                // 根據規則計算下一級所需經驗
                this.state.xpToNextLevel = 5 * (this.state.gridLevel + 1);
                this.checkGridExpansion();
            }
            this.updateStatsUI();
        },
        
        // 檢查格子是否需要擴充
        checkGridExpansion() {
            let newSize = this.state.gridSize;
            if (this.state.gridLevel >= 30) newSize = 7;
            else if (this.state.gridLevel >= 20) newSize = 6;
            else if (this.state.gridLevel >= 10) newSize = 5;
            else if (this.state.gridLevel >= 5) newSize = 4;
            
            if (newSize > this.state.gridSize) {
                const oldSize = this.state.gridSize;
                const newGrid = Array(newSize * newSize).fill(null);
                
                // 將舊格子數據複製到新格子
                for (let r = 0; r < oldSize; r++) {
                    for (let c = 0; c < oldSize; c++) {
                        newGrid[r * newSize + c] = this.state.grid[r * oldSize + c];
                    }
                }
                this.state.grid = newGrid;
                this.state.gridSize = newSize;
                this.renderGrid();
            }
        },
    
        // 遊戲主循環（用於賺錢）
        gameLoop() {
            let income = 0;
            this.state.grid.forEach(char => {
                if (char) {
                    // 收入公式: 等級^2 - 1
                    income += Math.pow(char.level, 2) - 1;
                }
            });
    
            if (income > 0) {
                this.state.gold += income;
                this.updateStatsUI();
            }
        }
    };
});
