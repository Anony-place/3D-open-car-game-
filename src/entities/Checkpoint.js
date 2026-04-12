import * as THREE from 'three';

export class Checkpoint {
    constructor(scene, position, size = 10) {
        this.scene = scene;
        this.position = position;
        this.size = size;

        // Visual
        const geometry = new THREE.TorusGeometry(size, 0.5, 16, 100);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.rotation.y = Math.PI / 2;
        this.scene.add(this.mesh);

        // Beam effect
        const beamGeom = new THREE.CylinderGeometry(size, size, 200, 32, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        this.beam = new THREE.Mesh(beamGeom, beamMat);
        this.beam.position.copy(position);
        this.beam.position.y += 100;
        this.scene.add(this.beam);
    }

    update(time) {
        this.mesh.rotation.z += 0.05;
        this.mesh.material.opacity = 0.5 + Math.sin(time * 5) * 0.2;
    }

    checkCollision(playerPosition) {
        const dist = playerPosition.distanceTo(this.position);
        return dist < this.size;
    }

    destroy() {
        this.scene.remove(this.mesh);
        this.scene.remove(this.beam);
    }
}
