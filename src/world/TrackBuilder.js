import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class TrackBuilder {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;

        // Track meshes and physics bodies for cleanup
        this.meshes = [];
        this.bodies = [];
        this.boostPads = [];
        this.jumpPads = [];
        this.obstacles = [];
        this.coins = [];
        this.fragileTiles = [];

        this.initSharedMaterials();
    }

    initSharedMaterials() {
        // Road surface material
        this.roadMat = new THREE.MeshStandardMaterial({
            color: 0x151624,
            roughness: 0.7,
            metalness: 0.2
        });

        // Neon curb materials
        this.neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        this.neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff8800 });
        this.neonGreenMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
        this.neonYellowMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

        // Hazard striped material
        this.hazardMat = new THREE.MeshStandardMaterial({
            color: 0xff3300,
            roughness: 0.4,
            metalness: 0.6
        });

        // Obstacle metal material
        this.metalMat = new THREE.MeshStandardMaterial({
            color: 0x333344,
            metalness: 0.8,
            roughness: 0.3
        });
    }

    clear() {
        this.meshes.forEach(m => this.scene.remove(m));
        this.bodies.forEach(b => this.world.removeBody(b));

        this.meshes = [];
        this.bodies = [];
        this.boostPads = [];
        this.jumpPads = [];
        this.obstacles = [];
        this.coins = [];
        this.fragileTiles = [];
    }

    // --- 1. Straight Road Platform ---
    createStraight(x, y, z, width = 12, length = 40, rotY = 0, rotX = 0, rotZ = 0, options = {}) {
        const thickness = options.thickness || 1.2;
        const color = options.color || 0x151624;
        const neonMat = options.neonMat || this.neonCyanMat;
        const hasRails = options.hasRails !== undefined ? options.hasRails : true;
        const railHeight = options.railHeight || 0.6;

        const group = new THREE.Group();

        // Main road platform mesh
        const roadGeo = new THREE.BoxGeometry(width, thickness, length);
        const roadMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.65,
            metalness: 0.25
        });
        const roadMesh = new THREE.Mesh(roadGeo, roadMat);
        roadMesh.castShadow = true;
        roadMesh.receiveShadow = true;
        group.add(roadMesh);

        // Neon side curbs / guardrails
        if (hasRails) {
            const railGeo = new THREE.BoxGeometry(0.3, railHeight, length);
            const railL = new THREE.Mesh(railGeo, neonMat);
            railL.position.set(-width / 2 + 0.15, (thickness + railHeight) / 2, 0);
            const railR = new THREE.Mesh(railGeo, neonMat);
            railR.position.set(width / 2 - 0.15, (thickness + railHeight) / 2, 0);
            group.add(railL, railR);
        }

        // Center line dashes
        if (options.centerLine) {
            const lineGeo = new THREE.BoxGeometry(0.4, 0.05, length * 0.9);
            const lineMesh = new THREE.Mesh(lineGeo, neonMat);
            lineMesh.position.y = thickness / 2 + 0.03;
            group.add(lineMesh);
        }

        group.position.set(x, y, z);
        group.rotation.set(rotX, rotY, rotZ);
        this.scene.add(group);
        this.meshes.push(group);

        // Physics Body
        const body = new CANNON.Body({
            mass: 0, // Static
            material: this.world.trackMaterial || new CANNON.Material()
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, thickness / 2, length / 2)));
        body.position.set(x, y, z);

        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ));
        body.quaternion.set(q.x, q.y, q.z, q.w);

        this.world.addBody(body);
        this.bodies.push(body);

        return { group, body };
    }

    // --- 2. Sloped Launch Ramp ---
    createRamp(x, y, z, width = 12, length = 30, height = 8, rotY = 0, options = {}) {
        const angle = Math.atan2(height, length);
        const rampLen = Math.sqrt(length * length + height * height);
        const thickness = 1.2;

        const group = new THREE.Group();

        const rampGeo = new THREE.BoxGeometry(width, thickness, rampLen);
        const rampMat = new THREE.MeshStandardMaterial({
            color: options.color || 0x18182c,
            roughness: 0.6,
            metalness: 0.3
        });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.castShadow = true;
        rampMesh.receiveShadow = true;
        group.add(rampMesh);

        // Side Rails
        const railGeo = new THREE.BoxGeometry(0.3, 0.8, rampLen);
        const railMat = options.neonMat || this.neonOrangeMat;
        const railL = new THREE.Mesh(railGeo, railMat);
        railL.position.set(-width / 2 + 0.15, 0.6, 0);
        const railR = new THREE.Mesh(railGeo, railMat);
        railR.position.set(width / 2 - 0.15, 0.6, 0);
        group.add(railL, railR);

        // Position at center of slope
        const centerY = y + height / 2;
        const centerZ = z - (length / 2) * Math.cos(rotY);
        const centerX = x - (length / 2) * Math.sin(rotY);

        group.position.set(centerX, centerY, centerZ);
        group.rotation.set(-angle, rotY, 0);
        this.scene.add(group);
        this.meshes.push(group);

        // Physics Body
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, thickness / 2, rampLen / 2)));
        body.position.set(centerX, centerY, centerZ);

        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-angle, rotY, 0));
        body.quaternion.set(q.x, q.y, q.z, q.w);

        this.world.addBody(body);
        this.bodies.push(body);

        return { group, body };
    }

    // --- 3. 360° Vertical Stunt Loop ---
    createLoop(centerX, centerY, centerZ, radius = 18, width = 10, rotY = 0) {
        const segments = 24;
        const arcStep = (Math.PI * 2) / segments;
        const thickness = 1.0;
        const segLen = (2 * Math.PI * radius) / segments;

        for (let i = 0; i < segments; i++) {
            const angle = i * arcStep;
            const nextAngle = (i + 1) * arcStep;
            const midAngle = (angle + nextAngle) / 2;

            // Offset along spiral so car doesn't collide with entrance on exit
            const zOffset = ((i / segments) - 0.5) * (width * 0.6);

            const localX = 0;
            const localY = -Math.cos(midAngle) * radius + radius;
            const localZ = Math.sin(midAngle) * radius + zOffset;

            // Rotate into world position
            const pos = new THREE.Vector3(localX, localY, localZ);
            pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
            pos.add(new THREE.Vector3(centerX, centerY, centerZ));

            const segRotX = midAngle;
            const euler = new THREE.Euler(segRotX, rotY, 0, 'YXZ');

            const group = new THREE.Group();
            const segGeo = new THREE.BoxGeometry(width, thickness, segLen * 1.05);
            const segMat = new THREE.MeshStandardMaterial({
                color: (i % 2 === 0) ? 0x16122e : 0x221844,
                roughness: 0.5,
                metalness: 0.4
            });
            const mesh = new THREE.Mesh(segGeo, segMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);

            // Neon rails
            const railGeo = new THREE.BoxGeometry(0.3, 0.6, segLen * 1.05);
            const railL = new THREE.Mesh(railGeo, this.neonPinkMat);
            railL.position.set(-width / 2 + 0.15, 0.4, 0);
            const railR = new THREE.Mesh(railGeo, this.neonPinkMat);
            railR.position.set(width / 2 - 0.15, 0.4, 0);
            group.add(railL, railR);

            group.position.copy(pos);
            group.quaternion.setFromEuler(euler);
            this.scene.add(group);
            this.meshes.push(group);

            // Physics Plank
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, thickness / 2, (segLen * 1.05) / 2)));
            body.position.copy(pos);
            body.quaternion.set(group.quaternion.x, group.quaternion.y, group.quaternion.z, group.quaternion.w);
            this.world.addBody(body);
            this.bodies.push(body);
        }
    }

    // --- 4. Banked Wall-Ride Curved Arc ---
    createWallRide(centerX, centerY, centerZ, radius = 25, width = 12, angleSpan = Math.PI * 0.6, rotY = 0, bankAngle = 0.9) {
        const segments = 16;
        const dAngle = angleSpan / segments;
        const thickness = 1.0;
        const segLen = (radius * angleSpan) / segments;

        for (let i = 0; i < segments; i++) {
            const a = (i + 0.5) * dAngle;
            const localX = Math.sin(a) * radius;
            const localZ = -Math.cos(a) * radius + radius;

            const pos = new THREE.Vector3(localX, 0, localZ);
            pos.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
            pos.add(new THREE.Vector3(centerX, centerY, centerZ));

            const group = new THREE.Group();
            const segGeo = new THREE.BoxGeometry(width, thickness, segLen * 1.05);
            const segMat = new THREE.MeshStandardMaterial({
                color: 0x1f1538,
                roughness: 0.5,
                metalness: 0.4
            });
            const mesh = new THREE.Mesh(segGeo, segMat);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);

            // Neon rails
            const railL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, segLen * 1.05), this.neonCyanMat);
            railL.position.set(-width / 2 + 0.15, 0.5, 0);
            const railR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, segLen * 1.05), this.neonCyanMat);
            railR.position.set(width / 2 - 0.15, 0.5, 0);
            group.add(railL, railR);

            group.position.copy(pos);
            group.rotation.set(0, rotY + a, bankAngle);
            this.scene.add(group);
            this.meshes.push(group);

            // Physics Body
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, thickness / 2, (segLen * 1.05) / 2)));
            body.position.copy(pos);
            const q = new THREE.Quaternion().setFromEuler(group.rotation);
            body.quaternion.set(q.x, q.y, q.z, q.w);
            this.world.addBody(body);
            this.bodies.push(body);
        }
    }

    // --- 5. Speed Booster Pad ---
    createBoostPad(x, y, z, width = 6, length = 12, rotY = 0, boostPower = 40) {
        const group = new THREE.Group();

        // Base frame
        const frameGeo = new THREE.BoxGeometry(width, 0.2, length);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x050510 });
        const frameMesh = new THREE.Mesh(frameGeo, frameMat);
        group.add(frameMesh);

        // Animated Chevrons
        const chevronCount = 4;
        const chevrons = [];
        for (let i = 0; i < chevronCount; i++) {
            const arrowGeo = new THREE.ConeGeometry(0.9, 1.4, 3);
            arrowGeo.rotateX(-Math.PI / 2);
            const arrowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
            const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
            arrowMesh.position.set(0, 0.15, ((i / chevronCount) - 0.5) * (length * 0.7));
            group.add(arrowMesh);
            chevrons.push(arrowMesh);
        }

        // Side glow strips
        const stripGeo = new THREE.BoxGeometry(0.2, 0.3, length);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        const stripL = new THREE.Mesh(stripGeo, stripMat);
        stripL.position.set(-width / 2 + 0.1, 0.15, 0);
        const stripR = new THREE.Mesh(stripGeo, stripMat);
        stripR.position.set(width / 2 - 0.1, 0.15, 0);
        group.add(stripL, stripR);

        group.position.set(x, y, z);
        group.rotation.y = rotY;
        this.scene.add(group);
        this.meshes.push(group);

        const padData = {
            position: new THREE.Vector3(x, y, z),
            width,
            length,
            rotY,
            boostPower,
            chevrons,
            group,
            direction: new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY)
        };
        this.boostPads.push(padData);

        return padData;
    }

    // --- 6. Super Bouncer / Jump Pad ---
    createJumpPad(x, y, z, width = 8, length = 8, rotY = 0, jumpPower = 26) {
        const group = new THREE.Group();

        // Platform base
        const baseGeo = new THREE.CylinderGeometry(width / 2, width / 2 + 0.5, 0.5, 24);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x221100, metalness: 0.8 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        group.add(baseMesh);

        // Glowing center pad
        const padGeo = new THREE.CylinderGeometry(width * 0.4, width * 0.4, 0.6, 24);
        const padMat = new THREE.MeshBasicMaterial({ color: 0xffbb00 });
        const padMesh = new THREE.Mesh(padGeo, padMat);
        group.add(padMesh);

        // Ring glow
        const ringGeo = new THREE.TorusGeometry(width * 0.45, 0.15, 8, 24);
        ringGeo.rotateX(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.y = 0.35;
        group.add(ringMesh);

        group.position.set(x, y, z);
        group.rotation.y = rotY;
        this.scene.add(group);
        this.meshes.push(group);

        const jumpData = {
            position: new THREE.Vector3(x, y, z),
            radius: width / 2,
            jumpPower,
            group,
            padMesh
        };
        this.jumpPads.push(jumpData);

        return jumpData;
    }

    // --- 7. Dynamic Moving Obstacles ---
    createMovingObstacle(x, y, z, type = 'spinner', params = {}) {
        const group = new THREE.Group();
        let body = null;

        if (type === 'spinner') {
            // Rotating horizontal sweeper bar
            const barWidth = params.barWidth || 16;
            const barHeight = params.barHeight || 1.2;
            const barDepth = params.barDepth || 1.2;
            const speed = params.speed || 1.8;

            // Pillar
            const pillarGeo = new THREE.CylinderGeometry(1.0, 1.2, 4, 16);
            const pillar = new THREE.Mesh(pillarGeo, this.metalMat);
            pillar.position.y = 2;
            group.add(pillar);

            // Rotating bar
            const barGeo = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
            const barMat = this.hazardMat;
            const barMesh = new THREE.Mesh(barGeo, barMat);
            barMesh.position.y = 2.5;

            // Neon tip markers
            const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, barHeight + 0.1, barDepth + 0.1), this.neonPinkMat);
            tipL.position.set(-barWidth / 2, 2.5, 0);
            const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.5, barHeight + 0.1, barDepth + 0.1), this.neonPinkMat);
            tipR.position.set(barWidth / 2, 2.5, 0);
            group.add(barMesh, tipL, tipR);

            group.position.set(x, y, z);
            this.scene.add(group);
            this.meshes.push(group);

            // Kinematic physics body
            body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.KINEMATIC
            });
            body.addShape(new CANNON.Box(new CANNON.Vec3(barWidth / 2, barHeight / 2, barDepth / 2)), new CANNON.Vec3(0, 2.5, 0));
            body.position.set(x, y, z);
            this.world.addBody(body);
            this.bodies.push(body);

            this.obstacles.push({
                type: 'spinner',
                group,
                body,
                speed,
                currentAngle: 0
            });

        } else if (type === 'slider') {
            // Sliding barrier that moves side to side across track
            const width = params.width || 6;
            const height = params.height || 2.5;
            const depth = params.depth || 2;
            const distance = params.distance || 10;
            const speed = params.speed || 2.0;

            const blockGeo = new THREE.BoxGeometry(width, height, depth);
            const blockMesh = new THREE.Mesh(blockGeo, this.hazardMat);
            blockMesh.position.y = height / 2;
            group.add(blockMesh);

            group.position.set(x, y, z);
            this.scene.add(group);
            this.meshes.push(group);

            body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.KINEMATIC
            });
            body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2)), new CANNON.Vec3(0, height / 2, 0));
            body.position.set(x, y, z);
            this.world.addBody(body);
            this.bodies.push(body);

            this.obstacles.push({
                type: 'slider',
                group,
                body,
                startX: x,
                distance,
                speed,
                axis: params.axis || 'x'
            });

        } else if (type === 'pendulum') {
            // Giant swinging hammer / blade
            const length = params.length || 18;
            const speed = params.speed || 2.5;
            const maxAngle = params.maxAngle || 1.1;

            const armGeo = new THREE.CylinderGeometry(0.3, 0.3, length, 12);
            const arm = new THREE.Mesh(armGeo, this.metalMat);
            arm.position.y = -length / 2;

            const headGeo = new THREE.CylinderGeometry(2.0, 2.0, 3.5, 16);
            headGeo.rotateZ(Math.PI / 2);
            const head = new THREE.Mesh(headGeo, this.hazardMat);
            head.position.y = -length;
            group.add(arm, head);

            group.position.set(x, y + length + 2, z);
            this.scene.add(group);
            this.meshes.push(group);

            body = new CANNON.Body({
                mass: 0,
                type: CANNON.Body.KINEMATIC
            });
            body.addShape(new CANNON.Sphere(2.2), new CANNON.Vec3(0, -length, 0));
            body.position.set(x, y + length + 2, z);
            this.world.addBody(body);
            this.bodies.push(body);

            this.obstacles.push({
                type: 'pendulum',
                group,
                body,
                speed,
                maxAngle,
                rotAxis: params.rotAxis || 'z'
            });
        }
    }

    // --- 8. Fragile / Falling Platform ---
    createFragileTile(x, y, z, width = 8, length = 8, rotY = 0) {
        const group = new THREE.Group();

        const tileGeo = new THREE.BoxGeometry(width, 0.8, length);
        const tileMat = new THREE.MeshStandardMaterial({
            color: 0x00eeff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.1,
            metalness: 0.9
        });
        const tileMesh = new THREE.Mesh(tileGeo, tileMat);
        tileMesh.castShadow = true;
        tileMesh.receiveShadow = true;
        group.add(tileMesh);

        group.position.set(x, y, z);
        group.rotation.y = rotY;
        this.scene.add(group);
        this.meshes.push(group);

        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, 0.4, length / 2)));
        body.position.set(x, y, z);
        const q = new THREE.Quaternion().setFromEuler(group.rotation);
        body.quaternion.set(q.x, q.y, q.z, q.w);
        this.world.addBody(body);
        this.bodies.push(body);

        const tileData = {
            group,
            body,
            tileMesh,
            position: new THREE.Vector3(x, y, z),
            width,
            length,
            triggered: false,
            collapseTimer: 0,
            isCollapsed: false,
            originalY: y
        };
        this.fragileTiles.push(tileData);

        return tileData;
    }

    // --- 9. Collectible Stunt Coin ---
    createCoin(x, y, z) {
        const group = new THREE.Group();

        const coinGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.25, 16);
        coinGeo.rotateZ(Math.PI / 2);
        const coinMat = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xffaa00,
            emissiveIntensity: 0.4
        });
        const coinMesh = new THREE.Mesh(coinGeo, coinMat);
        group.add(coinMesh);

        group.position.set(x, y, z);
        this.scene.add(group);
        this.meshes.push(group);

        const coinData = {
            group,
            position: new THREE.Vector3(x, y, z),
            collected: false,
            baseY: y
        };
        this.coins.push(coinData);

        return coinData;
    }

    // --- 10. Grand Finish Platform ---
    createFinishPlatform(x, y, z, rotY = 0) {
        const group = new THREE.Group();
        const size = 30;

        // Platform base
        const baseGeo = new THREE.CylinderGeometry(size / 2, size / 2 + 2, 2, 8);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x181230,
            roughness: 0.5,
            metalness: 0.5
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        group.add(baseMesh);

        // Neon Chequered Floor Target
        const innerGeo = new THREE.CylinderGeometry(size * 0.42, size * 0.42, 2.1, 8);
        const innerMat = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            wireframe: true
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        group.add(innerMesh);

        // Grand Victory Arch
        const archGeo = new THREE.TorusGeometry(8, 0.8, 16, 32, Math.PI);
        const archMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const archMesh = new THREE.Mesh(archGeo, archMat);
        archMesh.position.set(0, 2, 0);
        group.add(archMesh);

        // Floating Gold Trophy
        const trophyGeo = new THREE.OctahedronGeometry(2.5);
        const trophyMat = new THREE.MeshStandardMaterial({
            color: 0xffea00,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xff9900,
            emissiveIntensity: 0.6
        });
        const trophyMesh = new THREE.Mesh(trophyGeo, trophyMat);
        trophyMesh.position.set(0, 8, 0);
        group.add(trophyMesh);

        // Spotlights
        const victoryLight = new THREE.PointLight(0xffd700, 3.0, 50);
        victoryLight.position.set(0, 10, 0);
        group.add(victoryLight);

        group.position.set(x, y, z);
        group.rotation.y = rotY;
        this.scene.add(group);
        this.meshes.push(group);

        // Physics Body
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Cylinder(size / 2, size / 2 + 2, 2, 8));
        body.position.set(x, y, z);
        this.world.addBody(body);
        this.bodies.push(body);

        return { group, body, trophyMesh };
    }

    update(deltaTime, playerPosition, vehicleRef, audioRef) {
        const time = performance.now() * 0.001;

        // 1. Animate Boost Pad Chevrons & Check Triggers
        this.boostPads.forEach(pad => {
            pad.chevrons.forEach((ch, idx) => {
                ch.material.opacity = 0.4 + Math.sin(time * 12 + idx) * 0.5;
            });

            if (playerPosition && vehicleRef) {
                const dist = playerPosition.distanceTo(pad.position);
                if (dist < pad.length * 0.6) {
                    vehicleRef.applySpeedBoost(pad.boostPower, pad.direction);
                    if (audioRef) audioRef.playBoostSound();
                }
            }
        });

        // 2. Animate Jump Pads & Check Triggers
        this.jumpPads.forEach(jPad => {
            jPad.padMesh.scale.y = 1.0 + Math.sin(time * 8) * 0.15;

            if (playerPosition && vehicleRef) {
                const dist = playerPosition.distanceTo(jPad.position);
                if (dist < jPad.radius * 1.1 && Math.abs(playerPosition.y - jPad.position.y) < 3.5) {
                    vehicleRef.applyJumpImpulse(jPad.jumpPower, 15);
                    if (audioRef) audioRef.playJumpPadSound();
                }
            }
        });

        // 3. Update Moving Obstacles
        this.obstacles.forEach(obs => {
            if (obs.type === 'spinner') {
                obs.currentAngle += obs.speed * deltaTime;
                obs.group.rotation.y = obs.currentAngle;
                const q = new THREE.Quaternion().setFromEuler(obs.group.rotation);
                obs.body.quaternion.set(q.x, q.y, q.z, q.w);

            } else if (obs.type === 'slider') {
                const offset = Math.sin(time * obs.speed) * obs.distance;
                if (obs.axis === 'x') {
                    obs.group.position.x = obs.startX + offset;
                    obs.body.position.x = obs.startX + offset;
                } else {
                    obs.group.position.z = obs.startX + offset;
                    obs.body.position.z = obs.startX + offset;
                }

            } else if (obs.type === 'pendulum') {
                const angle = Math.sin(time * obs.speed) * obs.maxAngle;
                if (obs.rotAxis === 'z') {
                    obs.group.rotation.z = angle;
                } else {
                    obs.group.rotation.x = angle;
                }
                const q = new THREE.Quaternion().setFromEuler(obs.group.rotation);
                obs.body.quaternion.set(q.x, q.y, q.z, q.w);
            }
        });

        // 4. Update Fragile Falling Platforms
        this.fragileTiles.forEach(tile => {
            if (!tile.isCollapsed) {
                if (playerPosition) {
                    const dx = Math.abs(playerPosition.x - tile.position.x);
                    const dz = Math.abs(playerPosition.z - tile.position.z);
                    const dy = Math.abs(playerPosition.y - tile.position.y);

                    if (dx < tile.width / 2 && dz < tile.length / 2 && dy < 2.5) {
                        tile.triggered = true;
                    }
                }

                if (tile.triggered) {
                    tile.collapseTimer += deltaTime;
                    // Flash red warning
                    tile.tileMesh.material.color.setHex(Math.sin(time * 25) > 0 ? 0xff0044 : 0xffaa00);
                    tile.group.position.x = tile.position.x + (Math.random() - 0.5) * 0.15;

                    if (tile.collapseTimer > 0.8) {
                        tile.isCollapsed = true;
                        this.world.removeBody(tile.body);
                    }
                }
            } else {
                // Drop away down the abyss
                tile.group.position.y -= deltaTime * 30;
                tile.group.rotation.x += deltaTime * 2;
                tile.tileMesh.material.opacity = Math.max(0, tile.tileMesh.material.opacity - deltaTime);
            }
        });

        // 5. Update Coins
        this.coins.forEach(coin => {
            if (!coin.collected) {
                coin.group.rotation.y = time * 3.0;
                coin.group.position.y = coin.baseY + Math.sin(time * 4) * 0.4;

                if (playerPosition) {
                    const dist = playerPosition.distanceTo(coin.position);
                    if (dist < 3.5) {
                        coin.collected = true;
                        this.scene.remove(coin.group);
                        if (audioRef) audioRef.playCoinSound();
                        if (vehicleRef) vehicleRef.nitro = Math.min(100, vehicleRef.nitro + 25);
                    }
                }
            }
        });
    }
}
