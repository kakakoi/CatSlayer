// ゲームの状態を表す型
export type GameState = 'playing' | 'gameover' | 'stageClear';

// タッチ状態を表す型
export interface TouchState {
    isMoving: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    lastTapTime: number;
    doubleTapDelay: number;
    joystickRadius: number;
}

// キー入力の状態を表す型
export interface KeyState {
    [key: string]: boolean;
}

// 敵の種類を表す型
export type EnemyType = 'normal' | 'fast' | 'tank' | 'hunter' | 'random';

// 移動パターンを表す型
export type MovePattern = 'zigzag' | 'chase' | 'random' | 'horizontal' | 'circle';

// プレイヤーの方向を表す型
export type Direction = 'right' | 'left' | 'up' | 'down';

// サウンド名を表す型
export type SoundName = 'coin' | 'enemyDeath' | 'levelUp' | 'gameOver' | 'stageClear' | 'bgm';

// プレイヤーの色を表す型
export interface PlayerColors {
    armor: string;
    skin: string;
    hair: string;
    sword: string;
    shield: string;
}

// ゲームオブジェクトの基本インターフェース
export interface IGameObject {
    x: number;
    y: number;
    width: number;
    height: number;
    collidesWith(other: IGameObject): boolean;
}

// コインのインターフェース
export interface ICoin extends IGameObject {
    collected: boolean;
    value: number;
    animationOffset: number;
    update(time: number): void;
    render(ctx: CanvasRenderingContext2D): void;
}

// 敵のインターフェース
export interface IEnemy extends IGameObject {
    type: EnemyType;
    isAlive: boolean;
    startX: number;
    startY: number;
    spawning: boolean;
    spawnProgress: number;
    spawnDuration: number;
    spawnStartTime: number;
    speed: number;
    moveRange: number;
    scoreValue: number;
    color: string;
    movePattern: MovePattern;
    spawnerId: number;
    deathTime: number | null;
    update(game: IGame): void;
    render(ctx: CanvasRenderingContext2D): void;
}

// スポナーのインターフェース
export interface ISpawner extends IGameObject {
    id: number;
    spawnInterval: number;
    lastSpawnTime: number;
    active: boolean;
    radius: number;
    progress: number;
    maxEnemiesAlive: number;
    enemyCount: number;
    spawnedEnemies: IEnemy[];
    spawnEffect: number;
    update(game: IGame, currentTime: number): void;
    render(ctx: CanvasRenderingContext2D): void;
}

// プレイヤーのインターフェース
export interface IPlayer extends IGameObject {
    speed: number;
    direction: Direction;
    level: number;
    exp: number;
    expToNextLevel: number;
    isAttacking: boolean;
    attackDuration: number;
    attackTimer: number;
    attackRange: number;
    attackPower: number;
    attackFrame: number;
    autoAttackRange: number;
    autoAttackCooldown: number;
    lastAutoAttackTime: number;
    animationFrame: number;
    walkFrame: number;
    colors: PlayerColors;
    score: number;
    powerUps: number;
    update(game: IGame): void;
    render(ctx: CanvasRenderingContext2D): void;
    levelUp(): void;
    powerUp(): void;
    gainExp(amount: number): void;
    checkAttackCollision(enemy: IEnemy): boolean;
}

// ゲームのインターフェース
export interface IGame {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    keys: KeyState;
    player: IPlayer;
    enemies: IEnemy[];
    coins: ICoin[];
    spawners: ISpawner[];
    isRunning: boolean;
    gameState: GameState;
    score: number;
    stage: number;
    startTime: number;
    stageTime: number;
    remainingTime: number;
    audioContext: AudioContext | null;
    masterGain: GainNode | null;
    isMuted: boolean;
    bgmPlaying: boolean;
    touchState: TouchState;
    nextStageStartTime?: number;
    update(): void;
    render(): void;
    start(): void;
    restart(): void;
    gameLoop(currentTime: number): void;
    playSound(soundName: SoundName): void;
    toggleSound(): void;
    nextStage(): void;
} 