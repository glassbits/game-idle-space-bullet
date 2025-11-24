import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.lastFired = 0;
        this.fireRate = 500; // ms
        this.score = 0;
        this.scoreText = null;
    }

    preload() {
        // No assets to preload, we generate them procedurally
    }

    create() {
        // --- Generate Textures ---
        this.createTextures();

        // --- Player ---
        // Center of the screen
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.player = this.physics.add.sprite(centerX, centerY, 'player');
        this.player.setImmovable(true);
        // White line, White/Cyan glow
        this.player.postFX.addGlow(0x00ffff, 4, 0.5);

        // --- Groups ---
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group({
            classType: Phaser.Physics.Arcade.Image
        });

        // --- Spawner ---
        // Spawn enemy every 1.5 seconds
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
        this.scoreText = this.add.text(20, 20, 'EXP: 0', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        });
        this.scoreText.setShadow(0, 0, 10, '#ffffff', 2);
    }

    createTextures() {
        // 1. Player Hexagon
        const hexGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        hexGraphics.lineStyle(2, 0xffffff);
        // Draw hexagon
        const hexRadius = 20;
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            points.push({
                x: hexRadius * Math.cos(angle_rad) + 22, // Offset to center in texture
                y: hexRadius * Math.sin(angle_rad) + 22
            });
        }
        hexGraphics.strokePoints(points, true, true);
        hexGraphics.generateTexture('player', 44, 44);

        // 2. Enemy Square
        const squareGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        squareGraphics.lineStyle(2, 0xffffff);
        squareGraphics.strokeRect(2, 2, 28, 28); // 32x32 texture roughly
        squareGraphics.generateTexture('enemy', 32, 32);

        // 3. Bullet (Circle/Line)
        const bulletGraphics = this.make.graphics({ x: 0, y: 0, add: false });
        bulletGraphics.fillStyle(0xffffff);
        bulletGraphics.fillCircle(6, 6, 4);
        bulletGraphics.generateTexture('bullet', 12, 12);
    }

    spawnEnemy() {
        // Spawn at random edge
        const width = this.scale.width;
        const height = this.scale.height;
        let x, y;

        const edge = Phaser.Math.Between(0, 3);
        const buffer = 50;

        switch(edge) {
            case 0: // Top
                x = Phaser.Math.Between(0, width);
                y = -buffer;
                break;
            case 1: // Bottom
                x = Phaser.Math.Between(0, width);
                y = height + buffer;
                break;
            case 2: // Left
                x = -buffer;
                y = Phaser.Math.Between(0, height);
                break;
            case 3: // Right
                x = width + buffer;
                y = Phaser.Math.Between(0, height);
                break;
        }

        const enemy = this.enemies.create(x, y, 'enemy');
        // White line, Red glow
        enemy.postFX.addGlow(0xff0000, 4, 0.8);

        // Physics
        this.physics.moveToObject(enemy, this.player, 100); // Speed 100

        // Rotation (optional, but squares usually don't need rotation unless they face target)
        // Let's make them spin slowly for effect
        enemy.setAngularVelocity(50);

        enemy.hp = 3;
    }

    update(time, delta) {
        // Auto fire
        if (time > this.lastFired) {
            this.fireBullet(time);
        }

        // Cleanup bullets that go off screen
        this.bullets.children.each(bullet => {
            if (bullet.active && !this.cameras.main.worldView.contains(bullet.x, bullet.y)) {
                bullet.destroy();
            }
        });
    }

    fireBullet(time) {
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

        if (closestEnemy && closestDist < 400) { // Range 400
            const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
            bullet.postFX.addGlow(0xffffff, 2, 0.5);

            this.physics.moveToObject(bullet, closestEnemy, 400); // Speed 400
            this.lastFired = time + this.fireRate;
        }
    }

    hitEnemy(bullet, enemy) {
        if (!bullet.active || !enemy.active) return;

        bullet.destroy();
        enemy.hp--;

        // Show damage number
        this.showDamagePopup(enemy.x, enemy.y, 1);

        if (enemy.hp <= 0) {
            enemy.destroy();
            this.score += 10;
            this.scoreText.setText('EXP: ' + this.score);
        }
    }

    hitPlayer(player, enemy) {
        // Game Over logic
        this.physics.pause();
        player.setTint(0xff0000);

        const gameOverText = this.add.text(this.scale.width/2, this.scale.height/2, 'GAME OVER', {
            fontSize: '64px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        gameOverText.setShadow(0, 0, 20, '#ff0000', 4);
    }

    showDamagePopup(x, y, damage) {
        const text = this.add.text(x, y, damage.toString(), {
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
    type: Phaser.AUTO, // Will use WebGL if available (needed for FX)
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

// Handle resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
