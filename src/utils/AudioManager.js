export class AudioManager {
    constructor() {
        this.ctx = null;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.nitroNoise = null;
        this.nitroGain = null;
        this.initialized = false;
        this.isMuted = false;
        this.musicPlaying = false;
        this.musicInterval = null;
        this.musicStep = 0;
        this.rpm = 800;
        this.gear = 1;
    }

    init() {
        if (this.initialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.ctx = new AudioContext();

        // 1. Engine Dual Oscillator Synth
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineGain = this.ctx.createGain();

        this.engineOsc1.type = 'sawtooth';
        this.engineOsc2.type = 'triangle';
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);

        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);
        this.engineOsc2.frequency.setValueAtTime(22.5, this.ctx.currentTime);
        this.engineGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

        this.engineOsc1.start();
        this.engineOsc2.start();

        // 2. Nitro Noise Generator
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const nitroFilter = this.ctx.createBiquadFilter();
        nitroFilter.type = 'bandpass';
        nitroFilter.frequency.value = 1200;
        nitroFilter.Q.value = 2.0;

        this.nitroGain = this.ctx.createGain();
        this.nitroGain.gain.value = 0.0001;

        whiteNoise.connect(nitroFilter);
        nitroFilter.connect(this.nitroGain);
        this.nitroGain.connect(this.ctx.destination);
        whiteNoise.start();

        this.initialized = true;
        this.startSynthwaveBGM();
    }

    updateEngine(speed, nitroActive, isBraking) {
        if (!this.initialized || !this.ctx || this.isMuted) return;

        // Gear simulation
        let targetRPM = 800 + (speed % 40) * 100;
        if (speed > 160) targetRPM = 4200;
        this.rpm += (targetRPM - this.rpm) * 0.1;

        const basePitch = 40 + (this.rpm / 4000) * 110;
        const nitroMultiplier = nitroActive ? 1.4 : 1.0;
        const finalFreq = basePitch * nitroMultiplier;

        this.engineOsc1.frequency.setTargetAtTime(finalFreq, this.ctx.currentTime, 0.05);
        this.engineOsc2.frequency.setTargetAtTime(finalFreq * 0.5, this.ctx.currentTime, 0.05);

        const filterFreq = 300 + (speed * 12) + (nitroActive ? 1200 : 0);
        this.engineFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.08);

        const targetVol = Math.min(0.09, 0.03 + (speed / 200) * 0.06);
        this.engineGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);

        // Nitro volume
        const nitroVol = nitroActive ? 0.15 : 0.00001;
        this.nitroGain.gain.setTargetAtTime(nitroVol, this.ctx.currentTime, 0.08);
    }

    playBoostSound() {
        if (!this.initialized || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.35);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.4);
    }

    playJumpPadSound() {
        if (!this.initialized || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    playCheckpointSound() {
        if (!this.initialized || this.isMuted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);

            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.18, this.ctx.currentTime + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.06 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.06);
            osc.stop(this.ctx.currentTime + idx * 0.06 + 0.35);
        });
    }

    playStuntSound(isEpic = false) {
        if (!this.initialized || this.isMuted) return;
        const chord = isEpic ? [440, 554.37, 659.25, 880] : [587.33, 739.99, 880];
        chord.forEach((freq) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);
        });
    }

    playCoinSound() {
        if (!this.initialized || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
        osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playRespawnSound() {
        if (!this.initialized || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }

    playVictorySound() {
        if (!this.initialized || this.isMuted) return;
        const melody = [
            { f: 523.25, d: 0.15 },
            { f: 659.25, d: 0.15 },
            { f: 783.99, d: 0.15 },
            { f: 1046.5, d: 0.45 }
        ];
        let t = this.ctx.currentTime;
        melody.forEach(item => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(item.f, t);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + item.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + item.d + 0.05);
            t += item.d;
        });
    }

    playCollision(intensity = 1.0) {
        if (!this.initialized || this.isMuted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(90, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.18);

        const vol = Math.min(0.3, 0.1 * intensity);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    startSynthwaveBGM() {
        if (this.musicPlaying || !this.ctx) return;
        this.musicPlaying = true;

        const bassScale = [110, 110, 130.81, 146.83, 110, 98, 110, 130.81]; // A2, C3, D3, G2
        const arpeggio = [220, 329.63, 440, 523.25, 659.25, 523.25, 440, 329.63];

        const stepTime = 140; // ~107 BPM 16th notes
        this.musicInterval = setInterval(() => {
            if (this.isMuted || !this.ctx || this.ctx.state !== 'running') return;

            const t = this.ctx.currentTime;
            const step = this.musicStep % 16;
            this.musicStep++;

            // Kick drum on 0, 4, 8, 12
            if (step % 4 === 0) {
                const kick = this.ctx.createOscillator();
                const kGain = this.ctx.createGain();
                kick.frequency.setValueAtTime(140, t);
                kick.frequency.exponentialRampToValueAtTime(30, t + 0.12);
                kGain.gain.setValueAtTime(0.12, t);
                kGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
                kick.connect(kGain);
                kGain.connect(this.ctx.destination);
                kick.start(t);
                kick.stop(t + 0.15);
            }

            // Snare / HiHat on 2, 6, 10, 14
            if (step % 4 === 2) {
                const hat = this.ctx.createOscillator();
                const hGain = this.ctx.createGain();
                hat.type = 'highpass';
                hat.frequency.setValueAtTime(3000, t);
                hGain.gain.setValueAtTime(0.04, t);
                hGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
                hat.connect(hGain);
                hGain.connect(this.ctx.destination);
                hat.start(t);
                hat.stop(t + 0.06);
            }

            // Synth Bass
            const bassFreq = bassScale[Math.floor(step / 2) % bassScale.length];
            const bassOsc = this.ctx.createOscillator();
            const bGain = this.ctx.createGain();
            bassOsc.type = 'sawtooth';
            bassOsc.frequency.setValueAtTime(bassFreq * 0.5, t);
            bGain.gain.setValueAtTime(0.035, t);
            bGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            bassOsc.connect(bGain);
            bGain.connect(this.ctx.destination);
            bassOsc.start(t);
            bassOsc.stop(t + 0.13);

            // Synth Arp
            const arpFreq = arpeggio[step % arpeggio.length];
            const arpOsc = this.ctx.createOscillator();
            const aGain = this.ctx.createGain();
            arpOsc.type = 'triangle';
            arpOsc.frequency.setValueAtTime(arpFreq, t);
            aGain.gain.setValueAtTime(0.025, t);
            aGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
            arpOsc.connect(aGain);
            aGain.connect(this.ctx.destination);
            arpOsc.start(t);
            arpOsc.stop(t + 0.11);

        }, stepTime);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.engineGain) {
            this.engineGain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, this.ctx?.currentTime || 0);
        }
        if (this.nitroGain) {
            this.nitroGain.gain.setValueAtTime(0.0001, this.ctx?.currentTime || 0);
        }
        return this.isMuted;
    }
}
