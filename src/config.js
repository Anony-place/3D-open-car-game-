export const CONFIG = {
    gameTitle: "CYBER CAR PARKOUR 3D",
    version: "2.0.0",
    
    // Physics constants
    physics: {
        gravity: -22.0, // Snappy stunt gravity
        defaultFriction: 0.98,
        airControlForce: 1800, // In-air rotation torque
        airStabilizeForce: 800,
        downforceFactor: 1.2
    },

    // Vehicle presets available in Garage
    vehicles: [
        {
            id: 'cyber_gt',
            name: 'Cyber GT Supercar',
            type: 'supercar',
            description: 'Balanced speed, tight handling and aerial agility.',
            color: 0x00ffff,
            neonColor: 0x00f0ff,
            mass: 1400,
            engineForce: 3600,
            nitroForce: 7200,
            maxSteerVal: 0.52,
            suspensionStiffness: 35,
            suspensionRestLength: 0.32,
            frictionSlip: 5.5,
            wheelRadius: 0.48,
            bodyDimensions: { width: 2.1, height: 0.9, length: 4.4 },
            stats: { speed: 88, accel: 85, handling: 82, jump: 80 }
        },
        {
            id: 'apex_racer',
            name: 'Apex Formula Speeder',
            type: 'formula',
            description: 'Ultra-lightweight racer with massive downforce and nitro power.',
            color: 0xff0055,
            neonColor: 0xff0066,
            mass: 1100,
            engineForce: 4200,
            nitroForce: 8500,
            maxSteerVal: 0.58,
            suspensionStiffness: 42,
            suspensionRestLength: 0.28,
            frictionSlip: 6.2,
            wheelRadius: 0.45,
            bodyDimensions: { width: 2.2, height: 0.75, length: 4.6 },
            stats: { speed: 98, accel: 95, handling: 92, jump: 75 }
        },
        {
            id: 'monster_4x4',
            name: 'Titan Offroad 4x4',
            type: 'truck',
            description: 'Heavy beast with monster suspension to soak up giant leaps.',
            color: 0xffaa00,
            neonColor: 0xffbb00,
            mass: 2000,
            engineForce: 4500,
            nitroForce: 7800,
            maxSteerVal: 0.48,
            suspensionStiffness: 28,
            suspensionRestLength: 0.48,
            frictionSlip: 5.0,
            wheelRadius: 0.68,
            bodyDimensions: { width: 2.4, height: 1.3, length: 4.6 },
            stats: { speed: 75, accel: 80, handling: 72, jump: 95 }
        },
        {
            id: 'neon_tuner',
            name: 'Ghost Drift JDM',
            type: 'tuner',
            description: 'Widebody drift specialist with extreme air rotation agility.',
            color: 0x9900ff,
            neonColor: 0xcc00ff,
            mass: 1280,
            engineForce: 3800,
            nitroForce: 7500,
            maxSteerVal: 0.55,
            suspensionStiffness: 32,
            suspensionRestLength: 0.30,
            frictionSlip: 4.2,
            wheelRadius: 0.46,
            bodyDimensions: { width: 2.2, height: 0.88, length: 4.3 },
            stats: { speed: 84, accel: 90, handling: 96, jump: 88 }
        }
    ],

    // Neon paint options
    neonColors: [
        { name: 'Cyber Cyan', hex: 0x00ffff, css: '#00ffff' },
        { name: 'Neon Pink', hex: 0xff007f, css: '#ff007f' },
        { name: 'Plasma Purple', hex: 0xa800ff, css: '#a800ff' },
        { name: 'Electric Gold', hex: 0xffd700, css: '#ffd700' },
        { name: 'Acid Lime', hex: 0x39ff14, css: '#39ff14' },
        { name: 'Blaze Orange', hex: 0xff5500, css: '#ff5500' },
        { name: 'Pure Ice White', hex: 0xffffff, css: '#ffffff' }
    ],

    // Colors
    colors: {
        skyGradTop: 0x05021a,
        skyGradBottom: 0x1c0b3b,
        neonBlue: 0x00ffff,
        neonPink: 0xff007f,
        neonGreen: 0x39ff14,
        neonOrange: 0xff7700,
        trackBase: 0x111122,
        trackBorder: 0x00ffff,
        boostPad: 0x00ff88,
        jumpPad: 0xffcc00
    }
};
