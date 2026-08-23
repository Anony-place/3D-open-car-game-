import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { CarModelFactory } from './CarModelFactory.js';

export class Vehicle {
    constructor(scene, world, input, vehicleConfig = CONFIG.vehicles[0], customColor = null, customNeon = null) {
        this.scene = scene;
        this.world = world;
        this.input = input;
        this.config = vehicleConfig;
        this.customColor = customColor;
        this.customNeon = customNeon;

        this.mesh = new THREE.Group();
        this.wheelMeshes = [];

        // Vehicle dynamic state
        this.speed = 0; // KM/H
        this.rawSpeed = 0; // m/s
        this.nitro = 100;
        this.nitroActive = false;
        this.isDrifting = false;
        this.isAirborne = false;
        this.airTime = 0;
        this.wheelsOnGround = 4;

        // Particle systems
        this.particles = [];
        this.exhaustMeshes = [];
        this.nitroLight = null;

        this.init();
    }

    init() {
        const cfg = this.config;
        const dims = cfg.bodyDimensions || { width: 2.1, height: 0.9, length: 4.4 };

        // 1. Physics Chassis Body
        // Half-extents for Cannon Box
        const hx = dims.width / 2;
        const hy = dims.height / 2;
        const hz = dims.length / 2;

        const chassisShape = new CANNON.Box(new CANNON.Vec3(hx, hy, hz));
        this.chassisBody = new CANNON.Body({
            mass: cfg.mass || 1400,
            material: this.world.defaultMaterial || new CANNON.Material()
        });
        this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, hy, 0));
        this.chassisBody.position.set(0, 10, 0);
        this.chassisBody.angularDamping = 0.4;
        this.chassisBody.linearDamping = 0.05;

        // 2. Raycast Vehicle setup
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexForwardAxis: 2, // Z
            indexRightAxis: 0,   // X
            indexUpAxis: 1       // Y
        });

        // 3. Wheel Settings
        const wheelRadius = cfg.wheelRadius || 0.48;
        const wheelOptions = {
            radius: wheelRadius,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: cfg.suspensionStiffness || 35,
            suspensionRestLength: cfg.suspensionRestLength || 0.32,
            frictionSlip: cfg.frictionSlip || 5.5,
            dampingRelaxation: 2.5,
            dampingCompression: 4.5,
            maxSuspensionForce: 120000,
            rollInfluence: 0.02,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
            maxSuspensionTravel: 0.35,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true
        };

        const wX = hx * 0.95;
        const wY = 0.2;
        const wZ = hz * 0.75;

        const wheelPositions = [
            new CANNON.Vec3(wX, wY, -wZ),  // Front Right
            new CANNON.Vec3(-wX, wY, -wZ), // Front Left
            new CANNON.Vec3(wX, wY, wZ),   // Rear Right
            new CANNON.Vec3(-wX, wY, wZ)   // Rear Left
        ];

        wheelPositions.forEach((pos) => {
            wheelOptions.chassisConnectionPointLocal.copy(pos);
            this.vehicle.addWheel(wheelOptions);

            const wheelMesh = CarModelFactory.createWheelMesh(cfg, this.customNeon);
            this.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
        });

        this.vehicle.addToWorld(this.world);

        // 4. Visual 3D Chassis Model
        this.visualModel = CarModelFactory.createCarMesh(cfg, this.customColor, this.customNeon);
        this.mesh.add(this.visualModel);
        this.scene.add(this.mesh);

        // 5. Nitro Exhaust Fire Meshes
        this.createExhaustEffects();

        // 6. Particle container for tire smoke & sparks
        this.initParticleSystems();
    }

    createExhaustEffects() {
        const exhaustPositions = this.visualModel.userData.exhaustPositions || [
            new THREE.Vector3(-0.45, 0.05, 2.05),
            new THREE.Vector3(0.45, 0.05, 2.05)
        ];

        const flameGeo = new THREE.ConeGeometry(0.12, 0.9, 12);
        flameGeo.rotateX(-Math.PI / 2);
        flameGeo.translate(0, 0, 0.45);

        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.9
        });

        this.exhaustMeshes = [];
        exhaustPositions.forEach(pos => {
            const flame = new THREE.Mesh(flameGeo, flameMat.clone());
            flame.position.copy(pos);
            flame.visible = false;
            this.mesh.add(flame);
            this.exhaustMeshes.push(flame);
        });

        this.nitroLight = new THREE.PointLight(0x00ffff, 0, 15);
        this.nitroLight.position.set(0, 0.2, 2.2);
        this.mesh.add(this.nitroLight);
    }

    initParticleSystems() {
        // Simple particle system for tire smoke
        const count = 60;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const opacities = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] = -1000;
            opacities[i] = 0;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

        const mat = new THREE.PointsMaterial({
            color: 0xcccccc,
            size: 0.6,
            transparent: true,
            opacity: 0.5,
            blending: THREE.NormalBlending
        });

        this.smokePoints = new THREE.Points(geom, mat);
        this.scene.add(this.smokePoints);
        this.smokeParticles = [];
    }

    getWheelsOnGroundCount() {
        let count = 0;
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            if (this.vehicle.wheelInfos[i].isInContact) {
                count++;
            }
        }
        return count;
    }

    update(deltaTime) {
        const input = this.input.keys;
        const cfg = this.config;

        this.wheelsOnGround = this.getWheelsOnGroundCount();
        this.isAirborne = (this.wheelsOnGround === 0);

        if (this.isAirborne) {
            this.airTime += deltaTime;
        } else {
            this.airTime = 0;
        }

        // Speed calculation
        const vel = this.chassisBody.velocity;
        this.rawSpeed = vel.length();
        this.speed = Math.floor(this.rawSpeed * 3.6);

        // Nitro handling
        let engineForce = cfg.engineForce || 3600;
        const maxNitroForce = cfg.nitroForce || 7200;

        if (input.nitro && this.nitro > 0) {
            this.nitroActive = true;
            this.nitro = Math.max(0, this.nitro - deltaTime * 28);
            engineForce = maxNitroForce;

            // In-air nitro thruster
            if (this.isAirborne) {
                const forward = new CANNON.Vec3(0, 0, -1);
                this.chassisBody.quaternion.vmult(forward, forward);
                this.chassisBody.applyForce(forward.scale(8000), this.chassisBody.position);
            }
        } else {
            this.nitroActive = false;
            if (this.nitro < 100) {
                this.nitro += deltaTime * 8; // Auto regenerate
            }
        }

        // Steering & braking
        const maxSteer = cfg.maxSteerVal || 0.52;
        const brakeForce = 220;

        // Reset wheel forces each step
        for (let i = 0; i < 4; i++) {
            this.vehicle.applyEngineForce(0, i);
            this.vehicle.setSteeringValue(0, i);
            this.vehicle.setBrake(0, i);
        }

        // Acceleration / Reverse
        if (input.forward) {
            // Forward is negative Z in Cannon RaycastVehicle
            this.vehicle.applyEngineForce(-engineForce, 2);
            this.vehicle.applyEngineForce(-engineForce, 3);
            this.vehicle.applyEngineForce(-engineForce * 0.5, 0);
            this.vehicle.applyEngineForce(-engineForce * 0.5, 1);
        } else if (input.backward) {
            this.vehicle.applyEngineForce(engineForce * 0.6, 2);
            this.vehicle.applyEngineForce(engineForce * 0.6, 3);
            this.vehicle.applyEngineForce(engineForce * 0.4, 0);
            this.vehicle.applyEngineForce(engineForce * 0.4, 1);
        }

        // Steering (speed-dependent sensitivity)
        const steerSpeedDamp = Math.max(0.4, 1.0 - (this.speed / 280) * 0.6);
        const steerVal = maxSteer * steerSpeedDamp;

        if (input.left) {
            this.vehicle.setSteeringValue(steerVal, 0);
            this.vehicle.setSteeringValue(steerVal, 1);
        } else if (input.right) {
            this.vehicle.setSteeringValue(-steerVal, 0);
            this.vehicle.setSteeringValue(-steerVal, 1);
        }

        // Handbrake / Drift
        if (input.handbrake) {
            this.vehicle.setBrake(brakeForce, 0);
            this.vehicle.setBrake(brakeForce, 1);
            this.vehicle.setBrake(brakeForce * 1.5, 2);
            this.vehicle.setBrake(brakeForce * 1.5, 3);

            this.vehicle.wheelInfos[2].frictionSlip = 0.6;
            this.vehicle.wheelInfos[3].frictionSlip = 0.6;
            this.isDrifting = (this.speed > 25);
        } else {
            this.vehicle.wheelInfos[2].frictionSlip = cfg.frictionSlip || 5.5;
            this.vehicle.wheelInfos[3].frictionSlip = cfg.frictionSlip || 5.5;
            this.isDrifting = false;
        }

        // --- AERIAL STUNT & ROTATION PHYSICS ---
        if (this.isAirborne) {
            const torque = CONFIG.physics.airControlForce || 1800;
            const q = this.chassisBody.quaternion;

            // Pitch control (W = frontflip, S = backflip)
            if (input.forward) {
                const pitchAxis = new CANNON.Vec3(-1, 0, 0);
                q.vmult(pitchAxis, pitchAxis);
                this.chassisBody.torque.vadd(pitchAxis.scale(torque * 1.3), this.chassisBody.torque);
            } else if (input.backward) {
                const pitchAxis = new CANNON.Vec3(1, 0, 0);
                q.vmult(pitchAxis, pitchAxis);
                this.chassisBody.torque.vadd(pitchAxis.scale(torque * 1.3), this.chassisBody.torque);
            }

            // Roll / Yaw control (A/D or Q/E)
            if (input.left || input.rollLeft) {
                const rollAxis = new CANNON.Vec3(0, 0, -1);
                const yawAxis = new CANNON.Vec3(0, 1, 0);
                q.vmult(rollAxis, rollAxis);
                q.vmult(yawAxis, yawAxis);
                this.chassisBody.torque.vadd(rollAxis.scale(torque * 1.0), this.chassisBody.torque);
                this.chassisBody.torque.vadd(yawAxis.scale(torque * 0.6), this.chassisBody.torque);
            } else if (input.right || input.rollRight) {
                const rollAxis = new CANNON.Vec3(0, 0, 1);
                const yawAxis = new CANNON.Vec3(0, -1, 0);
                q.vmult(rollAxis, rollAxis);
                q.vmult(yawAxis, yawAxis);
                this.chassisBody.torque.vadd(rollAxis.scale(torque * 1.0), this.chassisBody.torque);
                this.chassisBody.torque.vadd(yawAxis.scale(torque * 0.6), this.chassisBody.torque);
            }

            // Air dampening if no rotational inputs
            if (!input.forward && !input.backward && !input.left && !input.right) {
                this.chassisBody.angularVelocity.scale(0.97, this.chassisBody.angularVelocity);
            }
        } else {
            // Aerodynamic Downforce when on ground
            if (this.rawSpeed > 10) {
                const downVector = new CANNON.Vec3(0, -1, 0);
                this.chassisBody.quaternion.vmult(downVector, downVector);
                const downforce = Math.min(6000, this.rawSpeed * this.rawSpeed * 3.5);
                this.chassisBody.applyForce(downVector.scale(downforce), this.chassisBody.position);
            }
        }

        // --- UPDATE VISUAL MESHES ---
        this.mesh.position.copy(this.chassisBody.position);
        this.mesh.quaternion.copy(this.chassisBody.quaternion);

        // Update wheel positions and rotations
        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const t = this.vehicle.wheelInfos[i].worldTransform;
            const wheelMesh = this.wheelMeshes[i];
            wheelMesh.position.copy(t.position);
            wheelMesh.quaternion.copy(t.quaternion);
        }

        // Update Exhaust VFX
        this.updateExhaustEffects(deltaTime);

        // Update Drift Smoke
        this.updateSmokeEffects(deltaTime);
    }

    updateExhaustEffects(deltaTime) {
        const isFiring = this.nitroActive;
        const scaleZ = isFiring ? 1.0 + Math.random() * 0.8 : 0.001;

        this.exhaustMeshes.forEach(mesh => {
            mesh.visible = isFiring;
            if (isFiring) {
                mesh.scale.set(1.0 + Math.random() * 0.3, 1.0 + Math.random() * 0.3, scaleZ);
                // Pulsing colors
                const color = Math.random() > 0.3 ? 0x00ffff : 0xff00ff;
                mesh.material.color.setHex(color);
            }
        });

        if (this.nitroLight) {
            this.nitroLight.intensity = isFiring ? 2.5 + Math.random() * 1.5 : 0;
        }
    }

    updateSmokeEffects(deltaTime) {
        if (!this.smokePoints) return;

        // Spawn smoke if drifting
        if (this.isDrifting && this.wheelsOnGround > 0 && Math.random() < 0.7) {
            for (let i = 2; i < 4; i++) {
                const wheelPos = this.wheelMeshes[i].position;
                this.smokeParticles.push({
                    x: wheelPos.x + (Math.random() - 0.5) * 0.4,
                    y: wheelPos.y + 0.1,
                    z: wheelPos.z + (Math.random() - 0.5) * 0.4,
                    vx: (Math.random() - 0.5) * 0.6,
                    vy: 0.8 + Math.random() * 0.6,
                    vz: (Math.random() - 0.5) * 0.6,
                    life: 1.0,
                    size: 0.4
                });
            }
        }

        // Update existing particles
        const posAttr = this.smokePoints.geometry.attributes.position;
        const count = 60;
        let pIdx = 0;

        for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
            const p = this.smokeParticles[i];
            p.life -= deltaTime * 2.2;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.z += p.vz * deltaTime;

            if (p.life <= 0) {
                this.smokeParticles.splice(i, 1);
            } else if (pIdx < count) {
                posAttr.setXYZ(pIdx, p.x, p.y, p.z);
                pIdx++;
            }
        }

        // Reset remaining slots off-screen
        for (let i = pIdx; i < count; i++) {
            posAttr.setXYZ(i, 0, -1000, 0);
        }
        posAttr.needsUpdate = true;
    }

    applySpeedBoost(boostPower = 45, direction = null) {
        let forwardVec;
        if (direction) {
            forwardVec = direction.clone().normalize();
        } else {
            forwardVec = new CANNON.Vec3(0, 0, -1);
            this.chassisBody.quaternion.vmult(forwardVec, forwardVec);
        }
        
        // Add huge impulse
        const impulse = forwardVec.scale(this.chassisBody.mass * boostPower);
        this.chassisBody.applyImpulse(impulse, this.chassisBody.position);

        // Refill nitro
        this.nitro = Math.min(100, this.nitro + 35);
    }

    applyJumpImpulse(forceY = 22, forceZ = 12) {
        const upVec = new CANNON.Vec3(0, 1, 0);
        const fwdVec = new CANNON.Vec3(0, 0, -1);
        this.chassisBody.quaternion.vmult(fwdVec, fwdVec);

        const impulseY = upVec.scale(this.chassisBody.mass * forceY);
        const impulseZ = fwdVec.scale(this.chassisBody.mass * forceZ);

        this.chassisBody.velocity.y = Math.max(this.chassisBody.velocity.y, 0);
        this.chassisBody.applyImpulse(impulseY.vadd(impulseZ), this.chassisBody.position);
    }

    respawn(position, rotationY = 0) {
        // Zero all velocities
        this.chassisBody.velocity.set(0, 0, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);

        // Set position slightly above checkpoint platform to avoid ground sticking
        this.chassisBody.position.set(position.x, position.y + 1.2, position.z);

        // Set orientation
        const quat = new CANNON.Quaternion();
        quat.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
        this.chassisBody.quaternion.copy(quat);

        // Update visuals immediately
        this.mesh.position.copy(this.chassisBody.position);
        this.mesh.quaternion.copy(this.chassisBody.quaternion);

        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.wheelInfos[i].steering = 0;
            this.vehicle.wheelInfos[i].rotation = 0;
        }

        this.speed = 0;
        this.rawSpeed = 0;
        this.airTime = 0;
        this.isAirborne = false;
        this.isDrifting = false;
    }

    destroy() {
        this.world.removeBody(this.chassisBody);
        this.scene.remove(this.mesh);
        this.wheelMeshes.forEach(m => this.scene.remove(m));
        if (this.smokePoints) this.scene.remove(this.smokePoints);
        this.vehicle.removeFromWorld(this.world);
    }
}
