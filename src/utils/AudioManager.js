export class AudioManager {
    constructor() {
        this.ctx = null;
        this.engineOsc = null;
        this.engineGain = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Engine Sound (Synthetic)
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();

        this.engineOsc.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc.frequency.setValueAtTime(50, this.ctx.currentTime);
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.engineOsc.start();
        this.initialized = true;
    }

    updateEngine(speed, nitroActive) {
        if (!this.initialized) return;

        // Map speed (0-150+) to frequency (50-250)
        const baseFreq = 50 + (speed * 1.5);
        const freq = nitroActive ? baseFreq * 1.5 : baseFreq;

        this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);

        // Volume based on speed
        const volume = 0.05 + (speed / 150) * 0.1;
        this.engineGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
    }

    playCollision() {
        if (!this.initialized) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }
}
