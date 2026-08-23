import * as THREE from 'three';

export class Checkpoint {
    constructor(scene, position, rotationY = 0, index = 1, isFinish = false) {
        this.scene = scene;
        this.position = position.clone();
        this.rotationY = rotationY;
        this.index = index;
        this.isFinish = isFinish;
        this.activated = false;
        this.radius = 8.0;

        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.group.rotation.y = rotationY;

        this.initVisuals();
        this.scene.add(this.group);
    }

    initVisuals() {
        const ringColor = this.isFinish ? 0xffcc00 : 0x00ffff;

        // 1. Holographic Outer Torus
        const ringGeo = new THREE.TorusGeometry(5.5, 0.25, 16, 48);
        const ringMat = new THREE.MeshBasicMaterial({
            color: ringColor,
            transparent: true,
            opacity: 0.85
        });
        this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
        this.ringMesh.position.y = 4.5;
        this.group.add(this.ringMesh);

        // 2. Inner Rotating Chevron / Diamond
        const innerGeo = new THREE.OctahedronGeometry(1.8);
        const innerMat = new THREE.MeshBasicMaterial({
            color: this.isFinish ? 0xff0055 : 0xff00ff,
            wireframe: true
        });
        this.innerMesh = new THREE.Mesh(innerGeo, innerMat);
        this.innerMesh.position.y = 4.5;
        this.group.add(this.innerMesh);

        // 3. Ground Base Ring
        const baseGeo = new THREE.CylinderGeometry(5.5, 5.5, 0.4, 32);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x111122,
            emissive: ringColor,
            emissiveIntensity: 0.3
        });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = 0.2;
        this.group.add(baseMesh);

        // 4. Vertical Light Pillar Beam
        const beamGeo = new THREE.CylinderGeometry(5.5, 5.5, 60, 32, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: ringColor,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide
        });
        this.beamMesh = new THREE.Mesh(beamGeo, beamMat);
        this.beamMesh.position.y = 30;
        this.group.add(this.beamMesh);

        // 5. Point Light
        this.pointLight = new THREE.PointLight(ringColor, 1.5, 25);
        this.pointLight.position.y = 4.5;
        this.group.add(this.pointLight);
    }

    update(time) {
        if (!this.ringMesh) return;

        // Floating animation
        this.innerMesh.rotation.x = time * 1.5;
        this.innerMesh.rotation.y = time * 2.0;

        this.ringMesh.rotation.z = time * 0.8;
        this.ringMesh.material.opacity = 0.65 + Math.sin(time * 4) * 0.25;
        this.beamMesh.material.opacity = 0.10 + Math.sin(time * 3) * 0.05;
    }

    checkCollision(playerPos) {
        if (this.activated) return false;
        const dist = playerPos.distanceTo(this.position);
        return dist < this.radius;
    }

    activate() {
        this.activated = true;
        const activeColor = 0x39ff14; // Bright Neon Green

        this.ringMesh.material.color.setHex(activeColor);
        this.innerMesh.material.color.setHex(activeColor);
        this.beamMesh.material.color.setHex(activeColor);
        this.pointLight.color.setHex(activeColor);
        this.pointLight.intensity = 3.0;

        // Pulse scale
        this.ringMesh.scale.set(1.4, 1.4, 1.4);
    }

    destroy() {
        this.scene.remove(this.group);
    }
}
