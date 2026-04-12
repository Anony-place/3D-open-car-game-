import * as THREE from 'three';

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.clock = new THREE.Clock();
        this.updatables = [];

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

    start() {
        this.renderer.setAnimationLoop(() => this.update());
    }

    update() {
        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        for (const object of this.updatables) {
            if (object.update.length === 2 && this.player) {
                // Environment update often needs player pos
                object.update(deltaTime, this.player.mesh.position);
            } else {
                object.update(deltaTime);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    setPlayer(player) {
        this.player = player;
    }
}
