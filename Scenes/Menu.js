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

        const playBtn = new CustomButton(this, config.width/2, 300, "button", "buttonPressed", "PLAY");
        playBtn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
            this.scene.start("levelSelect");
        })
    }
}