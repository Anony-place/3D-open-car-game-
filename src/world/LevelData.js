import * as THREE from 'three';

export const LEVEL_DATA = [
    // ==========================================
    // LEVEL 1: SKY STARTER / FIRST FLIGHT
    // ==========================================
    {
        id: 1,
        name: "Sky Starter: First Flight",
        difficulty: "EASY",
        parTime: 45, // seconds for 3 stars
        description: "Master sky driving, mega ramp launches and speed boosters high above the clouds.",
        startPos: new THREE.Vector3(0, 40, 0),
        startRotY: 0,
        build: (builder) => {
            // 1. Start Runway
            builder.createStraight(0, 40, 0, 14, 50, 0, 0, 0, { centerLine: true });
            builder.createBoostPad(0, 40.2, -15, 8, 12, 0, 42);

            // 2. Launch Ramp 1
            builder.createRamp(0, 40, -25, 14, 25, 7, 0);

            // GAP of 35m across void (from Z = -50 to Z = -85)

            // 3. Landing Platform & Checkpoint 1
            builder.createStraight(0, 43, -110, 16, 50, 0, 0, 0, { centerLine: true });

            // 4. Boost into Curved Section
            builder.createBoostPad(0, 43.2, -125, 8, 12, 0, 45);
            builder.createRamp(0, 43, -135, 16, 30, 9, 0);

            // High Leap GAP to Checkpoint 2 platform
            builder.createStraight(0, 48, -215, 16, 60, 0, 0, 0, { centerLine: true });

            // 5. Jump Pad over gap
            builder.createJumpPad(0, 48.2, -235, 8, 8, 0, 24);

            // 6. Final Finish Runway & Arena
            builder.createStraight(0, 52, -290, 18, 50, 0, 0, 0, { centerLine: true });
            builder.createFinishPlatform(0, 52, -325, 0);

            // Coins along the way
            builder.createCoin(0, 48, -65); // Mid-air jump 1
            builder.createCoin(0, 56, -175); // Mid-air jump 2
            builder.createCoin(0, 62, -260); // Jump pad air
        },
        checkpoints: [
            { pos: new THREE.Vector3(0, 43.5, -95), rotY: 0 },
            { pos: new THREE.Vector3(0, 48.5, -195), rotY: 0 },
            { pos: new THREE.Vector3(0, 52.5, -325), rotY: 0, isFinish: true }
        ]
    },

    // ==========================================
    // LEVEL 2: NEON VERTIGO & BALANCE
    // ==========================================
    {
        id: 2,
        name: "Neon Vertigo & Balance",
        difficulty: "MEDIUM",
        parTime: 60,
        description: "Tight catwalk balance beams, banked wall rides and spinning hazards.",
        startPos: new THREE.Vector3(0, 50, 0),
        startRotY: 0,
        build: (builder) => {
            // 1. Start Platform
            builder.createStraight(0, 50, 0, 14, 35, 0);

            // 2. Narrow Balance Beam (Only 4.5m wide!)
            builder.createStraight(0, 50, -45, 4.5, 55, 0, 0, 0, { hasRails: false, color: 0x221133 });

            // 3. Platform & Checkpoint 1
            builder.createStraight(0, 50, -95, 16, 45, 0);

            // 4. Rotating Spinner Hazard
            builder.createMovingObstacle(0, 50, -95, 'spinner', { barWidth: 15, speed: 2.2 });

            // 5. Wall-Ride curved sector (banked 45°)
            builder.createWallRide(0, 50, -120, 28, 12, Math.PI * 0.5, 0, 0.85);

            // 6. Checkpoint 2 Platform
            builder.createStraight(28, 50, -170, 16, 45, 0);

            // 7. Booster straightway & Mega Gap Jump
            builder.createBoostPad(28, 50.2, -180, 8, 12, 0, 55);
            builder.createRamp(28, 50, -192, 16, 25, 10, 0);

            // Giant Void Gap (80m) to Checkpoint 3
            builder.createStraight(28, 55, -300, 18, 55, 0);

            // 8. Three Fragile Falling Glass Platforms
            builder.createFragileTile(28, 55, -340, 9, 9, 0);
            builder.createFragileTile(28, 55, -355, 9, 9, 0);
            builder.createFragileTile(28, 55, -370, 9, 9, 0);

            // 9. Grand Finish Platform
            builder.createFinishPlatform(28, 55, -405, 0);

            // Coins
            builder.createCoin(0, 52, -45);
            builder.createCoin(28, 66, -245);
            builder.createCoin(28, 57, -355);
        },
        checkpoints: [
            { pos: new THREE.Vector3(0, 50.5, -75), rotY: 0 },
            { pos: new THREE.Vector3(28, 50.5, -155), rotY: 0 },
            { pos: new THREE.Vector3(28, 55.5, -285), rotY: 0 },
            { pos: new THREE.Vector3(28, 55.5, -405), rotY: 0, isFinish: true }
        ]
    },

    // ==========================================
    // LEVEL 3: MEGA RAMP & 360° STUNT LOOP
    // ==========================================
    {
        id: 3,
        name: "Mega Ramp & 360° Loop",
        difficulty: "HARD",
        parTime: 55,
        description: "Vertical drop mega speedway into an insane 360° stunt loop and airborne rings.",
        startPos: new THREE.Vector3(0, 100, 0),
        startRotY: 0,
        build: (builder) => {
            // 1. High Start Platform (Y = 100)
            builder.createStraight(0, 100, 0, 16, 40, 0);

            // 2. Steep Downhill Mega Drop Ramp (Drops from Y=100 to Y=40!)
            builder.createRamp(0, 40, -20, 16, 75, -60, Math.PI); // Steep downhill
            builder.createBoostPad(0, 40.2, -100, 10, 16, 0, 60);

            // 3. Full 360° Vertical Stunt Loop!
            builder.createLoop(0, 40, -145, 20, 12, 0);

            // 4. Exit Straightway & Checkpoint 1
            builder.createStraight(0, 40, -195, 18, 55, 0, 0, 0, { centerLine: true });

            // 5. Triple Boost Pad Chain into Mega Launch Ramp
            builder.createBoostPad(0, 40.2, -210, 8, 12, 0, 50);
            builder.createBoostPad(0, 40.2, -225, 8, 12, 0, 50);
            builder.createRamp(0, 40, -238, 16, 25, 12, 0);

            // Huge Airborne Gap (100m) to Checkpoint 2
            builder.createStraight(0, 48, -365, 20, 60, 0);

            // 6. Sliding Hazard Barriers
            builder.createMovingObstacle(0, 48, -360, 'slider', { width: 8, height: 3, distance: 7, speed: 3.0 });
            builder.createMovingObstacle(0, 48, -380, 'slider', { width: 8, height: 3, distance: 7, speed: -3.0 });

            // 7. Super Jump Pad to Finish Pinnacle Platform
            builder.createJumpPad(0, 48.2, -405, 10, 10, 0, 30);
            builder.createFinishPlatform(0, 70, -455, 0);

            // Mid-air coins
            builder.createCoin(0, 60, -145); // Inside top of loop
            builder.createCoin(0, 70, -300); // Super jump air
        },
        checkpoints: [
            { pos: new THREE.Vector3(0, 40.5, -185), rotY: 0 },
            { pos: new THREE.Vector3(0, 48.5, -345), rotY: 0 },
            { pos: new THREE.Vector3(0, 70.5, -455), rotY: 0, isFinish: true }
        ]
    },

    // ==========================================
    // LEVEL 4: CYBER TOWER SPIRAL ASCENT
    // ==========================================
    {
        id: 4,
        name: "Cyber Tower: Spiral Ascent",
        difficulty: "EXPERT",
        parTime: 75,
        description: "Climb a towering spiral cyber structure with hairpins, moving sweepers and precision leaps.",
        startPos: new THREE.Vector3(0, 30, 0),
        startRotY: 0,
        build: (builder) => {
            // Tier 1: Start
            builder.createStraight(0, 30, 0, 14, 40, 0);
            builder.createStraight(0, 32, -35, 14, 30, 0);
            builder.createMovingObstacle(0, 32, -35, 'spinner', { barWidth: 14, speed: 2.5 });

            // Hairpin Right to Tier 2
            builder.createStraight(20, 36, -50, 30, 14, 0);
            builder.createStraight(35, 42, -25, 14, 40, Math.PI); // Going back south!

            // Checkpoint 1
            builder.createStraight(35, 46, 10, 16, 35, Math.PI);

            // Hairpin Left & Boost to Tier 3
            builder.createStraight(15, 52, 25, 30, 14, Math.PI);
            builder.createStraight(-10, 58, 0, 14, 45, 0);
            builder.createBoostPad(-10, 58.2, -10, 8, 12, 0, 45);

            // Checkpoint 2
            builder.createStraight(-10, 62, -40, 16, 35, 0);
            builder.createMovingObstacle(-10, 62, -40, 'slider', { width: 7, height: 3, distance: 5, speed: 3.5 });

            // Tier 4: Jump Bouncer to Pinnacle
            builder.createJumpPad(-10, 62.2, -65, 8, 8, 0, 26);

            // Upper High Deck
            builder.createStraight(-10, 78, -115, 14, 40, 0);
            builder.createBoostPad(-10, 78.2, -125, 8, 10, 0, 50);
            builder.createRamp(-10, 78, -135, 14, 20, 8, 0);

            // Tower Summit Finish
            builder.createFinishPlatform(-10, 86, -190, 0);

            // Coins
            builder.createCoin(35, 44, -10);
            builder.createCoin(-10, 72, -90);
        },
        checkpoints: [
            { pos: new THREE.Vector3(35, 46.5, 10), rotY: Math.PI },
            { pos: new THREE.Vector3(-10, 62.5, -30), rotY: 0 },
            { pos: new THREE.Vector3(-10, 86.5, -190), rotY: 0, isFinish: true }
        ]
    },

    // ==========================================
    // LEVEL 5: THE IMPOSSIBLE SKYWAY
    // ==========================================
    {
        id: 5,
        name: "The Impossible Skyway",
        difficulty: "EXTREME",
        parTime: 90,
        description: "The ultimate parkour gauntlet! Collapsing bridges, double loops, moving crushers and huge jumps.",
        startPos: new THREE.Vector3(0, 50, 0),
        startRotY: 0,
        build: (builder) => {
            // Stage 1: Fast Start into Fragile Bridge
            builder.createStraight(0, 50, 0, 12, 35, 0);
            builder.createFragileTile(0, 50, -30, 8, 8, 0);
            builder.createFragileTile(0, 50, -42, 8, 8, 0);
            builder.createFragileTile(0, 50, -54, 8, 8, 0);

            // Stage 2: Checkpoint 1 & Twin Spinners
            builder.createStraight(0, 50, -85, 16, 45, 0);
            builder.createMovingObstacle(0, 50, -80, 'spinner', { barWidth: 15, speed: 3.0 });
            builder.createMovingObstacle(0, 50, -95, 'spinner', { barWidth: 15, speed: -3.0 });

            // Stage 3: Speed Boost into 360° Loop
            builder.createBoostPad(0, 50.2, -115, 8, 12, 0, 55);
            builder.createLoop(0, 50, -150, 18, 12, 0);

            // Checkpoint 2
            builder.createStraight(0, 50, -195, 16, 40, 0);

            // Stage 4: Banked Wall-Ride with Pendulum Hammer
            builder.createWallRide(0, 50, -220, 30, 12, Math.PI * 0.6, 0, 0.9);
            builder.createMovingObstacle(20, 50, -250, 'pendulum', { length: 16, speed: 3.0 });

            // Checkpoint 3
            builder.createStraight(30, 50, -290, 16, 40, 0);

            // Stage 5: Double Mega Boost Gap Jump (110m void!)
            builder.createBoostPad(30, 50.2, -305, 8, 12, 0, 60);
            builder.createRamp(30, 50, -318, 16, 25, 12, 0);

            // Landing Island
            builder.createStraight(30, 56, -450, 18, 50, 0);
            builder.createJumpPad(30, 56.2, -470, 8, 8, 0, 28);

            // Final Apex Shrine Finish
            builder.createFinishPlatform(30, 78, -525, 0);

            // Coins
            builder.createCoin(0, 52, -42);
            builder.createCoin(0, 68, -150);
            builder.createCoin(30, 74, -385);
        },
        checkpoints: [
            { pos: new THREE.Vector3(0, 50.5, -70), rotY: 0 },
            { pos: new THREE.Vector3(0, 50.5, -185), rotY: 0 },
            { pos: new THREE.Vector3(30, 50.5, -280), rotY: 0 },
            { pos: new THREE.Vector3(30, 78.5, -525), rotY: 0, isFinish: true }
        ]
    },

    // ==========================================
    // FREESTYLE STUNT SANDBOX PLAYGROUND
    // ==========================================
    {
        id: 0,
        name: "Freestyle Stunt Sandbox",
        difficulty: "SANDBOX",
        parTime: 0,
        description: "Giant open stunt park! Huge mega ramps, half-pipes, loops, trampolines and 40 coins.",
        startPos: new THREE.Vector3(0, 20, 0),
        startRotY: 0,
        build: (builder) => {
            // Main Center Arena (160x160m)
            builder.createStraight(0, 20, 0, 160, 160, 0, 0, 0, { hasRails: true, centerLine: true });

            // 4 Huge Mega Ramps on all four compass sides
            builder.createRamp(0, 20, -75, 24, 40, 18, 0); // North Launch Ramp
            builder.createRamp(0, 20, 75, 24, 40, 18, Math.PI); // South Launch Ramp
            builder.createRamp(75, 20, 0, 24, 40, 18, Math.PI / 2); // East Launch Ramp
            builder.createRamp(-75, 20, 0, 24, 40, 18, -Math.PI / 2); // West Launch Ramp

            // Twin 360° Stunt Loops
            builder.createLoop(-45, 20, -35, 18, 12, 0);
            builder.createLoop(45, 20, 35, 18, 12, Math.PI);

            // Boost Pads leading into ramps
            builder.createBoostPad(0, 20.2, -45, 12, 14, 0, 55);
            builder.createBoostPad(0, 20.2, 45, 12, 14, Math.PI, 55);
            builder.createBoostPad(45, 20.2, 0, 12, 14, Math.PI / 2, 55);
            builder.createBoostPad(-45, 20.2, 0, 12, 14, -Math.PI / 2, 55);

            // 4 Jump Trampoline Pads in corners
            builder.createJumpPad(-50, 20.2, -50, 12, 12, 0, 32);
            builder.createJumpPad(50, 20.2, -50, 12, 12, 0, 32);
            builder.createJumpPad(-50, 20.2, 50, 12, 12, 0, 32);
            builder.createJumpPad(50, 20.2, 50, 12, 12, 0, 32);

            // Center Spinner Hazard
            builder.createMovingObstacle(0, 20, 0, 'spinner', { barWidth: 26, speed: 1.5 });

            // High Flying Floating Platforms
            builder.createStraight(0, 65, -120, 35, 35, 0);
            builder.createStraight(0, 65, 120, 35, 35, 0);

            // 20 Collectible Coins scattered for freestyle fun
            for (let i = 0; i < 20; i++) {
                const a = (i / 20) * Math.PI * 2;
                const r = 25 + (i % 3) * 20;
                builder.createCoin(Math.cos(a) * r, 22 + (i % 4) * 3, Math.sin(a) * r);
            }
        },
        checkpoints: []
    }
];
