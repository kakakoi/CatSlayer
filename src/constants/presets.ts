import type { PlayerPreset } from '../types.js';

export const DEFAULT_PRESETS: PlayerPreset[] = [
    {
        id: 'knight',
        name: '騎士',
        emoji: '⚔️',
        colors: {
            armor: '#4A4A4A',
            skin: '#FFD700',
            hair: '#8B4513',
            sword: '#C0C0C0',
            shield: '#CD853F',
        },
    },
    {
        id: 'ninja',
        name: '忍者',
        emoji: '🥷',
        colors: {
            armor: '#000000',
            skin: '#8B4513',
            hair: '#000000',
            sword: '#4A4A4A',
            shield: '#2F4F4F',
        },
    },
    {
        id: 'cat',
        name: '猫',
        emoji: '🐱',
        colors: {
            armor: '#FFA500',
            skin: '#FFE4B5',
            hair: '#8B4513',
            sword: '#DAA520',
            shield: '#D2691E',
        },
    },
];

// 各パーツのカラーパレット
export const COLOR_PALETTES = {
    armor: ['#4A4A4A', '#8B4513', '#000000', '#4B0082', '#CD853F'],
    skin: ['#FFD700', '#FFE4B5', '#8B4513', '#FFE4E1', '#E6E6FA'],
    hair: ['#8B4513', '#000000', '#A020F0', '#F8F8FF', '#FFD700'],
    sword: ['#C0C0C0', '#DAA520', '#4A4A4A', '#9400D3', '#E6E6FA'],
    shield: ['#CD853F', '#D2691E', '#2F4F4F', '#8A2BE2', '#F0F8FF'],
};
