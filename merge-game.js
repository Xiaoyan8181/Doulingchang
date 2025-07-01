// merge-game.js - 合成小遊戲核心邏輯

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
        this.elements.gamePage.style.display = 'block';
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
        return `${String(imageNumber).padStart(3, '0')}.png`;
    },

    // 設定事件監聽器
    setupEventListeners() {
        this.elements.buyButton.addEventListener('click', this.handleBuy.bind(this));

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
            if(e.target.classList.contains('grid-cell')) {
                e.target.classList.add('drag-over');
            }
        });

        this.elements.gameGrid.addEventListener('dragleave', (e) => {
            if(e.target.classList.contains('grid-cell')) {
                e.target.classList.remove('drag-over');
            }
        });

        this.elements.gameGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if(e.target.classList.contains('grid-cell')) {
                e.target.classList.remove('drag-over');
            }
            if (dragSrcElement) {
                this.handleDrop(dragSrcElement, e.target);
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

        // 判斷是放到格子還是角色上
        if (dropTarget.classList.contains('grid-cell')) {
            destIndex = parseInt(dropTarget.dataset.index, 10);
        } else if (dropTarget.parentElement.classList.contains('character')) {
            destIndex = parseInt(dropTarget.parentElement.parentElement.dataset.index, 10);
        } else {
            return; // 無效的放置目標
        }
        
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