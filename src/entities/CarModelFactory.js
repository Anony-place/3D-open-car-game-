import * as THREE from 'three';

export class CarModelFactory {
    static createCarMesh(vehicleConfig, customColorHex, customNeonHex) {
        const group = new THREE.Group();
        const mainColor = customColorHex || vehicleConfig.color || 0x00ffff;
        const neonColor = customNeonHex || vehicleConfig.neonColor || 0x00ffff;

        // Shared materials
        const bodyMat = new THREE.MeshStandardMaterial({
            color: mainColor,
            metalness: 0.85,
            roughness: 0.2,
            envMapIntensity: 1.0
        });

        const darkCarbonMat = new THREE.MeshStandardMaterial({
            color: 0x111116,
            roughness: 0.5,
            metalness: 0.4
        });

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x112233,
            roughness: 0.1,
            metalness: 0.9,
            transparent: true,
            opacity: 0.75
        });

        const neonMat = new THREE.MeshBasicMaterial({
            color: neonColor
        });

        const redGlowMat = new THREE.MeshBasicMaterial({
            color: 0xff0044
        });

        const whiteGlowMat = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            metalness: 0.95,
            roughness: 0.1
        });

        const carType = vehicleConfig.type || 'supercar';

        if (carType === 'formula') {
            CarModelFactory.buildFormula(group, bodyMat, darkCarbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat);
        } else if (carType === 'truck') {
            CarModelFactory.buildMonsterTruck(group, bodyMat, darkCarbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat);
        } else if (carType === 'tuner') {
            CarModelFactory.buildTuner(group, bodyMat, darkCarbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat);
        } else {
            // Default: Cyber GT Supercar
            CarModelFactory.buildSupercar(group, bodyMat, darkCarbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat);
        }

        // Underglow neon plane
        const underglowGeo = new THREE.PlaneGeometry(2.2, 4.0);
        const underglowMat = new THREE.MeshBasicMaterial({
            color: neonColor,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const underglow = new THREE.Mesh(underglowGeo, underglowMat);
        underglow.rotation.x = Math.PI / 2;
        underglow.position.y = -0.3;
        group.add(underglow);

        // Exhaust Nozzle positions for Nitro fire
        group.userData = {
            exhaustPositions: [
                new THREE.Vector3(-0.45, 0.05, 2.05),
                new THREE.Vector3(0.45, 0.05, 2.05)
            ],
            bodyMat: bodyMat,
            neonMat: neonMat,
            underglowMat: underglowMat,
            redGlowMat: redGlowMat
        };

        return group;
    }

    static buildSupercar(group, bodyMat, carbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat) {
        // Lower Main Chassis
        const lowerGeo = new THREE.BoxGeometry(2.0, 0.45, 4.2);
        const lowerMesh = new THREE.Mesh(lowerGeo, bodyMat);
        lowerMesh.position.y = 0.0;
        lowerMesh.castShadow = true;
        lowerMesh.receiveShadow = true;
        group.add(lowerMesh);

        // Hood / Nose (sloped)
        const hoodGeo = new THREE.BoxGeometry(1.9, 0.35, 1.6);
        const hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
        hoodMesh.position.set(0, 0.15, -1.2);
        hoodMesh.rotation.x = 0.08;
        hoodMesh.castShadow = true;
        group.add(hoodMesh);

        // Cockpit / Cabin
        const cabinGeo = new THREE.BoxGeometry(1.6, 0.48, 1.8);
        const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
        cabinMesh.position.set(0, 0.45, -0.1);
        cabinMesh.castShadow = true;
        group.add(cabinMesh);

        // Roof Accent
        const roofGeo = new THREE.BoxGeometry(1.4, 0.08, 1.4);
        const roofMesh = new THREE.Mesh(roofGeo, carbonMat);
        roofMesh.position.set(0, 0.7, -0.1);
        group.add(roofMesh);

        // Front Splitter
        const splitterGeo = new THREE.BoxGeometry(2.05, 0.08, 0.5);
        const splitterMesh = new THREE.Mesh(splitterGeo, carbonMat);
        splitterMesh.position.set(0, -0.18, -2.15);
        group.add(splitterMesh);

        // Neon Front Lip
        const neonLipGeo = new THREE.BoxGeometry(2.06, 0.04, 0.05);
        const neonLip = new THREE.Mesh(neonLipGeo, neonMat);
        neonLip.position.set(0, -0.18, -2.4);
        group.add(neonLip);

        // Headlights (Dual angular LEDs)
        const hlGeo = new THREE.BoxGeometry(0.45, 0.12, 0.08);
        const hlLeft = new THREE.Mesh(hlGeo, whiteGlowMat);
        hlLeft.position.set(-0.7, 0.1, -2.05);
        const hlRight = new THREE.Mesh(hlGeo, whiteGlowMat);
        hlRight.position.set(0.7, 0.1, -2.05);
        group.add(hlLeft, hlRight);

        // Taillight bar (Full-width Cyber Red Neon)
        const tlGeo = new THREE.BoxGeometry(1.9, 0.1, 0.08);
        const tlMesh = new THREE.Mesh(tlGeo, redGlowMat);
        tlMesh.position.set(0, 0.15, 2.1);
        group.add(tlMesh);

        // Rear Diffuser
        const diffGeo = new THREE.BoxGeometry(1.8, 0.2, 0.4);
        const diffMesh = new THREE.Mesh(diffGeo, carbonMat);
        diffMesh.position.set(0, -0.12, 2.05);
        group.add(diffMesh);

        // Rear Wing / Spoiler
        const wingPillarGeo = new THREE.BoxGeometry(0.08, 0.35, 0.15);
        const wpLeft = new THREE.Mesh(wingPillarGeo, carbonMat);
        wpLeft.position.set(-0.6, 0.35, 1.85);
        const wpRight = new THREE.Mesh(wingPillarGeo, carbonMat);
        wpRight.position.set(0.6, 0.35, 1.85);

        const wingBladeGeo = new THREE.BoxGeometry(2.1, 0.06, 0.45);
        const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMat);
        wingBlade.position.set(0, 0.52, 1.9);
        wingBlade.rotation.x = -0.05;

        const wingNeonGeo = new THREE.BoxGeometry(2.12, 0.04, 0.04);
        const wingNeon = new THREE.Mesh(wingNeonGeo, neonMat);
        wingNeon.position.set(0, 0.52, 2.12);

        group.add(wpLeft, wpRight, wingBlade, wingNeon);

        // Side Neon Trims
        const sideTrimGeo = new THREE.BoxGeometry(0.04, 0.06, 3.2);
        const stLeft = new THREE.Mesh(sideTrimGeo, neonMat);
        stLeft.position.set(-1.01, -0.1, 0);
        const stRight = new THREE.Mesh(sideTrimGeo, neonMat);
        stRight.position.set(1.01, -0.1, 0);
        group.add(stLeft, stRight);
    }

    static buildFormula(group, bodyMat, carbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat) {
        // Narrow Needle Body
        const needleGeo = new THREE.BoxGeometry(1.1, 0.4, 4.4);
        const needleMesh = new THREE.Mesh(needleGeo, bodyMat);
        needleMesh.position.set(0, 0, 0);
        group.add(needleMesh);

        // Open Cockpit
        const cockpitGeo = new THREE.BoxGeometry(0.8, 0.35, 1.2);
        const cockpitMesh = new THREE.Mesh(cockpitGeo, glassMat);
        cockpitMesh.position.set(0, 0.32, -0.2);
        group.add(cockpitMesh);

        // Halo Safety Ring
        const haloGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 16, Math.PI);
        const halo = new THREE.Mesh(haloGeo, carbonMat);
        halo.position.set(0, 0.48, -0.3);
        halo.rotation.x = -Math.PI / 2;
        group.add(halo);

        // Giant Front Wing
        const fWingGeo = new THREE.BoxGeometry(2.3, 0.08, 0.7);
        const fWing = new THREE.Mesh(fWingGeo, carbonMat);
        fWing.position.set(0, -0.15, -2.1);
        group.add(fWing);

        const fWingNeon = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.04, 0.05), neonMat);
        fWingNeon.position.set(0, -0.15, -2.45);
        group.add(fWingNeon);

        // Giant Rear Wing
        const rWingPillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.2), carbonMat);
        rWingPillar.position.set(0, 0.4, 2.0);
        const rWingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.5), carbonMat);
        rWingBlade.position.set(0, 0.7, 2.0);
        const rWingNeon = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.04, 0.05), neonMat);
        rWingNeon.position.set(0, 0.7, 2.25);
        group.add(rWingPillar, rWingBlade, rWingNeon);

        // Taillight
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.08), redGlowMat);
        tl.position.set(0, 0.1, 2.2);
        group.add(tl);
    }

    static buildMonsterTruck(group, bodyMat, carbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat) {
        // High Rugged Cabin
        const cabinGeo = new THREE.BoxGeometry(2.2, 0.9, 3.2);
        const cabinMesh = new THREE.Mesh(cabinGeo, bodyMat);
        cabinMesh.position.set(0, 0.3, 0);
        group.add(cabinMesh);

        // Windows
        const wndGeo = new THREE.BoxGeometry(2.22, 0.45, 1.8);
        const wndMesh = new THREE.Mesh(wndGeo, glassMat);
        wndMesh.position.set(0, 0.5, -0.2);
        group.add(wndMesh);

        // Heavy Bullbar
        const bullbarGeo = new THREE.BoxGeometry(2.0, 0.6, 0.3);
        const bullbar = new THREE.Mesh(bullbarGeo, carbonMat);
        bullbar.position.set(0, 0.0, -1.8);
        group.add(bullbar);

        // Roof Light Bar (4 bright yellow-white spots)
        for (let i = -3; i <= 3; i += 2) {
            const spot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), whiteGlowMat);
            spot.rotation.x = Math.PI / 2;
            spot.position.set(i * 0.25, 0.85, -0.8);
            group.add(spot);
        }

        // Taillights
        const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.08), redGlowMat);
        tlL.position.set(-0.8, 0.3, 1.62);
        const tlR = new THREE.Mesh(tlL.geometry, redGlowMat);
        tlR.position.set(0.8, 0.3, 1.62);
        group.add(tlL, tlR);
    }

    static buildTuner(group, bodyMat, carbonMat, glassMat, neonMat, redGlowMat, whiteGlowMat) {
        // Widebody Coupe
        const bodyGeo = new THREE.BoxGeometry(2.1, 0.5, 4.1);
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.position.set(0, 0.05, 0);
        group.add(bodyMesh);

        // Wide Fender Flares
        const flareGeo = new THREE.BoxGeometry(2.3, 0.35, 1.2);
        const flareFront = new THREE.Mesh(flareGeo, bodyMat);
        flareFront.position.set(0, 0.02, -1.3);
        const flareRear = new THREE.Mesh(flareGeo, bodyMat);
        flareRear.position.set(0, 0.02, 1.3);
        group.add(flareFront, flareRear);

        // Fastback Greenhouse
        const cabinGeo = new THREE.BoxGeometry(1.6, 0.5, 2.0);
        const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
        cabinMesh.position.set(0, 0.45, 0.0);
        group.add(cabinMesh);

        // Ducktail Spoiler
        const ducktailGeo = new THREE.BoxGeometry(1.8, 0.2, 0.25);
        const ducktail = new THREE.Mesh(ducktailGeo, carbonMat);
        ducktail.position.set(0, 0.38, 2.0);
        ducktail.rotation.x = 0.3;
        group.add(ducktail);

        // Taillight bar
        const tl = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.08), redGlowMat);
        tl.position.set(0, 0.15, 2.06);
        group.add(tl);
    }

    static createWheelMesh(vehicleConfig, customNeonHex) {
        const radius = vehicleConfig.wheelRadius || 0.48;
        const width = 0.38;
        const neonColor = customNeonHex || vehicleConfig.neonColor || 0x00ffff;

        const wheelGroup = new THREE.Group();

        // Tire Rubber
        const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
        tireGeo.rotateZ(Math.PI / 2);
        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x18181a,
            roughness: 0.85,
            metalness: 0.1
        });
        const tireMesh = new THREE.Mesh(tireGeo, tireMat);
        tireMesh.castShadow = true;
        wheelGroup.add(tireMesh);

        // Inner Rim
        const rimGeo = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, width + 0.02, 18);
        rimGeo.rotateZ(Math.PI / 2);
        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x282830,
            metalness: 0.9,
            roughness: 0.2
        });
        const rimMesh = new THREE.Mesh(rimGeo, rimMat);
        wheelGroup.add(rimMesh);

        // Glowing Neon Rim Ring
        const ringGeo = new THREE.TorusGeometry(radius * 0.65, 0.03, 8, 24);
        ringGeo.rotateY(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({ color: neonColor });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        wheelGroup.add(ringMesh);

        return wheelGroup;
    }
}
