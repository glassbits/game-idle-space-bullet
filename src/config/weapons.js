export const WEAPON_TYPES = {
    RIFLE: 'rifle',
    CANNON: 'cannon',
    MISSILE: 'missile',
    MACHINE_GUN: 'machine_gun'
};

export const MOVEMENT_TYPES = {
    STRAIGHT: 'straight',
    HOMING: 'homing',
    ORBIT: 'orbit' // "rotating shield" style
};

export const WEAPONS = {
    [WEAPON_TYPES.RIFLE]: {
        name: 'Neon Rifle',
        description: 'Standard issue energy rifle.',
        color: 0x00ffff, // Cyan
        baseStats: {
            damage: 10,
            fireRate: 800, // ms
            critRate: 0.05,
            critDamage: 1.5,
            projectileSpeed: 500,
            projectileCount: 1,
            pierce: 0,
            boomZone: 0, // AoE radius
            movementType: MOVEMENT_TYPES.STRAIGHT
        },
        levelUp: {
            damage: 5,
            fireRate: -50,
            projectileSpeed: 50
        }
    },
    [WEAPON_TYPES.CANNON]: {
        name: 'Plasma Cannon',
        description: 'Slow but powerful. Explodes on impact.',
        color: 0xff00ff, // Magenta
        baseStats: {
            damage: 30,
            fireRate: 2000,
            critRate: 0.1,
            critDamage: 2.0,
            projectileSpeed: 300,
            projectileCount: 1,
            pierce: 0,
            boomZone: 100,
            movementType: MOVEMENT_TYPES.STRAIGHT
        },
        levelUp: {
            damage: 15,
            boomZone: 20
        }
    },
    [WEAPON_TYPES.MISSILE]: {
        name: 'Homing Missile',
        description: 'Chases enemies.',
        color: 0xffff00, // Yellow
        baseStats: {
            damage: 15,
            fireRate: 1500,
            critRate: 0.05,
            critDamage: 1.5,
            projectileSpeed: 250,
            projectileCount: 1,
            pierce: 0,
            boomZone: 30,
            movementType: MOVEMENT_TYPES.HOMING
        },
        levelUp: {
            fireRate: -100,
            projectileSpeed: 20
        }
    },
    [WEAPON_TYPES.MACHINE_GUN]: {
        name: 'Rapid Blaster',
        description: 'High fire rate, low damage.',
        color: 0x00ff00, // Green
        baseStats: {
            damage: 4,
            fireRate: 150,
            critRate: 0.05,
            critDamage: 1.2,
            projectileSpeed: 600,
            projectileCount: 1,
            pierce: 0,
            boomZone: 0,
            movementType: MOVEMENT_TYPES.STRAIGHT
        },
        levelUp: {
            damage: 1,
            fireRate: -10
        }
    }
};
