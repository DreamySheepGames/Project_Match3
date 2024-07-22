class Lock extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, initialLevel, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.scene.add.existing(this);
        this.level = initialLevel;
        this.updateLockSprite();
        this.disableInteractive();
    }

    // Method to decrease the lock level
    decreaseLevel() {
        this.level--;
        this.updateLockSprite();
    }

    // Method to update the lock sprite based on the current lock level
    updateLockSprite() {
        switch (this.level)
        {
            case 0:
                this.destroyLock();
                break;

            case 1:
                this.setTexture('lock');
                break;

            case 2:
                this.setTexture('lock2');
                break;
        }
    }

    changeTexture(newTextureKey) {
        this.setTexture(newTextureKey);
    }

    // Method to destroy the lock
    destroyLock() 
    {
        this.destroy();
    }
}
