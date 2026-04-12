export class Input {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            nitro: false,
            handbrake: false
        };

        this.map = {
            'w': 'forward', 'arrowup': 'forward',
            's': 'backward', 'arrowdown': 'backward',
            'a': 'left', 'arrowleft': 'left',
            'd': 'right', 'arrowright': 'right',
            'shift': 'nitro',
            ' ': 'handbrake'
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        this.initMobileControls();
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (this.map[key]) this.keys[this.map[key]] = true;
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        if (this.map[key]) this.keys[this.map[key]] = false;
    }

    initMobileControls() {
        const bind = (id, key) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('pointerdown', (e) => { e.preventDefault(); this.keys[key] = true; });
            el.addEventListener('pointerup', () => this.keys[key] = false);
            el.addEventListener('pointerleave', () => this.keys[key] = false);
        };

        bind('btn-w', 'forward');
        bind('btn-l', 'left');
        bind('btn-r', 'right');
        bind('btn-n', 'nitro');
        // Add 'S' as backward/brake for mobile if needed, using existing UI
        const btnS = document.getElementById('btn-s'); // Assuming we might add it
        if (btnS) bind('btn-s', 'backward');
    }
}
