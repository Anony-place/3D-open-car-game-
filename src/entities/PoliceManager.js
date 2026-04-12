import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PoliceManager {
    constructor(scene, world, player) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.policeCars = [];
        this.wantedLevel = 0;
        this.maxPolice = 3;

        this.carGeometry = new THREE.BoxGeometry(2, 1, 4);
        this.carMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });

        this.spawnTimer = 0;
    }

    setWantedLevel(level) {
        this.wantedLevel = level;
    }

    spawnPolice() {
        if (!this.player || this.policeCars.length >= this.wantedLevel) return;

        const spawnDist = 50;
        const angle = Math.random() * Math.PI * 2;
        const x = this.player.mesh.position.x + Math.cos(angle) * spawnDist;
        const z = this.player.mesh.position.z + Math.sin(angle) * spawnDist;

        const body = new CANNON.Body({
            mass: 1500,
            shape: new CANNON.Box(new CANNON.Vec3(1, 0.5, 2))
        });
        body.position.set(x, 1, z);
        body.linearDamping = 0.1;
        body.angularDamping = 0.5;
        this.world.addBody(body);

        const mesh = new THREE.Mesh(this.carGeometry, this.carMaterial);
        // Add siren light
        const light = new THREE.PointLight(0xff0000, 1, 10);
        light.position.y = 1;
        mesh.add(light);

        this.scene.add(mesh);

        this.policeCars.push({ body, mesh, light });
    }

    update(deltaTime) {
        if (this.wantedLevel === 0) {
            this.reset();
            return;
        }

        this.spawnTimer += deltaTime;
        if (this.spawnTimer > 5) {
            this.spawnPolice();
            this.spawnTimer = 0;
        }

        for (let i = this.policeCars.length - 1; i >= 0; i--) {
            const police = this.policeCars[i];
            police.mesh.position.copy(police.body.position);
            police.mesh.quaternion.copy(police.body.quaternion);

            // Simple Chase AI
            if (this.player) {
                const toPlayer = new CANNON.Vec3(
                    this.player.mesh.position.x - police.body.position.x,
                    0,
                    this.player.mesh.position.z - police.body.position.z
                );
                const dist = toPlayer.length();
                toPlayer.normalize();

                const speed = 15;
                police.body.velocity.x = toPlayer.x * speed;
                police.body.velocity.z = toPlayer.z * speed;

                // Look at player
                const angle = Math.atan2(toPlayer.x, toPlayer.z);
                police.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);

                // Siren flicker
                police.light.intensity = Math.sin(performance.now() * 0.01) > 0 ? 2 : 0;
                police.light.color.setHex(Math.sin(performance.now() * 0.01) > 0 ? 0xff0000 : 0x0000ff);

                // Despawn if too far
                if (dist > 200) {
                    this.world.removeBody(police.body);
                    this.scene.remove(police.mesh);
                    this.policeCars.splice(i, 1);
                }
            }
        }
    }

    reset() {
        for (const police of this.policeCars) {
            this.world.removeBody(police.body);
            this.scene.remove(police.mesh);
        }
        this.policeCars = [];
    }
}
