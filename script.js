const socket = io('http://localhost:3000');

let currentUser = null;
let currentRoom = null;
let rooms = []; // 房間列表
let spirits = [
    { name: "火焰龍", rarity: "epic", hp: 100, atk: 80, def: 60, spd: 70, image: "fire-dragon.jpg" },
    { name: "冰霜狼", rarity: "rare", hp: 80, atk: 60, def: 70, spd: 90, image: "ice-wolf.jpg" },
    { name: "雷電鷹", rarity: "common", hp: 60, atk: 70, def: 50, spd: 100, image: "thunder-eagle.jpg" }
];
let customSpirits = JSON.parse(localStorage.getItem('customSpirits')) || [];
let selectedSpirits = [];
let coins = parseInt(localStorage.getItem('coins')) || 0;
let lastCheckIn = localStorage.getItem('lastCheckIn') || null;

function showPage(pageId) {
    document.querySelectorAll('div[id$="-page"]').forEach(page => page.style.display = 'none');
    document.getElementById(pageId).style.display = 'flex';
    if (pageId === 'lobby-page') {
        updateLobby();
        displayUsername(); // 新增：顯示帳號名稱
    }
    if (pageId === 'room-page') {
        updatePlayerList(); // 新增：更新房間內玩家列表
    }
}

// 新增：顯示帳號名稱
function displayUsername() {
    if (currentUser) {
        document.getElementById('username-display').textContent = `帳號: ${currentUser.username}`;
    }
}

// 每日簽到
document.getElementById('daily-check-in').addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    if (lastCheckIn !== today) {
        coins += 100;
        localStorage.setItem('coins', coins);
        localStorage.setItem('lastCheckIn', today);
        updateCoinsDisplay();
        alert('簽到成功！獲得 100 鬥靈幣');
    } else {
        alert('今天已經簽到過了！');
    }
});

function updateCoinsDisplay() {
    document.getElementById('coins-display').textContent = `鬥靈幣: ${coins}`;
}

// 房間管理
function createRoom() {
    const roomName = document.getElementById('room-name').value;
    const roomMode = document.getElementById('room-mode').value;
    if (roomName && currentUser) {
        const room = {
            id: Date.now().toString(),
            name: roomName,
            mode: roomMode,
            owner: currentUser.username, // 房主
            players: [{ username: currentUser.username }] // 房間內玩家列表
        };
        socket.emit('createRoom', room);
        currentRoom = room;
        showPage('room-page');
        document.getElementById('room-title').textContent = room.name;
    }
}

function updateLobby() {
    socket.emit('getRooms');
}

socket.on('updateRooms', (updatedRooms) => {
    rooms = updatedRooms;
    const roomList = document.getElementById('room-list');
    roomList.innerHTML = '';
    rooms.forEach(room => {
        const roomItem = document.createElement('div');
        roomItem.className = 'room-item';
        roomItem.textContent = `${room.name} (${room.mode}) - ${room.players.length} 位玩家`;
        roomItem.onclick = () => joinRoom(room.id);
        roomList.appendChild(roomItem);
    });
});

function joinRoom(roomId) {
    const room = rooms.find(r => r.id === roomId);
    if (room && currentUser) {
        // 檢查玩家是否已經在房間中
        const existingPlayer = room.players.find(p => p.username === currentUser.username);
        if (!existingPlayer) {
            room.players.push({ username: currentUser.username });
            socket.emit('joinRoom', { roomId, username: currentUser.username });
        }
        currentRoom = room;
        showPage('room-page');
        document.getElementById('room-title').textContent = room.name;
        updatePlayerList(); // 更新玩家列表
    }
}

// 新增：更新房間內玩家列表
function updatePlayerList() {
    if (currentRoom) {
        const playerList = document.getElementById('player-list-content');
        playerList.innerHTML = '';
        currentRoom.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.username;
            playerList.appendChild(li);
        });
    }
}

function leaveRoom() {
    if (currentRoom && currentUser) {
        // 如果是房主，關閉房間
        if (currentRoom.owner === currentUser.username) {
            socket.emit('closeRoom', currentRoom.id);
        } else {
            // 非房主，僅移除自己
            socket.emit('leaveRoom', { roomId: currentRoom.id, username: currentUser.username });
        }
        currentRoom = null;
        showPage('lobby-page');
    }
}

// 房主關閉房間時通知其他成員
socket.on('roomClosed', (roomId) => {
    if (currentRoom && currentRoom.id === roomId) {
        alert('房間已關閉');
        currentRoom = null;
        showPage('lobby-page');
    }
});

// 玩家離開房間時更新房間內玩家列表
socket.on('playerLeft', ({ roomId, username }) => {
    if (currentRoom && currentRoom.id === roomId) {
        currentRoom.players = currentRoom.players.filter(p => p.username !== username);
        updatePlayerList();
    }
});

// 玩家加入房間時更新房間內玩家列表
socket.on('playerJoined', ({ roomId, username }) => {
    if (currentRoom && currentRoom.id === roomId) {
        // 確保玩家不重複
        if (!currentRoom.players.some(p => p.username === username)) {
            currentRoom.players.push({ username });
        }
        updatePlayerList();
    }
});

function startGame() {
    alert('遊戲開始！');
}

// 登入與註冊
document.getElementById('login-submit').addEventListener('click', () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    socket.emit('login', { username, password });
});

socket.on('loginSuccess', (user) => {
    currentUser = user;
    showPage('lobby-page');
    updateCoinsDisplay();
});

socket.on('loginFailure', () => {
    alert('登入失敗，請檢查帳號或密碼');
});

document.getElementById('show-register').addEventListener('click', () => showPage('register-page'));
document.getElementById('back-to-login').addEventListener('click', () => showPage('login-page'));
document.getElementById('back-to-menu-from-login').addEventListener('click', () => showPage('menu-page'));

document.getElementById('register-submit').addEventListener('click', () => {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    socket.emit('register', { username, password });
});

socket.on('registerSuccess', () => {
    alert('註冊成功，請登入');
    showPage('login-page');
});

socket.on('registerFailure', () => {
    alert('註冊失敗，帳號已存在');
});

// 單人模式與計算機（省略不變的部分）
function renderSpirits(containerId, spiritsList, selectable = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    spiritsList.forEach(spirit => {
        const spiritDiv = document.createElement('div');
        spiritDiv.className = `spirit ${spirit.rarity}`;
        spiritDiv.style.backgroundImage = `url(${spirit.image})`;
        spiritDiv.textContent = spirit.name;
        if (selectable) {
            spiritDiv.onclick = () => selectSpirit(spirit);
        }
        container.appendChild(spiritDiv);
    });
}

function selectSpirit(spirit) {
    if (selectedSpirits.length < 3 && !selectedSpirits.includes(spirit)) {
        selectedSpirits.push(spirit);
        renderSelectedSpirits();
    }
}

function renderSelectedSpirits() {
    const selectedList = document.getElementById('selected-list');
    selectedList.innerHTML = '';
    selectedSpirits.forEach(spirit => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-item';
        const spiritDiv = document.createElement('div');
        spiritDiv.className = `spirit ${spirit.rarity}`;
        spiritDiv.style.backgroundImage = `url(${spirit.image})`;
        spiritDiv.textContent = spirit.name;
        spiritDiv.onclick = () => removeSpirit(spirit);
        itemDiv.appendChild(spiritDiv);

        const propRow = document.createElement('div');
        propRow.className = 'prop-row';
        ['hp', 'atk', 'def', 'spd'].forEach(prop => {
            const wrapper = document.createElement('div');
            wrapper.className = 'input-wrapper';
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'prop-input';
            input.value = spirit[prop];
            input.onchange = (e) => spirit[prop] = parseInt(e.target.value);
            const label = document.createElement('div');
            label.className = 'prop-label';
            label.textContent = prop.toUpperCase();
            wrapper.appendChild(input);
            wrapper.appendChild(label);
            propRow.appendChild(wrapper);
        });
        itemDiv.appendChild(propRow);
        selectedList.appendChild(itemDiv);
    });
}

function removeSpirit(spirit) {
    selectedSpirits = selectedSpirits.filter(s => s !== spirit);
    renderSelectedSpirits();
}

function confirmSelection() {
    if (selectedSpirits.length === 3) {
        alert('鬥靈選擇完成！');
    } else {
        alert('請選擇 3 隻鬥靈！');
    }
}

function calculatePower() {
    const results = document.getElementById('calculation-results');
    results.innerHTML = '';
    selectedSpirits.forEach(spirit => {
        const totalPower = spirit.hp + spirit.atk + spirit.def + spirit.spd;
        const winRate = (totalPower / 400) * 100;
        const resultRow = document.createElement('div');
        resultRow.className = 'result-row';
        const spiritDiv = document.createElement('div');
        spiritDiv.className = `spirit ${spirit.rarity}`;
        spiritDiv.style.backgroundImage = `url(${spirit.image})`;
        spiritDiv.textContent = spirit.name;
        resultRow.appendChild(spiritDiv);

        const barContainer = document.createElement('div');
        barContainer.className = 'win-rate-bar-container';
        const bar = document.createElement('div');
        bar.className = 'win-rate-bar';
        bar.style.width = `${winRate}%`;
        barContainer.appendChild(bar);
        resultRow.appendChild(barContainer);

        const winRateText = document.createElement('div');
        winRateText.className = 'win-rate-text';
        winRateText.textContent = `勝率: ${winRate.toFixed(2)}%`;
        resultRow.appendChild(winRateText);

        const propsText = document.createElement('div');
        propsText.className = 'props-text';
        propsText.innerHTML = `HP: <span class="${spirit.hp >= 80 ? 'positive' : 'negative'}">${spirit.hp}</span><br>
                              攻擊力: <span class="${spirit.atk >= 70 ? 'positive' : 'negative'}">${spirit.atk}</span><br>
                              防禦力: <span class="${spirit.def >= 60 ? 'positive' : 'negative'}">${spirit.def}</span><br>
                              速度: <span class="${spirit.spd >= 80 ? 'positive' : 'negative'}">${spirit.spd}</span>`;
        resultRow.appendChild(propsText);

        results.appendChild(resultRow);
    });
}

// 自訂鬥靈
document.getElementById('custom-spirit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = e.target['spirit-name'].value;
    const hp = parseInt(e.target.hp.value);
    const atk = parseInt(e.target.atk.value);
    const def = parseInt(e.target.def.value);
    const spd = parseInt(e.target.spd.value);
    if (name && hp && atk && def && spd) {
        const newSpirit = { name, rarity: 'custom', hp, atk, def, spd, image: 'custom-spirit.jpg' };
        customSpirits.push(newSpirit);
        localStorage.setItem('customSpirits', JSON.stringify(customSpirits));
        renderCustomSpirits();
        e.target.reset();
    }
});

function renderCustomSpirits() {
    const customList = document.getElementById('custom-spirit-list');
    customList.innerHTML = '';
    customSpirits.forEach((spirit, index) => {
        const entry = document.createElement('div');
        entry.className = 'custom-spirit-entry';
        entry.textContent = `${spirit.name} - HP: ${spirit.hp}, 攻擊力: ${spirit.atk}, 防禦力: ${spirit.def}, 速度: ${spirit.spd}`;
        const deleteButton = document.createElement('button');
        deleteButton.textContent = '刪除';
        deleteButton.onclick = () => {
            customSpirits.splice(index, 1);
            localStorage.setItem('customSpirits', JSON.stringify(customSpirits));
            renderCustomSpirits();
        };
        entry.appendChild(deleteButton);
        customList.appendChild(entry);
    });
}

function saveSettings() {
    const bgmVolume = document.getElementById('bgm-volume').value;
    const sfxVolume = document.getElementById('sfx-volume').value;
    localStorage.setItem('bgmVolume', bgmVolume);
    localStorage.setItem('sfxVolume', sfxVolume);
    alert('設定已儲存');
}

// 初始化
renderSpirits('spirit-list', [...spirits, ...customSpirits], true);
renderSpirits('calculation-spirits', [...spirits, ...customSpirits], true);
renderCustomSpirits();
updateCoinsDisplay();
