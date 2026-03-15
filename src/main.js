import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { CONFIG } from './config.js';

// --- STATE ---
let scene, camera, renderer, clock;
let car, carBody, wheels = [];
let cores = [], obstacles = [], speedLines = [], trails = [], destructibles = [], particles = [];
let npcCars = [], policeCars = [];
let checkpoints = [], currentCheckpoint = 0;
let wantedLevel = 0;
let gameState = 'MENU';
let gameMode = 'FREE_ROAM';
let score = 0;
let startTime = 0;

const physics = { ...CONFIG.physics };
const keys = { w: false, s: false, a: false, d: false, shift: false, space: false };

// --- INIT ---
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.sky);
    scene.fog = new THREE.FogExp2(CONFIG.colors.sky, 0.0008);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 3000);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(150, 200, 100);
    sun.castShadow = true;
    sun.shadow.camera.left = -500;
    sun.shadow.camera.right = 500;
    sun.shadow.camera.top = 500;
    sun.shadow.camera.bottom = -500;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);
}

function setupWorld() {
    const worldSize = 4000;

    // 1. SEA (Vibrant Blue)
    const seaGeo = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const seaMat = new THREE.MeshStandardMaterial({
        color: CONFIG.colors.river,
        roughness: 0.2,
        metalness: 0.1
    });
    const sea = new THREE.Mesh(seaGeo, seaMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -5;
    scene.add(sea);

    // 2. MAIN ISLAND (Stylized Grass)
    const islandGeo = new THREE.CircleGeometry(worldSize/2, 64);
    const islandMat = new THREE.MeshStandardMaterial({
        color: CONFIG.colors.grass,
        roughness: 0.8
    });
    const island = new THREE.Mesh(islandGeo, islandMat);
    island.rotation.x = -Math.PI / 2;
    island.receiveShadow = true;
    scene.add(island);

    // 3. CARTOON ROADS (Dirt Paths)
    createStylizedRoads();

    // 4. RIVER & WATERFALL
    createCartoonRiver();

    // 5. BIOMES (Only Forest and Jungle Village)
    createCartoonForest(0, 0, 1800);
    createJungleVillage(500, 500);
    createJungleVillage(-500, -800);

    // 6. CLOUDS (Big Fluffy White)
    for(let i=0; i<60; i++) {
        const cloud = new THREE.Group();
        const count = 3 + Math.floor(Math.random() * 4);
        for(let j=0; j<count; j++) {
            const p = new THREE.Mesh(
                new THREE.SphereGeometry(15 + Math.random()*15, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 })
            );
            p.position.set(j*15, Math.random()*10, Math.random()*10);
            cloud.add(p);
        }
        cloud.position.set((Math.random()-0.5)*2500, 250 + Math.random()*150, (Math.random()-0.5)*2500);
        scene.add(cloud);
    }
}

function createStylizedRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.dirt, roughness: 1 });

    // "Kaccha Road" - Winding path using a CatmullRomCurve
    const points = [];
    for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const radius = 800 + Math.sin(i * 0.8) * 150;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius));
    }
    points.push(points[0].clone());

    const curve = new THREE.CatmullRomCurve3(points);
    const roadGeo = new THREE.TubeGeometry(curve, 100, 45, 8, true);
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.receiveShadow = true;
    scene.add(road);

    // Add extra "Kaccha" paths to villages
    const villagePaths = [
        new THREE.Vector3(500, 0.12, 500),
        new THREE.Vector3(0, 0.12, 0),
        new THREE.Vector3(-500, 0.12, -800)
    ];
    const pathCurve = new THREE.CatmullRomCurve3(villagePaths);
    const vRoadGeo = new THREE.TubeGeometry(pathCurve, 20, 30, 8, false);
    const vRoad = new THREE.Mesh(vRoadGeo, roadMat);
    scene.add(vRoad);
}

function createCartoonForest(centerX, centerZ, areaSize) {
    const treeCount = 800; // Increased density
    const colors = [0x2d6a4f, 0x40916c, 0x52b788, 0x74c69d, 0x95d5b2];

    for(let i=0; i<treeCount; i++) {
        const x = centerX + (Math.random()-0.5) * areaSize;
        const z = centerZ + (Math.random()-0.5) * areaSize;

        // Don't spawn on roads
        const distToCenter = Math.sqrt(x*x + z*z);
        if (Math.abs(distToCenter - 800) < 60 || Math.abs(x) < 25 || Math.abs(z) < 25) continue;

        const tree = createStylizedTree(colors[Math.floor(Math.random()*colors.length)]);
        tree.position.set(x, 0, z);
        scene.add(tree);

        if (Math.random() > 0.8) {
            destructibles.push({ mesh: tree, type: 'tree' });
        } else {
            const hitBox = new THREE.Mesh(new THREE.BoxGeometry(2, 10, 2), new THREE.MeshBasicMaterial({visible: false}));
            hitBox.position.copy(tree.position);
            scene.add(hitBox);
            obstacles.push(hitBox);
        }

        // Add Mushrooms
        if (Math.random() > 0.92) {
            const mush = createMushroom();
            mush.position.set(x + (Math.random()-0.5)*15, 0, z + (Math.random()-0.5)*15);
            scene.add(mush);
            destructibles.push({ mesh: mush, type: 'mushroom' });
        }

        // Add Grass Tufts
        if (Math.random() > 0.7) {
            const tuft = createGrassTuft();
            tuft.position.set(x + (Math.random()-0.5)*20, 0, z + (Math.random()-0.5)*20);
            scene.add(tuft);
        }

        // Add massive rocks
        if (Math.random() > 0.98) {
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(10 + Math.random()*20),
                new THREE.MeshStandardMaterial({color: 0x777777})
            );
            rock.position.set(x, 2, z);
            scene.add(rock);
            obstacles.push(rock);
        }
    }
}

function createGrassTuft() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 1 });
    const count = 3 + Math.floor(Math.random()*3);
    for(let i=0; i<count; i++) {
        const blade = new THREE.Mesh(
            new THREE.ConeGeometry(0.2 + Math.random()*0.3, 1 + Math.random()*2, 4),
            mat
        );
        blade.position.set((Math.random()-0.5)*2, 0.5, (Math.random()-0.5)*2);
        blade.rotation.x = (Math.random()-0.5)*0.5;
        blade.rotation.z = (Math.random()-0.5)*0.5;
        group.add(blade);
    }
    return group;
}

function createStylizedTree(leafColor) {
    const group = new THREE.Group();
    // GIANT TREES: Increased height and scale
    const scale = 1.0 + Math.random() * 2.5;
    const trunkH = (8 + Math.random() * 12) * scale;
    const trunkW = (1.2 + Math.random() * 1) * scale;

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkW * 0.7, trunkW, trunkH, 6),
        new THREE.MeshStandardMaterial({ color: CONFIG.colors.wood, roughness: 1 })
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Multi-layered leaves for "Bade Bade" trees
    const layerCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < layerCount; i++) {
        const lSize = (trunkH * 0.45) * (1 - i * 0.2);
        const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(lSize, 6, 6),
            new THREE.MeshStandardMaterial({ color: leafColor, roughness: 1 })
        );
        leaves.position.y = trunkH + (i * lSize * 0.8);
        leaves.scale.y = 0.8;
        leaves.castShadow = true;
        group.add(leaves);
    }

    return group;
}

function createMushroom() {
    const group = new THREE.Group();
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 1, 6),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    stem.position.y = 0.5;
    group.add(stem);

    const capColor = Math.random() > 0.5 ? CONFIG.colors.mushroom : 0x00f5d4;
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: capColor })
    );
    cap.position.y = 1;
    group.add(cap);

    // White dots
    for(let i=0; i<5; i++) {
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 4, 4), new THREE.MeshBasicMaterial({color: 0xffffff}));
        const angle = (i/5) * Math.PI * 2;
        dot.position.set(Math.cos(angle)*0.6, 1.6, Math.sin(angle)*0.6);
        group.add(dot);
    }

    // Glow
    const light = new THREE.PointLight(capColor, 1, 10);
    light.position.y = 2;
    group.add(light);

    return group;
}

function createJungleVillage(x, z) {
    const count = 5 + Math.floor(Math.random()*5);
    for(let i=0; i<count; i++) {
        const hx = x + (Math.random()-0.5)*150;
        const hz = z + (Math.random()-0.5)*150;

        const hut = new THREE.Group();
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(6, 6, 8, 8),
            new THREE.MeshStandardMaterial({ color: CONFIG.colors.wood, roughness: 1 })
        );
        base.position.y = 4;
        base.castShadow = true;
        hut.add(base);

        const roof = new THREE.Mesh(
            new THREE.ConeGeometry(8, 10, 8),
            new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 1 })
        );
        roof.position.y = 13;
        roof.castShadow = true;
        hut.add(roof);

        hut.position.set(hx, 0, hz);
        scene.add(hut);
        obstacles.push(base);

        // Campfire
        const fire = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), new THREE.MeshStandardMaterial({color: 0xff4d00, emissive: 0xff4d00}));
        fire.position.set(hx + 15, 0.5, hz + 15);
        scene.add(fire);
        const pLight = new THREE.PointLight(0xff4d00, 2, 20);
        pLight.position.set(hx+15, 5, hz+15);
        scene.add(pLight);

        // Rural Elements: Fences
        for(let j=0; j<4; j++) {
            const fence = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 0.5), new THREE.MeshStandardMaterial({color: CONFIG.colors.wood}));
            fence.position.set(hx + (j==0?8:j==1?-8:0), 1, hz + (j==2?8:j==3?-8:0));
            if(j>1) fence.rotation.y = Math.PI/2;
            scene.add(fence);
        }

        // Rural Elements: Haystacks
        const hay = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshStandardMaterial({color: 0xe9c46a}));
        hay.position.set(hx - 12, 0, hz + 12);
        hay.scale.y = 1.2;
        scene.add(hay);
        destructibles.push({mesh: hay, type: 'hay'});
    }
}

function createCartoonRiver() {
    const riverGeo = new THREE.PlaneGeometry(2000, 80);
    const riverMat = new THREE.MeshStandardMaterial({
        color: CONFIG.colors.river,
        transparent: true,
        opacity: 0.9
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -0.2, -600);
    scene.add(river);

    // Cartoon Bridge
    const bridge = new THREE.Group();
    const plankGeo = new THREE.BoxGeometry(100, 2, 10);
    const plankMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.wood });
    for(let i=0; i<6; i++) {
        const plank = new THREE.Mesh(plankGeo, plankMat);
        plank.position.z = i * 12 - 30;
        bridge.add(plank);
    }
    bridge.position.set(0, 1, -600);
    scene.add(bridge);
}

function setupCar() {
    car = new THREE.Group();
    carBody = new THREE.Group();

    // Cartoon Toy Car Body
    const bodyGeo = new THREE.BoxGeometry(3, 1.5, 5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff0055, roughness: 0.2, metalness: 0.8 });
    const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
    mainBody.position.y = 1.25;
    mainBody.castShadow = true;
    carBody.add(mainBody);

    const cabinGeo = new THREE.SphereGeometry(1.5, 8, 8, 0, Math.PI*2, 0, Math.PI/2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.7 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 2;
    cabin.scale.z = 1.5;
    carBody.add(cabin);

    // Eyes/Headlights
    const eyeGeo = new THREE.SphereGeometry(0.4, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
    eye1.position.set(0.8, 1.5, 2.4);
    carBody.add(eye1);
    const eye2 = eye1.clone();
    eye2.position.x = -0.8;
    carBody.add(eye2);

    const pupilGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const pupil1 = new THREE.Mesh(pupilGeo, pupilMat);
    pupil1.position.set(0.8, 1.5, 2.7);
    carBody.add(pupil1);
    const pupil2 = pupil1.clone();
    pupil2.position.x = -0.8;
    carBody.add(pupil2);

    // Chunky Wheels
    const wGeo = new THREE.CylinderGeometry(0.8, 0.8, 1, 12);
    const wMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    [[-1.8, 0.8, 1.8], [1.8, 0.8, 1.8], [-1.8, 0.8, -1.8], [1.8, 0.8, -1.8]].forEach(p => {
        const w = new THREE.Mesh(wGeo, wMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], p[1], p[2]);
        w.castShadow = true;
        car.add(w);
        wheels.push(w);
    });

    car.add(carBody);
    scene.add(car);
}

function setupLevel() {
    setupTraffic();
    setupRace();

    const coreGeo = new THREE.IcosahedronGeometry(1.2, 0);
    const coreMat = new THREE.MeshStandardMaterial({ color: CONFIG.colors.core, emissive: CONFIG.colors.core, emissiveIntensity: 1 });

    for (let i = 0; i < CONFIG.totalCores; i++) {
        const c = new THREE.Mesh(coreGeo, coreMat);
        c.position.set((Math.random() - 0.5) * 1200, 2, (Math.random() - 0.5) * 1200);
        scene.add(c);
        cores.push(c);
    }
}

function setupTraffic() {
    const trafficCount = 15;
    for(let i=0; i<trafficCount; i++) {
        const npc = createNPCCar(0xffcc00 + Math.random() * 0x0033ff);
        const onTrack = Math.random() > 0.4;
        if(onTrack) {
            npc.onTrack = true;
            npc.angle = Math.random() * Math.PI * 2;
        } else {
            npc.position.set((Math.random()-0.5)*1000, 0, (Math.random()-0.5)*1000);
            npc.dir = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        }
        npc.speed = 0.4 + Math.random() * 0.4;
        npcCars.push(npc);
        scene.add(npc);
    }
}

function createNPCCar(color) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 1.5, 4),
        new THREE.MeshStandardMaterial({ color })
    );
    body.position.y = 1;
    group.add(body);
    return group;
}

function setupRace() {
    const points = [
        [800, 0, 0], [0, 0, 800], [-800, 0, 0], [0, 0, -800], [0, 0, 0]
    ];
    const geo = new THREE.TorusGeometry(12, 1, 16, 50);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffea00 });

    points.forEach((p, i) => {
        const cp = new THREE.Mesh(geo, mat);
        cp.position.set(p[0], 10, p[2]);
        cp.rotation.y = Math.PI / 2;
        cp.visible = false;
        scene.add(cp);
        checkpoints.push(cp);
    });
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    gameState = 'COUNTDOWN';
    let c = 3;
    const el = document.getElementById('countdown');
    el.style.display = 'block';
    const interval = setInterval(() => {
        c--;
        el.innerText = c > 0 ? c : 'GO!';
        if (c < 0) {
            clearInterval(interval);
            el.style.display = 'none';
            gameState = 'PLAYING';
            startTime = Date.now();
            document.getElementById('hud').style.display = 'block';
        }
    }, 1000);
}

function update() {
    if (gameState !== 'PLAYING') return;

    updateRace();
    updateParticles();

    let targetMax = physics.maxSpeed;
    if (keys.shift && physics.nitro > 0 && physics.speed > 0.5) {
        targetMax = physics.nitroMax;
        physics.nitro -= 0.8;
        spawnSmoke(0x00ffff);
    } else {
        physics.nitro = Math.min(100, physics.nitro + 0.2);
    }

    if (keys.w) physics.speed += physics.accel;
    else if (keys.s) physics.speed -= physics.accel * 2;
    else physics.speed *= physics.friction;

    physics.speed = THREE.MathUtils.clamp(physics.speed, -0.5, targetMax);

    if (Math.abs(physics.speed) > 0.1) {
        const dir = physics.speed > 0 ? 1 : -1;
        let turnSpeed = physics.turn;
        if (keys.s && physics.speed > 0.8) {
            turnSpeed *= 1.8;
            spawnSmoke(0xffffff);
        }
        if (keys.a) physics.angle += turnSpeed * dir;
        if (keys.d) physics.angle -= turnSpeed * dir;
    }

    car.position.x += Math.sin(physics.angle) * physics.speed;
    car.position.z += Math.cos(physics.angle) * physics.speed;
    car.rotation.y = physics.angle;

    // Body tilt
    carBody.rotation.z = THREE.MathUtils.lerp(carBody.rotation.z, (keys.a ? 0.15 : keys.d ? -0.15 : 0), 0.1);

    wheels.forEach(w => w.rotation.x += physics.speed * 0.8);

    const camOffset = new THREE.Vector3(0, 10, -20).applyMatrix4(car.matrixWorld);
    camera.position.lerp(camOffset, 0.1);
    camera.lookAt(car.position.clone().add(new THREE.Vector3(0, 2, 0)));

    camera.fov = THREE.MathUtils.lerp(camera.fov, 70 + (Math.abs(physics.speed) * 10), 0.1);
    camera.updateProjectionMatrix();

    document.getElementById('hud-score').innerText = `SCORE: ${score}`;
    document.getElementById('hud-speed').innerText = `${Math.floor(Math.abs(physics.speed * 100))} KM/H`;

    checkCollisions();
}

function checkCollisions() {
    obstacles.forEach(o => {
        const dist = car.position.distanceTo(o.position || o.getWorldPosition(new THREE.Vector3()));
        if(dist < 6) {
            physics.speed *= -0.4;
            score = Math.max(0, score - 1);
        }
    });

    for (let i = destructibles.length - 1; i >= 0; i--) {
        const d = destructibles[i];
        if(car.position.distanceTo(d.mesh.position) < 6 && Math.abs(physics.speed) > 0.5) {
            if (!d.broken) {
                d.broken = true;
                score += 20;
                d.mesh.scale.set(1.5, 0.2, 1.5); // Squash effect
                setTimeout(() => {
                    scene.remove(d.mesh);
                    destructibles.splice(i, 1);
                }, 1000);
            }
        }
    }

    for(let i=cores.length-1; i>=0; i--) {
        if(car.position.distanceTo(cores[i].position) < 6) {
            scene.remove(cores[i]);
            cores.splice(i, 1);
            score += 50;
            physics.nitro = Math.min(100, physics.nitro + 30);
        }
    }
}

function spawnSmoke(color) {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 4, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    p.position.copy(car.position);
    p.position.y = 0.5;
    p.life = 1.0;
    scene.add(p);
    particles.push(p);
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= 0.05;
        p.scale.multiplyScalar(1.1);
        p.material.opacity = p.life;
        if (p.life <= 0) {
            scene.remove(p);
            particles.splice(i, 1);
        }
    }
}

function updateNPCs() {
    npcCars.forEach(npc => {
        if(npc.onTrack) {
            npc.angle += npc.speed * 0.002;
            const radius = 800 + Math.sin(npc.angle * 20 * 0.8 / (Math.PI*2)) * 150;
            npc.position.set(Math.cos(npc.angle)*radius, 0, Math.sin(npc.angle)*radius);
            npc.rotation.y = -npc.angle;
        } else {
            npc.position.add(npc.dir.clone().multiplyScalar(npc.speed));
            if(npc.position.length() > 1800) npc.position.set(0,0,0);
        }
    });
}

function updateRace() {
    if(gameMode !== 'RACING') return;
    const cp = checkpoints[currentCheckpoint];
    if(cp) {
        cp.visible = true;
        cp.rotation.z += 0.05;
        if(car.position.distanceTo(cp.position) < 20) {
            cp.visible = false;
            currentCheckpoint++;
            score += 200;
            if(currentCheckpoint >= checkpoints.length) finishGame();
        }
    }
}

function finishGame() {
    gameState = 'FINISHED';
    document.getElementById('win-screen').style.display = 'flex';
}

function animate() {
    requestAnimationFrame(animate);
    update();
    updateNPCs();
    renderer.render(scene, camera);
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
        el.onpointerleave = () => keys[k] = false;
    };
    bind('btn-w', 'w');
    bind('btn-l', 'a');
    bind('btn-r', 'd');
    bind('btn-n', 'shift');
}

init();
