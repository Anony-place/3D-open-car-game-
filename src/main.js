import * as THREE from 'three';
import { CONFIG } from './config.js';

// --- STATE ---
let scene, camera, renderer, clock;
let car, carBody, wheels = [];
let cores = [], obstacles = [], speedLines = [], trails = [], destructibles = [];
let npcCars = [], policeCars = [];
let checkpoints = [], currentCheckpoint = 0;
let wantedLevel = 0;
let gameState = 'MENU';
let gameMode = 'FREE_ROAM'; // 'FREE_ROAM' or 'RACING'
let score = 0;
let startTime = 0;

const physics = { ...CONFIG.physics };
const keys = { w: false, s: false, a: false, d: false, shift: false, space: false };

// --- INIT ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.0005);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 2000);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    setupLights();
    setupWorld();
    setupCar();
    setupLevel();
    setupControls();

    window.addEventListener('resize', onResize);
    document.getElementById('start-btn').addEventListener('click', () => { gameMode = 'FREE_ROAM'; startGame(); });
    document.getElementById('race-btn').addEventListener('click', () => { gameMode = 'RACING'; startGame(); });

    animate();
}

function setupLights() {
    scene.add(new THREE.AmbientLight(0x444466, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(100, 200, 100);
    sun.castShadow = true;
    sun.shadow.camera.left = -200;
    sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200;
    sun.shadow.camera.bottom = -200;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function setupWorld() {
    // World Constants
    const worldSize = 3000;

    // 1. SEA (Base Floor)
    const seaGeo = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const seaMat = new THREE.MeshStandardMaterial({
        color: 0x0044ff,
        roughness: 0.1,
        metalness: 0.5,
        transparent: true,
        opacity: 0.8
    });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -2; // Slightly below ground
    scene.add(sea);

    // 2. MAIN ISLAND
    const islandGeo = new THREE.PlaneGeometry(worldSize, worldSize);
    const islandMat = new THREE.MeshStandardMaterial({ color: 0x1a472a, roughness: 0.9 }); // Dark Green
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.rotation.x = -Math.PI / 2;
    island.receiveShadow = true;
    scene.add(island);

    // 3. ROADS (Grid-like for city, winding for village/forest)
    createRoads();

    // 4. RIVER
    createRiver();

    // 5. BIOMES
    createForest(-500, -500, 800);
    createVillage(500, 500, 400);
    createCity(0, 800, 600);

    // 5. SKYBOX / ENVIRONMENT
    // Removed explicit sky mesh as scene background and fog handle it better for now

    // Add some clouds
    for(let i=0; i<50; i++) {
        const cloud = new THREE.Mesh(
            new THREE.BoxGeometry(20 + Math.random()*50, 10, 20 + Math.random()*30),
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
        );
        cloud.position.set((Math.random()-0.5)*2000, 200 + Math.random()*100, (Math.random()-0.5)*2000);
        scene.add(cloud);
    }
}

function createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });

    // Add some random crates (destructibles)
    for(let i=0; i<50; i++) {
        const crate = new THREE.Mesh(
            new THREE.BoxGeometry(3, 3, 3),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        crate.position.set((Math.random()-0.5)*1000, 1.5, (Math.random()-0.5)*1000);
        if (Math.abs(crate.position.x) < 25 || Math.abs(crate.position.z) < 25) {
            scene.add(crate);
            destructibles.push({ mesh: crate, type: 'crate' });
        }
    }

    // Main Highway (North-South)
    const mainRoad = new THREE.Mesh(new THREE.PlaneGeometry(40, 3000), roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.y = 0.05;
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    // Cross Road (East-West)
    const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(3000, 40), roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.y = 0.05;
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // Road markings
    const markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for(let i= -1500; i< 1500; i+= 50) {
        const marker = new THREE.Mesh(new THREE.PlaneGeometry(2, 15), markerMat);
        marker.rotation.x = -Math.PI/2;
        marker.position.set(0, 0.06, i);
        scene.add(marker);

        const markerH = new THREE.Mesh(new THREE.PlaneGeometry(15, 2), markerMat);
        markerH.rotation.x = -Math.PI/2;
        markerH.position.set(i, 0.06, 0);
        scene.add(markerH);
    }
}

function createForest(x, z, size) {
    const treeCount = 200;
    for(let i=0; i<treeCount; i++) {
        const tx = x + (Math.random()-0.5) * size;
        const tz = z + (Math.random()-0.5) * size;

        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.7, 5),
            new THREE.MeshStandardMaterial({ color: 0x4d2926 })
        );
        trunk.position.y = 2.5;
        trunk.castShadow = true;
        tree.add(trunk);

        const leaves = new THREE.Mesh(
            new THREE.ConeGeometry(3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x134015 })
        );
        leaves.position.y = 7;
        leaves.castShadow = true;
        tree.add(leaves);

        tree.position.set(tx, 0, tz);
        scene.add(tree);

        // Smaller trees are destructible, big ones are obstacles
        if (Math.random() > 0.7) {
            destructibles.push({ mesh: tree, type: 'tree' });
        } else {
            obstacles.push(trunk);
        }
    }
}

function createVillage(x, z, size) {
    const houseCount = 15;
    for(let i=0; i<houseCount; i++) {
        const hx = x + (Math.random()-0.5) * size;
        const hz = z + (Math.random()-0.5) * size;
        if(Math.abs(hx) < 30 || Math.abs(hz) < 30) continue; // Keep roads clear

        const house = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.BoxGeometry(10, 8, 10),
            new THREE.MeshStandardMaterial({ color: 0xddc9a3 })
        );
        base.position.y = 4;
        base.castShadow = true;
        house.add(base);

        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(8, 6, 4),
            new THREE.MeshStandardMaterial({ color: 0x8b4513 })
        );
        roof.position.y = 11;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        house.add(roof);

        house.position.set(hx, 0, hz);
        scene.add(house);
        obstacles.push(base);
    }
}

function createCity(x, z, size) {
    const buildingCount = 30;
    for(let i=0; i<buildingCount; i++) {
        const bx = x + (Math.random()-0.5) * size;
        const bz = z + (Math.random()-0.5) * size;
        if(Math.abs(bx) < 30 || Math.abs(bz) < 30) continue;

        const h = 20 + Math.random() * 60;
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(15, h, 15),
            new THREE.MeshStandardMaterial({ color: 0x334455, metalness: 0.5, roughness: 0.2 })
        );
        building.position.set(bx, h/2, bz);
        building.castShadow = true;
        scene.add(building);
        obstacles.push(building);

        // Add some street lights near buildings if close to road
        if(Math.abs(bx) < 60) {
            const lamp = new THREE.Group();
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 10), new THREE.MeshStandardMaterial({color: 0x333333}));
            pole.position.y = 5;
            lamp.add(pole);
            const lightBox = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 1), new THREE.MeshStandardMaterial({color: 0x333333}));
            lightBox.position.set(0, 10, 1);
            lamp.add(lightBox);

            const pLight = new THREE.PointLight(0xffffaa, 1, 30);
            pLight.position.set(bx, 10, bz + (bx > 0 ? 1 : -1));
            scene.add(pLight);

            lamp.position.set(bx > 0 ? 25 : -25, 0, bz);
            scene.add(lamp);
            destructibles.push({ mesh: lamp, type: 'lamp' });
        }
    }
}

function setupTraffic() {
    const trafficCount = 20;
    for(let i=0; i<trafficCount; i++) {
        const npc = createNPCCar(0x555555 + Math.random() * 0xaaaaaa);
        // Randomly place on roads
        const onMainRoad = Math.random() > 0.5;
        if(onMainRoad) {
            npc.position.set(Math.random() > 0.5 ? 10 : -10, 0, (Math.random()-0.5)*2000);
            npc.axis = 'z';
        } else {
            npc.position.set((Math.random()-0.5)*2000, 0, Math.random() > 0.5 ? 10 : -10);
            npc.axis = 'x';
        }
        npc.speed = 0.3 + Math.random() * 0.4;
        npc.dir = Math.random() > 0.5 ? 1 : -1;
        npcCars.push(npc);
        scene.add(npc);
    }
}

function createNPCCar(color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1.2, 4.5),
        new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 0.6;
    group.add(body);
    return group;
}

function setupPolice() {
    // Police will be spawned when wanted level > 0
}

function spawnPolice() {
    const p = createNPCCar(0x111111);
    // Add siren
    const siren = new THREE.Mesh(
        new THREE.BoxGeometry(1, 0.3, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    siren.position.y = 1.3;
    p.add(siren);

    const sirenLight = new THREE.PointLight(0xff0000, 2, 20);
    sirenLight.position.y = 2;
    p.add(sirenLight);
    p.light = sirenLight;

    p.position.set(car.position.x + 100, 0, car.position.z + 100);
    policeCars.push(p);
    scene.add(p);
}

function setupRace() {
    const points = [
        [0, 0, 100], [0, 0, 500], [400, 0, 500], [400, 0, -400], [-400, 0, -400], [0, 0, 0]
    ];
    const geo = new THREE.TorusGeometry(8, 0.5, 16, 100);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    points.forEach((p, i) => {
        const cp = new THREE.Mesh(geo, mat);
        cp.position.set(p[0], 8, p[2]);
        cp.rotation.y = Math.PI / 2;
        cp.visible = false;
        scene.add(cp);
        checkpoints.push(cp);
    });
}

function updateRace() {
    if(gameMode !== 'RACING') return;

    const cp = checkpoints[currentCheckpoint];
    if(cp) {
        cp.visible = true;
        cp.rotation.z += 0.05;
        if(car.position.distanceTo(cp.position) < 15) {
            cp.visible = false;
            currentCheckpoint++;
            score += 100;
            document.getElementById('hud-score').innerText = `SCORE: ${score}`;
            if(currentCheckpoint >= checkpoints.length) finishGame();
        }
    }
}

function createRiver() {
    const riverGeo = new THREE.PlaneGeometry(3000, 60);
    const riverMat = new THREE.MeshStandardMaterial({
        color: 0x0044ff,
        transparent: true,
        opacity: 0.7
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -0.1, -400); // Crosses the map
    scene.add(river);

    // Bridges
    const bridgeGeo = new THREE.BoxGeometry(45, 2, 70);
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(0, 1, -400);
    scene.add(bridge);
}

function setupCar() {
    car = new THREE.Group();
    carBody = new THREE.Group();

    // Main Chassis
    const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.5, 4.8),
        new THREE.MeshStandardMaterial({ color: 0xcc0000, metalness: 0.8, roughness: 0.2 })
    );
    chassis.position.y = 0.6;
    chassis.castShadow = true;
    carBody.add(chassis);

    // Upper body / Cabin
    const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0.1 })
    );
    cabin.position.set(0, 1.1, -0.2);
    cabin.castShadow = true;
    carBody.add(cabin);

    // Windows (simple overlay meshes)
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
    const frontWindshield = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), windowMat);
    frontWindshield.position.set(0, 1.2, 1.06);
    frontWindshield.rotation.x = -0.3;
    carBody.add(frontWindshield);

    // Spoiler
    const spoilerPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.MeshStandardMaterial({color: 0x111111}));
    spoilerPost1.position.set(0.8, 1.0, -2.0);
    carBody.add(spoilerPost1);
    const spoilerPost2 = spoilerPost1.clone();
    spoilerPost2.position.x = -0.8;
    carBody.add(spoilerPost2);
    const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.8), new THREE.MeshStandardMaterial({color: 0xcc0000}));
    spoilerWing.position.set(0, 1.3, -2.0);
    carBody.add(spoilerWing);

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.6, 0.2, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const hl1 = new THREE.Mesh(lightGeo, lightMat);
    hl1.position.set(0.8, 0.6, 2.41);
    carBody.add(hl1);
    const hl2 = hl1.clone();
    hl2.position.x = -0.8;
    carBody.add(hl2);

    // Add point lights for headlights
    const hLight1 = new THREE.SpotLight(0xffffff, 2, 50, Math.PI/6);
    hLight1.position.set(0.8, 0.6, 2.41);
    hLight1.target.position.set(0.8, 0.6, 10);
    car.add(hLight1);
    car.add(hLight1.target);

    car.add(carBody);

    const wGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.7, 24);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });

    [[-1.2, 1.5], [1.2, 1.5], [-1.2, -1.5], [1.2, -1.5]].forEach(p => {
        const w = new THREE.Group();
        const tire = new THREE.Mesh(wGeo, wMat);
        tire.rotation.z = Math.PI / 2;
        w.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.72, 12), rimMat);
        rim.rotation.z = Math.PI / 2;
        w.add(rim);

        w.position.set(p[0], 0.48, p[1]);
        w.castShadow = true;
        car.add(w);
        wheels.push(w);
    });

    scene.add(car);
}

function setupLevel() {
    setupTraffic();
    setupPolice();
    setupRace();

    const coreGeo = new THREE.OctahedronGeometry(0.8, 0);
    const coreMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.core, emissive: CONFIG.colors.core, emissiveIntensity: 2 });

    for (let i = 0; i < CONFIG.totalCores; i++) {
        const c = new THREE.Mesh(coreGeo, coreMat);
        c.position.set((Math.random() - 0.5) * 500, 1.2, (Math.random() - 0.5) * 500);
        scene.add(c);
        cores.push(c);
    }
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameState = 'COUNTDOWN';
    let c = 3;
    const el = document.getElementById('countdown');
    el.style.display = 'block';
    const interval = setInterval(() => {
        c--;
        el.innerText = c > 0 ? c : 'IGNITE';
        if (c < 0) {
            clearInterval(interval);
            el.style.display = 'none';
            gameState = 'PLAYING';
            startTime = Date.now();
            document.getElementById('hud').style.display = 'block';
            if ('ontouchstart' in window) document.getElementById('mobile-controls').style.display = 'flex';
        }
    }, 1000);
}

function update() {
    if (gameState !== 'PLAYING') return;

    updateRace();

    // Nitro & Speed Lines
    let targetMax = physics.maxSpeed;
    const linesEl = document.getElementById('speed-lines');
    if (keys.shift && physics.nitro > 0 && physics.speed > 0.5) {
        targetMax = physics.nitroMax;
        physics.nitro -= 0.6;
        linesEl.style.opacity = '1';
        camera.fov = THREE.MathUtils.lerp(camera.fov, 90, 0.1);
        spawnTrail();
    } else {
        physics.nitro = Math.min(100, physics.nitro + 0.15);
        linesEl.style.opacity = '0';
        camera.fov = THREE.MathUtils.lerp(camera.fov, 70, 0.1);
    }
    camera.updateProjectionMatrix();
    document.getElementById('nitro-bar').style.width = physics.nitro + '%';

    // Movement Physics
    if (keys.w) physics.speed += physics.accel;
    else if (keys.s) physics.speed -= physics.accel * 2;
    else physics.speed *= physics.friction;

    physics.speed = THREE.MathUtils.clamp(physics.speed, -0.5, targetMax);

    // Drifting & Turning
    if (Math.abs(physics.speed) > 0.1) {
        const dir = physics.speed > 0 ? 1 : -1;
        let turnSpeed = physics.turn;

        // Sharper turns when drifting (Handbrake feel with S while moving fast)
        if (keys.s && physics.speed > 0.8) {
            turnSpeed *= 2.0;
            physics.driftFactor = THREE.MathUtils.lerp(physics.driftFactor, 0.5, 0.1);
        } else {
            physics.driftFactor = THREE.MathUtils.lerp(physics.driftFactor, 0, 0.1);
        }

        if (keys.a) physics.angle += turnSpeed * dir;
        if (keys.d) physics.angle -= turnSpeed * dir;
    }

    // Body Tilt
    let tiltTarget = 0;
    if (keys.a) tiltTarget = 0.15;
    if (keys.d) tiltTarget = -0.15;
    carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, tiltTarget, 0.1);
    carBody.rotation.y = THREE.MathUtils.lerp(carBody.rotation.y, (keys.a ? 0.1 : keys.d ? -0.1 : 0), 0.1);

    car.position.x += Math.sin(physics.angle) * physics.speed;
    car.position.z += Math.cos(physics.angle) * physics.speed;
    car.rotation.y = physics.angle;

    wheels.forEach(w => w.rotation.x += physics.speed * 0.8);

    // Camera Follow
    const camOffset = new THREE.Vector3(0, 6, -14).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.15);
    camera.lookAt(car.position.clone().add(new THREE.Vector3(0, 1, 0)));

    // HUD
    document.getElementById('hud-score').innerText = `SCORE: ${score}`;
    document.getElementById('hud-speed').innerHTML = `${Math.floor(Math.abs(physics.speed * 140))} <span id="speed-unit">KM/H</span>`;

    checkCollisions();
}

function checkCollisions() {
    // Obstacle Collision (Solid)
    obstacles.forEach(o => {
        const dist = car.position.distanceTo(o.getWorldPosition(new THREE.Vector3()));
        if(dist < 5) {
            physics.speed *= -0.5;
            // Push car back slightly
            const bounceDir = car.position.clone().sub(o.getWorldPosition(new THREE.Vector3())).normalize();
            car.position.add(bounceDir.multiplyScalar(0.5));
        }
    });

    // Destructible Collision (Tod Phod) - Iterate backwards for safe removal
    for (let i = destructibles.length - 1; i >= 0; i--) {
        const d = destructibles[i];
        const dist = car.position.distanceTo(d.mesh.position);
        if(dist < 5 && Math.abs(physics.speed) > 0.5) {
            // "Break" the object
            d.mesh.rotation.x += (Math.random() + 0.5) * 1.5;
            d.mesh.rotation.z += (Math.random() - 0.5) * 1.5;
            d.mesh.position.y += 0.5;

            // Apply some "explosion" force
            const force = car.position.clone().sub(d.mesh.position).normalize().negate();
            d.mesh.position.add(force.multiplyScalar(2));

            // Remove after some time
            if (!d.broken) {
                d.broken = true;
                score += 10; // Bonus for destruction
                document.getElementById('hud-score').innerText = `SCORE: ${score}`;
                setTimeout(() => {
                    scene.remove(d.mesh);
                    const idx = destructibles.indexOf(d);
                    if (idx > -1) destructibles.splice(idx, 1);
                }, 2000);
            }
        }
    }
}

function spawnTrail() {
    const p = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.05, 0.8),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 })
    );
    p.position.copy(car.position);
    p.position.y = 0.05;
    p.rotation.y = car.rotation.y;
    scene.add(p);
    trails.push(p);
    setTimeout(() => {
        scene.remove(p);
        trails.splice(trails.indexOf(p), 1);
    }, 1000);
}

function finishGame() {
    gameState = 'FINISHED';
    const time = ((Date.now() - startTime) / 1000).toFixed(2);
    document.getElementById('final-stats').innerText = `SCORE: ${score} | TIME: ${time}s`;
    document.getElementById('win-screen').style.display = 'flex';
    document.getElementById('hud').style.display = 'none';
}

function animate() {
    requestAnimationFrame(animate);
    update();
    updateNPCs();
    renderer.render(scene, camera);
}

function updateNPCs() {
    if (gameState !== 'PLAYING') return;

    // Update Traffic
    npcCars.forEach(npc => {
        if(npc.axis === 'z') {
            npc.position.z += npc.speed * npc.dir;
            if(Math.abs(npc.position.z) > 1500) npc.position.z *= -1;
            npc.rotation.y = npc.dir > 0 ? 0 : Math.PI;
        } else {
            npc.position.x += npc.speed * npc.dir;
            if(Math.abs(npc.position.x) > 1500) npc.position.x *= -1;
            npc.rotation.y = npc.dir > 0 ? Math.PI/2 : -Math.PI/2;
        }

        // Collision with player
        if(car.position.distanceTo(npc.position) < 5) {
            physics.speed *= 0.5;
            wantedLevel = Math.min(5, wantedLevel + 0.5);
            updateWantedUI();
            if(policeCars.length < wantedLevel) spawnPolice();
        }
    });

    // Update Police - Iterate backwards for safe removal
    for (let i = policeCars.length - 1; i >= 0; i--) {
        const p = policeCars[i];
        // Simple chase logic
        const dir = car.position.clone().sub(p.position).normalize();
        p.position.add(dir.multiplyScalar(0.7));
        p.lookAt(car.position.x, 0, car.position.z);

        // Siren flash
        if(p.light) p.light.color.setHex(Date.now() % 400 < 200 ? 0xff0000 : 0x0000ff);

        if(car.position.distanceTo(p.position) < 5) {
            physics.speed *= 0.8;
            score = Math.max(0, score - 5); // Losing points when caught
            document.getElementById('hud-score').innerText = `SCORE: ${score}`;
        }

        // Despawn if too far
        if(car.position.distanceTo(p.position) > 400 && wantedLevel < 1) {
            scene.remove(p);
            policeCars.splice(i, 1);
        }
    }
}

function updateWantedUI() {
    let stars = '';
    for(let i=0; i<5; i++) stars += i < Math.floor(wantedLevel) ? '★' : '☆';
    const wantedEl = document.getElementById('hud-wanted') || createWantedUI();
    wantedEl.innerText = `WANTED: ${stars}`;
    wantedEl.style.color = wantedLevel > 0 ? '#ff0000' : '#ffffff';
}

function createWantedUI() {
    const el = document.createElement('div');
    el.id = 'hud-wanted';
    el.className = 'hud-item';
    document.getElementById('hud').appendChild(el);
    return el;
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupControls() {
    const map = { w: 'w', s: 's', a: 'a', d: 'd', arrowup: 'w', arrowdown: 's', arrowleft: 'a', arrowright: 'd', shift: 'shift', ' ': 'space' };
    window.onkeydown = (e) => { const k = map[e.key.toLowerCase()]; if (k) keys[k] = true; };
    window.onkeyup = (e) => { const k = map[e.key.toLowerCase()]; if (k) keys[k] = false; };

    const bind = (id, k) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.onpointerdown = (e) => { e.preventDefault(); keys[k] = true; };
        el.onpointerup = () => keys[k] = false;
    };
    bind('btn-w', 'w'); bind('btn-l', 'a'); bind('btn-r', 'd'); bind('btn-n', 'shift');
}

init();
