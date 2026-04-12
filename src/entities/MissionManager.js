import * as THREE from 'three';
import { Checkpoint } from './Checkpoint.js';

export class MissionManager {
    constructor(scene, player, physics) {
        this.scene = scene;
        this.player = player;
        this.physics = physics;
        this.activeMission = null;
        this.checkpoint = null;
        this.score = 0;
        this.timeRemaining = 0;
        this.totalCores = 15;
        this.startTime = 0;

        this.hudScore = document.getElementById('hud-score');
        this.winScreen = document.getElementById('win-screen');
        this.finalStats = document.getElementById('final-stats');
    }

    startFreeRoam() {
        this.activeMission = 'freeroam';
        this.spawnNextCheckpoint();
    }

    startRace() {
        this.activeMission = 'race';
        this.score = 0;
        this.startTime = performance.now();
        this.spawnNextCheckpoint();
    }

    spawnNextCheckpoint() {
        if (this.checkpoint) {
            this.checkpoint.destroy();
        }

        const range = 200;
        const x = (Math.random() - 0.5) * range;
        const z = (Math.random() - 0.5) * range;
        const pos = new THREE.Vector3(x, 2, z);

        this.checkpoint = new Checkpoint(this.scene, pos);
    }

    update(time) {
        if (this.checkpoint) {
            this.checkpoint.update(time);

            if (this.player && this.checkpoint.checkCollision(this.player.mesh.position)) {
                this.onCheckpointReached();
            }
        }
    }

    onCheckpointReached() {
        this.score++;
        this.hudScore.textContent = `CORES: ${this.score} / ${this.totalCores}`;

        if (this.score >= this.totalCores) {
            this.onMissionComplete();
        } else {
            this.spawnNextCheckpoint();
        }
    }

    onMissionComplete() {
        if (this.checkpoint) {
            this.checkpoint.destroy();
            this.checkpoint = null;
        }

        const endTime = performance.now();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);

        this.winScreen.style.display = 'flex';
        this.winScreen.classList.remove('hidden');
        this.finalStats.textContent = `TIME: ${duration}s | CORES COLLECTED: ${this.score}`;
    }
}
