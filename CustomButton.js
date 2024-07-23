class CustomButton extends Phaser.GameObjects.Container
{
    constructor(scene, x, y, upTexture, overTexture, buttonText)
    {
        super(scene, x, y)
        this.scene = scene;
        this.upImage = scene.add.image(x, y, upTexture);
        this.overImage = scene.add.image(x, y, overTexture);
        this.scene.add.text(x, y - 8, buttonText, {
                fontSize: '32px',
                color: '#000000'
            }).setOrigin(0.5, 0.5);

        this.setSize(this.upImage.width * 2, this.upImage.height * 2)

        // scale image (I only use this because I can't find a button sprite that is large enough)
        this.upImage.setScale(2);
        this.overImage.setScale(2);

        this.overImage.setVisible(false);

        this.setInteractive()
            .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
                this.upImage.setVisible(false);
                this.overImage.setVisible(true);
            })
            .on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
                this.upImage.setVisible(true);
                this.overImage.setVisible(false);
            })
    }
}