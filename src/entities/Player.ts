import type { Direction, IEnemy, IGame, IPlayer, PlayerColors } from '../types.js';
import { GameObject } from './GameObject.js';

export class Player extends GameObject implements IPlayer {
    public speed: number;
    public direction: Direction;
    public level: number;
    public exp: number;
    public expToNextLevel: number;
    public isAttacking: boolean;
    public attackDuration: number;
    public attackTimer: number;
    public attackRange: number;
    public attackPower: number;
    public attackFrame: number;
    public autoAttackRange: number;
    public autoAttackCooldown: number;
    public lastAutoAttackTime: number;
    public animationFrame: number;
    public walkFrame: number;
    public colors: PlayerColors;
    public score: number;
    public powerUps: number;

    constructor(x: number, y: number) {
        super(x, y, 32, 32);
        this.speed = 5;
        this.direction = 'right';

        // レベルシステム
        this.level = 1;
        this.exp = 0;
        this.expToNextLevel = 100;

        // 剣攻撃の設定
        this.isAttacking = false;
        this.attackDuration = 200;
        this.attackTimer = 0;
        this.attackRange = 80;
        this.attackPower = 1;
        this.attackFrame = 0;

        // 自動攻撃の設定
        this.autoAttackRange = 150;
        this.autoAttackCooldown = 500;
        this.lastAutoAttackTime = 0;

        // アニメーション用
        this.animationFrame = 0;
        this.walkFrame = 0;
        this.colors = {
            armor: '#4444FF',
            skin: '#FFD700',
            hair: '#8B4513',
            sword: '#SILVER',
            shield: '#CD853F',
        };

        // その他のプロパティ
        this.score = 0;
        this.powerUps = 0;
    }

    update(game: IGame): void {
        // 移動処理
        if (game.keys.ArrowLeft) {
            this.x -= this.speed;
            this.direction = 'left';
        }
        if (game.keys.ArrowRight) {
            this.x += this.speed;
            this.direction = 'right';
        }
        if (game.keys.ArrowUp) {
            this.y -= this.speed;
            this.direction = 'up';
        }
        if (game.keys.ArrowDown) {
            this.y += this.speed;
            this.direction = 'down';
        }

        // 画面外に出ないように制限
        this.x = Math.max(0, Math.min(this.x, game.canvas.width - this.width));
        this.y = Math.max(0, Math.min(this.y, game.canvas.height - this.height));

        // 自動攻撃の処理
        if (!this.isAttacking) {
            const currentTime = Date.now();
            if (currentTime - this.lastAutoAttackTime >= this.autoAttackCooldown) {
                // 最も近い敵を探す
                let nearestEnemy = null;
                let minDistance = Number.POSITIVE_INFINITY;

                for (const enemy of game.enemies) {
                    if (enemy.isAlive) {
                        const dx = enemy.x - this.x;
                        const dy = enemy.y - this.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestEnemy = enemy;
                        }
                    }
                }

                // 近くに敵がいれば攻撃
                if (nearestEnemy && minDistance <= this.autoAttackRange) {
                    const dx = nearestEnemy.x - this.x;
                    const dy = nearestEnemy.y - this.y;

                    if (Math.abs(dx) > Math.abs(dy)) {
                        this.direction = dx > 0 ? 'right' : 'left';
                    } else {
                        this.direction = dy > 0 ? 'down' : 'up';
                    }

                    this.isAttacking = true;
                    this.attackTimer = this.attackDuration;
                    this.lastAutoAttackTime = currentTime;
                }
            }
        }

        // 手動攻撃の処理
        if (game.keys[' '] && !this.isAttacking) {
            this.isAttacking = true;
            this.attackTimer = this.attackDuration;
            this.lastAutoAttackTime = Date.now();
        }

        // 攻撃タイマーの更新
        if (this.isAttacking) {
            this.attackTimer -= 16;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
            }
        }
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        // キャラクターの基本位置
        const x = Math.floor(this.x);
        const y = Math.floor(this.y);
        const w = this.width;
        const h = this.height;

        // 歩行アニメーション
        this.walkFrame = (this.walkFrame + 1) % 30;
        const bounce = Math.sin(this.walkFrame * 0.2) * 2;

        // 向きに応じて反転
        const scaleX = 1;
        if (this.direction === 'left') {
            ctx.scale(-1, 1);
            ctx.translate(-x * 2 - w, 0);
        }

        // 体の描画
        ctx.fillStyle = this.colors.armor;
        // 胴体（8bitらしい四角形）
        ctx.fillRect(x + 8, y + 12 + bounce, 16, 16);

        // 頭
        ctx.fillStyle = this.colors.skin;
        ctx.fillRect(x + 10, y + 4 + bounce, 12, 12);

        // 髪
        ctx.fillStyle = this.colors.hair;
        ctx.fillRect(x + 8, y + 2 + bounce, 16, 6);

        // 剣（通常時）
        if (!this.isAttacking) {
            ctx.fillStyle = this.colors.sword;
            if (this.direction === 'right' || this.direction === 'left') {
                ctx.fillRect(x + 20, y + 16 + bounce, 60, 18); // 横長さ60px、太さ18px
            } else if (this.direction === 'up') {
                ctx.fillRect(x + 14, y - 24 + bounce, 18, 60); // 縦長さ60px、太さ18px
            } else {
                ctx.fillRect(x + 14, y + 24 + bounce, 18, 60); // 縦長さ60px、太さ18px
            }
        }

        // 攻撃エフェクトの描画
        if (this.isAttacking) {
            const progress = 1 - this.attackTimer / this.attackDuration;
            this.attackFrame = Math.floor(progress * 3);

            // 剣を振るエフェクト
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 12;
            ctx.beginPath();

            const centerX = x + w / 2;
            const centerY = y + h / 2;
            const swingAngle = Math.PI * progress; // 振り下ろしの角度を調整

            if (this.direction === 'right' || this.direction === 'left') {
                // 縦振り（上から下）
                ctx.beginPath();
                ctx.arc(
                    centerX,
                    centerY,
                    this.attackRange * 1.5,
                    -Math.PI / 2 - swingAngle / 2, // 上から
                    Math.PI / 2 - swingAngle / 2, // 下まで
                    this.direction === 'left'
                ); // 左向きの場合は逆回転
                ctx.stroke();

                // 剣の描画
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(-Math.PI / 2 - swingAngle / 2); // 上から始まる回転
                ctx.fillStyle = this.colors.sword;
                ctx.fillRect(0, -9, 120, 18);
                ctx.restore();
            } else {
                // 上下方向の場合は横振り
                ctx.beginPath();
                const startAngle = this.direction === 'up' ? Math.PI : 0;
                ctx.arc(
                    centerX,
                    centerY,
                    this.attackRange * 1.5,
                    startAngle - Math.PI / 3 - swingAngle / 2,
                    startAngle + Math.PI / 3 - swingAngle / 2
                );
                ctx.stroke();

                // 剣の描画
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(startAngle - swingAngle / 2);
                ctx.fillStyle = this.colors.sword;
                ctx.fillRect(0, -9, 120, 18);
                ctx.restore();
            }

            // 斬撃エフェクト
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * (1 - progress)})`;
            ctx.lineWidth = 15;
            for (let i = 0; i < 3; i++) {
                const offset = i * 45 * (1 - progress);
                ctx.beginPath();
                if (this.direction === 'right' || this.direction === 'left') {
                    // 縦方向の斬撃エフェクト
                    const effectX = centerX + (this.direction === 'left' ? -offset : offset);
                    ctx.moveTo(effectX, centerY - 90 * (1 - progress));
                    ctx.lineTo(effectX, centerY + 90 * (1 - progress));
                    ctx.lineTo(effectX + (this.direction === 'left' ? -30 : 30), centerY);
                } else {
                    // 横方向の斬撃エフェクト
                    const effectY = centerY + (this.direction === 'up' ? -offset : offset);
                    ctx.moveTo(centerX - 90 * (1 - progress), effectY);
                    ctx.lineTo(centerX + 90 * (1 - progress), effectY);
                    ctx.lineTo(centerX, effectY + (this.direction === 'up' ? -30 : 30));
                }
                ctx.stroke();
            }
        }

        // レベル表示
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${this.level}`, x + w / 2, y - 5);

        ctx.restore();
    }

    levelUp(): void {
        this.level++;
        this.exp -= this.expToNextLevel;
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);

        // レベルアップ時の能力上昇
        this.speed += 0.2;
        this.attackRange += 10;
        this.autoAttackRange += 15;
        this.attackPower += 0.5;
        this.autoAttackCooldown = Math.max(200, this.autoAttackCooldown - 20);
    }

    powerUp(): void {
        this.powerUps++;
        this.attackPower = 1 + this.powerUps * 0.5;
        this.attackRange += 5;
    }

    // レベルアップ処理を追加
    gainExp(amount: number): void {
        this.exp += amount;
        while (this.exp >= this.expToNextLevel) {
            this.levelUp();
        }
    }

    // 攻撃判定メソッドを追加
    checkAttackCollision(enemy: IEnemy): boolean {
        if (!this.isAttacking) return false;

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;

        // 敵との距離を計算
        const dx = enemyCenterX - centerX;
        const dy = enemyCenterY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 攻撃範囲外なら判定しない
        if (distance > this.attackRange) return false;

        // 攻撃方向に応じた判定
        let attackAngle: number;
        switch (this.direction) {
            case 'right':
                attackAngle = 0;
                break;
            case 'left':
                attackAngle = Math.PI;
                break;
            case 'up':
                attackAngle = -Math.PI / 2;
                break;
            case 'down':
                attackAngle = Math.PI / 2;
                break;
        }

        // 敵の角度を計算
        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += Math.PI * 2;

        // 攻撃角度との差を計算
        let angleDiff = Math.abs(angle - attackAngle);
        if (angleDiff > Math.PI) {
            angleDiff = Math.PI * 2 - angleDiff;
        }

        // 90度の範囲内なら攻撃が当たる
        return angleDiff <= Math.PI / 2;
    }
}
