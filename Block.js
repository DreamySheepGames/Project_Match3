class Block extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        this.scene = scene;
        this.scene.add.existing(this);
        this.setInteractive();
    }

    // Method to destroy the block
    destroyBlock() {
        this.destroy();
    }
}

//export default Block;
