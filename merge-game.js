// merge-game.js - 合成小遊戲核心邏輯

const Game = {
    // 遊戲狀態
    state: {
        gold: 500,
        gridLevel: 1,
        currentXP: 0,
        xpToNextLevel: 10,
        gridSize: 3,
        grid: [],
        charactersOnBoard: 0,
        gameLoopInterval: null,
        uniqueIdCounter: 0,
        isGameActive: false,
        eventListenersAttached: false,
        buyCount: 0,
        goldSpent: 0,
    },

    // DOM 元素快取
    elements: {},

    // 初始化遊戲
    init() {
        console.log("初始化合成遊戲核心...");
        this.cacheDOMElements();
        this.resetState();
        this.renderInitialUI();

        if (!this.state.eventListenersAttached) {
            this.setupEventListeners();
            this.state.eventListenersAttached = true;
        }

        this.state.gameLoopInterval = setInterval(this.gameLoop.bind(this), 1000);
        this.state.isGameActive = true;
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
        this.state.isGameActive = false;
        this.state.buyCount = 0;
        this.state.goldSpent = 0;
        if (this.state.gameLoopInterval) {
            clearInterval(this.state.gameLoopInterval);
            this.state.gameLoopInterval = null;
        }
        if(this.elements.buyButton) {
            this.elements.buyButton.disabled = false;
        }
    },

    // 快取常用的 DOM 元素
    cacheDOMElements() {
        this.elements.goldDisplay = document.getElementById('gold-display');
        this.elements.gridLevelDisplay = document.getElementById('grid-level-display');
        this.elements.incomeRateDisplay = document.getElementById('income-rate-display');
        this.elements.xpBar = document.getElementById('xp-bar-fill');
        this.elements.xpText = document.getElementById('xp-text');
        this.elements.gameGrid = document.getElementById('game-grid');
        this.elements.buyButton = document.getElementById('buy-character-btn');
        this.elements.gameTimer = document.getElementById('game-timer');
        this.elements.scoreboardList = document.getElementById('scoreboard-list');
        this.elements.resultsPopup = document.getElementById('results-popup');
        this.elements.finalRankings = document.getElementById('final-rankings');
    },

    // 渲染初始介面
    renderInitialUI() {
        this.updateStatsUI();
        this.renderGrid();
        this.updateBuyButtonText();
        this.updateIncomeRateDisplay();
    },
    
    // 更新頂部狀態 UI
    updateStatsUI() {
        if (!this.elements.goldDisplay) return;
        this.elements.goldDisplay.textContent = this.state.gold;
        this.elements.gridLevelDisplay.textContent = this.state.gridLevel;
        const xpPercentage = (this.state.currentXP / this.state.xpToNextLevel) * 100;
        this.elements.xpBar.style.width = `${xpPercentage}%`;
        this.elements.xpText.textContent = `${this.state.currentXP} / ${this.state.xpToNextLevel}`;
    },

    // 更新購買按鈕的價格顯示
    updateBuyButtonText() {
        if (!this.elements.buyButton) return;
        const nextCost = this.state.buyCount * 10;
        if (this.state.buyCount === 0) {
            this.elements.buyButton.textContent = '購買角色 (免費)';
        } else {
            this.elements.buyButton.textContent = `購買角色 (${nextCost} 金幣)`;
        }
    },

    // 更新每秒產出顯示
    updateIncomeRateDisplay() {
        if (!this.elements.incomeRateDisplay) return;
        let currentIncome = 0;
        this.state.grid.forEach(char => {
            if (char) {
                currentIncome += Math.pow(char.level, 2) - 1;
            }
        });
        this.elements.incomeRateDisplay.textContent = currentIncome;
    },

    renderGrid() {
        if (!this.elements.gameGrid) return;
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

    createCharacterElement(characterData) {
        const characterDiv = document.createElement('div');
        characterDiv.className = 'character';
        characterDiv.draggable = this.state.isGameActive;
        characterDiv.id = characterData.id;
        characterDiv.dataset.level = characterData.level;
        
        const img = document.createElement('img');
        img.src = this.getCharacterImage(characterData.level);
        img.ondragstart = (e) => e.preventDefault();
        
        characterDiv.appendChild(img);
        return characterDiv;
    },
    
    getCharacterImage(level) {
        const imageNumber = 34 - level;
        return `images/${String(imageNumber).padStart(3, '0')}.png`;
    },

    setupEventListeners() {
        if (!this.elements.buyButton || !this.elements.gameGrid) return;
        this.elements.buyButton.addEventListener('click', this.handleBuy.bind(this));
        let dragSrcElement = null;
        this.elements.gameGrid.addEventListener('dragstart', (e) => { if (this.state.isGameActive && e.target.classList.contains('character')) { dragSrcElement = e.target; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', e.target.innerHTML); setTimeout(() => e.target.classList.add('dragging'), 0); } });
        this.elements.gameGrid.addEventListener('dragover', (e) => { if (this.state.isGameActive) e.preventDefault(); });
        this.elements.gameGrid.addEventListener('dragenter', (e) => { const targetCell = e.target.closest('.grid-cell'); if (this.state.isGameActive && targetCell) { targetCell.classList.add('drag-over'); } });
        this.elements.gameGrid.addEventListener('dragleave', (e) => { const targetCell = e.target.closest('.grid-cell'); if(targetCell) { targetCell.classList.remove('drag-over'); } });
        this.elements.gameGrid.addEventListener('drop', (e) => { e.preventDefault(); e.stopPropagation(); const targetCell = e.target.closest('.grid-cell'); if(targetCell) targetCell.classList.remove('drag-over'); if (this.state.isGameActive && dragSrcElement) { this.handleDrop(dragSrcElement, e.target); } });
        this.elements.gameGrid.addEventListener('dragend', (e) => { if (dragSrcElement) { dragSrcElement.classList.remove('dragging'); dragSrcElement = null; } });
    },

    getWeightedRandomLevel() {
        const gl = this.state.gridLevel;
        let weights = [];
        weights.push({ level: 1, weight: 20 });
        if (gl >= 2) { weights.push({ level: 2, weight: 3 + 2 * (gl - 2) }); }
        if (gl >= 5) { weights.push({ level: 3, weight: 5 + 2 * (gl - 5) }); }
        if (gl >= 8) {
            let w4 = (gl < 16) ? (6 + 1 * (gl - 8)) : (13 + 2 * (gl - 15));
            weights.push({ level: 4, weight: w4 });
        }
        if (gl >= 12) {
            let w5 = (gl < 16) ? (5 + 1 * (gl - 12)) : (8 + 2 * (gl - 15));
            weights.push({ level: 5, weight: w5 });
        }
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        for (const item of weights) {
            if (random < item.weight) return item.level;
            random -= item.weight;
        }
        return weights[weights.length - 1].level;
    },

    handleBuy() {
        if (!this.state.isGameActive) return;
        const cost = this.state.buyCount * 10;
        if (this.state.gold < cost) {
            alert("金幣不足！");
            return;
        }
        if (this.state.charactersOnBoard >= this.state.grid.length) {
            alert("格子已滿！");
            return;
        }

        this.state.gold -= cost;
        this.state.goldSpent += cost;
        this.state.buyCount++;
        
        let emptyCells = [];
        this.state.grid.forEach((cell, index) => {
            if (cell === null) emptyCells.push(index);
        });
        
        const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const characterLevel = this.getWeightedRandomLevel();
        const newCharacter = { level: characterLevel, id: `char-${this.state.uniqueIdCounter++}` };

        this.state.grid[randomIndex] = newCharacter;
        this.state.charactersOnBoard++;

        this.updateStatsUI();
        this.renderGrid();
        this.updateBuyButtonText();
        this.updateIncomeRateDisplay();
    },

    handleDrop(draggedElement, dropTarget) {
        const srcIndex = parseInt(draggedElement.parentElement.dataset.index, 10);
        const destCell = dropTarget.closest('.grid-cell');
        if (!destCell) return;
        const destIndex = parseInt(destCell.dataset.index, 10);
        const srcChar = this.state.grid[srcIndex];
        const destChar = this.state.grid[destIndex];

        if (srcIndex === destIndex) return;

        if (destChar && srcChar.level === destChar.level && srcChar.level < 33) {
            const newLevel = srcChar.level + 1;
            this.state.grid[destIndex].level = newLevel;
            this.state.grid[srcIndex] = null;
            this.state.charactersOnBoard--;
            this.addXP(newLevel);
            
            // 【新增】觸發合併閃光效果
            destCell.classList.add('merge-flash');
            setTimeout(() => {
                destCell.classList.remove('merge-flash');
            }, 400); // 移除 class 的時間應與 CSS 動畫時間匹配

        } else {
            [this.state.grid[srcIndex], this.state.grid[destIndex]] = [this.state.grid[destIndex], this.state.grid[srcIndex]];
        }
        
        this.renderGrid();
        this.updateIncomeRateDisplay();
    },
    
    addXP(amount) {
        this.state.currentXP += amount;
        while (this.state.currentXP >= this.state.xpToNextLevel) {
            this.state.currentXP -= this.state.xpToNextLevel;
            this.state.gridLevel++;
            this.state.xpToNextLevel = 5 * (this.state.gridLevel + 1);
            this.checkGridExpansion();
        }
        this.updateStatsUI();
    },
    
    checkGridExpansion() {
        let newSize = this.state.gridSize;
        if (this.state.gridLevel >= 30) newSize = 7;
        else if (this.state.gridLevel >= 20) newSize = 6;
        else if (this.state.gridLevel >= 10) newSize = 5;
        else if (this.state.gridLevel >= 5) newSize = 4;
        if (newSize > this.state.gridSize) {
            const oldSize = this.state.gridSize;
            const newGrid = Array(newSize * newSize).fill(null);
            for (let r = 0; r < oldSize; r++) { for (let c = 0; c < oldSize; c++) { newGrid[r * newSize + c] = this.state.grid[r * oldSize + c]; } }
            this.state.grid = newGrid;
            this.state.gridSize = newSize;
            this.renderGrid();
        }
    },

    gameLoop() {
        if (!this.state.isGameActive) return;
        let income = 0;
        this.state.grid.forEach(char => {
            if (char) {
                income += Math.pow(char.level, 2) - 1;
            }
        });

        if (income > 0) {
            this.state.gold += income;
            this.updateStatsUI();
        }
    },

    getScore() {
        let totalCharacterValue = 0;
        this.state.grid.forEach(char => {
            if (char) {
                totalCharacterValue += Math.pow(char.level, 2) - 1;
            }
        });
        return this.state.gold + totalCharacterValue + this.state.goldSpent;
    },

    updateTimer(timeLeft) {
        if (!this.elements.gameTimer) return;
        if (timeLeft < 0) timeLeft = 0;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        this.elements.gameTimer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    updateScoreboard(scores = []) {
        if (!this.elements.scoreboardList) return;
        this.elements.scoreboardList.innerHTML = '';
        scores.forEach((player, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            let scoreText = player.score;
            if (player.hasLeft) { scoreText += ' (已離開)'; scoreItem.style.opacity = '0.6'; }
            scoreItem.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${player.username}</span><span class="score">${scoreText}</span>`;
            this.elements.scoreboardList.appendChild(scoreItem);
        });
    },

    endGame(finalScores) {
        this.state.isGameActive = false;
        if (this.state.gameLoopInterval) { clearInterval(this.state.gameLoopInterval); this.state.gameLoopInterval = null; }
        if (this.elements.buyButton) { this.elements.buyButton.disabled = true; }
        if (this.elements.finalRankings) {
            this.elements.finalRankings.innerHTML = '';
            finalScores.forEach((player, index) => {
                const scoreItem = document.createElement('div');
                scoreItem.className = 'score-item';
                let scoreText = player.score;
                if (player.hasLeft) { scoreText += ' (已離開)'; scoreItem.style.opacity = '0.6'; }
                scoreItem.innerHTML = `<span class="rank">${index + 1}.</span><span class="name">${player.username}</span><span class="score">${scoreText}</span>`;
                this.elements.finalRankings.appendChild(scoreItem);
            });
        }
        if (this.elements.resultsPopup) { this.elements.resultsPopup.style.display = 'flex'; }
    }
};