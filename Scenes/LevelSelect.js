class LevelSelect extends Phaser.Scene {
    constructor() {
        super("levelSelect");
    }

    // preload() {
    //     // Load the JSON file
    //     this.load.json('sampleLevel', 'path/to/SampleLevel.json');
    // }

    create() {
        // Example of starting Level1
        const levelToStart = "Level1";
        this.scene.start('playGame', { levelKey: levelToStart });
    }
}