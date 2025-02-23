import { AudioManager } from './audio/AudioManager.js';
import { Coin } from './entities/Coin.js';
import type { Enemy } from './entities/Enemy.js';
import { Player } from './entities/Player.js';
import { Spawner } from './entities/Spawner.js';
import type { GameState, IGame, KeyState, TouchState } from './types.js';
import { CustomizePanel } from './ui/CustomizePanel.js';

// ゲームクラス
export class Game implements IGame {
    public canvas: HTMLCanvasElement;
    public ctx: CanvasRenderingContext2D;
    public keys: KeyState = {};
    public player: Player;
    public enemies: Enemy[] = [];
    public coins: Coin[] = [];
    public spawners: Spawner[] = [];
    public isRunning = false;
    public gameState: GameState = 'playing';
    public score = 0;
    public stage = 1;
    public startTime = Date.now();
    public stageTime = 60;
    public remainingTime: number = this.stageTime;
    public nextStageStartTime = 0;
    public touchState: TouchState = {
        isMoving: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        lastTapTime: 0,
        doubleTapDelay: 300,
        joystickRadius: 50,
        joystickBaseX: 0,
        joystickBaseY: 0,
    };
    private audioManager: AudioManager;
    private customizePanel: CustomizePanel;
    private backgroundCanvas: HTMLCanvasElement;
    private backgroundCtx: CanvasRenderingContext2D;

    constructor() {
        console.log('🐯 CatSlayer Game Starting...');
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

        // 背景用のオフスクリーンキャンバスを作成
        this.backgroundCanvas = document.createElement('canvas');
        const bgCtx = this.backgroundCanvas.getContext('2d');
        if (!bgCtx) {
            throw new Error('Failed to get background 2D context');
        }
        this.backgroundCtx = bgCtx;

        // プレイヤーを中央に配置
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
        this.audioManager = new AudioManager();
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
            joystickRadius: 50,
            joystickBaseX: 100,
            joystickBaseY: this.canvas.height - 100,
        };

        // カスタマイズパネルの初期化
        this.customizePanel = new CustomizePanel(
            this.canvas,
            this.ctx,
            (colors) => {
                // 色の保存とプレイヤーの更新
                this.player.colors = colors;
                localStorage.setItem('playerColors', JSON.stringify(colors));
                this.gameState = 'playing';
            },
            () => {
                this.gameState = 'playing';
            }
        );

        // 保存された色の読み込み
        const savedColors = localStorage.getItem('playerColors');
        if (savedColors) {
            this.player.colors = JSON.parse(savedColors);
        }

        window.addEventListener('resize', () => {
            this.resize();
            this.touchState.joystickBaseY = this.canvas.height - 100;
        });
    }

    // スポナーのセットアップを別メソッドに分離
    setupSpawners(): void {
        // 画面の四隅にスポナーを配置（マージンを設定）
        const margin = Math.min(this.canvas.width, this.canvas.height) * 0.1; // 画面サイズの10%をマージンとして使用

        // スポナーを四隅に配置
        this.spawners = [
            new Spawner(this, margin, margin, 2000), // 左上
            new Spawner(this, this.canvas.width - margin - 40, margin, 2000), // 右上
            new Spawner(this, margin, this.canvas.height - margin - 40, 2000), // 左下
            new Spawner(
                this,
                this.canvas.width - margin - 40,
                this.canvas.height - margin - 40,
                2000
            ), // 右下
        ];

        // スポナーにIDを付与と初期設定
        for (const [index, spawner] of this.spawners.entries()) {
            spawner.id = index;
            spawner.active = false;
            spawner.lastSpawnTime = Date.now() + index * 500; // スポナーごとに時間をずらす

            // 段階的に起動
            setTimeout(
                () => {
                    spawner.active = true;
                },
                2000 + index * 500
            );
        }
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

        // スポナーの位置を更新
        const margin = Math.min(this.canvas.width, this.canvas.height) * 0.1;
        if (this.spawners.length === 4) {
            // 左上のスポナー
            this.spawners[0].x = margin;
            this.spawners[0].y = margin;

            // 右上のスポナー
            this.spawners[1].x = this.canvas.width - margin - 40;
            this.spawners[1].y = margin;

            // 左下のスポナー
            this.spawners[2].x = margin;
            this.spawners[2].y = this.canvas.height - margin - 40;

            // 右下のスポナー
            this.spawners[3].x = this.canvas.width - margin - 40;
            this.spawners[3].y = this.canvas.height - margin - 40;
        }

        // 背景キャンバスのサイズも更新
        this.backgroundCanvas.width = this.canvas.width;
        this.backgroundCanvas.height = this.canvas.height;

        // 背景を再描画
        this.drawBackground();
    }

    // 新しい背景描画メソッド
    private drawBackground(): void {
        // 草原のタイルサイズ
        const tileSize = 32;
        const rows = Math.ceil(this.backgroundCanvas.height / tileSize);
        const cols = Math.ceil(this.backgroundCanvas.width / tileSize);

        // 背景色（薄い緑）
        this.backgroundCtx.fillStyle = '#90EE90';
        this.backgroundCtx.fillRect(
            0,
            0,
            this.backgroundCanvas.width,
            this.backgroundCanvas.height
        );

        // タイルごとに装飾を追加
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * tileSize;
                const y = row * tileSize;

                // ランダムな装飾（草や花）を追加
                if (Math.random() < 0.1) {
                    // 10%の確率で装飾を追加
                    const decorType = Math.random();

                    if (decorType < 0.6) {
                        // 60%の確率で草
                        // 草を描画
                        this.backgroundCtx.strokeStyle = '#228B22';
                        this.backgroundCtx.beginPath();
                        const grassX = x + Math.random() * (tileSize - 10) + 5;
                        const grassY = y + Math.random() * (tileSize - 10) + 5;
                        this.backgroundCtx.moveTo(grassX, grassY);
                        this.backgroundCtx.lineTo(grassX - 3, grassY - 5);
                        this.backgroundCtx.moveTo(grassX, grassY);
                        this.backgroundCtx.lineTo(grassX + 3, grassY - 5);
                        this.backgroundCtx.stroke();
                    } else {
                        // 40%の確率で花
                        // 花を描画
                        const flowerX = x + Math.random() * (tileSize - 8) + 4;
                        const flowerY = y + Math.random() * (tileSize - 8) + 4;

                        // 花びら
                        this.backgroundCtx.fillStyle = Math.random() < 0.5 ? '#FFD700' : '#FFFFFF';
                        for (let i = 0; i < 4; i++) {
                            this.backgroundCtx.beginPath();
                            this.backgroundCtx.arc(
                                flowerX + Math.cos((i * Math.PI) / 2) * 2,
                                flowerY + Math.sin((i * Math.PI) / 2) * 2,
                                2,
                                0,
                                Math.PI * 2
                            );
                            this.backgroundCtx.fill();
                        }

                        // 花の中心
                        this.backgroundCtx.fillStyle = '#FFA500';
                        this.backgroundCtx.beginPath();
                        this.backgroundCtx.arc(flowerX, flowerY, 1, 0, Math.PI * 2);
                        this.backgroundCtx.fill();
                    }
                }
            }
        }
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

        // サウンドボタンの判定を行う共通関数を更新
        const checkButtonClick = (clientX: number, clientY: number): boolean => {
            const rect = this.canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            // サウンドボタン
            if (x >= this.canvas.width - 80 && x <= this.canvas.width - 50 && y >= 10 && y <= 40) {
                this.audioManager.toggleSound();
                return true;
            }

            // カスタマイズボタン
            if (x >= this.canvas.width - 40 && x <= this.canvas.width - 10 && y >= 10 && y <= 40) {
                if (this.gameState === 'playing') {
                    this.gameState = 'customizing';
                    this.customizePanel.open();
                }
                return true;
            }

            return false;
        };

        // マウスクリックイベントの追加
        this.canvas.addEventListener('click', (e) => {
            if (this.gameState === 'gameover') {
                this.restart();
                return;
            }

            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (this.gameState === 'customizing') {
                this.customizePanel.handleClick(x, y);
                return;
            }

            checkButtonClick(e.clientX, e.clientY);
        });

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

            if (this.gameState === 'customizing') {
                this.customizePanel.handleClick(x, y);
                return;
            }

            // サウンドボタンのクリック判定
            if (checkButtonClick(touch.clientX, touch.clientY)) {
                return;
            }

            // ジョイスティックエリアの判定
            if (this.isInJoystickArea(x, y)) {
                this.touchState.isMoving = true;
                this.touchState.currentX = x;
                this.touchState.currentY = y;
                return;
            }

            // ジョイスティック以外の領域のタッチはダブルタップ攻撃として処理
            const currentTime = Date.now();
            if (currentTime - this.touchState.lastTapTime < this.touchState.doubleTapDelay) {
                if (!this.player.isAttacking) {
                    this.player.isAttacking = true;
                    this.player.attackTimer = this.player.attackDuration;
                    this.player.lastAutoAttackTime = currentTime;
                }
            }
            this.touchState.lastTapTime = currentTime;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.touchState.isMoving) return;

            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            this.touchState.currentX = x;
            this.touchState.currentY = y;

            // ジョイスティックの方向計算（固定位置基準）
            const dx = x - this.touchState.joystickBaseX;
            const dy = y - this.touchState.joystickBaseY;
            const distance = Math.sqrt(dx * dx + dy * dy);

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
            this.audioManager.stopBGM();
            this.audioManager.playSound('gameOver');
            return;
        }

        if (this.gameState === 'stageClear' || this.gameState === 'customizing') {
            // ステージクリアまたはカスタマイズ中は更新を停止
            if (this.gameState === 'stageClear' && Date.now() >= this.nextStageStartTime) {
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

            this.audioManager.playSound('stageClear');
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
                    this.audioManager.playSound('enemyDeath');

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
                    this.audioManager.playSound('coin');
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

        // カスタマイズ中は一時停止表示
        if (this.gameState === 'customizing') {
            // 半透明のオーバーレイ
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // 一時停止表示
            this.ctx.fillStyle = 'white';
            this.ctx.font = '36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('⏸ PAUSE', this.canvas.width / 2, 50);
        }

        // カスタマイズパネルの描画（最前面に表示）
        if (this.gameState === 'customizing') {
            this.customizePanel.render();
        }

        // サウンドとカスタマイズボタンの描画
        // サウンドボタン
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width - 80, 10, 30, 30);
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            this.audioManager.getMuteState() ? '🔇' : '🔊',
            this.canvas.width - 65,
            30
        );

        // カスタマイズボタン
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(this.canvas.width - 40, 10, 30, 30);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText('👤', this.canvas.width - 25, 30);

        // 仮想ジョイスティックの描画
        if (this.gameState === 'playing') {
            // 基準円の描画（外周のみ）
            this.ctx.beginPath();
            this.ctx.arc(
                this.touchState.joystickBaseX,
                this.touchState.joystickBaseY,
                this.touchState.joystickRadius,
                0,
                Math.PI * 2
            );
            this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            if (this.touchState.isMoving) {
                // スティック部分の描画
                const dx = this.touchState.currentX - this.touchState.joystickBaseX;
                const dy = this.touchState.currentY - this.touchState.joystickBaseY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = this.touchState.joystickRadius;

                const stickX =
                    this.touchState.joystickBaseX +
                    (dx / distance) * Math.min(distance, maxDistance);
                const stickY =
                    this.touchState.joystickBaseY +
                    (dy / distance) * Math.min(distance, maxDistance);

                // スティックの軌跡を描画
                this.ctx.beginPath();
                this.ctx.moveTo(this.touchState.joystickBaseX, this.touchState.joystickBaseY);
                this.ctx.lineTo(stickX, stickY);
                this.ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();

                // 動かしているつまみ部分
                this.ctx.beginPath();
                this.ctx.arc(stickX, stickY, 20, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            } else {
                // 非移動時のみ中心のつまみを表示
                this.ctx.beginPath();
                this.ctx.arc(
                    this.touchState.joystickBaseX,
                    this.touchState.joystickBaseY,
                    20,
                    0,
                    Math.PI * 2
                );
                this.ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(50, 50, 50, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
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
        // プレイヤーを中央に配置
        this.player = new Player(this.canvas.width / 2, this.canvas.height / 2);
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

        this.audioManager.playSound('bgm');
    }

    // ゲームループ
    gameLoop(_currentTime: number): void {
        if (!this.isRunning) return;

        // コインのアニメーションを更新
        for (const coin of this.coins) {
            if (!coin.collected) {
                coin.update(_currentTime);
            }
        }

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
                    this.audioManager.playSound('bgm');
                },
                { once: true }
            );

            this.canvas.addEventListener(
                'click',
                () => {
                    this.audioManager.playSound('bgm');
                },
                { once: true }
            );

            this.gameLoop(0);
        }
    }

    // drawGridメソッドを更新
    drawGrid(): void {
        // 背景キャンバスの内容をメインキャンバスにコピー
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);
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
        this.audioManager.playSound('stageClear');
    }

    // タッチ操作が有効な範囲かどうかを判定
    private isInJoystickArea(x: number, y: number): boolean {
        const dx = x - this.touchState.joystickBaseX;
        const dy = y - this.touchState.joystickBaseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.touchState.joystickRadius * 2; // タッチ有効範囲を半径の2倍に設定
    }

    // クリックイベントハンドラを更新
    private handleClick(x: number, y: number): void {
        if (this.gameState === 'customizing') {
            this.customizePanel.handleClick(x, y);
            return;
        }

        // ... existing click handling code ...
    }

    // タッチイベントハンドラを更新
    private handleTouch(x: number, y: number): void {
        if (this.gameState === 'customizing') {
            this.customizePanel.handleClick(x, y);
            return;
        }

        // ... existing touch handling code ...
    }
}

// ゲームの初期化と開始
export function initGame(): void {
    const game = new Game();
    game.start();
}
