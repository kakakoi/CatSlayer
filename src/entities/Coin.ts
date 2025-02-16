import type { ICoin } from '../types.js';
import { GameObject } from './GameObject.js';

export class Coin extends GameObject implements ICoin {
    public collected = false;
    public value = 10;
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