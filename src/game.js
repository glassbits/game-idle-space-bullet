import Phaser from 'phaser';
import { WEAPONS, WEAPON_TYPES, MOVEMENT_TYPES } from './config/weapons.js';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.score = 0;

        // Game State
        this.level = 1;
        this.maxHp = 100;
        this.currentHp = 100;
        this.exp = 0;
        this.maxExp = 100; // EXP needed for next level

        // Inventory: Array of active weapon instances
        this.inventory = [];

        // UI Elements
        this.uiGroup = null;
        this.weaponGrid = [];
    }

    preload() {
        // No assets to preload
    }

    create() {
        // --- Generate Textures ---
        this.createTextures();

        // --- Player ---
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.player = this.physics.add.sprite(centerX, centerY, 'player');
        this.player.setImmovable(true);
        this.player.postFX.addGlow(0x00ffff, 4, 0.5);

        // --- Groups ---
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image
        });

        // --- Spawner ---
        this.time.addEvent({
            delay: 1500,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // --- Colliders ---
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);

        // --- UI ---
        this.createUI();

        // --- Initial Loadout ---
        // Give player a Rifle to start
        this.addWeapon(WEAPON_TYPES.RIFLE);
    }

    createUI() {
        this.uiGroup = this.add.group();

        // 1. HUD (Top Left)
        const hudBg = this.add.graphics();
        hudBg.fillStyle(0x000000, 0.5);
        hudBg.fillRect(10, 10, 250, 100);
        this.uiGroup.add(hudBg);

        this.levelText = this.add.text(20, 20, `LVL: ${this.level}`, { fontSize: '20px', color: '#fff' });
        this.uiGroup.add(this.levelText);

        this.hpText = this.add.text(20, 50, `HP: ${this.currentHp}/${this.maxHp}`, { fontSize: '20px', color: '#ff0000' });
        this.uiGroup.add(this.hpText);

        this.expText = this.add.text(20, 80, `EXP: ${this.exp}/${this.maxExp}`, { fontSize: '20px', color: '#ffff00' });
        this.uiGroup.add(this.expText);

        // 2. Weapon Grid (3x2) - Visuals only for now, updated by renderWeaponGrid
        this.weaponContainer = this.add.container(20, 120);
        this.uiGroup.add(this.weaponContainer);
        this.renderWeaponGrid();
    }

    renderWeaponGrid() {
        this.weaponContainer.removeAll(true);

        const slotSize = 40;
        const gap = 5;

        for (let i = 0; i < 6; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const x = col * (slotSize + gap);
            const y = row * (slotSize + gap);

            // Slot BG
            const slot = this.add.rectangle(x + slotSize/2, y + slotSize/2, slotSize, slotSize, 0x333333);
            slot.setStrokeStyle(1, 0xffffff);
            this.weaponContainer.add(slot);

            // Weapon Content
            if (this.inventory[i]) {
                const weapon = this.inventory[i];
                // Simple representation: Colored square + Level
                const wIcon = this.add.rectangle(x + slotSize/2, y + slotSize/2, slotSize - 10, slotSize - 10, weapon.config.color);
                this.weaponContainer.add(wIcon);

                const lvlText = this.add.text(x + slotSize/2, y + slotSize/2, `${weapon.level}`, {
                    fontSize: '14px', color: '#000', fontStyle: 'bold'
                }).setOrigin(0.5);
                this.weaponContainer.add(lvlText);
            }
        }
    }

    createTextures() {
        // ... (Existing textures code) ...
        const hexGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        hexGraphics.lineStyle(2, 0xffffff);
        const hexRadius = 20;
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            points.push({
                x: hexRadius * Math.cos(angle_rad) + 22,
                y: hexRadius * Math.sin(angle_rad) + 22
            });
        }
        hexGraphics.strokePoints(points, true, true);
        hexGraphics.generateTexture('player', 44, 44);

        const squareGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        squareGraphics.lineStyle(2, 0xffffff);
        squareGraphics.strokeRect(2, 2, 28, 28);
        squareGraphics.generateTexture('enemy', 32, 32);

        const bulletGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bulletGraphics.fillStyle(0xffffff);
        bulletGraphics.fillCircle(6, 6, 4);
        bulletGraphics.generateTexture('bullet', 12, 12);
    }

    addWeapon(type) {
        const existing = this.inventory.find(w => w.type === type);
        if (existing) {
            existing.level++;
            // Apply stats scaling
            const scaling = WEAPONS[type].levelUp;
            for (const [key, val] of Object.entries(scaling)) {
                if (existing.stats[key] !== undefined) {
                    existing.stats[key] += val;
                }
            }
        } else {
            if (this.inventory.length >= 6) return; // Full

            const config = WEAPONS[type];
            this.inventory.push({
                type: type,
                level: 1,
                stats: { ...config.baseStats },
                config: config,
                lastFired: 0
            });
        }
        this.renderWeaponGrid();
    }

    spawnEnemy() {
        const width = this.scale.width;
        const height = this.scale.height;
        let x, y;

        const edge = Phaser.Math.Between(0, 3);
        const buffer = 50;

        switch(edge) {
            case 0: x = Phaser.Math.Between(0, width); y = -buffer; break;
            case 1: x = Phaser.Math.Between(0, width); y = height + buffer; break;
            case 2: x = -buffer; y = Phaser.Math.Between(0, height); break;
            case 3: x = width + buffer; y = Phaser.Math.Between(0, height); break;
        }

        const enemy = this.enemies.create(x, y, 'enemy');
        enemy.postFX.addGlow(0xff0000, 4, 0.8);
        this.physics.moveToObject(enemy, this.player, 100);
        enemy.setAngularVelocity(50);
        enemy.hp = 3 + (this.level * 1); // Scale HP slightly with level
        enemy.maxHp = enemy.hp;
    }

    update(time, delta) {
        // Weapon Firing Logic
        this.inventory.forEach(weapon => {
            if (time > weapon.lastFired + weapon.stats.fireRate) {
                this.fireWeapon(weapon, time);
            }
        });

        // Homing Logic for Missiles
        this.bullets.children.each(bullet => {
            if (bullet.active) {
                // Cleanup off-screen
                if (!this.cameras.main.worldView.contains(bullet.x, bullet.y)) {
                    bullet.destroy();
                    return;
                }

                if (bullet.data && bullet.data.get('movementType') === MOVEMENT_TYPES.HOMING) {
                    this.updateHomingBullet(bullet);
                }
            }
        });
    }

    fireWeapon(weapon, time) {
        // Find closest enemy
        let closestEnemy = null;
        let closestDist = Infinity;

        this.enemies.children.each(enemy => {
            if (enemy.active) {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
        });

        // Simple firing condition: Only fire if enemy exists (except maybe some weapons fire anyway?)
        // Let's enforce 500px range for most weapons to avoid off-screen spam
        if (closestEnemy && closestDist < 500) {
            const count = weapon.stats.projectileCount || 1;

            for(let i=0; i<count; i++) {
                // Slight spread if multiple
                const spreadAngle = (i - (count-1)/2) * 0.2;

                const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
                bullet.setTint(weapon.config.color);
                bullet.postFX.addGlow(weapon.config.color, 2, 0.5);

                // Store stats on bullet
                bullet.damage = weapon.stats.damage;
                bullet.boomZone = weapon.stats.boomZone;
                bullet.setData('movementType', weapon.stats.movementType);
                bullet.setData('target', closestEnemy);
                bullet.setData('speed', weapon.stats.projectileSpeed);

                // Initial Velocity
                if (weapon.stats.movementType === MOVEMENT_TYPES.STRAIGHT) {
                    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, closestEnemy.x, closestEnemy.y);
                    this.physics.velocityFromRotation(angle + spreadAngle, weapon.stats.projectileSpeed, bullet.body.velocity);
                } else if (weapon.stats.movementType === MOVEMENT_TYPES.HOMING) {
                    // Start in random direction or towards enemy
                    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, closestEnemy.x, closestEnemy.y);
                     this.physics.velocityFromRotation(angle + spreadAngle, weapon.stats.projectileSpeed, bullet.body.velocity);
                }
            }

            weapon.lastFired = time;
        }
    }

    updateHomingBullet(bullet) {
        const target = bullet.getData('target');
        const speed = bullet.getData('speed');

        if (target && target.active) {
            const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, target.x, target.y);
            // Lerp rotation for smooth turning
            // Simple way: just set velocity towards target again
            // For better homing: Accelerate towards target
            this.physics.moveToObject(bullet, target, speed);
        }
    }

    hitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;

        // Handle AoE
        if (bullet.boomZone > 0) {
            this.createExplosion(bullet.x, bullet.y, bullet.boomZone, bullet.damage);
        } else {
            this.dealDamage(enemy, bullet.damage);
        }

        // Destroy bullet unless it has pierce (not impl yet)
        bullet.destroy();
    }

    createExplosion(x, y, radius, damage) {
        // Visual
        const circle = this.add.circle(x, y, radius, 0xffffff, 0.5);
        this.tweens.add({
            targets: circle,
            scale: 1.5,
            alpha: 0,
            duration: 200,
            onComplete: () => circle.destroy()
        });

        // Logic
        this.enemies.children.each(enemy => {
            if (enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius) {
                this.dealDamage(enemy, damage);
            }
        });
    }

    dealDamage(enemy, damage) {
        enemy.hp -= damage;
        this.showDamagePopup(enemy.x, enemy.y, damage);

        if (enemy.hp <= 0 && enemy.active) {
            enemy.destroy(); // Mark inactive
            this.gainExp(10);
        }
    }

    gainExp(amount) {
        this.exp += amount;
        if (this.exp >= this.maxExp) {
            this.exp -= this.maxExp;
            this.levelUp();
        }
        this.updateHUD();
    }

    updateHUD() {
        this.levelText.setText(`LVL: ${this.level}`);
        this.hpText.setText(`HP: ${this.currentHp}/${this.maxHp}`);
        this.expText.setText(`EXP: ${this.exp}/${this.maxExp}`);
    }

    levelUp() {
        this.level++;
        this.maxExp = Math.floor(this.maxExp * 1.2);
        this.updateHUD();

        // Pause Game and Show Selection
        this.scene.pause();
        this.showCardSelection();
    }

    showCardSelection() {
        // Simple HTML/DOM overlay or Phaser UI?
        // Let's use Phaser UI container
        const width = this.scale.width;
        const height = this.scale.height;

        const container = this.add.container(width/2, height/2);
        container.setDepth(100); // On top

        // Background
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8);
        bg.setInteractive(); // Block clicks
        container.add(bg);

        const title = this.add.text(0, -200, 'LEVEL UP!', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
        container.add(title);

        // Pick 3 random weapons
        const options = [];
        const keys = Object.values(WEAPON_TYPES);
        for(let i=0; i<3; i++) {
            const randomKey = Phaser.Utils.Array.GetRandom(keys);
            options.push(WEAPONS[randomKey]);
        }

        // Draw Cards
        options.forEach((opt, index) => {
            const xOffset = (index - 1) * 250;
            const card = this.add.rectangle(xOffset, 0, 220, 300, 0x222222).setInteractive();
            card.setStrokeStyle(2, opt.color);

            const name = this.add.text(xOffset, -100, opt.name, { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
            const desc = this.add.text(xOffset, 0, opt.description, { fontSize: '16px', color: '#ccc', wordWrap: { width: 200 } }).setOrigin(0.5);

            // Stats preview (simplified)
            let statsText = `DMG: ${opt.baseStats.damage}\nSPD: ${opt.baseStats.projectileSpeed}`;
            const info = this.add.text(xOffset, 80, statsText, { fontSize: '14px', color: '#aaa' }).setOrigin(0.5);

            // Click Event
            card.on('pointerdown', () => {
                const weaponKey = Object.keys(WEAPONS).find(key => WEAPONS[key] === opt);
                this.addWeapon(weaponKey);
                container.destroy();
                this.scene.resume();
            });

            // Hover effect
            card.on('pointerover', () => card.setFillStyle(0x444444));
            card.on('pointerout', () => card.setFillStyle(0x222222));

            container.add([card, name, desc, info]);
        });
    }

    hitPlayer(player, enemy) {
        this.currentHp -= 10;
        this.updateHUD();

        enemy.destroy();

        if (this.currentHp <= 0) {
            this.physics.pause();
            player.setTint(0xff0000);
            const gameOverText = this.add.text(this.scale.width/2, this.scale.height/2, 'GAME OVER', {
                fontSize: '64px',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            gameOverText.setShadow(0, 0, 20, '#ff0000', 4);
        }
    }

    showDamagePopup(x, y, damage) {
        const text = this.add.text(x, y, Math.floor(damage).toString(), {
            fontSize: '20px',
            color: '#fff'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: y - 30,
            alpha: 0,
            duration: 800,
            onComplete: () => text.destroy()
        });
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#050505',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: MainScene
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
