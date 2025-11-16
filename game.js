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

  update(isHoleBelow = false) {
    this.applyGravity();
    this.y += this.velocityY;

    // 地面との衝突判定（穴の上にいない場合のみ）
    if (!isHoleBelow && this.y >= CONFIG.groundY - this.height) {
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
    this.worldX = data.x; // ワールド座標（基準位置）
    this.width = data.width;
    this.height = data.height;
    this.scrollOffset = worldX;

    // 左右パトロール用
    this.offsetX = 0; // 基準位置からの相対移動量
    this.direction = 1; // 1: 右, -1: 左
  }

  update(scrollOffset) {
    this.scrollOffset = scrollOffset;

    // 左右パトロール
    this.offsetX += CONFIG.enemy.speed * this.direction;

    // 移動範囲に達したら反転
    if (this.offsetX > CONFIG.enemy.moveRange) {
      this.offsetX = CONFIG.enemy.moveRange;
      this.direction = -1;
    } else if (this.offsetX < -CONFIG.enemy.moveRange) {
      this.offsetX = -CONFIG.enemy.moveRange;
      this.direction = 1;
    }
  }

  getScreenX() {
    // ワールド座標 + パトロールオフセット - スクロール位置
    // 「少し左右に揺れながら左方向に流れていく」ように見える
    return this.worldX + this.offsetX - this.scrollOffset;
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

    // ステージレイアウトの検証
    Level.validateStageLayout(stageData);

    // 障害物の生成
    stageData.obstacles.forEach(data => {
      if (data.type === 'enemy') {
        this.enemies.push(new Enemy(data, 0));
      } else {
        this.obstacles.push(new Obstacle(data, 0));
      }
    });
  }

  // ステージレイアウトの検証（静的メソッド）
  static validateStageLayout(stageData) {
    // すべての危険オブジェクトを抽出（hole, spike, enemy）
    const hazards = stageData.obstacles.map(obs => {
      const width = obs.type === 'hole' ? obs.width : (obs.width || 40);
      return {
        type: obs.type,
        x: obs.x,
        width: width,
        endX: obs.x + width
      };
    }).sort((a, b) => a.x - b.x);

    // 連続した危険ゾーンを検出
    const hazardZones = [];
    let currentZone = null;

    for (let i = 0; i < hazards.length; i++) {
      const hazard = hazards[i];

      if (!currentZone) {
        // 新しいゾーンの開始
        currentZone = {
          startX: hazard.x,
          endX: hazard.endX,
          hazards: [hazard]
        };
      } else {
        // 前の危険オブジェクトとの間隔をチェック
        const gap = hazard.x - currentZone.endX;

        if (gap < CONFIG.safeZoneWidth) {
          // 安全地帯が不十分 → 同じゾーンに追加
          currentZone.endX = hazard.endX;
          currentZone.hazards.push(hazard);
        } else {
          // 十分な安全地帯がある → 現在のゾーンを保存して新しいゾーンを開始
          hazardZones.push(currentZone);
          currentZone = {
            startX: hazard.x,
            endX: hazard.endX,
            hazards: [hazard]
          };
        }
      }
    }

    // 最後のゾーンを追加
    if (currentZone) {
      hazardZones.push(currentZone);
    }

    // 各ゾーンの幅をチェック
    hazardZones.forEach((zone, index) => {
      const zoneWidth = zone.endX - zone.startX;
      if (zoneWidth > CONFIG.maxHazardSpan) {
        const hazardTypes = zone.hazards.map(h => `${h.type}@${h.x}`).join(', ');
        console.warn(
          `⚠️ Impossible hazard zone detected!\n` +
          `  Zone ${index + 1}: x=${zone.startX} to ${zone.endX} (width: ${zoneWidth}px)\n` +
          `  Max clearable width: ${CONFIG.maxHazardSpan}px\n` +
          `  Hazards: ${hazardTypes}\n` +
          `  → Players cannot jump over this zone!`
        );
      }
    });

    return hazardZones;
  }

  update(scrollOffset) {
    this.obstacles.forEach(obstacle => obstacle.update(scrollOffset));
    this.enemies.forEach(enemy => enemy.update(scrollOffset));
  }

  draw(ctx, scrollOffset) {
    this.obstacles.forEach(obstacle => obstacle.draw(ctx));
    this.enemies.forEach(enemy => enemy.draw(ctx));

    // ゴール地点の描画
    const goalScreenX = this.goalX - scrollOffset;
    if (goalScreenX > 0 && goalScreenX < CONFIG.canvasWidth + 100) {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(goalScreenX, 0, 50, CONFIG.canvasHeight);
      ctx.fillStyle = '#000';
      ctx.font = '20px Arial';
      ctx.fillText('GOAL', goalScreenX + 5, CONFIG.canvasHeight / 2);
    }
  }

  isHoleBelow(player) {
    // プレイヤーの足元に穴があるかチェック
    for (let obstacle of this.obstacles) {
      if (obstacle.type === 'hole') {
        const screenX = obstacle.getScreenX();
        // プレイヤーの足元が穴の範囲内にあるか
        if (player.x + player.width > screenX && player.x < screenX + obstacle.width) {
          return true;
        }
      }
    }
    return false;
  }

  checkCollisions(player) {
    // 障害物との衝突チェック（穴以外）
    for (let obstacle of this.obstacles) {
      if (obstacle.type !== 'hole' && player.collidesWith(obstacle)) {
        return true;
      }
    }

    // 敵との衝突チェック
    for (let enemy of this.enemies) {
      if (player.collidesWith(enemy)) {
        return true;
      }
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

    this.state = 'running'; // 'running', 'gameOver', 'continueReady', 'stageClear'
    this.worldX = 0;
    this.player = null;
    this.level = null;

    // コンティニュー機能用
    this.lastCheckpointX = 0; // 直近のチェックポイント worldX
    this.deathX = 0;          // 死亡時の worldX
    this.continueCount = 0;   // コンティニュー回数

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
        } else if (this.state === 'continueReady') {
          this.continueFromCheckpoint();
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

    // ワールド（スクロール）の更新
    this.worldX += CONFIG.scrollSpeed;

    // チェックポイント更新（コンティニュー有効時のみ）
    if (CONFIG.continue.enabled) {
      const interval = CONFIG.continue.checkpointInterval;
      const nextCheckpoint = this.lastCheckpointX + interval;

      if (this.worldX >= nextCheckpoint) {
        this.lastCheckpointX = nextCheckpoint;
      }
    }

    // レベルの更新
    this.level.update(this.worldX);

    // 穴の判定
    const isHoleBelow = this.level.isHoleBelow(this.player);

    // プレイヤーの更新
    this.player.update(isHoleBelow);

    // 衝突判定（スパイク・敵）
    if (this.level.checkCollisions(this.player)) {
      this.gameOver();
      return;
    }

    // 画面外に落下（穴に落ちた）
    if (this.player.y > CONFIG.canvasHeight) {
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

    // レベルの描画（scrollOffsetを渡す）
    this.level.draw(this.ctx, this.worldX);

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
    // 死亡地点を記録
    this.deathX = this.worldX;

    // コンティニュー可能か判定
    const canContinue =
      CONFIG.continue.enabled &&
      this.lastCheckpointX > 0 &&
      this.continueCount < CONFIG.continue.maxContinues;

    if (canContinue) {
      this.state = 'continueReady';
      this.updateMessage('GAME OVER - Press R to Continue', 'game-over');
    } else {
      this.state = 'gameOver';
      this.updateMessage('GAME OVER - Press R to Restart', 'game-over');
    }
  }

  stageClear() {
    this.state = 'stageClear';
    this.updateMessage('STAGE CLEAR!', 'stage-clear');
  }

  continueFromCheckpoint() {
    this.continueCount++;

    const preRoll = CONFIG.continue.preRollDistance;
    const targetWorldX = Math.max(0, this.lastCheckpointX - preRoll);

    this.worldX = targetWorldX;

    this.player = new Player();
    this.level = new Level(CONFIG.stage1);

    this.updateMessage('');
    this.state = 'running';
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

  // デバッグ用設定パネルの初期化
  initConfigPanel();
});

// デバッグ用設定パネルの初期化
function initConfigPanel() {
  const panel = document.getElementById('config-panel');

  // enableConfigUI が true の場合のみ表示
  if (CONFIG.debug.enableConfigUI) {
    panel.style.display = 'block';
  }

  // デフォルト値を保存（リセット用）
  const defaults = {
    scrollSpeed: CONFIG.scrollSpeed,
    gravity: CONFIG.gravity,
    jumpVelocity: CONFIG.jumpVelocity,
    maxFallSpeed: CONFIG.maxFallSpeed,
    enemySpeed: CONFIG.enemy.speed,
    enemyMoveRange: CONFIG.enemy.moveRange
  };

  // 現在の値をinputにセット
  function loadConfigToUI() {
    document.getElementById('cfg-scrollSpeed').value = CONFIG.scrollSpeed;
    document.getElementById('cfg-gravity').value = CONFIG.gravity;
    document.getElementById('cfg-jumpVelocity').value = CONFIG.jumpVelocity;
    document.getElementById('cfg-maxFallSpeed').value = CONFIG.maxFallSpeed;
    document.getElementById('cfg-enemySpeed').value = CONFIG.enemy.speed;
    document.getElementById('cfg-enemyMoveRange').value = CONFIG.enemy.moveRange;
  }

  loadConfigToUI();

  // 「適用してリスタート」ボタン
  document.getElementById('cfg-apply').addEventListener('click', () => {
    // inputの値をCONFIGに反映
    CONFIG.scrollSpeed = parseFloat(document.getElementById('cfg-scrollSpeed').value);
    CONFIG.gravity = parseFloat(document.getElementById('cfg-gravity').value);
    CONFIG.jumpVelocity = parseFloat(document.getElementById('cfg-jumpVelocity').value);
    CONFIG.maxFallSpeed = parseFloat(document.getElementById('cfg-maxFallSpeed').value);
    CONFIG.enemy.speed = parseFloat(document.getElementById('cfg-enemySpeed').value);
    CONFIG.enemy.moveRange = parseFloat(document.getElementById('cfg-enemyMoveRange').value);

    // ゲームをリスタート
    game.reset();
    console.log('✅ Config updated and game restarted:', {
      scrollSpeed: CONFIG.scrollSpeed,
      gravity: CONFIG.gravity,
      jumpVelocity: CONFIG.jumpVelocity,
      maxFallSpeed: CONFIG.maxFallSpeed,
      enemySpeed: CONFIG.enemy.speed,
      enemyMoveRange: CONFIG.enemy.moveRange
    });
  });

  // 「デフォルトに戻す」ボタン
  document.getElementById('cfg-reset').addEventListener('click', () => {
    CONFIG.scrollSpeed = defaults.scrollSpeed;
    CONFIG.gravity = defaults.gravity;
    CONFIG.jumpVelocity = defaults.jumpVelocity;
    CONFIG.maxFallSpeed = defaults.maxFallSpeed;
    CONFIG.enemy.speed = defaults.enemySpeed;
    CONFIG.enemy.moveRange = defaults.enemyMoveRange;

    loadConfigToUI();
    game.reset();
    console.log('🔄 Config reset to defaults');
  });
}
