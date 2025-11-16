// config.js - ゲームバランス調整値を一括管理
const CONFIG = {
  canvasWidth: 800,
  canvasHeight: 450,

  // 物理 & ゲームスピード
  scrollSpeed: 3.0,
  gravity: 0.6,
  jumpVelocity: -12.0,
  maxFallSpeed: 15.0,

  // プレイヤー
  playerStartX: 150,
  playerWidth: 40,
  playerHeight: 40,

  // ステージ
  stageLength: 6000,
  groundY: 360,

  // 当たり判定調整
  collisionPadding: 6,

  // レベルデザイン制約
  maxHazardSpan: 110,      // ジャンプで越えられる危険ゾーンの最大幅（px）
  safeZoneWidth: 60,       // プレイヤーが安全に着地できる最小幅（px）

  // 敵キャラクター
  enemy: {
    moveRange: 40, // 基準位置から左右何px動くか
    speed: 1.5     // パトロール用の速度
  },

  // コンティニュー機能
  continue: {
    enabled: true,            // コンティニュー機能のON/OFF
    checkpointInterval: 800,  // 何ワールド単位ごとにチェックポイントを打つか
    preRollDistance: 150,     // コンティニュー時、死亡地点よりどれだけ手前から再開するか
    maxContinues: Infinity    // テスト時は Infinity、本番用に制限をかけたい場合は数値に変更
  },

  // デバッグ
  debug: {
    showHitbox: false,
    showWorldPos: false,
  },

  // ステージ1の障害物
  stage1: {
    obstacles: [
      { type: 'hole', x: 800, width: 120 },
      { type: 'spike', x: 1300, width: 40, height: 40 },
      { type: 'enemy', x: 1800, width: 40, height: 40 },
      { type: 'spike', x: 2200, width: 40, height: 40 },
      { type: 'hole', x: 2800, width: 100 },
      { type: 'enemy', x: 3400, width: 40, height: 40 },
      { type: 'spike', x: 4000, width: 40, height: 40 },
      { type: 'spike', x: 4200, width: 40, height: 40 }, // 修正: 4100 → 4200 (安全地帯を確保)
      { type: 'hole', x: 4700, width: 110 },
      { type: 'enemy', x: 5200, width: 40, height: 40 },
    ]
  }
};
