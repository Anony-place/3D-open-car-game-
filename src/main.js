import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Engine } from './core/Engine.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { Input } from './utils/Input.js';
import { AudioManager } from './utils/AudioManager.js';
import { Environment } from './world/Environment.js';
import { Vehicle } from './entities/Vehicle.js';
import { ParkourManager } from './entities/ParkourManager.js';
import { StuntDetector } from './entities/StuntDetector.js';
import { LEVEL_DATA } from './world/LevelData.js';

class Game {
    constructor() {
        this.engine = new Engine();
        this.physics = new PhysicsWorld();
        this.input = new Input();
        this.audio = new AudioManager();
        this.environment = new Environment(this.engine.scene, this.physics.world);
        this.parkour = new ParkourManager(this.engine.scene, this.physics, this.audio);

        this.selectedCarIndex = 0;
        this.selectedNeonIndex = 0;
        this.player = null;
        this.stuntDetector = null;
        this.isPaused = false;
        this._hudUpdatable = null;

        this.engine.add(this.physics);
        this.engine.add(this.environment);
        this.engine.add(this.parkour);

        this.setupUI();
        this.setupGarage();
        this.setupLevelSelect();
        this.engine.start();
    }

    initPlayer() {
        // Remove previous HUD updatable to prevent duplication
        if (this._hudUpdatable) {
            const idx = this.engine.updatables.indexOf(this._hudUpdatable);
            if (idx !== -1) {
                this.engine.updatables.splice(idx, 1);
            }
            this._hudUpdatable = null;
        }

        if (this.player) {
            this.player.destroy();
            this.engine.remove(this.player);
        }

        const carCfg = CONFIG.vehicles[this.selectedCarIndex];
        const neonColor = CONFIG.neonColors[this.selectedNeonIndex].hex;

        this.player = new Vehicle(
            this.engine.scene,
            this.physics.world,
            this.input,
            carCfg,
            null, // default paint
            neonColor
        );

        this.engine.add(this.player);
        this.engine.setPlayer(this.player);
        this.parkour.setPlayer(this.player);

        // Setup Stunt Detector
        this.stuntDetector = new StuntDetector(this.player, (stuntInfo) => {
            this.parkour.addStuntScore(stuntInfo);
        });

        // Add dynamic per-frame updates
        const hudUpdatable = {
            update: (deltaTime) => {
                if (this.player) {
                    // Update Stunt Detector
                    if (this.stuntDetector) {
                        this.stuntDetector.update(deltaTime);
                    }

                    // Key bindings check
                    if (this.input.isJustPressed('respawn')) {
                        this.parkour.respawnPlayer();
                    }

                    if (this.input.isJustPressed('camSwitch')) {
                        this.engine.switchCameraMode();
                        this.parkour.showStuntToast(`📷 CAMERA: ${this.engine.cameraMode.toUpperCase()}`, 0, 'info');
                    }

                    if (this.input.isJustPressed('pause')) {
                        this.togglePause();
                    }

                    if (this.input.isJustPressed('music')) {
                        const isMuted = this.audio.toggleMute();
                        this.updateMusicBtn(isMuted);
                    }

                    // HUD Speed & Nitro updates
                    const speedElem = document.getElementById('hud-speed-val');
                    const nitroBar = document.getElementById('nitro-bar');

                    if (speedElem) {
                        speedElem.textContent = this.player.speed;
                    }
                    if (nitroBar) {
                        nitroBar.style.width = `${this.player.nitro}%`;
                    }

                    // Audio engine sounds
                    this.audio.updateEngine(this.player.speed, this.player.nitroActive, this.input.keys.backward);
                }
            }
        };
        this.engine.updatables.push(hudUpdatable);
        this._hudUpdatable = hudUpdatable;
    }

    setupUI() {
        // Main Screen buttons
        const playBtn = document.getElementById('play-btn');
        const sandboxBtn = document.getElementById('sandbox-btn');
        const garageBtn = document.getElementById('garage-btn');
        const controlsBtn = document.getElementById('controls-btn');
        const musicBtn = document.getElementById('music-toggle-btn');
        const pauseBtn = document.getElementById('btn-pause-hud');

        // Modals
        const startScreen = document.getElementById('start-screen');
        const levelModal = document.getElementById('level-modal');
        const garageModal = document.getElementById('garage-modal');
        const controlsModal = document.getElementById('controls-modal');
        const pauseModal = document.getElementById('pause-modal');
        const hud = document.getElementById('hud');
        const mobileCtrls = document.getElementById('mobile-controls');

        // Check if touch device
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (isTouch && mobileCtrls) {
            mobileCtrls.style.display = 'flex';
        }

        playBtn.addEventListener('click', () => {
            this.audio.init();
            levelModal.classList.remove('hidden');
            this.renderLevelGrid();
        });

        sandboxBtn.addEventListener('click', () => {
            this.audio.init();
            startScreen.classList.add('hidden');
            hud.style.display = 'block';
            if (isTouch && mobileCtrls) mobileCtrls.style.display = 'flex';

            this.initPlayer();
            this.parkour.loadLevel(0); // Sandbox mode
        });

        garageBtn.addEventListener('click', () => {
            this.audio.init();
            garageModal.classList.remove('hidden');
            this.renderGarageView();
        });

        controlsBtn.addEventListener('click', () => {
            controlsModal.classList.remove('hidden');
        });

        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.getAttribute('data-target');
                if (targetId) {
                    document.getElementById(targetId)?.classList.add('hidden');
                }
            });
        });

        // Pause HUD button
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        // Resume button in pause menu
        document.getElementById('resume-btn')?.addEventListener('click', () => {
            this.togglePause();
        });

        // Restart button in pause menu
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.togglePause();
            this.parkour.loadLevel(this.parkour.currentLevelIndex);
        });

        // Main Menu button in pause & win menu
        document.querySelectorAll('.main-menu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                location.reload();
            });
        });

        // Music toggle button
        if (musicBtn) {
            musicBtn.addEventListener('click', () => {
                this.audio.init();
                const isMuted = this.audio.toggleMute();
                this.updateMusicBtn(isMuted);
            });
        }
    }

    updateMusicBtn(isMuted) {
        const musicBtn = document.getElementById('music-toggle-btn');
        if (musicBtn) {
            musicBtn.textContent = isMuted ? '🔇 AUDIO: OFF' : '🔊 AUDIO: ON';
            musicBtn.style.borderColor = isMuted ? '#ff0055' : '#00ffff';
            musicBtn.style.color = isMuted ? '#ff0055' : '#00ffff';
        }
    }

    togglePause() {
        const pauseModal = document.getElementById('pause-modal');
        if (!pauseModal || !this.parkour.isPlaying && !this.isPaused) return;

        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            pauseModal.classList.remove('hidden');
            this.parkour.isPlaying = false;
        } else {
            pauseModal.classList.add('hidden');
            this.parkour.isPlaying = true;
        }
    }

    setupGarage() {
        const prevBtn = document.getElementById('garage-prev-car');
        const nextBtn = document.getElementById('garage-next-car');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.selectedCarIndex = (this.selectedCarIndex - 1 + CONFIG.vehicles.length) % CONFIG.vehicles.length;
                this.renderGarageView();
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.selectedCarIndex = (this.selectedCarIndex + 1) % CONFIG.vehicles.length;
                this.renderGarageView();
            });
        }
    }

    renderGarageView() {
        const car = CONFIG.vehicles[this.selectedCarIndex];
        document.getElementById('garage-car-name').textContent = car.name;
        document.getElementById('garage-car-desc').textContent = car.description;

        // Stats bars
        document.getElementById('stat-speed').style.width = `${car.stats.speed}%`;
        document.getElementById('stat-accel').style.width = `${car.stats.accel}%`;
        document.getElementById('stat-handling').style.width = `${car.stats.handling}%`;
        document.getElementById('stat-jump').style.width = `${car.stats.jump}%`;

        // Render Color Palette
        const palette = document.getElementById('neon-color-palette');
        if (palette) {
            palette.innerHTML = '';
            CONFIG.neonColors.forEach((color, idx) => {
                const dot = document.createElement('div');
                dot.className = `color-dot ${idx === this.selectedNeonIndex ? 'selected' : ''}`;
                dot.style.background = color.css;
                dot.title = color.name;
                dot.addEventListener('click', () => {
                    this.selectedNeonIndex = idx;
                    this.renderGarageView();
                });
                palette.appendChild(dot);
            });
        }
    }

    setupLevelSelect() {
        this.renderLevelGrid();
    }

    renderLevelGrid() {
        const grid = document.getElementById('level-cards-grid');
        if (!grid) return;

        grid.innerHTML = '';
        const unlocked = this.parkour.savedProgress.unlockedLevel || 1;
        const records = this.parkour.savedProgress.records || {};

        // Levels 1 to 5
        for (let i = 1; i <= 5; i++) {
            const lvl = LEVEL_DATA.find(l => l.id === i);
            if (!lvl) continue;

            const isLocked = i > unlocked;
            const rec = records[i];

            const card = document.createElement('div');
            card.className = `level-card ${isLocked ? 'locked' : 'unlocked'}`;

            let starsText = '☆☆☆';
            if (rec && rec.stars) {
                starsText = '⭐'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars);
            }

            let bestTimeText = rec ? `BEST: ${this.parkour.formatTime(rec.time)}` : `PAR: ${lvl.parTime}s`;

            card.innerHTML = `
                <div class="lvl-number">STAGE 0${i}</div>
                <div class="lvl-name">${lvl.name}</div>
                <div class="lvl-diff">${lvl.difficulty}</div>
                <div class="lvl-stars">${starsText}</div>
                <div class="lvl-best">${bestTimeText}</div>
                ${isLocked ? '<div class="lock-icon">🔒 LOCKED</div>' : '<button class="lvl-play-btn">START</button>'}
            `;

            if (!isLocked) {
                card.addEventListener('click', () => {
                    document.getElementById('level-modal').classList.add('hidden');
                    document.getElementById('start-screen').classList.add('hidden');
                    document.getElementById('hud').style.display = 'block';

                    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                    const mobileCtrls = document.getElementById('mobile-controls');
                    if (isTouch && mobileCtrls) mobileCtrls.style.display = 'flex';

                    this.initPlayer();
                    this.parkour.loadLevel(i);
                });
            }

            grid.appendChild(card);
        }
    }
}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
