// game.js - FROG RUNNER メインゲームロジック

// プレイヤークラス
class Player {
  constructor() {
    this.x = CONFIG.playerStartX;
    this.y = CONFIG.groundY - CONFIG.playerHeight;
    this.width = CONFIG.playerWidth;
    this.height = CONFIG.playerHeight;
    this.velocityY = 0;
    this.isJumping = false;
    this.rotation = 0;
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = CONFIG.jumpVelocity;
      this.isJumping = true;
    }
  }

  applyGravity() {
    this.velocityY += CONFIG.gravity;
    if (this.velocityY > CONFIG.maxFallSpeed) {
      this.velocityY = CONFIG.maxFallSpeed;
    }
  }

  update() {
    this.applyGravity();
    this.y += this.velocityY;

    // 地面との衝突判定
    if (this.y >= CONFIG.groundY - this.height) {
      this.y = CONFIG.groundY - this.height;
      this.velocityY = 0;
      this.isJumping = false;
      this.rotation = 0;
    } else {
      // ジャンプ中は回転
      this.rotation += 0.1;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
    ctx.rotate(this.rotation);

    // カエルの描画（シンプルな図形）
    // 体
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // 目（2つ）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-this.width / 4, -this.height / 4, 6, 0, Math.PI * 2);
    ctx.arc(this.width / 4, -this.height / 4, 6, 0, Math.PI * 2);
    ctx.fill();

    // 瞳
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-this.width / 4, -this.height / 4, 3, 0, Math.PI * 2);
    ctx.arc(this.width / 4, -this.height / 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // デバッグ: 当たり判定表示
    if (CONFIG.debug.showHitbox) {
      ctx.strokeStyle = 'red';
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
  }

  getHitbox() {
    return {
      x: this.x + CONFIG.collisionPadding,
      y: this.y + CONFIG.collisionPadding,
      width: this.width - CONFIG.collisionPadding * 2,
      height: this.height - CONFIG.collisionPadding * 2
    };
  }

  collidesWith(obstacle) {
    const playerBox = this.getHitbox();
    const obstacleBox = obstacle.getHitbox();

    return (
      playerBox.x < obstacleBox.x + obstacleBox.width &&
      playerBox.x + playerBox.width > obstacleBox.x &&
      playerBox.y < obstacleBox.y + obstacleBox.height &&
      playerBox.y + playerBox.height > obstacleBox.y
    );
  }
}

// 障害物クラス
class Obstacle {
  constructor(data, worldX) {
    this.type = data.type;
    this.worldX = data.x;
    this.width = data.width;
    this.height = data.height || 0;
    this.scrollOffset = worldX;
  }

  update(scrollOffset) {
    this.scrollOffset = scrollOffset;
  }

  getScreenX() {
    return this.worldX - this.scrollOffset;
  }

  draw(ctx) {
    const screenX = this.getScreenX();

    if (this.type === 'hole') {
      // 穴の描画
      ctx.fillStyle = '#333';
      ctx.fillRect(screenX, CONFIG.groundY, this.width, CONFIG.canvasHeight - CONFIG.groundY);

      // 穴の縁
      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 4;
      ctx.strokeRect(screenX, CONFIG.groundY, this.width, CONFIG.canvasHeight - CONFIG.groundY);
    } else if (this.type === 'spike') {
      // トゲの描画
      const spikeY = CONFIG.groundY - this.height;
      ctx.fillStyle = '#e74c3c';

      // 三角形のトゲ
      const numSpikes = Math.floor(this.width / 20);
      for (let i = 0; i < numSpikes; i++) {
        ctx.beginPath();
        ctx.moveTo(screenX + i * 20, CONFIG.groundY);
        ctx.lineTo(screenX + i * 20 + 10, spikeY);
        ctx.lineTo(screenX + i * 20 + 20, CONFIG.groundY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // デバッグ: 当たり判定表示
    if (CONFIG.debug.showHitbox) {
      const hitbox = this.getHitbox();
      ctx.strokeStyle = 'blue';
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }
  }

  getHitbox() {
    const screenX = this.getScreenX();
    if (this.type === 'hole') {
      return {
        x: screenX,
        y: CONFIG.groundY,
        width: this.width,
        height: CONFIG.canvasHeight - CONFIG.groundY
      };
    } else if (this.type === 'spike') {
      return {
        x: screenX,
        y: CONFIG.groundY - this.height,
        width: this.width,
        height: this.height
      };
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  isOffScreen() {
    const screenX = this.getScreenX();
    return screenX + this.width < 0;
  }
}

// 敵クラス
class Enemy {
  constructor(data, worldX) {
    this.type = data.type;
    this.worldX = data.x;
    this.width = data.width;
    this.height = data.height;
    this.speed = data.speed;
    this.moveRange = data.moveRange || 100;
    this.startX = data.x;
    this.direction = 1;
    this.scrollOffset = worldX;
  }

  update(scrollOffset) {
    this.scrollOffset = scrollOffset;

    // 左右往復移動
    this.worldX += this.speed * this.direction;

    if (this.worldX > this.startX + this.moveRange) {
      this.worldX = this.startX + this.moveRange;
      this.direction = -1;
    } else if (this.worldX < this.startX - this.moveRange) {
      this.worldX = this.startX - this.moveRange;
      this.direction = 1;
    }
  }

  getScreenX() {
    return this.worldX - this.scrollOffset;
  }

  draw(ctx) {
    const screenX = this.getScreenX();
    const enemyY = CONFIG.groundY - this.height;

    // 敵の描画（シンプルな怪物）
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(screenX, enemyY, this.width, this.height);

    // 目（怖い感じ）
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(screenX + this.width / 3, enemyY + this.height / 3, 5, 0, Math.PI * 2);
    ctx.arc(screenX + (this.width * 2) / 3, enemyY + this.height / 3, 5, 0, Math.PI * 2);
    ctx.fill();

    // デバッグ: 当たり判定表示
    if (CONFIG.debug.showHitbox) {
      const hitbox = this.getHitbox();
      ctx.strokeStyle = 'purple';
      ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }
  }

  getHitbox() {
    const screenX = this.getScreenX();
    return {
      x: screenX + CONFIG.collisionPadding,
      y: CONFIG.groundY - this.height + CONFIG.collisionPadding,
      width: this.width - CONFIG.collisionPadding * 2,
      height: this.height - CONFIG.collisionPadding * 2
    };
  }

  isOffScreen() {
    const screenX = this.getScreenX();
    return screenX + this.width < 0;
  }
}

// レベル（ステージ）クラス
class Level {
  constructor(stageData) {
    this.obstacles = [];
    this.enemies = [];
    this.goalX = CONFIG.stageLength;

    // 障害物の生成
    stageData.obstacles.forEach(data => {
      if (data.type === 'enemy') {
        this.enemies.push(new Enemy(data, 0));
      } else {
        this.obstacles.push(new Obstacle(data, 0));
      }
    });
  }

  update(scrollOffset) {
    this.obstacles.forEach(obstacle => obstacle.update(scrollOffset));
    this.enemies.forEach(enemy => enemy.update(scrollOffset));
  }

  draw(ctx) {
    this.obstacles.forEach(obstacle => obstacle.draw(ctx));
    this.enemies.forEach(enemy => enemy.draw(ctx));

    // ゴール地点の描画
    const goalScreenX = this.goalX - game.worldX;
    if (goalScreenX > 0 && goalScreenX < CONFIG.canvasWidth + 100) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(goalScreenX, 0, 50, CONFIG.canvasHeight);
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText('GOAL', goalScreenX + 5, CONFIG.canvasHeight / 2);
    }
  }

  checkCollisions(player) {
    // 障害物との衝突チェック
    for (let obstacle of this.obstacles) {
      if (player.collidesWith(obstacle)) {
        return true;
      }
    }

    // 敵との衝突チェック
    for (let enemy of this.enemies) {
      if (player.collidesWith(enemy)) {
        return true;
      }
    }

    // 穴に落下したかチェック
    if (player.y > CONFIG.canvasHeight) {
      return true;
    }

    return false;
  }

  isGoalReached(worldX) {
    return worldX >= this.goalX;
  }
}

// ゲームクラス
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = CONFIG.canvasWidth;
    this.canvas.height = CONFIG.canvasHeight;

    this.state = 'running'; // 'running', 'gameOver', 'stageClear'
    this.worldX = 0;
    this.player = null;
    this.level = null;

    this.setupInput();
    this.reset();
  }

  setupInput() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.state === 'running') {
          this.player.jump();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (this.state === 'gameOver') {
          this.reset();
        }
      }
    });
  }

  reset() {
    this.state = 'running';
    this.worldX = 0;
    this.player = new Player();
    this.level = new Level(CONFIG.stage1);
    this.updateMessage('');
  }

  start() {
    this.gameLoop();
  }

  update() {
    if (this.state !== 'running') return;

    // プレイヤーの更新
    this.player.update();

    // ワールド（スクロール）の更新
    this.worldX += CONFIG.scrollSpeed;

    // レベルの更新
    this.level.update(this.worldX);

    // 衝突判定
    if (this.level.checkCollisions(this.player)) {
      this.gameOver();
      return;
    }

    // ゴール判定
    if (this.level.isGoalReached(this.worldX)) {
      this.stageClear();
      return;
    }
  }

  draw() {
    // 背景のクリア（グラデーションは CSS で描画済み）
    this.ctx.clearRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

    // 地面の描画
    this.drawGround();

    // レベルの描画
    this.level.draw(this.ctx);

    // プレイヤーの描画
    this.player.draw(this.ctx);

    // デバッグ情報
    if (CONFIG.debug.showWorldPos) {
      this.ctx.fillStyle = '#000';
      this.ctx.font = '16px Arial';
      this.ctx.fillText(`World X: ${Math.floor(this.worldX)}`, 10, 20);
      this.ctx.fillText(`Player Y: ${Math.floor(this.player.y)}`, 10, 40);
    }
  }

  drawGround() {
    // 地面
    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(0, CONFIG.groundY, CONFIG.canvasWidth, CONFIG.canvasHeight - CONFIG.groundY);

    // 地面のライン
    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, CONFIG.groundY);
    this.ctx.lineTo(CONFIG.canvasWidth, CONFIG.groundY);
    this.ctx.stroke();
  }

  gameOver() {
    this.state = 'gameOver';
    this.updateMessage('GAME OVER - Press R to Restart', 'game-over');
  }

  stageClear() {
    this.state = 'stageClear';
    this.updateMessage('STAGE CLEAR!', 'stage-clear');
  }

  updateMessage(text, className = '') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + className;
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// ゲームの初期化と開始
let game;
window.addEventListener('load', () => {
  game = new Game();
  game.start();
});
