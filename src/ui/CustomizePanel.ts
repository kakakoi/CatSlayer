import { DEFAULT_PRESETS } from '../constants/presets.js';
import type { CustomizeState, PlayerColors } from '../types.js';

export class CustomizePanel {
    private state: CustomizeState;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private onSave: (colors: PlayerColors) => void;
    private onClose: () => void;

    constructor(
        canvas: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        onSave: (colors: PlayerColors) => void,
        onClose: () => void
    ) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.onSave = onSave;
        this.onClose = onClose;
        this.state = {
            isOpen: false,
            selectedPreset: null,
            currentColors: { ...DEFAULT_PRESETS[0].colors },
            savedPresets: [...DEFAULT_PRESETS],
        };
    }

    render(): void {
        if (!this.state.isOpen) return;

        // 半透明の背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // パネルの背景
        const panelWidth = Math.min(300, this.canvas.width * 0.8);
        const panelHeight = Math.min(300, this.canvas.height * 0.8);
        const panelX = (this.canvas.width - panelWidth) / 2;
        const panelY = (this.canvas.height - panelHeight) / 2;

        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

        // タイトル
        this.ctx.fillStyle = 'black';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('キャラクター選択', panelX + panelWidth / 2, panelY + 40);

        // プリセットの描画
        this.state.savedPresets.forEach((preset, index) => {
            const isSelected = preset.id === this.state.selectedPreset;
            const y = panelY + 100 + index * 80;

            // 選択枠
            if (isSelected) {
                this.ctx.fillStyle = 'rgba(0, 123, 255, 0.1)';
                this.ctx.fillRect(panelX + 20, y - 30, panelWidth - 40, 60);
                this.ctx.strokeStyle = 'rgba(0, 123, 255, 0.5)';
                this.ctx.strokeRect(panelX + 20, y - 30, panelWidth - 40, 60);
            }

            // プリセット名とプレビュー
            this.ctx.fillStyle = 'black';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`${preset.emoji} ${preset.name}`, panelX + 40, y);

            // ミニプレビュー
            this.renderCharacterPreview(panelX + panelWidth - 80, y - 15, preset.colors);
        });
    }

    private renderCharacterPreview(x: number, y: number, colors: PlayerColors): void {
        this.ctx.save();
        this.ctx.translate(x, y);

        // 体（防具）
        this.ctx.fillStyle = colors.armor;
        this.ctx.fillRect(-10, -10, 20, 20);

        // 顔（肌）
        this.ctx.fillStyle = colors.skin;
        this.ctx.beginPath();
        this.ctx.arc(0, -5, 5, 0, Math.PI * 2);
        this.ctx.fill();

        // 髪
        this.ctx.fillStyle = colors.hair;
        this.ctx.fillRect(-6, -12, 12, 4);

        this.ctx.restore();
    }

    handleClick(x: number, y: number): void {
        if (!this.state.isOpen) return;

        const panelWidth = Math.min(300, this.canvas.width * 0.8);
        const panelHeight = Math.min(300, this.canvas.height * 0.8);
        const panelX = (this.canvas.width - panelWidth) / 2;
        const panelY = (this.canvas.height - panelHeight) / 2;

        // プリセットのクリック判定
        this.state.savedPresets.forEach((preset, index) => {
            const presetY = panelY + 100 + index * 80;
            if (
                x >= panelX + 20 &&
                x <= panelX + panelWidth - 20 &&
                y >= presetY - 30 &&
                y <= presetY + 30
            ) {
                this.state.selectedPreset = preset.id;
                this.state.currentColors = { ...preset.colors };
                // プリセット選択時に即座に適用
                this.onSave(this.state.currentColors);
                this.state.isOpen = false;
            }
        });
    }

    open(): void {
        this.state.isOpen = true;
        this.state.selectedPreset = DEFAULT_PRESETS[0].id;
        this.state.currentColors = { ...DEFAULT_PRESETS[0].colors };
    }

    close(): void {
        this.state.isOpen = false;
    }

    isOpen(): boolean {
        return this.state.isOpen;
    }
}
