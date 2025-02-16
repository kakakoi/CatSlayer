import { IGame, IEnemy, EnemyType, MovePattern } from '../types.js';
import { GameObject } from './GameObject.js';

export class Enemy extends GameObject implements IEnemy {
    public isAlive: boolean;
    public startX: number;
    public startY: number;
    public spawning: boolean;
    public spawnProgress: number;
    public spawnDuration: number;
    public spawnStartTime: number;
    public speed: number;
    public moveRange: number;
    public scoreValue: number;
    public color: string;
    public movePattern: MovePattern;
    public spawnerId: number = 0;
    public direction: number;
    public zigzagAngle: number;
    public directionChangeTimer: number;
    public dx: number;
    public dy: number;
    public deathTime: number | null;

    constructor(x: number, y: number, public type: EnemyType = 'normal') {
        super(x, y, 30, 30);
        this.isAlive = true;
        this.startX = x;
        this.startY = y;
        this.spawning = true;
        this.spawnProgress = 0;
        this.spawnDuration = 500;
        this.spawnStartTime = Date.now();
        this.direction = 1;
        this.zigzagAngle = 0;
        this.directionChangeTimer = 0;
        this.dx = Math.random() * 2 - 1;
        this.dy = Math.random() * 2 - 1;
        this.deathTime = null;

        // タイプごとの特性を設定
        switch (type) {
            case 'fast': // 速い敵（赤）
                this.speed = 5;
                this.moveRange = 150;
                this.scoreValue = 80;
                this.color = '#FF0000';
                this.movePattern = 'zigzag';
                break;
            case 'tank': // 遅いが価値が高い敵（紫）
                this.speed = 1.5;
                this.moveRange = 100;
                this.scoreValue = 150;
                this.color = '#800080';
                this.movePattern = 'horizontal';
                this.width = 40; // より大きい
                this.height = 40;
                break;
            case 'hunter': // プレイヤーを追いかける敵（オレンジ）
                this.speed = 2.5;
                this.moveRange = 300;
                this.scoreValue = 120;
                this.color = '#FFA500';
                this.movePattern = 'chase';
                break;
            case 'random': // ランダムな動きの敵（緑）
                this.speed = 3;
                this.moveRange = 200;
                this.scoreValue = 100;
                this.color = '#00FF00';
                this.movePattern = 'random';
                break;
            default: // 通常の敵（青）
                this.speed = 3;
                this.moveRange = 200;
                this.scoreValue = 50;
                this.color = '#0000FF';
                this.movePattern = 'circle';
                break;
        }
    }

    update(game: IGame): void {
        if (!this.isAlive) return;

        if (this.spawning) {
            const currentTime = Date.now();
            this.spawnProgress = Math.min(
                1,
                (currentTime - this.spawnStartTime) / this.spawnDuration
            );
            if (this.spawnProgress >= 1) {
                this.spawning = false;
            }
            return;
        }

        // タイプごとの移動パターン
        switch (this.movePattern) {
            case 'zigzag':
                this.zigzagAngle += 0.1;
                this.x += this.speed * Math.cos(this.zigzagAngle);
                this.y += this.speed * 0.5 * Math.sin(this.zigzagAngle * 2);
                // 範囲を超えたら方向転換
                if (Math.abs(this.x - this.startX) > this.moveRange) {
                    this.startX = this.x;
                    this.zigzagAngle = Math.PI - this.zigzagAngle;
                }
                break;

            case 'chase':
                if (game?.player) {
                    const dx = game.player.x - this.x;
                    const dy = game.player.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 0) {
                        this.x += (dx / distance) * this.speed;
                        this.y += (dy / distance) * this.speed;
                    }
                }
                break;

            case 'random':
                this.directionChangeTimer++;
                if (this.directionChangeTimer > 60) {
                    // 約1秒ごとに方向変更
                    this.dx = Math.random() * 2 - 1;
                    this.dy = Math.random() * 2 - 1;
                    this.directionChangeTimer = 0;
                }
                this.x += this.dx * this.speed;
                this.y += this.dy * this.speed;

                // 画面外に出ないように制限
                if (game) {
                    if (this.x < 0 || this.x > game.canvas.width - this.width) this.dx *= -1;
                    if (this.y < 0 || this.y > game.canvas.height - this.height) this.dy *= -1;
                }
                break;

            case 'horizontal':
                this.x += this.speed * this.direction;
                if (Math.abs(this.x - this.startX) > this.moveRange) {
                    this.direction *= -1;
                }
                break;

            case 'circle': {
                const angle = (Date.now() / 1000) % (Math.PI * 2);
                this.x = this.startX + (Math.cos(angle) * this.moveRange) / 2;
                this.y = this.startY + (Math.sin(angle) * this.moveRange) / 2;
                break;
            }
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.isAlive) return;

        if (this.spawning) {
            const scale = this.spawnProgress;
            const alpha = this.spawnProgress;

            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.scale(scale, scale);
            ctx.rotate(this.spawnProgress * Math.PI * 2);

            this.drawTiger(ctx, -this.width / 2, -this.height / 2, this.width, this.height, alpha);

            ctx.restore();
        } else {
            this.drawTiger(ctx, this.x, this.y, this.width, this.height, 1);
        }
    }

    drawTiger(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, alpha: number): void {
        ctx.save();

        // 体の基本色
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
        ctx.fillRect(x, y, width, height);

        // 虎の特徴を追加
        const stripeColor = `rgba(0, 0, 0, ${alpha * 0.5})`;
        ctx.fillStyle = stripeColor;

        // 縦縞模様（タイプによって異なるパターン）
        switch (this.type) {
            case 'fast': // 速い敵は斜めの縞
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.moveTo(x + width * (0.2 + i * 0.3), y);
                    ctx.lineTo(x + width * (0.3 + i * 0.3), y + height);
                    ctx.lineTo(x + width * (0.4 + i * 0.3), y + height);
                    ctx.lineTo(x + width * (0.3 + i * 0.3), y);
                    ctx.fill();
                }
                break;

            case 'tank': // タンクは太い縦縞
                for (let i = 0; i < 2; i++) {
                    ctx.fillRect(x + width * (0.3 + i * 0.4), y, width * 0.15, height);
                }
                break;

            case 'hunter': // ハンターは波状の縞
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const xPos = x + width * (0.2 + i * 0.3);
                    ctx.moveTo(xPos, y);
                    for (let j = 0; j <= height; j += height / 4) {
                        ctx.quadraticCurveTo(
                            xPos + width * 0.1,
                            y + j + height / 8,
                            xPos,
                            y + j + height / 4
                        );
                    }
                }
                ctx.stroke();
                break;

            case 'random': // ランダムは点状の模様
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.arc(
                        x + width * (0.2 + Math.random() * 0.6),
                        y + height * (0.2 + Math.random() * 0.6),
                        width * 0.1,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                }
                break;

            default: // 通常の敵は普通の縦縞
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x + width * (0.25 + i * 0.25), y, width * 0.1, height);
                }
        }

        // 耳
        ctx.fillStyle = `rgba(${this.color}, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.2, y);
        ctx.lineTo(x + width * 0.3, y - height * 0.2);
        ctx.lineTo(x + width * 0.4, y);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + width * 0.6, y);
        ctx.lineTo(x + width * 0.7, y - height * 0.2);
        ctx.lineTo(x + width * 0.8, y);
        ctx.fill();

        // 目
        const eyeColor = `rgba(255, 255, 0, ${alpha})`; // 黄色い目
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(x + width * 0.3, y + height * 0.3, width * 0.1, 0, Math.PI * 2);
        ctx.arc(x + width * 0.7, y + height * 0.3, width * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // 瞳
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(x + width * 0.3, y + height * 0.3, width * 0.05, 0, Math.PI * 2);
        ctx.arc(x + width * 0.7, y + height * 0.3, width * 0.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
} 