import * as CANNON from 'cannon-es';
import { CONFIG } from '../config.js';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, CONFIG.physics.gravity, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = false;

        // Default materials
        this.defaultMaterial = new CANNON.Material('default');
        this.trackMaterial = new CANNON.Material('track');
        this.wheelMaterial = new CANNON.Material('wheel');

        const trackWheelContact = new CANNON.ContactMaterial(
            this.wheelMaterial,
            this.trackMaterial,
            {
                friction: 0.4,
                restitution: 0.1,
                contactEquationStiffness: 1e8,
                contactEquationRelaxation: 3
            }
        );
        this.world.addContactMaterial(trackWheelContact);

        const defaultContact = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.2,
                restitution: 0.2
            }
        );
        this.world.addContactMaterial(defaultContact);

        this.world.defaultContactMaterial = defaultContact;

        this.init();
    }

    init() {
        // Void kill plane far below in the sky (Y = -50)
        // Handled dynamically by ParkourManager for car respawn
    }

    update(deltaTime) {
        // High quality physics stepping to prevent tunnel effects on mega ramps
        const fixedTimeStep = 1 / 60;
        this.world.step(fixedTimeStep, Math.min(deltaTime, 0.1), 5);
    }
}
