class Menu extends Phaser.Scene
{
    constructor()
    {
        super("menu");
    }

    create()
    {
        this.add.text(20, 20, "MENU");

        // Background
        this.background = this.add.image(config.width/2, config.height/2, 'background1');
        this.background.setOrigin(0.5, 0.5);
        this.background.setScale(1.6);

        // Game name
        var btnPlayText = this.add.text(config.width/2, 100, "DIAMONDS", {
            fontSize: '128px',
            color: '#000000'
        }).setOrigin(0.5, 0.5);

        // buttons
        var btnPlay = this.add.image(config.width/2, 300, "button")
        .setInteractive()
        .setOrigin(0.5, 0.5)
        .setScale(2)
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
            this.scene.start("levelSelect");
        })

        // Create text and position it over the button
        var btnPlayText = this.add.text(0, 0, "PLAY", {
            fontSize: '32px',
            color: '#000000'
        }).setOrigin(0.5, 0.5);

        // Group the button and text together if you need to move or manipulate them together
        var playButtonGroup = this.add.container(0, 0, [btnPlay, btnPlayText]);

        // Optional: If you want to add some offset to the text position to align it perfectly
        btnPlayText.setX(btnPlay.x);
        btnPlayText.setY(btnPlay.y - 10);
    }
}