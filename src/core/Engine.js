import * as THREE from 'three';

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 3500);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false
        });
        this.clock = new THREE.Clock();
        this.updatables = [];
        this.player = null;

        // Camera Modes: 'chase', 'close', 'hood'
        this.cameraMode = 'chase';
        this.cameraModes = ['chase', 'close', 'hood'];
        this.cameraModeIndex = 0;
        this.camShakeIntensity = 0;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => this.onResize());
    }

    add(object) {
        if (object.mesh) this.scene.add(object.mesh);
        else if (object instanceof THREE.Object3D) this.scene.add(object);

        if (typeof object.update === 'function') {
            this.updatables.push(object);
        }
    }

    remove(object) {
        if (object.mesh) this.scene.remove(object.mesh);
        else if (object instanceof THREE.Object3D) this.scene.remove(object);

        const index = this.updatables.indexOf(object);
        if (index !== -1) {
            this.updatables.splice(index, 1);
        }
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    setPlayer(player) {
        this.player = player;
    }

    switchCameraMode() {
        this.cameraModeIndex = (this.cameraModeIndex + 1) % this.cameraModes.length;
        this.cameraMode = this.cameraModes[this.cameraModeIndex];
    }

    triggerCameraShake(intensity = 0.5) {
        this.camShakeIntensity = Math.max(this.camShakeIntensity, intensity);
    }

    start() {
        this.renderer.setAnimationLoop(() => this.update());
    }

    update() {
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        // Update all registered systems
        for (const object of this.updatables) {
            if (object.update.length === 2 && this.player) {
                object.update(deltaTime, this.player.mesh.position);
            } else {
                object.update(deltaTime);
            }
        }

        // Camera Follow Logic
        this.updateCamera(deltaTime);

        this.renderer.render(this.scene, this.camera);
    }

    updateCamera(deltaTime) {
        if (!this.player || !this.player.mesh) return;

        const carPos = this.player.mesh.position;
        const carQuat = this.player.mesh.quaternion;
        const speed = this.player.speed || 0;
        const nitro = this.player.nitroActive;

        let targetOffset = new THREE.Vector3(0, 4.5, 9.5);
        let lookTargetOffset = new THREE.Vector3(0, 1.2, -4.0);
        let lerpFactor = 0.12;

        if (this.cameraMode === 'close') {
            targetOffset = new THREE.Vector3(0, 2.8, 6.0);
            lookTargetOffset = new THREE.Vector3(0, 1.0, -3.0);
            lerpFactor = 0.18;
        } else if (this.cameraMode === 'hood') {
            targetOffset = new THREE.Vector3(0, 1.1, -0.4);
            lookTargetOffset = new THREE.Vector3(0, 1.0, -10.0);
            lerpFactor = 0.35;
        }

        // Apply car rotation to camera offset
        const worldOffset = targetOffset.clone().applyQuaternion(carQuat);
        const desiredCamPos = carPos.clone().add(worldOffset);

        // Dynamic FOV based on speed and nitro
        const baseFov = 68;
        const speedFovAdd = Math.min(22, (speed / 200) * 18);
        const nitroFovAdd = nitro ? 8 : 0;
        const targetFov = baseFov + speedFovAdd + nitroFovAdd;

        this.camera.fov += (targetFov - this.camera.fov) * 0.1;
        this.camera.updateProjectionMatrix();

        // Speed Lines Overlay opacity
        const speedLines = document.getElementById('speed-lines');
        if (speedLines) {
            const opacity = nitro ? 0.8 : Math.max(0, (speed - 90) / 100);
            speedLines.style.opacity = opacity.toString();
        }

        // Smooth camera position interpolation
        this.camera.position.lerp(desiredCamPos, lerpFactor);

        // Camera Shake effect
        if (this.camShakeIntensity > 0.01) {
            const shake = this.camShakeIntensity;
            this.camera.position.x += (Math.random() - 0.5) * shake;
            this.camera.position.y += (Math.random() - 0.5) * shake;
            this.camera.position.z += (Math.random() - 0.5) * shake;
            this.camShakeIntensity *= 0.9;
        } else {
            this.camShakeIntensity = 0;
        }

        // Look at point ahead of car
        const lookTarget = carPos.clone().add(lookTargetOffset.applyQuaternion(carQuat));
        this.camera.lookAt(lookTarget);
    }
}
