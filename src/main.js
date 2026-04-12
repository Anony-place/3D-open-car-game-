import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Environment } from './world/Environment.js';
import { Input } from './utils/Input.js';
import { PhysicsWorld } from './physics/PhysicsWorld.js';
import { Vehicle } from './entities/Vehicle.js';
import { TrafficManager } from './entities/TrafficManager.js';
import { MissionManager } from './entities/MissionManager.js';
import { AudioManager } from './utils/AudioManager.js';
import { PoliceManager } from './entities/PoliceManager.js';

class Game {
    constructor() {
        this.engine = new Engine();
        this.physics = new PhysicsWorld();
        this.input = new Input();
        this.audio = new AudioManager();
        this.environment = new Environment(this.engine.scene, this.physics.world);
        this.traffic = new TrafficManager(this.engine.scene, this.physics.world);
        this.mission = new MissionManager(this.engine.scene, null, this.physics.world);
        this.police = new PoliceManager(this.engine.scene, this.physics.world, null);

        this.engine.add(this.physics);
        this.engine.add(this.environment);
        this.engine.add(this.traffic);
        this.engine.add(this.mission);
        this.engine.add(this.police);

        this.setupUI();
        this.engine.start();
    }

    setupUI() {
        const startBtn = document.getElementById('start-btn');
        const raceBtn = document.getElementById('race-btn');

        startBtn.addEventListener('click', () => {
            this.audio.init();
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('hud').style.display = 'block';
            this.initPlayer();
            this.mission.startFreeRoam();
        });

        raceBtn.addEventListener('click', () => {
            this.audio.init();
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('hud').style.display = 'block';
            this.initPlayer();
            this.mission.startRace();
            this.police.setWantedLevel(2);
        });
    }

    initPlayer() {
        if (this.player) {
            this.player.destroy();
            this.engine.remove(this.player);
        }
        this.player = new Vehicle(this.engine.scene, this.physics.world, this.input);
        this.mission.player = this.player;
        this.police.player = this.player;
        this.engine.add(this.player);
        this.engine.setPlayer(this.player);

        // HUD Elements
        const speedElem = document.getElementById('hud-speed');
        const nitroBar = document.getElementById('nitro-bar');
        const minimapObj = document.getElementById('minimap-objective');

        // Simple camera follow setup + HUD update
        this.engine.updatables.push({
            update: () => {
                if (this.player) {
                    const carPos = this.player.mesh.position;
                    const carQuat = this.player.mesh.quaternion;

                    // 1. Camera
                    const offset = new THREE.Vector3(0, 5, -10);
                    offset.applyQuaternion(carQuat);
                    this.engine.camera.position.lerp(carPos.clone().add(offset), 0.1);
                    this.engine.camera.lookAt(carPos);

                    // 2. HUD
                    speedElem.childNodes[0].textContent = this.player.speed + " ";
                    nitroBar.style.width = this.player.nitro + "%";

                    // 3. Audio
                    this.audio.updateEngine(this.player.speed, this.player.nitroActive);

                    // 4. Minimap
                    if (this.mission && this.mission.checkpoint) {
                        minimapObj.style.display = 'block';
                        const checkPos = this.mission.checkpoint.position;
                        const dx = (checkPos.x - carPos.x) / 5; // Scale factor
                        const dz = (checkPos.z - carPos.z) / 5;

                        // Clamp to circle/box
                        const limit = 70;
                        const x = Math.max(-limit, Math.min(limit, dx)) + 75;
                        const y = Math.max(-limit, Math.min(limit, dz)) + 75;

                        minimapObj.style.left = `${x}px`;
                        minimapObj.style.top = `${y}px`;
                    } else {
                        minimapObj.style.display = 'none';
                    }
                }
            }
        });
    }
}

new Game();
