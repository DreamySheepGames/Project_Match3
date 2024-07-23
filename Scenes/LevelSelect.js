class LevelSelect extends Phaser.Scene {
    constructor() {
        super("levelSelect");
    }

    create() {
        // Example of starting Level1
        const levelToStart = 1;
        this.scene.start('playGame', { levelIndex: levelToStart });
    }
}