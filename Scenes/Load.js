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

        this.load.image('row', 'assets/Gems/Gems Row.png');
        this.load.image('column', 'assets/Gems/Gems Column.png');
        this.load.image('cross', 'assets/Gems/Gems Cross.png');
        this.load.image('color', 'assets/Gems/Gems Color.png');
        this.load.image('lock', 'assets/Gems/lock.png');
        this.load.image('lock2', 'assets/Gems/lock2.png');

        this.load.image('block', 'assets/RoundedBlocks/ground.png');
        this.load.image('block2', 'assets/RoundedBlocks/iceCave.png');
        this.load.image('background1', 'assets/Backgrounds/BG1.jpg');

        this.load.image('frame', 'assets/Frame/frame.png');
    }

    create()
    {
        this.add.text(20, 20, "Loading...");
        this.scene.start("playGame");
    }
}