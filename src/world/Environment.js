import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Environment {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.init();
    }

    init() {
        this.dayTime = 0.2; // Start in morning
        this.dayDuration = 300; // 5 minutes for a full cycle

        this.setupLights();
        this.setupSky();
        this.setupBaseTerrain();
        this.setupRoads();
        this.setupProps();
    }

    setupLights() {
        this.ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(this.ambient);

        this.sun = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sun.position.set(100, 200, 100);
        this.sun.castShadow = true;
        this.sun.shadow.camera.left = -75;
        this.sun.shadow.camera.right = 75;
        this.sun.shadow.camera.top = 75;
        this.sun.shadow.camera.bottom = -75;
        this.sun.shadow.mapSize.width = 1024;
        this.sun.shadow.mapSize.height = 1024;
        this.sun.shadow.bias = -0.0005;
        this.scene.add(this.sun);

        // Target for shadows to follow player
        this.sun.target = new THREE.Object3D();
        this.scene.add(this.sun.target);
    }

    setupSky() {
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.001);
    }

    setupBaseTerrain() {
        const size = 10000;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.9 });
        const terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        terrain.receiveShadow = true;
        this.scene.add(terrain);
    }

    setupRoads() {
        // Create a simple cross road
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });

        const road1 = new THREE.Mesh(new THREE.PlaneGeometry(20, 2000), roadMat);
        road1.rotation.x = -Math.PI / 2;
        road1.position.y = 0.05;
        road1.receiveShadow = true;
        this.scene.add(road1);

        const road2 = new THREE.Mesh(new THREE.PlaneGeometry(2000, 20), roadMat);
        road2.rotation.x = -Math.PI / 2;
        road2.position.y = 0.05;
        road2.receiveShadow = true;
        this.scene.add(road2);
    }

    setupProps() {
        // We will implement instanced buildings and trees here
        this.createCityArea(new THREE.Vector3(0, 0, -200));
        this.createForestArea(new THREE.Vector3(200, 0, 200));
    }

    createCityArea(center) {
        const buildingGeo = new THREE.BoxGeometry(10, 1, 10); // Base height 1, scale height later
        const buildingMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const count = 60;

        const instancedBuildings = new THREE.InstancedMesh(buildingGeo, buildingMat, count);
        instancedBuildings.castShadow = true;
        instancedBuildings.receiveShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const x = center.x + (Math.random() - 0.5) * 400;
            const z = center.z + (Math.random() - 0.5) * 400;

            // Avoid spawning on roads (very simple check)
            if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;

            const h = 20 + Math.random() * 60;

            dummy.position.set(x, h/2, z);
            dummy.scale.set(1, h, 1);
            dummy.updateMatrix();
            instancedBuildings.setMatrixAt(i, dummy.matrix);

            // Physics body
            const body = new CANNON.Body({ mass: 0 }); // Static
            body.addShape(new CANNON.Box(new CANNON.Vec3(5, h/2, 5)));
            body.position.set(x, h/2, z);
            this.world.addBody(body);
        }

        this.scene.add(instancedBuildings);
    }

    createForestArea(center) {
        const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d2926 });
        const count = 300;

        const instancedTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
        instancedTrunks.castShadow = true;
        instancedTrunks.receiveShadow = true;

        const leavesGeo = new THREE.ConeGeometry(3, 8, 8);
        const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
        const instancedLeaves = new THREE.InstancedMesh(leavesGeo, leavesMat, count);
        instancedLeaves.castShadow = true;

        const dummy = new THREE.Object3D();
        for (let i = 0; i < count; i++) {
            const x = center.x + (Math.random() - 0.5) * 600;
            const z = center.z + (Math.random() - 0.5) * 600;

            if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;

            dummy.position.set(x, 2.5, z);
            dummy.updateMatrix();
            instancedTrunks.setMatrixAt(i, dummy.matrix);

            dummy.position.set(x, 7, z);
            dummy.updateMatrix();
            instancedLeaves.setMatrixAt(i, dummy.matrix);

            // Physics body for trunk
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(new CANNON.Cylinder(0.5, 0.7, 5, 8));
            body.position.set(x, 2.5, z);
            this.world.addBody(body);
        }

        this.scene.add(instancedTrunks);
        this.scene.add(instancedLeaves);
    }

    update(deltaTime, playerPosition) {
        // 1. Day/Night Cycle
        this.dayTime += deltaTime / this.dayDuration;
        if (this.dayTime > 1) this.dayTime = 0;

        const angle = this.dayTime * Math.PI * 2;
        this.sun.position.set(
            Math.cos(angle) * 200,
            Math.sin(angle) * 200,
            100
        );

        const isNight = this.sun.position.y < 0;
        this.sun.intensity = isNight ? 0 : 1.2;
        this.ambient.intensity = isNight ? 0.1 : 0.5;

        const skyColor = new THREE.Color().setHSL(0.6, 0.5, isNight ? 0.05 : 0.6);
        this.scene.background.lerp(skyColor, 0.05);
        this.scene.fog.color.lerp(skyColor, 0.05);

        // 2. Shadows follow player
        if (playerPosition) {
            this.sun.position.x += playerPosition.x;
            this.sun.position.z += playerPosition.z;
            this.sun.target.position.copy(playerPosition);
            this.sun.target.updateMatrixWorld();
        }
    }
}
