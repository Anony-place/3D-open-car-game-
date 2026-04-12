import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export class Vehicle {
    constructor(scene, world, input) {
        this.scene = scene;
        this.world = world;
        this.input = input;

        this.mesh = new THREE.Group();
        this.wheelMeshes = [];

        // Stats
        this.speed = 0;
        this.nitro = 100;
        this.nitroActive = false;
        this.isDrifting = false;

        this.init();
    }

    init() {
        // 1. Chassis Body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
        this.chassisBody = new CANNON.Body({ mass: 1500 });
        this.chassisBody.addShape(chassisShape);
        this.chassisBody.position.set(0, 4, 0);
        this.chassisBody.angularVelocity.set(0, 0, 0);

        // 2. Raycast Vehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexForwardAxis: 2, // Z
            indexRightAxis: 0,   // X
            indexUpAxis: 1       // Y
        });

        // 3. Wheel Options
        const options = {
            radius: 0.5,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 5,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollInfluence: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true
        };

        // Add 4 wheels
        const wheelPositions = [
            new CANNON.Vec3(1, 0, 1.5),
            new CANNON.Vec3(-1, 0, 1.5),
            new CANNON.Vec3(1, 0, -1.5),
            new CANNON.Vec3(-1, 0, -1.5)
        ];

        wheelPositions.forEach((pos, i) => {
            options.chassisConnectionPointLocal.copy(pos);
            this.vehicle.addWheel(options);

            // Visual wheel
            const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 20);
            wheelGeo.rotateZ(Math.PI / 2);
            const wheelMesh = new THREE.Mesh(wheelGeo, new THREE.MeshStandardMaterial({ color: 0x222222 }));
            this.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
        });

        this.vehicle.addToWorld(this.world);

        // Visual Chassis
        const chassisGeo = new THREE.BoxGeometry(2, 1, 4);
        const chassisMesh = new THREE.Mesh(chassisGeo, new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        this.mesh.add(chassisMesh);
        this.scene.add(this.mesh);
    }

    update(deltaTime) {
        const input = this.input.keys;

        // Dynamic stats based on nitro
        let engineForce = 2500;
        if (input.nitro && this.nitro > 0) {
            engineForce = 5000;
            this.nitro -= deltaTime * 20;
            this.nitroActive = true;
        } else {
            this.nitroActive = false;
            if (this.nitro < 100) {
                this.nitro += deltaTime * 5;
            }
        }

        const maxSteerVal = 0.5;
        const brakeForce = 150;

        // Calculate speed in KM/H
        this.speed = Math.floor(Math.abs(this.vehicle.chassisBody.velocity.length()) * 3.6);

        // Reset
        this.vehicle.applyEngineForce(0, 0);
        this.vehicle.applyEngineForce(0, 1);
        this.vehicle.applyEngineForce(0, 2);
        this.vehicle.applyEngineForce(0, 3);
        this.vehicle.setSteeringValue(0, 0);
        this.vehicle.setSteeringValue(0, 1);
        this.vehicle.setBrake(0, 0);
        this.vehicle.setBrake(0, 1);
        this.vehicle.setBrake(0, 2);
        this.vehicle.setBrake(0, 3);

        if (input.forward) {
            this.vehicle.applyEngineForce(-engineForce, 2);
            this.vehicle.applyEngineForce(-engineForce, 3);
        } else if (input.backward) {
            this.vehicle.applyEngineForce(engineForce, 2);
            this.vehicle.applyEngineForce(engineForce, 3);
        }

        if (input.left) {
            this.vehicle.setSteeringValue(maxSteerVal, 0);
            this.vehicle.setSteeringValue(maxSteerVal, 1);
        } else if (input.right) {
            this.vehicle.setSteeringValue(-maxSteerVal, 0);
            this.vehicle.setSteeringValue(-maxSteerVal, 1);
        }

        if (input.handbrake) {
            this.vehicle.setBrake(brakeForce, 0);
            this.vehicle.setBrake(brakeForce, 1);
            this.vehicle.setBrake(brakeForce, 2);
            this.vehicle.setBrake(brakeForce, 3);

            // Drifting feel: reduce friction on rear wheels
            this.vehicle.wheelInfos[2].frictionSlip = 0.5;
            this.vehicle.wheelInfos[3].frictionSlip = 0.5;
            this.isDrifting = true;
        } else {
            this.vehicle.wheelInfos[2].frictionSlip = 5;
            this.vehicle.wheelInfos[3].frictionSlip = 5;
            this.isDrifting = false;
        }

        // Update visual positions
        this.mesh.position.copy(this.chassisBody.position);
        this.mesh.quaternion.copy(this.chassisBody.quaternion);

        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const t = this.vehicle.wheelInfos[i].worldTransform;
            const wheelMesh = this.wheelMeshes[i];
            wheelMesh.position.copy(t.position);
            wheelMesh.quaternion.copy(t.quaternion);
        }
    }

    destroy() {
        this.world.removeBody(this.chassisBody);
        this.scene.remove(this.mesh);
        this.wheelMeshes.forEach(m => this.scene.remove(m));
        this.vehicle.removeFromWorld(this.world);
    }
}
