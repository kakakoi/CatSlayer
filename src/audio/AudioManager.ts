import type { SoundName } from '../types';

export class AudioManager {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private isMuted = false;
    private bgmPlaying = false;

    private coinSound: () => void = () => {};
    private enemyDeathSound: () => void = () => {};
    private levelUpSound: () => void = () => {};
    private gameOverSound: () => void = () => {};
    private stageClearSound: () => void = () => {};

    constructor() {
        this.setupAudio();
    }

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

        // ステージクリア音
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

    stopBGM(): void {
        this.bgmPlaying = false;
    }

    getMuteState(): boolean {
        return this.isMuted;
    }
} 