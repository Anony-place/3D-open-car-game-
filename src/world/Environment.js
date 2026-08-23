import * as THREE from 'three';

export class Environment {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.floatingProps = [];
        this.clouds = [];

        this.init();
    }

    init() {
        this.setupSky();
        this.setupLights();
        this.setupAbyssGrid();
        this.setupFloatingCyberDecorations();
    }

    setupSky() {
        // Deep cyber sunset / space gradient background
        this.scene.background = new THREE.Color(0x0a0518);
        this.scene.fog = new THREE.FogExp2(0x0a0518, 0.0018);
    }

    setupLights() {
        // Ambient Light
        this.ambient = new THREE.AmbientLight(0x332244, 0.7);
        this.scene.add(this.ambient);

        // Main Sun Light (Cyber Golden/Magenta)
        this.sun = new THREE.DirectionalLight(0xffeedd, 1.3);
        this.sun.position.set(120, 220, 80);
        this.sun.castShadow = true;
        this.sun.shadow.camera.left = -90;
        this.sun.shadow.camera.right = 90;
        this.sun.shadow.camera.top = 90;
        this.sun.shadow.camera.bottom = -90;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 600;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.bias = -0.0005;
        this.scene.add(this.sun);

        // Sun target
        this.sun.target = new THREE.Object3D();
        this.scene.add(this.sun.target);

        // Rim / Fill Light (Cyber Cyan)
        this.rimLight = new THREE.DirectionalLight(0x00ffff, 0.6);
        this.rimLight.position.set(-150, 100, -150);
        this.scene.add(this.rimLight);

        // Giant Distant Synthwave Sun Disc
        const sunGeo = new THREE.CircleGeometry(160, 32);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xff0066,
            side: THREE.DoubleSide
        });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(0, 140, -1200);
        this.scene.add(sunMesh);
    }

    setupAbyssGrid() {
        // Infinite Glowing Cyber Grid far below in the abyss (Y = -120)
        const gridHelper = new THREE.GridHelper(3000, 100, 0xff00ff, 0x00ffff);
        gridHelper.position.y = -120;
        this.scene.add(gridHelper);

        // Abyss Plane (Dark water/fog plane)
        const abyssGeo = new THREE.PlaneGeometry(5000, 5000);
        const abyssMat = new THREE.MeshStandardMaterial({
            color: 0x03010a,
            roughness: 0.8,
            metalness: 0.2
        });
        const abyssMesh = new THREE.Mesh(abyssGeo, abyssMat);
        abyssMesh.rotation.x = -Math.PI / 2;
        abyssMesh.position.y = -125;
        this.scene.add(abyssMesh);
    }

    setupFloatingCyberDecorations() {
        // Floating Cyber Pyramids & Rings in the background sky
        const pyramidGeo = new THREE.TetrahedronGeometry(40);
        const pyramidMat = new THREE.MeshStandardMaterial({
            color: 0x1a0f30,
            emissive: 0x5500aa,
            emissiveIntensity: 0.2,
            roughness: 0.3,
            metalness: 0.8
        });

        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 400 + Math.random() * 300;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const y = 30 + Math.random() * 120;

            const pyramid = new THREE.Mesh(pyramidGeo, pyramidMat);
            pyramid.position.set(x, y, z);
            pyramid.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            this.scene.add(pyramid);
            this.floatingProps.push({
                mesh: pyramid,
                rotSpeedX: (Math.random() - 0.5) * 0.2,
                rotSpeedY: (Math.random() - 0.5) * 0.3,
                baseY: y,
                floatSpeed: 0.5 + Math.random() * 0.5
            });
        }

        // Giant Cyber Rings
        const ringGeo = new THREE.TorusGeometry(80, 2.5, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true
        });

        for (let i = 0; i < 4; i++) {
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(
                (Math.random() - 0.5) * 800,
                100 + Math.random() * 100,
                (Math.random() - 0.5) * 800
            );
            ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            this.scene.add(ring);
            this.floatingProps.push({
                mesh: ring,
                rotSpeedX: 0.05,
                rotSpeedY: 0.08,
                baseY: ring.position.y,
                floatSpeed: 0.3
            });
        }

        // Floating Low-Poly Clouds
        const cloudGeo = new THREE.DodecahedronGeometry(18, 1);
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0x3d2066,
            roughness: 0.9,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < 25; i++) {
            const cloud = new THREE.Mesh(cloudGeo, cloudMat);
            const x = (Math.random() - 0.5) * 1200;
            const y = 10 + Math.random() * 80;
            const z = (Math.random() - 0.5) * 1200;
            cloud.position.set(x, y, z);
            cloud.scale.set(2.5 + Math.random() * 2, 0.8 + Math.random() * 0.5, 2.0 + Math.random() * 1.5);
            this.scene.add(cloud);
            this.clouds.push(cloud);
        }
    }

    update(deltaTime, playerPosition) {
        const time = performance.now() * 0.001;

        // Animate floating props
        this.floatingProps.forEach(item => {
            item.mesh.rotation.x += item.rotSpeedX * deltaTime;
            item.mesh.rotation.y += item.rotSpeedY * deltaTime;
            item.mesh.position.y = item.baseY + Math.sin(time * item.floatSpeed) * 8;
        });

        // Drift clouds slowly
        this.clouds.forEach(cloud => {
            cloud.position.x += 4.0 * deltaTime;
            if (cloud.position.x > 700) cloud.position.x = -700;
        });

        // Shadows follow player position
        if (playerPosition) {
            this.sun.position.x = playerPosition.x + 120;
            this.sun.position.z = playerPosition.z + 80;
            this.sun.target.position.copy(playerPosition);
            this.sun.target.updateMatrixWorld();
        }
    }
}
