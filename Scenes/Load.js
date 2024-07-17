class Load extends Phaser.Scene
{
    constructor()
    {
        super("bootGame");
    }

    preload()
    {
        this.load.image('blue', 'assets/Gems/Gems A 6.png');
        this.load.image('green', 'assets/Gems/Gems A 2.png');
        this.load.image('red', 'assets/Gems/Gems A 4.png');
        this.load.image('purple', 'assets/Gems/Gems A 1.png');
        this.load.image('cyan', 'assets/Gems/Gems A 5.png');
        this.load.image('yellow', 'assets/Gems/Gems A 3.png');
        this.load.image('air', 'assets/Gems/Gems Air.png');

        this.load.image('block', 'assets/RoundedBlocks/ground.png');
        this.load.image('background1', 'assets/Backgrounds/BG1.jpg');
    }

    create()
    {
        this.add.text(20, 20, "Loading...");
        this.scene.start("playGame");
    }
}