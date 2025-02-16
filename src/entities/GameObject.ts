import { IGameObject } from '../types.js';

// ゲームオブジェクトの基本クラス
export class GameObject implements IGameObject {
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