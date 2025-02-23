import type { EnemyType, IEnemy, IGame, ISpawner } from '../types.js';
import { Enemy } from './Enemy.js';
import { GameObject } from './GameObject.js';

export class Spawner extends GameObject implements ISpawner {
    public id = 0;
    public lastSpawnTime: number;
    public active: boolean;
    public radius: number;
    public progress: number;
    public maxEnemiesAlive: number;
    public enemyCount: number;
    public spawnedEnemies: IEnemy[];
    public spawnEffect: number;
    private game: IGame;

    constructor(
        game: IGame,
        x: number,
        y: number,
        public spawnInterval = 3000
    ) {
        super(x, y, 40, 40);
        this.game = game;
        this.lastSpawnTime = Date.now();
        this.active = true;
        this.radius = 25;
        this.progress = 0;
        this.maxEnemiesAlive = 5;
        this.enemyCount = 0;
        this.spawnedEnemies = [];
        this.spawnEffect = 0;
    }

    update(game: IGame, currentTime: number): void {
        if (!this.active) return;

        // スポーンエフェクトの更新
        if (this.spawnEffect > 0) {
            this.spawnEffect = Math.max(0, this.spawnEffect - 0.05);
        }

        // 死亡した敵を配列から削除（最適化）
        if (currentTime % 30 === 0) {
            // 30フレームごとにチェック
            this.spawnedEnemies = this.spawnedEnemies.filter((enemy) => enemy.isAlive);
            this.enemyCount = this.spawnedEnemies.length;
        }

        // 進行度を更新（敵が最大数未満の場合のみ）
        if (this.enemyCount < this.maxEnemiesAlive) {
            this.progress = Math.min(1, (currentTime - this.lastSpawnTime) / this.spawnInterval);

            if (this.progress >= 1) {
                this.spawnEnemy(game);
                this.lastSpawnTime = currentTime;
                this.progress = 0;
                this.spawnEffect = 1;
            }
        } else {
            this.progress = 0;
        }
    }

    spawnEnemy(game: IGame): void {
        const types: EnemyType[] = ['normal', 'fast', 'tank', 'hunter', 'random'];
        const randomType = types[Math.floor(Math.random() * types.length)];

        // スポナーの位置から敵を生成
        const enemy = new Enemy(
            this.x + this.width / 2 - 15,
            this.y + this.height / 2 - 15,
            randomType
        );

        enemy.spawnerId = this.id;
        enemy.spawning = true;
        enemy.spawnProgress = 0;
        enemy.spawnStartTime = Date.now();

        this.spawnedEnemies.push(enemy);
        game.enemies.push(enemy);
    }

    render(ctx: CanvasRenderingContext2D): void {
        // 穴の描画（黒い円）
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#222222';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.stroke();

        // スポーンエフェクト
        if (this.spawnEffect > 0) {
            ctx.beginPath();
            ctx.arc(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.radius * (1 + this.spawnEffect * 0.5),
                0,
                Math.PI * 2
            );
            ctx.fillStyle = `rgba(255, 0, 0, ${this.spawnEffect * 0.3})`;
            ctx.fill();
        }

        // プログレスバーの背景（グレー）
        const barWidth = this.width * 1.2;
        const barHeight = 8;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y + this.height + 5;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // プログレスバーの進行度（赤）
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barWidth * this.progress, barHeight);

        // 敵の数を表示
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.enemyCount}/${this.maxEnemiesAlive}`,
            this.x + this.width / 2,
            this.y + this.height / 2
        );
    }
}
