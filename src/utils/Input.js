export class Input {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            nitro: false,
            handbrake: false,
            respawn: false,
            jump: false,
            rollLeft: false,
            rollRight: false,
            camSwitch: false,
            pause: false
        };

        this.keyJustPressed = {
            respawn: false,
            camSwitch: false,
            pause: false,
            jump: false,
            music: false
        };

        this.map = {
            'w': 'forward',
            'arrowup': 'forward',
            's': 'backward',
            'arrowdown': 'backward',
            'a': 'left',
            'arrowleft': 'left',
            'd': 'right',
            'arrowright': 'right',
            'shift': 'nitro',
            ' ': 'handbrake',
            'r': 'respawn',
            'c': 'camSwitch',
            'v': 'camSwitch',
            'p': 'pause',
            'escape': 'pause',
            'e': 'rollRight',
            'q': 'rollLeft',
            'j': 'jump',
            'm': 'music'
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));

        this.initMobileControls();
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        const action = this.map[key];
        if (action) {
            if (!this.keys[action]) {
                this.keyJustPressed[action] = true;
            }
            this.keys[action] = true;

            // Prevent default page scrolling for arrows/space
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'space'].includes(key)) {
                e.preventDefault();
            }
        }
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        const action = this.map[key];
        if (action) {
            this.keys[action] = false;
        }
    }

    isJustPressed(action) {
        if (this.keyJustPressed[action]) {
            this.keyJustPressed[action] = false;
            return true;
        }
        return false;
    }

    initMobileControls() {
        const bind = (id, action) => {
            const el = document.getElementById(id);
            if (!el) return;

            const start = (e) => {
                e.preventDefault();
                this.keys[action] = true;
                this.keyJustPressed[action] = true;
                el.classList.add('active');
            };

            const end = (e) => {
                e.preventDefault();
                this.keys[action] = false;
                el.classList.remove('active');
            };

            el.addEventListener('pointerdown', start);
            el.addEventListener('pointerup', end);
            el.addEventListener('pointerleave', end);
            el.addEventListener('pointercancel', end);
        };

        bind('btn-w', 'forward');
        bind('btn-s', 'backward');
        bind('btn-l', 'left');
        bind('btn-r', 'right');
        bind('btn-n', 'nitro');
        bind('btn-drift', 'handbrake');
        bind('btn-respawn', 'respawn');
        bind('btn-cam', 'camSwitch');
    }
}
