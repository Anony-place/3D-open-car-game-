import * as THREE from 'three';
import { TrackBuilder } from '../world/TrackBuilder.js';
import { LEVEL_DATA } from '../world/LevelData.js';
import { Checkpoint } from './Checkpoint.js';

export class ParkourManager {
    constructor(scene, physicsWorld, audio) {
        this.scene = scene;
        this.physics = physicsWorld;
        this.audio = audio;
        this.builder = new TrackBuilder(this.scene, this.physics.world);

        this.player = null;
        this.currentLevelIndex = 1; // 1 to 5, or 0 for Sandbox
        this.currentLevelData = null;

        this.checkpoints = [];
        this.currentCheckpointIdx = 0;
        this.respawnPos = new THREE.Vector3(0, 40, 0);
        this.respawnRotY = 0;

        // Level state
        this.isPlaying = false;
        this.isFinished = false;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.stuntScore = 0;
        this.respawnCount = 0;

        // UI references
        this.hudScore = document.getElementById('hud-score');
        this.hudTimer = document.getElementById('hud-timer');
        this.hudCheckpoint = document.getElementById('hud-checkpoint');
        this.hudLevelName = document.getElementById('hud-level-name');
        this.winScreen = document.getElementById('win-screen');
        this.finalStats = document.getElementById('final-stats');
        this.stuntFeed = document.getElementById('stunt-feed');

        this.loadProgress();
    }

    loadProgress() {
        try {
            const data = localStorage.getItem('cyber_parkour_progress');
            this.savedProgress = data ? JSON.parse(data) : {
                unlockedLevel: 1,
                records: {}
            };
        } catch (e) {
            this.savedProgress = { unlockedLevel: 1, records: {} };
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('cyber_parkour_progress', JSON.stringify(this.savedProgress));
        } catch (e) {}
    }

    setPlayer(player) {
        this.player = player;
    }

    loadLevel(levelId) {
        // Find level data
        const data = LEVEL_DATA.find(lvl => lvl.id === levelId) || LEVEL_DATA[0];
        this.currentLevelData = data;
        this.currentLevelIndex = levelId;

        // Clear existing track and checkpoints
        this.builder.clear();
        this.checkpoints.forEach(cp => cp.destroy());
        this.checkpoints = [];

        // Build new track geometry & physics
        data.build(this.builder);

        // Build checkpoints
        if (data.checkpoints && data.checkpoints.length > 0) {
            data.checkpoints.forEach((cpData, idx) => {
                const cp = new Checkpoint(
                    this.scene,
                    cpData.pos,
                    cpData.rotY,
                    idx + 1,
                    cpData.isFinish || false
                );
                this.checkpoints.push(cp);
            });
        }

        // Set initial respawn point
        this.respawnPos.copy(data.startPos);
        this.respawnRotY = data.startRotY;
        this.currentCheckpointIdx = 0;

        // Reset state
        this.isPlaying = true;
        this.isFinished = false;
        this.startTime = performance.now();
        this.elapsedTime = 0;
        this.stuntScore = 0;
        this.respawnCount = 0;

        // Put player at start
        if (this.player) {
            this.player.respawn(this.respawnPos, this.respawnRotY);
        }

        // Update HUD
        if (this.hudLevelName) {
            this.hudLevelName.textContent = data.name.toUpperCase();
        }
        this.updateHUD();
    }

    respawnPlayer() {
        if (!this.player) return;
        this.respawnCount++;
        this.player.respawn(this.respawnPos, this.respawnRotY);
        if (this.audio) this.audio.playRespawnSound();

        this.showStuntToast('⚡ RESPAWNED AT CHECKPOINT', 0, 'respawn');
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        const timeNow = performance.now();
        const timeSec = timeNow * 0.001;

        if (!this.isFinished) {
            this.elapsedTime = (timeNow - this.startTime) * 0.001;
        }

        // 1. Update Track Builder dynamic objects
        if (this.player) {
            this.builder.update(
                deltaTime,
                this.player.mesh.position,
                this.player,
                this.audio
            );

            const playerPos = this.player.mesh.position;

            // 2. Check if player fell into the abyss
            if (playerPos.y < -12) {
                this.respawnPlayer();
            }

            // 3. Checkpoints detection
            if (this.checkpoints.length > 0 && this.currentCheckpointIdx < this.checkpoints.length) {
                const targetCP = this.checkpoints[this.currentCheckpointIdx];
                if (targetCP.checkCollision(playerPos)) {
                    targetCP.activate();
                    if (this.audio) this.audio.playCheckpointSound();

                    if (targetCP.isFinish) {
                        this.onLevelComplete();
                    } else {
                        // Advance checkpoint
                        this.currentCheckpointIdx++;
                        this.respawnPos.copy(targetCP.position);
                        this.respawnRotY = targetCP.rotationY;

                        this.showStuntToast(`🏁 CHECKPOINT ${this.currentCheckpointIdx} / ${this.checkpoints.length}`, 200, 'checkpoint');
                        this.stuntScore += 200;
                    }
                }
            }
        }

        // Update checkpoints visual animations
        this.checkpoints.forEach(cp => cp.update(timeSec));

        this.updateHUD();
    }

    addStuntScore(stuntInfo) {
        this.stuntScore += stuntInfo.points;
        if (this.audio) {
            const isEpic = (stuntInfo.points >= 800);
            this.audio.playStuntSound(isEpic);
        }
        this.showStuntToast(`⭐ ${stuntInfo.name} +${stuntInfo.points}`, stuntInfo.points, 'stunt');
    }

    showStuntToast(text, points = 0, type = 'stunt') {
        if (!this.stuntFeed) return;

        const toast = document.createElement('div');
        toast.className = `stunt-toast ${type}`;
        toast.textContent = text;

        this.stuntFeed.prepend(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 400);
        }, 2200);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    updateHUD() {
        if (this.hudTimer) {
            this.hudTimer.textContent = this.formatTime(this.elapsedTime);
        }

        if (this.hudScore) {
            this.hudScore.textContent = `SCORE: ${this.stuntScore}`;
        }

        if (this.hudCheckpoint) {
            if (this.checkpoints.length > 0) {
                this.hudCheckpoint.textContent = `CHECKPOINT: ${this.currentCheckpointIdx} / ${this.checkpoints.length}`;
            } else {
                this.hudCheckpoint.textContent = `FREESTYLE MODE`;
            }
        }
    }

    onLevelComplete() {
        if (this.isFinished) return;
        this.isFinished = true;
        this.isPlaying = false;

        const totalTime = this.elapsedTime;
        const parTime = this.currentLevelData.parTime || 60;

        // Calculate Star Rating (1 to 3 stars)
        let stars = 1;
        if (totalTime <= parTime * 0.9) {
            stars = 3;
        } else if (totalTime <= parTime * 1.3) {
            stars = 2;
        }

        // Save progress & best time
        const levelId = this.currentLevelIndex;
        if (levelId > 0) {
            const nextLvl = levelId + 1;
            if (nextLvl <= 5 && nextLvl > this.savedProgress.unlockedLevel) {
                this.savedProgress.unlockedLevel = nextLvl;
            }

            const currentRecord = this.savedProgress.records[levelId];
            if (!currentRecord || totalTime < currentRecord.time) {
                this.savedProgress.records[levelId] = {
                    time: totalTime,
                    stars: Math.max(stars, currentRecord?.stars || 1),
                    score: Math.max(this.stuntScore, currentRecord?.score || 0)
                };
            }
            this.saveProgress();
        }

        if (this.audio) this.audio.playVictorySound();

        // Show Win Screen
        if (this.winScreen) {
            this.winScreen.style.display = 'flex';
            this.winScreen.classList.remove('hidden');

            const starsHtml = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

            let statsHtml = `
                <div style="font-size: 36px; margin-bottom: 12px; color: #ffd700;">${starsHtml}</div>
                <div style="font-size: 22px; color: #00ffff; margin-bottom: 6px;">COMPLETION TIME: ${this.formatTime(totalTime)}</div>
                <div style="font-size: 18px; color: #ff00ff; margin-bottom: 6px;">STUNT SCORE: ${this.stuntScore}</div>
                <div style="font-size: 15px; color: #aaa; margin-bottom: 25px;">RESPAWNS USED: ${this.respawnCount}</div>
            `;

            if (this.finalStats) {
                this.finalStats.innerHTML = statsHtml;
            }

            // Next Level button setup
            const nextBtn = document.getElementById('next-level-btn');
            if (nextBtn) {
                if (levelId > 0 && levelId < 5) {
                    nextBtn.style.display = 'inline-block';
                    nextBtn.onclick = () => {
                        this.winScreen.style.display = 'none';
                        this.winScreen.classList.add('hidden');
                        this.loadLevel(levelId + 1);
                    };
                } else {
                    nextBtn.style.display = 'none';
                }
            }
        }
    }
}
