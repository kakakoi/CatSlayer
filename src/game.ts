import {
    IGame,
    IGameObject,
    ICoin,
    IEnemy,
    IPlayer,
    ISpawner,
    GameState,
    TouchState,
    KeyState,
    Direction,
    PlayerColors,
    SoundName,
    EnemyType,
    MovePattern
} from './types';

// ゲームオブジェクトの基本クラス
class GameObject implements IGameObject {
    constructor(
        public x: number,
        public y: number,
        public width: number,
        public height: number
    ) {}

    // 衝突判定
    collidesWith(other: IGameObject): boolean {
        return (
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }
}

// コインクラス
class Coin extends GameObject implements ICoin {
    public collected: boolean = false;
    public value: number = 10;
    public animationOffset: number;

    constructor(x: number, y: number) {
        super(x, y, 20, 20);
        this.animationOffset = Math.random() * Math.PI * 2;
    }

    update(time: number): void {
        // 上下に浮遊するアニメーション
        this.y += Math.sin(time / 500 + this.animationOffset) * 0.5;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (this.collected) return;

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.stroke();
    }
}

// 敵スポナークラス
class Spawner extends GameObject implements ISpawner {
    public id: number = 0;
    public lastSpawnTime: number;
    public active: boolean;
    public radius: number;
    public progress: number;
    public maxEnemiesAlive: number;
    public enemyCount: number;
    public spawnedEnemies: IEnemy[];
    public spawnEffect: number;

    constructor(x: number, y: number, public spawnInterval: number = 3000) {
        super(x, y, 40, 40);
        this.lastSpawnTime = Date.now();
        this.active = false;
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

// プレイヤークラス
class Player extends GameObject implements IPlayer {
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
        let attackAngle;
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

// 敵クラス
class Enemy extends GameObject implements IEnemy {
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

// ゲームクラス
class Game implements IGame {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public keys: KeyState = {};
    public player: IPlayer;
    public enemies: IEnemy[] = [];
    public coins: ICoin[] = [];
    public spawners: ISpawner[] = [];
    public isRunning: boolean = false;
    public gameState: GameState = 'playing';
    public score: number = 0;
    public stage: number = 1;
    public startTime: number = Date.now();
    public stageTime: number = 60;
    public remainingTime: number = this.stageTime;
    public audioContext: AudioContext | null = null;
    public masterGain: GainNode | null = null;
    public isMuted: boolean = false;
    public bgmPlaying: boolean = false;
    public touchState: TouchState;
    public nextStageStartTime: number = 0;
    private coinSound: () => void = () => {};
    private enemyDeathSound: () => void = () => {};
    private levelUpSound: () => void = () => {};
    private gameOverSound: () => void = () => {};
    private stageClearSound: () => void = () => {};

    constructor() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error('Canvas element not found');
        }
        this.canvas = canvas;

        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        this.ctx = ctx;

        this.player = new Player(50, 50);
        this.initializeInputs();
        this.setupSpawners();
        this.resize();

        // タッチ状態の初期化
        this.touchState = {
            isMoving: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            lastTapTime: 0,
            doubleTapDelay: 300,
            joystickRadius: 50
        };

        window.addEventListener('resize', () => this.resize());
    }

    // スポナーのセットアップを別メソッドに分離
    setupSpawners(): void {
        // キャンバスの中央を基準に配置
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const offsetX = this.canvas.width * 0.35; // 横方向のオフセット
        const offsetY = this.canvas.height * 0.35; // 縦方向のオフセット

        // スポナーをより外側に配置
        this.spawners = [
            new Spawner(centerX - offsetX, centerY - offsetY, 2000), // 左上
            new Spawner(centerX + offsetX, centerY - offsetY, 2000), // 右上
            new Spawner(centerX - offsetX, centerY + offsetY, 2000), // 左下
            new Spawner(centerX + offsetX, centerY + offsetY, 2000), // 右下
        ];

        // スポナーにIDを付与
        this.spawners.forEach((spawner, index) => {
            spawner.id = index;
            spawner.active = false;
            spawner.lastSpawnTime = Date.now() + index * 500; // スポナーごとに時間をずらす
        });

        // スポナーを段階的に起動
        this.spawners.forEach((spawner, index) => {
            setTimeout(
                () => {
                    spawner.active = true;
                },
                2000 + index * 500
            );
        });
    }

    // 画面サイズの調整
    resize(): void {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // 画面の向きと端末に応じて最適なサイズを計算
        if (windowWidth < windowHeight) {
            // 縦向きの場合
            this.canvas.width = windowWidth;
            this.canvas.height = windowHeight * 0.9;
        } else {
            // 横向きの場合
            // 画面の90%の高さを基準にする
            const targetHeight = windowHeight * 0.9;
            // 16:9のアスペクト比を維持
            const targetWidth = targetHeight * (16 / 9);

            // 幅が画面を超える場合は幅を基準にする
            if (targetWidth > windowWidth * 0.95) {
                this.canvas.width = windowWidth * 0.95;
                this.canvas.height = windowWidth * 0.95 * (9 / 16);
            } else {
                this.canvas.width = targetWidth;
                this.canvas.height = targetHeight;
            }
        }

        // キャンバスの位置を中央に調整
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '50%';
        this.canvas.style.top = '50%';
        this.canvas.style.transform = 'translate(-50%, -50%)';
    }

    // 入力処理の初期化を更新
    initializeInputs(): void {
        // キーボード入力
        window.addEventListener('keydown', (e) => {
            if (this.gameState === 'gameover' && e.key === ' ') {
                this.restart();
                return;
            }
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // タッチ状態の初期化を更新
        this.touchState = {
            isMoving: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            lastTapTime: 0,
            doubleTapDelay: 300,
            joystickRadius: 50, // ジョイスティックの移動半径
        };

        // タッチ開始時の処理を更新
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();

            if (this.gameState === 'gameover') {
                this.restart();
                return;
            }

            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // サウンドボタンの判定
            if (x >= this.canvas.width - 40 && x <= this.canvas.width - 10 && y >= 10 && y <= 40) {
                this.toggleSound();
                return;
            }

            // ダブルタップの判定
            const currentTime = Date.now();
            if (currentTime - this.touchState.lastTapTime < this.touchState.doubleTapDelay) {
                if (!this.player.isAttacking) {
                    this.player.isAttacking = true;
                    this.player.attackTimer = this.player.attackDuration;
                    this.player.lastAutoAttackTime = currentTime;
                }
            }
            this.touchState.lastTapTime = currentTime;

            // タッチ開始位置を保存
            this.touchState.isMoving = true;
            this.touchState.startX = x;
            this.touchState.startY = y;
            this.touchState.currentX = x;
            this.touchState.currentY = y;
        });

        // タッチ移動時の処理を更新
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchState.isMoving) return;

            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            this.touchState.currentX = x;
            this.touchState.currentY = y;

            // ジョイスティックの方向計算
            const dx = x - this.touchState.startX;
            const dy = y - this.touchState.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 移動方向の正規化と閾値の適用
            if (distance > 10) {
                // デッドゾーン
                const normalizedDx = dx / distance;
                const normalizedDy = dy / distance;

                // 8方向の移動に制限
                this.keys.ArrowRight = normalizedDx > 0.5;
                this.keys.ArrowLeft = normalizedDx < -0.5;
                this.keys.ArrowDown = normalizedDy > 0.5;
                this.keys.ArrowUp = normalizedDy < -0.5;

                // プレイヤーの向きを設定
                if (Math.abs(normalizedDx) > Math.abs(normalizedDy)) {
                    this.player.direction = normalizedDx > 0 ? 'right' : 'left';
                } else {
                    this.player.direction = normalizedDy > 0 ? 'down' : 'up';
                }
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.touchState.isMoving = false;
            this.resetMovementKeys();
        });
    }

    // 新しいメソッド：移動キーをリセット
    resetMovementKeys(): void {
        this.keys.ArrowRight = false;
        this.keys.ArrowLeft = false;
        this.keys.ArrowDown = false;
        this.keys.ArrowUp = false;
    }

    // ゲームの更新処理
    update(): void {
        if (this.gameState === 'gameover') {
            this.bgmPlaying = false;
            this.playSound('gameOver');
            return;
        }

        if (this.gameState === 'stageClear') {
            // ステージクリア中は敵の更新を停止
            if (Date.now() >= this.nextStageStartTime) {
                this.nextStage();
            }
            return;
        }

        const currentTime = Date.now();

        // 残り時間の更新
        this.remainingTime = Math.max(
            0,
            this.stageTime - Math.floor((currentTime - this.startTime) / 1000)
        );

        // 時間切れチェック
        if (this.remainingTime <= 0) {
            this.gameState = 'stageClear';
            this.nextStageStartTime = Date.now() + 5000; // 5秒後に次のステージ

            // 現在の敵をすべて消去
            this.enemies = [];
            this.coins = [];

            // スポナーを停止
            for (const spawner of this.spawners) {
                spawner.active = false;
                spawner.spawnedEnemies = [];
                spawner.enemyCount = 0;
            }

            this.playSound('stageClear');
            return;
        }

        this.player.update(this);

        // スポナーの更新
        for (const spawner of this.spawners) {
            spawner.update(this, currentTime);
        }

        // 敵の更新と衝突判定
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.update(this);

                if (this.player.checkAttackCollision(enemy)) {
                    enemy.isAlive = false;
                    enemy.deathTime = Date.now();
                    this.score += enemy.scoreValue;
                    this.player.gainExp(enemy.scoreValue * 0.4);

                    // 敵を倒した時の効果音
                    this.playSound('enemyDeath');

                    if (Math.random() < 0.5) {
                        this.coins.push(new Coin(enemy.x, enemy.y));
                    }
                }

                if (enemy.isAlive && this.player.collidesWith(enemy)) {
                    this.gameState = 'gameover';
                }
            }
        }

        // コインの更新と収集判定
        for (const coin of this.coins) {
            if (!coin.collected) {
                coin.update(currentTime);
                if (this.player.collidesWith(coin)) {
                    coin.collected = true;
                    this.score += coin.value;
                    this.player.gainExp(30);
                    // コイン収集時の効果音
                    this.playSound('coin');
                }
            }
        }

        // 死亡した敵を配列から削除（定期的なクリーンアップ）
        this.enemies = this.enemies.filter(
            (enemy) => enemy.isAlive || (enemy.deathTime && Date.now() - enemy.deathTime < 1000)
        );

        // 使用済みのコインを配列から削除
        this.coins = this.coins.filter((coin) => !coin.collected);
    }

    // 描画処理
    render(): void {
        // 画面クリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 背景のグリッド描画
        this.drawGrid();

        // スポナーの描画
        for (const spawner of this.spawners) {
            spawner.render(this.ctx);
        }

        // コインの描画
        for (const coin of this.coins) {
            coin.render(this.ctx);
        }

        // 敵の描画
        for (const enemy of this.enemies) {
            enemy.render(this.ctx);
        }

        // プレイヤーの描画
        this.player.render(this.ctx);

        // ステージと残り時間の表示を更新
        this.ctx.fillStyle = 'black';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Stage: ${this.stage}`, 10, 30);

        // スコア表示
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 60);

        // ステージクリア画面
        if (this.gameState === 'stageClear') {
            this.renderStageClear();
        }

        // ゲームオーバー画面
        if (this.gameState === 'gameover') {
            this.renderGameOver();
        }

        // サウンドコントロールボタンの描画
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width - 40, 10, 30, 30);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.isMuted ? '🔇' : '🔊', this.canvas.width - 25, 30);

        // 仮想ジョイスティックの描画
        if (this.touchState.isMoving) {
            // ジョイスティックの基準円
            this.ctx.beginPath();
            this.ctx.arc(
                this.touchState.startX,
                this.touchState.startY,
                this.touchState.joystickRadius,
                0,
                Math.PI * 2
            );
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // スティック部分
            const dx = this.touchState.currentX - this.touchState.startX;
            const dy = this.touchState.currentY - this.touchState.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = this.touchState.joystickRadius;

            const stickX =
                this.touchState.startX + (dx / distance) * Math.min(distance, maxDistance);
            const stickY =
                this.touchState.startY + (dy / distance) * Math.min(distance, maxDistance);

            this.ctx.beginPath();
            this.ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fill();
        }
    }

    renderStageClear(): void {
        // 半透明の青背景
        this.ctx.fillStyle = 'rgba(0, 0, 255, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ステージクリアテキスト
        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            `STAGE ${this.stage} CLEAR!`,
            this.canvas.width / 2,
            this.canvas.height / 2 - 50
        );

        // カウントダウンの表示
        const nextStageIn = Math.ceil((this.nextStageStartTime - Date.now()) / 1000);
        this.ctx.font = '36px Arial';
        this.ctx.fillText(
            `Next Stage in ${nextStageIn}`,
            this.canvas.width / 2,
            this.canvas.height / 2 + 10
        );
    }

    renderGameOver(): void {
        // 半透明の黒背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ゲームオーバーテキスト
        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);

        // スコア表示
        this.ctx.font = '24px Arial';
        this.ctx.fillText(
            `Final Score: ${this.score}`,
            this.canvas.width / 2,
            this.canvas.height / 2 + 10
        );

        // リスタート案内（タッチとスペースキーの両方を表示）
        this.ctx.font = '20px Arial';
        this.ctx.fillText(
            'Tap or Press Space to Restart',
            this.canvas.width / 2,
            this.canvas.height / 2 + 50
        );
    }

    restart(): void {
        this.gameState = 'playing';
        this.score = 0;
        this.stage = 1;
        this.remainingTime = this.stageTime;
        this.startTime = Date.now();
        this.player = new Player(50, 50);
        this.enemies = [];
        this.coins = [];

        // スポナーの完全な再初期化
        for (const spawner of this.spawners) {
            spawner.active = false;
            spawner.lastSpawnTime = Date.now() + spawner.id * 500;
            spawner.spawnInterval = 2000;
            spawner.maxEnemiesAlive = 5;
            spawner.enemyCount = 0;
            spawner.spawnedEnemies = [];
            spawner.progress = 0;

            // 段階的に起動
            setTimeout(
                () => {
                    spawner.active = true;
                },
                2000 + spawner.id * 500
            );
        }

        if (this.audioContext) {
            this.playBGM();
        }
    }

    // ゲームループ
    gameLoop(currentTime: number): void {
        if (!this.isRunning) return;

        this.update();
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    // ゲーム開始
    start(): void {
        if (!this.isRunning) {
            this.isRunning = true;

            // 最初のユーザー操作時にAudioContextを初期化
            this.canvas.addEventListener(
                'touchstart',
                () => {
                    if (!this.audioContext) {
                        this.setupAudio();
                        this.playBGM();
                    }
                },
                { once: true }
            );

            this.canvas.addEventListener(
                'click',
                () => {
                    if (!this.audioContext) {
                        this.setupAudio();
                        this.playBGM();
                    }
                },
                { once: true }
            );

            this.gameLoop(0);
        }
    }

    // オーディオシステムのセットアップ
    setupAudio(): void {
        // ユーザーのジェスチャー後に初期化
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext)();
        }

        // マスターボリューム
        if (this.audioContext && !this.masterGain) {
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3;
            this.masterGain.connect(this.audioContext.destination);
        }

        // 効果音の設定
        this.setupSoundEffects();
    }

    // 効果音の生成
    setupSoundEffects(): void {
        if (!this.audioContext || !this.masterGain) return;

        const audioContext = this.audioContext;
        const masterGain = this.masterGain;

        // コイン取得音
        this.coinSound = () => {
            if (!audioContext || !masterGain) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                440,
                audioContext.currentTime + 0.1
            );

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        };

        // 敵撃破音
        this.enemyDeathSound = () => {
            if (!audioContext || !masterGain) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(
                55,
                audioContext.currentTime + 0.2
            );

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        };

        // レベルアップ音
        this.levelUpSound = () => {
            if (!audioContext || !masterGain) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.2);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        };

        // ゲームオーバー音
        this.gameOverSound = () => {
            if (!audioContext || !masterGain) return;
            const time = audioContext.currentTime;

            // RPG風のメロディを定義
            const notes = [
                { freq: 523.25, duration: 0.15 }, // C5
                { freq: 587.33, duration: 0.15 }, // D5
                { freq: 523.25, duration: 0.15 }, // C5
                { freq: 440.0, duration: 0.15 }, // A4
                { freq: 392.0, duration: 0.3 }, // G4
                { freq: 349.23, duration: 0.6 }, // F4
            ];

            // 各音を順番に再生
            let currentTime = time;
            for (const note of notes) {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.value = note.freq;

                gainNode.gain.setValueAtTime(0.2, currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + note.duration - 0.1);

                oscillator.connect(gainNode);
                gainNode.connect(masterGain);

                oscillator.start(currentTime);
                oscillator.stop(currentTime + note.duration);

                currentTime += note.duration;
            }

            // 軽いリバーブ効果
            const convolver = audioContext.createConvolver();
            const reverbTime = 1; // リバーブ時間を短く
            const sampleRate = audioContext.sampleRate;
            const impulseLength = sampleRate * reverbTime;
            const impulse = audioContext.createBuffer(2, impulseLength, sampleRate);

            for (let channel = 0; channel < 2; channel++) {
                const impulseData = impulse.getChannelData(channel);
                for (let i = 0; i < impulseLength; i++) {
                    impulseData[i] = (Math.random() * 2 - 1) * (1 - i / impulseLength) ** 3;
                }
            }

            convolver.buffer = impulse;
            const reverbGain = audioContext.createGain();
            reverbGain.gain.value = 0.1; // リバーブを控えめに

            convolver.connect(reverbGain);
            reverbGain.connect(masterGain);
        };

        // ステージクリア音を追加
        this.stageClearSound = () => {
            if (!audioContext || !masterGain) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
            oscillator.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.3); // C6

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.4);
        };
    }

    // BGMの生成と再生
    playBGM(): void {
        if (!this.audioContext || !this.masterGain || this.bgmPlaying) return;
        this.bgmPlaying = true;

        const audioContext = this.audioContext;
        const masterGain = this.masterGain;

        const playNote = (frequency: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;

            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const bpm = 120;
        const beatDuration = 60 / bpm;
        const sequence = [
            440,
            523.25,
            659.25,
            523.25, // メロディ1
            440,
            523.25,
            659.25,
            523.25, // メロディ2
            392,
            493.88,
            587.33,
            493.88, // メロディ3
            349.23,
            440,
            523.25,
            440, // メロディ4
        ];

        const playSequence = (time: number) => {
            sequence.forEach((freq, index) => {
                playNote(freq, time + index * beatDuration, beatDuration);
            });

            // ループ再生
            if (this.bgmPlaying) {
                setTimeout(
                    () => playSequence(time + sequence.length * beatDuration),
                    sequence.length * beatDuration * 1000
                );
            }
        };

        playSequence(this.audioContext.currentTime);
    }

    // サウンド管理メソッドの更新
    toggleSound(): void {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        }
    }

    playSound(soundName: SoundName): void {
        if (!this.audioContext || this.isMuted) return;

        switch (soundName) {
            case 'coin':
                this.coinSound();
                break;
            case 'enemyDeath':
                this.enemyDeathSound();
                break;
            case 'levelUp':
                this.levelUpSound();
                break;
            case 'gameOver':
                this.gameOverSound();
                break;
            case 'stageClear':
                this.stageClearSound();
                break;
            case 'bgm':
                this.playBGM();
                break;
        }
    }

    // ステージクリア時の処理を追加
    nextStage(): void {
        // 敵とコインを完全に消去
        this.enemies = [];
        this.coins = [];

        // スポナーを一旦すべて停止
        for (const spawner of this.spawners) {
            spawner.active = false;
            spawner.spawnedEnemies = [];
            spawner.enemyCount = 0;
        }

        // ステージ情報の更新
        this.stage++;
        this.remainingTime = this.stageTime;
        this.gameState = 'playing';
        this.startTime = Date.now();

        // スポナーの設定を更新
        for (const spawner of this.spawners) {
            // ステージが上がるごとに敵の生成間隔を短くする
            spawner.spawnInterval = Math.max(1000, 2000 - (this.stage - 1) * 200);
            spawner.maxEnemiesAlive = Math.min(8, 5 + Math.floor((this.stage - 1) / 2));
            spawner.lastSpawnTime = Date.now() + spawner.id * 500; // スポナーごとに時間をずらす
        }

        // 2秒後にスポナーを起動
        setTimeout(() => {
            for (const spawner of this.spawners) {
                spawner.active = true;
            }
        }, 2000);

        // ステージクリア音を再生
        this.playSound('stageClear');
    }

    // drawGridメソッドを追加
    drawGrid(): void {
        this.ctx.strokeStyle = '#CCCCCC';
        this.ctx.lineWidth = 0.5;

        // 縦線
        for (let x = 0; x < this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // 横線
        for (let y = 0; y < this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
}

// ゲームの初期化と開始
window.onload = () => {
    const game = new Game();
    game.start();
};
