/* ============================================================
   GAMES MODULE
   Snake, Minesweeper, Tetris with themes & persistence
============================================================ */

class GamesManager {
  constructor() {
    this.currentGame = null;
    this.snakeConfig = {
      color: '#22c55e',
      shape: 'rounded',
      speed: 5
    };
    this.loadGamePreferences();
  }

  loadGamePreferences() {
    const saved = localStorage.getItem('gamePreferences');
    if (saved) {
      this.snakeConfig = { ...this.snakeConfig, ...JSON.parse(saved) };
    }
  }

  saveGamePreferences() {
    localStorage.setItem('gamePreferences', JSON.stringify(this.snakeConfig));
  }
}

let gamesManager = new GamesManager();

/* ============================================================
   SNAKE GAME
============================================================ */

class SnakeGame {
  constructor(canvasId = 'snakeCanvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.gridSize = 20;
    this.gameWidth = this.canvas.width / this.gridSize;
    this.gameHeight = this.canvas.height / this.gridSize;
    
    this.reset();
    this.setupControls();
  }

  reset() {
    this.snake = [
      { x: Math.floor(this.gameWidth / 2), y: Math.floor(this.gameHeight / 2) }
    ];
    this.food = this.generateFood();
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.score = 0;
    this.gameRunning = false;
    this.gameLocked = false;
  }

  generateFood() {
    return {
      x: Math.floor(Math.random() * this.gameWidth),
      y: Math.floor(Math.random() * this.gameHeight)
    };
  }

  setupControls() {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  }

  handleKeyPress(e) {
    if (!this.gameRunning) return;

    const key = e.key.toLowerCase();
    const arrowMap = {
      'arrowup': { x: 0, y: -1 },
      'arrowdown': { x: 0, y: 1 },
      'arrowleft': { x: -1, y: 0 },
      'arrowright': { x: 1, y: 0 },
      'w': { x: 0, y: -1 },
      's': { x: 0, y: 1 },
      'a': { x: -1, y: 0 },
      'd': { x: 1, y: 0 }
    };

    if (arrowMap[key]) {
      e.preventDefault();
      const newDir = arrowMap[key];
      
      // Prevent 180° turns
      if (!(newDir.x === -this.direction.x && newDir.y === -this.direction.y)) {
        this.nextDirection = newDir;
      }
    }
  }

  changeDirection(dir) {
    if (!this.gameRunning) return;
    
    // Prevent 180° turns
    if (!(dir.x === -this.direction.x && dir.y === -this.direction.y)) {
      this.nextDirection = dir;
    }
  }

  update() {
    if (!this.gameRunning || this.gameLocked) return;

    this.direction = this.nextDirection;
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Wrap around screen
    head.x = (head.x + this.gameWidth) % this.gameWidth;
    head.y = (head.y + this.gameHeight) % this.gameHeight;

    // Check self collision
    if (this.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      this.endGame();
      return;
    }

    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.food = this.generateFood();
      document.getElementById('snakeScore').textContent = this.score;
    } else {
      this.snake.pop();
    }
  }

  draw() {
    // Clear canvas
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake
    const snakeColor = gamesManager.snakeConfig.color;
    const shape = gamesManager.snakeConfig.shape;
    
    this.snake.forEach((segment, idx) => {
      this.drawSegment(
        segment.x * this.gridSize,
        segment.y * this.gridSize,
        this.gridSize,
        snakeColor,
        shape,
        idx === 0 // isHead
      );
    });

    // Draw food
    this.ctx.fillStyle = '#ef4444';
    this.drawSegment(
      this.food.x * this.gridSize,
      this.food.y * this.gridSize,
      this.gridSize,
      '#ef4444',
      'round',
      false
    );
  }

  drawSegment(x, y, size, color, shape, isHead) {
    const padding = 2;
    const x1 = x + padding;
    const y1 = y + padding;
    const w = size - padding * 2;
    const h = size - padding * 2;

    this.ctx.fillStyle = isHead ? this.lighten(color, 20) : color;

    if (shape === 'round') {
      this.drawRoundedRect(x1, y1, w, h, size / 2);
    } else if (shape === 'rounded') {
      this.drawRoundedRect(x1, y1, w, h, 4);
    } else if (shape === 'square') {
      this.ctx.fillRect(x1, y1, w, h);
    } else if (shape === 'diamond') {
      this.drawDiamond(x1 + w / 2, y1 + h / 2, w / 2);
    }
  }

  drawRoundedRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.fill();
  }

  drawDiamond(cx, cy, size) {
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size);
    this.ctx.lineTo(cx + size, cy);
    this.ctx.lineTo(cx, cy + size);
    this.ctx.lineTo(cx - size, cy);
    this.ctx.closePath();
    this.ctx.fill();
  }

  lighten(color, percent) {
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.round(parseInt(hex.substring(0, 2), 16) * (1 + percent / 100)));
    const g = Math.min(255, Math.round(parseInt(hex.substring(2, 4), 16) * (1 + percent / 100)));
    const b = Math.min(255, Math.round(parseInt(hex.substring(4, 6), 16) * (1 + percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  endGame() {
    this.gameRunning = false;
    document.getElementById('snakeStatus').textContent = 
      `Game Over! Pontuação: ${this.score}`;
  }

  start() {
    this.reset();
    this.gameRunning = true;
    document.getElementById('snakeStatus').textContent = 'Jogo em andamento...';
    
    const gameLoop = setInterval(() => {
      if (!this.gameRunning) {
        clearInterval(gameLoop);
        return;
      }
      this.update();
      this.draw();
    }, 1000 / this.snakeConfig.speed);
  }
}

/* ============================================================
   MINESWEEPER GAME
============================================================ */

class MinesweeperGame {
  constructor(rows = 8, cols = 8, mines = 10) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.board = [];
    this.revealed = [];
    this.flagged = [];
    this.gameRunning = false;
    this.gameWon = false;
  }

  init() {
    this.board = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    this.revealed = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
    this.flagged = Array(this.rows).fill(null).map(() => Array(this.cols).fill(false));
    
    // Place mines randomly
    let placed = 0;
    while (placed < this.mines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      if (this.board[r][c] !== 'M') {
        this.board[r][c] = 'M';
        placed++;
      }
    }

    // Calculate numbers
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] !== 'M') {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
                if (this.board[nr][nc] === 'M') count++;
              }
            }
          }
          this.board[r][c] = count;
        }
      }
    }

    this.gameRunning = true;
  }

  reveal(r, c) {
    if (!this.gameRunning || this.revealed[r][c] || this.flagged[r][c]) return;

    this.revealed[r][c] = true;

    if (this.board[r][c] === 'M') {
      this.gameRunning = false;
      this.revealAll();
      return false; // Hit a mine
    }

    // Flood fill for empty cells
    if (this.board[r][c] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
            if (!this.revealed[nr][nc]) {
              this.reveal(nr, nc);
            }
          }
        }
      }
    }

    this.checkWin();
    return true;
  }

  toggleFlag(r, c) {
    if (!this.revealed[r][c]) {
      this.flagged[r][c] = !this.flagged[r][c];
      this.checkWin();
    }
  }

  revealAll() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.revealed[r][c] = true;
      }
    }
  }

  checkWin() {
    let revealedCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.revealed[r][c] && this.board[r][c] !== 'M') {
          revealedCount++;
        }
      }
    }
    
    if (revealedCount === this.rows * this.cols - this.mines) {
      this.gameRunning = false;
      this.gameWon = true;
    }
  }

  render() {
    const container = document.getElementById('minesweeperBoard');
    container.innerHTML = '';
    container.style.gridTemplateColumns = `repeat(${this.cols}, 30px)`;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const btn = document.createElement('button');
        btn.className = 'mine-cell';
        
        if (this.revealed[r][c]) {
          btn.classList.add('revealed');
          if (this.board[r][c] === 'M') {
            btn.textContent = '💣';
          } else if (this.board[r][c] > 0) {
            btn.textContent = this.board[r][c];
          }
        } else if (this.flagged[r][c]) {
          btn.classList.add('flagged');
          btn.textContent = '🚩';
        }

        btn.addEventListener('click', () => this.reveal(r, c) && this.render());
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          this.toggleFlag(r, c);
          this.render();
        });

        container.appendChild(btn);
      }
    }
  }
}

/* ============================================================
   TETRIS GAME
============================================================ */

class TetrisGame {
  constructor(canvasId = 'tetrisCanvas') {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.gridWidth = 10;
    this.gridHeight = 20;
    this.cellSize = 20;
    
    this.canvas.width = this.gridWidth * this.cellSize;
    this.canvas.height = this.gridHeight * this.cellSize;

    this.board = Array(this.gridHeight).fill(null).map(() => Array(this.gridWidth).fill(0));
    this.currentPiece = null;
    this.score = 0;
    this.gameRunning = false;

    this.pieces = [
      { shape: [[1, 1, 1, 1]], color: '#00f0f0' }, // I
      { shape: [[1, 1], [1, 1]], color: '#f0f000' }, // O
      { shape: [[0, 1, 0], [1, 1, 1]], color: '#a000f0' }, // T
      { shape: [[1, 0, 0], [1, 1, 1]], color: '#0000f0' }, // J
      { shape: [[0, 0, 1], [1, 1, 1]], color: '#f0a000' }, // L
      { shape: [[0, 1, 1], [1, 1, 0]], color: '#00f000' }, // S
      { shape: [[1, 1, 0], [0, 1, 1]], color: '#f00000' }  // Z
    ];

    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (e) => this.handleKeyPress(e));
  }

  handleKeyPress(e) {
    if (!this.gameRunning || !this.currentPiece) return;

    switch (e.key.toLowerCase()) {
      case 'arrowleft':
      case 'a':
        e.preventDefault();
        this.movePiece(-1, 0);
        break;
      case 'arrowright':
      case 'd':
        e.preventDefault();
        this.movePiece(1, 0);
        break;
      case 'arrowdown':
      case 's':
        e.preventDefault();
        this.movePiece(0, 1);
        break;
      case 'arrowup':
      case 'w':
        e.preventDefault();
        this.rotatePiece();
        break;
    }
  }

  spawnPiece() {
    const template = this.pieces[Math.floor(Math.random() * this.pieces.length)];
    this.currentPiece = {
      x: Math.floor(this.gridWidth / 2) - 1,
      y: 0,
      shape: template.shape,
      color: template.color
    };
  }

  movePiece(dx, dy) {
    if (!this.currentPiece) return;
    
    this.currentPiece.x += dx;
    this.currentPiece.y += dy;

    if (!this.isValidPosition()) {
      this.currentPiece.x -= dx;
      this.currentPiece.y -= dy;
      
      if (dy > 0) {
        this.lockPiece();
      }
    }
  }

  rotatePiece() {
    if (!this.currentPiece) return;
    
    const original = this.currentPiece.shape;
    this.currentPiece.shape = this.rotate90(this.currentPiece.shape);

    if (!this.isValidPosition()) {
      this.currentPiece.shape = original;
    }
  }

  rotate90(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        rotated[c][rows - 1 - r] = shape[r][c];
      }
    }
    return rotated;
  }

  isValidPosition() {
    if (!this.currentPiece) return false;

    for (let r = 0; r < this.currentPiece.shape.length; r++) {
      for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
        if (!this.currentPiece.shape[r][c]) continue;

        const x = this.currentPiece.x + c;
        const y = this.currentPiece.y + r;

        if (x < 0 || x >= this.gridWidth || y >= this.gridHeight) return false;
        if (y >= 0 && this.board[y][x]) return false;
      }
    }
    return true;
  }

  lockPiece() {
    if (!this.currentPiece) return;

    for (let r = 0; r < this.currentPiece.shape.length; r++) {
      for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
        if (!this.currentPiece.shape[r][c]) continue;

        const x = this.currentPiece.x + c;
        const y = this.currentPiece.y + r;

        if (y >= 0) {
          this.board[y][x] = this.currentPiece.color;
        }
      }
    }

    this.clearLines();
    this.spawnPiece();

    if (!this.isValidPosition()) {
      this.gameRunning = false;
    }
  }

  clearLines() {
    let clearedLines = 0;
    
    for (let r = this.gridHeight - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== 0)) {
        this.board.splice(r, 1);
        this.board.unshift(Array(this.gridWidth).fill(0));
        clearedLines++;
        r++;
      }
    }

    this.score += clearedLines * 100;
  }

  draw() {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw board
    for (let r = 0; r < this.gridHeight; r++) {
      for (let c = 0; c < this.gridWidth; c++) {
        if (this.board[r][c]) {
          this.ctx.fillStyle = this.board[r][c];
          this.ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
        }
      }
    }

    // Draw current piece
    if (this.currentPiece) {
      this.ctx.fillStyle = this.currentPiece.color;
      for (let r = 0; r < this.currentPiece.shape.length; r++) {
        for (let c = 0; c < this.currentPiece.shape[r].length; c++) {
          if (this.currentPiece.shape[r][c]) {
            const x = (this.currentPiece.x + c) * this.cellSize;
            const y = (this.currentPiece.y + r) * this.cellSize;
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
          }
        }
      }
    }
  }

  start() {
    this.gameRunning = true;
    this.spawnPiece();
    
    const gameLoop = setInterval(() => {
      if (!this.gameRunning) {
        clearInterval(gameLoop);
        return;
      }
      this.movePiece(0, 1);
      this.draw();
    }, 500);
  }
}

/* ============================================================
   GLOBAL UI HANDLERS
============================================================ */

let snakeGameInstance = null;
let minesweeperInstance = null;
let tetrisInstance = null;

function openSnakeGame() {
  document.getElementById('snakeGameModal').classList.remove('hidden');
  startSnakeGame();
}

function closeSnakeGame() {
  document.getElementById('snakeGameModal').classList.add('hidden');
  if (snakeGameInstance) {
    snakeGameInstance.gameRunning = false;
  }
}

function startSnakeGame() {
  if (!snakeGameInstance) {
    snakeGameInstance = new SnakeGame();
  }
  snakeGameInstance.start();
}

function snakeChangeDirection(dir) {
  if (!snakeGameInstance) return;
  
  const dirMap = {
    'up': { x: 0, y: -1 },
    'down': { x: 0, y: 1 },
    'left': { x: -1, y: 0 },
    'right': { x: 1, y: 0 }
  };
  
  snakeGameInstance.changeDirection(dirMap[dir]);
}

function setSnakeColor(color) {
  gamesManager.snakeConfig.color = color;
  gamesManager.saveGamePreferences();
  document.querySelectorAll('[data-snake-color]').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-snake-color="${color}"]`)?.classList.add('active');
}

function setSnakeShape(shape) {
  gamesManager.snakeConfig.shape = shape;
  gamesManager.saveGamePreferences();
  document.querySelectorAll('[data-snake-shape]').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-snake-shape="${shape}"]`)?.classList.add('active');
}

function toggleSnakeCustomize() {
  const panel = document.getElementById('snakeCustomizePanel');
  panel.classList.toggle('hidden');
}

function openMinesweeperGame() {
  document.getElementById('snakeGameModal').classList.add('hidden');
  if (!minesweeperInstance) {
    minesweeperInstance = new MinesweeperGame(8, 8, 10);
  }
  minesweeperInstance.init();
  minesweeperInstance.render();
}

function openTetrisGame() {
  document.getElementById('snakeGameModal').classList.add('hidden');
  if (!tetrisInstance) {
    tetrisInstance = new TetrisGame();
  }
  tetrisInstance.start();
}
