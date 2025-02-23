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
    public isMoving: boolean;
    public walkAnimationSpeed: number;
    public capeOffset: number;

    constructor(x: number, y: number) {
        super(x, y, 32, 32);
        this.speed = 2.5;
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
        this.isMoving = false;
        this.walkAnimationSpeed = 0.2;
        this.capeOffset = 0;
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
        // 移動状態の更新
        this.isMoving =
            game.keys.ArrowLeft || game.keys.ArrowRight || game.keys.ArrowUp || game.keys.ArrowDown;

        // アニメーションフレームの更新
        if (this.isMoving) {
            this.walkFrame += this.walkAnimationSpeed;
            this.capeOffset = Math.sin(this.walkFrame) * 2;
        } else {
            this.walkFrame = 0;
            this.capeOffset = 0;
        }

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
        ctx.translate(this.x, this.y);

        // キャラクターの向きに応じて反転
        const isLeftFacing = this.direction === 'left';
        if (isLeftFacing) {
            ctx.scale(-1, 1);
        }

        // アニメーションのオフセット計算
        const legOffset = this.isMoving ? Math.sin(this.walkFrame * Math.PI) * 3 : 0;

        // 影の描画
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, 15, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // === 2頭身キャラクターの描画 ===

        // 脚（歩行アニメーション）
        ctx.fillStyle = this.colors.armor;
        // 左脚
        ctx.fillRect(-6, 5 + legOffset, 5, 10);
        // 右脚
        ctx.fillRect(1, 5 - legOffset, 5, 10);

        // マント
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-8 - this.capeOffset * 0.5, -10, 3, 15);
        ctx.fillRect(5 + this.capeOffset * 0.5, -10, 3, 15);

        // 胴体（小さめの四角形）
        ctx.fillStyle = this.colors.armor;
        ctx.fillRect(-7, -10, 14, 15);

        // 装飾ライン
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-7, -5, 14, 2);
        ctx.fillRect(-7, 0, 14, 2);

        // 頭（大きめの円形）
        ctx.fillStyle = this.colors.armor;
        ctx.beginPath();
        ctx.arc(0, -15, 10, 0, Math.PI * 2);
        ctx.fill();

        // ヘルメットのバイザー
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-6, -18, 12, 3);

        // 羽飾り
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-4, -25, 2, 8);
        ctx.fillRect(-2, -27, 2, 10);
        ctx.fillRect(0, -25, 2, 8);

        // 盾（左手に持つ）
        if (!this.isAttacking) {
            ctx.fillStyle = this.colors.shield;
            ctx.fillRect(-12, -8, 4, 12);
            // 盾の装飾
            ctx.fillStyle = '#8a5a3a';
            ctx.fillRect(-12, -5, 4, 2);
            ctx.fillRect(-12, 0, 4, 2);
        }

        // 剣（右手に持つ）
        if (!this.isAttacking) {
            // 大剣の柄
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(9, -8, 4, 8);
            // 柄の装飾
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(9, -6, 4, 4);

            // 大剣のつば
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(7, -9, 8, 3);

            // 大剣の刃
            ctx.fillStyle = this.colors.sword;
            ctx.fillRect(9, -25, 4, 16);

            // 刃先
            ctx.beginPath();
            ctx.moveTo(9, -25);
            ctx.lineTo(11, -28);
            ctx.lineTo(13, -25);
            ctx.fill();

            // 刃の装飾ライン
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(10, -24, 2, 15);
        } else {
            // 攻撃時の剣の描画（斜めに構える）
            ctx.save();
            ctx.translate(9, -8);
            ctx.rotate(-Math.PI / 4);

            // 柄
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(0, 0, 4, 8);
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, 2, 4, 4);

            // つば
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(-2, -1, 8, 3);

            // 刃
            ctx.fillStyle = this.colors.sword;
            ctx.fillRect(0, -17, 4, 16);

            // 刃先
            ctx.beginPath();
            ctx.moveTo(0, -17);
            ctx.lineTo(2, -20);
            ctx.lineTo(4, -17);
            ctx.fill();

            // 装飾ライン
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(1, -16, 2, 15);

            ctx.restore();
        }

        // 攻撃エフェクト
        if (this.isAttacking) {
            const attackFrame = this.attackFrame / this.attackDuration;
            const opacity = 1 - attackFrame;

            // 斬撃エフェクト
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(15, -15, this.attackRange * opacity * 0.5, -Math.PI / 4, Math.PI / 2);
            ctx.stroke();

            // 追加の光の線
            const lines = 3;
            for (let i = 0; i < lines; i++) {
                const lineOpacity = opacity * (1 - i / lines);
                ctx.strokeStyle = `rgba(200, 230, 255, ${lineOpacity})`;
                ctx.lineWidth = 1.5 - i * 0.3;
                ctx.beginPath();
                ctx.arc(
                    15,
                    -15,
                    this.attackRange * opacity * 0.5 + i * 3,
                    -Math.PI / 4,
                    Math.PI / 2
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    levelUp(): void {
        this.level++;
        this.exp -= this.expToNextLevel;
        this.expToNextLevel = Math.floor(this.expToNextLevel * 1.5);

        // レベルアップ時の能力上昇
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
