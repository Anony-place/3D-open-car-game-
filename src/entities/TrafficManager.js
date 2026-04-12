import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class TrafficManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.npcs = [];
        this.pool = [];
        this.npcGeometry = new THREE.BoxGeometry(2, 1, 4);
        this.npcMaterial = new THREE.MeshStandardMaterial({ color: 0x5555ff });

        this.spawnTimer = 0;
        this.spawnInterval = 3; // Spawn every 3 seconds
        this.maxNpcs = 20;
    }

    spawnNpc() {
        if (this.npcs.length >= this.maxNpcs) return;

        let npc;
        if (this.pool.length > 0) {
            npc = this.pool.pop();
            this.scene.add(npc.mesh);
            this.world.addBody(npc.body);
        } else {
            const body = new CANNON.Body({
                mass: 1000,
                shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2))
            });
            const mesh = new THREE.Mesh(this.npcGeometry, this.npcMaterial);
            npc = { body, mesh };
            this.scene.add(mesh);
            this.world.addBody(body);
        }

        const isHorizontal = Math.random() > 0.5;
        const x = isHorizontal ? (Math.random() - 0.5) * 400 : (Math.random() > 0.5 ? 5 : -5);
        const z = isHorizontal ? (Math.random() > 0.5 ? 5 : -5) : (Math.random() - 0.5) * 400;

        npc.body.position.set(x, 1, z);
        npc.body.angularVelocity.set(0, 0, 0);
        npc.body.linearDamping = 0.1;
        npc.body.angularDamping = 0.5;

        // NPC Speed & Direction
        const speed = 10 + Math.random() * 10;
        const velocity = isHorizontal ?
            new CANNON.Vec3(speed * (x > 0 ? -1 : 1), 0, 0) :
            new CANNON.Vec3(0, 0, speed * (z > 0 ? -1 : 1));

        npc.body.velocity.copy(velocity);

        if (isHorizontal) {
            npc.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        } else {
            npc.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
        }

        npc.isHorizontal = isHorizontal;
        npc.speed = speed;
        npc.targetVelocity = velocity.clone();

        this.npcs.push(npc);
    }

    update(deltaTime, playerPosition) {
        this.spawnTimer += deltaTime;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnNpc();
            this.spawnTimer = 0;
        }

        const despawnDist = 500;

        for (let i = this.npcs.length - 1; i >= 0; i--) {
            const npc = this.npcs[i];
            npc.mesh.position.copy(npc.body.position);
            npc.mesh.quaternion.copy(npc.body.quaternion);

            // Simple stopping AI if player is too close in front
            let factor = 1.0;
            if (playerPosition) {
                const toPlayer = new CANNON.Vec3(playerPosition.x - npc.body.position.x, 0, playerPosition.z - npc.body.position.z);
                const dist = toPlayer.length();
                const dot = toPlayer.dot(npc.targetVelocity.unit());

                if (dist < 15 && dot > 0) { // Player is in front and close
                    factor = 0; // Stop
                }
            }

            // Maintain velocity - basic cruise control
            npc.body.velocity.x = npc.targetVelocity.x * factor;
            npc.body.velocity.z = npc.targetVelocity.z * factor;

            // Remove if too far from player (or origin if no player)
            const distSq = playerPosition ?
                npc.body.position.distanceSquared(new CANNON.Vec3(playerPosition.x, playerPosition.y, playerPosition.z)) :
                npc.body.position.lengthSquared();

            if (distSq > despawnDist * despawnDist) {
                this.world.removeBody(npc.body);
                this.scene.remove(npc.mesh);
                this.npcs.splice(i, 1);
                this.pool.push(npc);
            }
        }
    }

    reset() {
        for (const npc of this.npcs) {
            this.world.removeBody(npc.body);
            this.scene.remove(npc.mesh);
            this.pool.push(npc);
        }
        this.npcs = [];
    }
}
