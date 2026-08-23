import * as THREE from 'three';

export class StuntDetector {
    constructor(vehicle, onStuntCallback) {
        this.vehicle = vehicle;
        this.onStunt = onStuntCallback;

        this.wasAirborne = false;
        this.totalAirTime = 0;
        this.accumPitch = 0;
        this.accumRoll = 0;
        this.accumYaw = 0;
        this.prevQuat = new THREE.Quaternion();
        this.driftScore = 0;
        this.driftTimer = 0;
    }

    update(deltaTime) {
        if (!this.vehicle || !this.vehicle.chassisBody) return;

        const isAirborne = this.vehicle.isAirborne;
        const currentQuat = new THREE.Quaternion(
            this.vehicle.chassisBody.quaternion.x,
            this.vehicle.chassisBody.quaternion.y,
            this.vehicle.chassisBody.quaternion.z,
            this.vehicle.chassisBody.quaternion.w
        );

        if (isAirborne) {
            if (!this.wasAirborne) {
                // Just took off
                this.wasAirborne = true;
                this.totalAirTime = 0;
                this.accumPitch = 0;
                this.accumRoll = 0;
                this.accumYaw = 0;
                this.prevQuat.copy(currentQuat);
            }

            this.totalAirTime += deltaTime;

            // Compute delta rotation around local axes
            const deltaQ = this.prevQuat.clone().invert().multiply(currentQuat);
            const euler = new THREE.Euler().setFromQuaternion(deltaQ, 'YXZ');

            this.accumPitch += euler.x;
            this.accumRoll += euler.z;
            this.accumYaw += euler.y;

            this.prevQuat.copy(currentQuat);

        } else {
            if (this.wasAirborne) {
                // Just landed!
                this.processLanding(currentQuat);
                this.wasAirborne = false;
            }

            // Drift tracking on ground
            if (this.vehicle.isDrifting && this.vehicle.speed > 25) {
                this.driftTimer += deltaTime;
                this.driftScore += deltaTime * this.vehicle.speed * 4;
            } else if (this.driftTimer > 0.6) {
                // Award drift score
                const points = Math.floor(this.driftScore);
                if (points > 100) {
                    this.triggerStunt({
                        name: 'DRIFT MASTER',
                        points: points,
                        type: 'drift'
                    });
                }
                this.driftTimer = 0;
                this.driftScore = 0;
            } else {
                this.driftTimer = 0;
                this.driftScore = 0;
            }
        }
    }

    processLanding(quat) {
        // Test if car landed upright (up vector pointing roughly positive Y)
        const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
        const isUpright = upVec.y > 0.45;

        if (!isUpright) {
            // Bad landing or flip failed
            return;
        }

        const stuntList = [];
        let totalPoints = 0;

        // Pitch flips (Frontflip / Backflip)
        const pitchRotations = Math.round(this.accumPitch / (Math.PI * 2));
        if (pitchRotations >= 1) {
            const count = pitchRotations;
            const name = count === 1 ? 'FRONTFLIP' : `${count}x FRONTFLIP`;
            const pts = count * 500;
            stuntList.push(name);
            totalPoints += pts;
        } else if (pitchRotations <= -1) {
            const count = Math.abs(pitchRotations);
            const name = count === 1 ? 'BACKFLIP' : `${count}x BACKFLIP`;
            const pts = count * 500;
            stuntList.push(name);
            totalPoints += pts;
        }

        // Barrel Rolls
        const rollRotations = Math.round(this.accumRoll / (Math.PI * 2));
        if (Math.abs(rollRotations) >= 1) {
            const count = Math.abs(rollRotations);
            const name = count === 1 ? 'BARREL ROLL' : `${count}x BARREL ROLL`;
            const pts = count * 600;
            stuntList.push(name);
            totalPoints += pts;
        }

        // Flatspins
        const yawRotations = Math.round(this.accumYaw / (Math.PI * 2));
        if (Math.abs(yawRotations) >= 1) {
            const count = Math.abs(yawRotations);
            const name = `${count * 360}° FLATSPIN`;
            const pts = count * 400;
            stuntList.push(name);
            totalPoints += pts;
        }

        // Big Air Time bonus
        if (this.totalAirTime > 1.2) {
            const airSeconds = this.totalAirTime.toFixed(1);
            const pts = Math.floor(this.totalAirTime * 150);
            stuntList.push(`BIG AIR ${airSeconds}s`);
            totalPoints += pts;
        }

        // Clean landing bonus
        if (stuntList.length > 0) {
            stuntList.push('CLEAN LANDING');
            totalPoints += 150;

            this.triggerStunt({
                name: stuntList.join(' + '),
                points: totalPoints,
                type: 'air'
            });
        }
    }

    triggerStunt(stuntInfo) {
        if (this.onStunt) {
            this.onStunt(stuntInfo);
        }
    }
}
