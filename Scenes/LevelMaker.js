class LevelMaker extends Phaser.Scene
{
    constructor() {
        super('playGame');
    }

    init(data) {
        this.currentLevelIndex = data.levelIndex //|| 1 // Start from level 1 if no data passed
        this.levelKey = `level${this.currentLevelIndex}`;
        //this.levelKey = data.levelKey;
    }

    create()
    {
        // not important
        this.add.text(20, 20, `Level ${this.currentLevelIndex}`);

        // json reader
        var sampleLevel = this.cache.json.get('sampleLevel');
        var levelData = sampleLevel[this.levelKey.toLowerCase()];
        
        // next level
        // go to the next level at incrementTargetCount()
        this.nextLevel = this.currentLevelIndex + 1;

        // set tile dimension
        // only the bottom half of the tile grid is seen and interactable, remember to also modify this.topMargin after you change levelHeight
        this.levelHeight = levelData.gridDimension.levelHeight;
        this.levelLength = levelData.gridDimension.levelLength;

        // set tile postition
        this.leftMargin = levelData.margin.leftMargin;
        this.topMargin = levelData.margin.topMargin;

        // the size of the gems
        this.tileSize = levelData.tile.tileSize;
        
        // Gem drop tween ease
        this.dropTweenEase = levelData.tile.dropTweenEase;
        //this.dropTweenEase = 'Linear';

        // Declare assets that will be used as tiles
        this.tileTypes = levelData.tile.tileTypes;

        // Declare gem modes:
        // normal: self explained
        // horizontal: when removed, destroy the whole row it is moved to
        // vertical: when removed, destroy the whole column it is moved to
        // color: when removed, destroy every gem that has the same color with the gem it is swapped with
        // cross: when rememoved: destroy the whole row AND column it is moved to
        // BIG NOTE: 'normal' MUST be at first and 'air' MUST be at last
        this.tileMode = levelData.tile.tileMode;

        // set time duration for actions and tweening, I don't recommend we change this
        this.durationFill = 700;                           // the time it takes to fill the tile grid
        this.durationSwap = 100;                            // the time it takes to swap 2 gems' position
        this.durationCheckMatch = 200;                      // the time it takes to check for a match-3 after swapping so we can remove the gems
        this.durationCheckMatchAgain = 500;                 // the time it takes to check for a match-3 again after removing the gems

        this.durationTileUp = 50;           // the time it takes to reset the activated gems (the gems we clicked on) to null , I don't recommend modifying this value

        this.halfRows = Math.ceil(this.levelHeight / 2);

        //background
        this.background = this.add.image(config.width/2, config.height/2, 'background1');
        this.background.setOrigin(0.5, 0.5);
        this.background.setScale(1.6);

        this.score = 0;

        // Keep track which tiles the user is trying to swap
        this.activeTile1 = null;
        this.activeTile2 = null;

        // Controls whether the player can make a move or not
        this.canMove = false;
        this.isFilling = true;

        // destroyTile helper
        // this.horizontalTile = null;
        // this.verticalTile = null;

        // get the width and height of tiles
        let blueTileTexture = this.textures.get(this.tileTypes[0]).getSourceImage();
        this.tileWidth = blueTileTexture.width;
        this.tileHeight = blueTileTexture.height;

        //this.add.text(40, 40, `Tile Width: ${this.tileWidth}, Tile Height: ${this.tileHeight}`);

        //This will hold all of the tile sprites
        this.tiles = this.add.group();

        // Create tilegrid, so the tile grid is kinda like below

        // this.tileGrid = [
        //     [null, null, null, null, null, null],
        //     [null, null, null, null, null, null],
        //     [null, null, null, null, null, null],
        //     [null, null, null, null, null, null],
        //     [null, null, null, null, null, null],
        //     [null, null, null, null, null, null],
        // ];

        // tileGrid[x][y], but as shown above, x is actually y because x decide which row the item is
        // while y decides which x position in the row the item is. So it is more like this: tileGrid[row][column]

        this.tileGrid = [];
        for (var i = 0; i < this.levelHeight; i++) {
            this.tileGrid[i] = new Array(this.levelLength).fill(null);
        }

        // fill the tile grid from what column to what column
        // example: if you want to fill all of the column then fillStart = 0, fillEnd = this.levelLength (var j = fillStart; j < fillEnd; j++)
        this.fillStart = levelData.filling.fillStart;
        this.fillEnd = levelData.filling.fillEnd;       

        // array to contain frames
        this.frameGrid = [];
        for (var i = 0; i < this.levelHeight; i++) {
            this.frameGrid[i] = new Array(this.levelLength).fill(null)
        }

        // the grid for the targets that we need to destroy
        this.blockGrid = [];
        for (var i = 0; i < this.levelHeight; i++) {
            this.blockGrid[i] = new Array(this.levelLength).fill(null);
        }

        // grid for the locks of the tile grid so the player can't interact with that tile
        this.lockGrid = [];
        for (var i = 0; i < this.levelHeight; i++) {
            this.lockGrid[i] = new Array(this.levelLength).fill(null);
        }

        // where to put the air block [row, column]
        this.airPos = levelData.positions.airPos;
        this.removeFramePos = levelData.positions.removeFramePos;
        // where to put the block tile that needs to be destroyed to go to the next level [row, column]
        this.blockPos = levelData.positions.blockPos;
        this.blockHardness2Pos = levelData.positions.blockHardness2Pos;
        // where to put the lock
        this.lockPos = levelData.positions.lockPos;
        this.lockLevel2Pos = levelData.positions.lockLevel2Pos;

        // for diagonally slide mechanic, (row, column, diagonal slide left, diagonal slide right)
        this.railwaySwitches = [];

        if (levelData.railwaySwitches) {
            levelData.railwaySwitches.forEach(item => {
                this.addRailwaySwitchTile(item.row, item.column, item.diagonalLeft, item.diagonalRight);
            });
        }

        // the tile slides "out" to the "null" tile spot
        // this.addRailwaySwitchTile(12, 1, true, false);
        // this.addRailwaySwitchTile(12, 14, false, true);

        // Bottom left corner, this is just for testing, usually we don't use this because we already got vertical drop
        // this.addRailwaySwitchTile(14, 0, false, true);
        // this.addRailwaySwitchTile(15, 1, false, true);

        // at mid tilegrid
        // this.addRailwaySwitchTile(15, 6, false, true);
        // this.addRailwaySwitchTile(15, 9, true, false);

        // bottom right corner, this code doesn't really work, not because it's broken, it actually works, it's just because we scan the tile grid from left to right
        // so because of that, the vertical drop of the left column is prioritzed over the diagonal slide to left of the right column
        // the diagonal slide to the left above still works though
        // this.addRailwaySwitchTile(14, 15, true, false);
        // this.addRailwaySwitchTile(15, 14, true, false);

        // railwaySwitch for locks
        // this.addRailwaySwitchTile(11, 5, true, false);
        // this.addRailwaySwitchTile(15, 4, false, true);
        // this.addRailwaySwitchTile(11, 10, false, true);
        // this.addRailwaySwitchTile(15, 11, true, false);
        
        //Create a random data generator to use later
        var seed = Date.now();
        this.random = new Phaser.Math.RandomDataGenerator([seed]);
        //this.add.text(40, 40, `Log: ${this.random}`);

        this.initTiles();
        this.setBlockHardness();
        this.setLockLevel();

        //After done spawning tiles, we check if there are matches
        this.time.delayedCall(this.durationFill, function() {
            this.checkMatch();
        }, null, this);

        this.createScore();
        this.incrementScore();

        this.targetCount = 0;
        this.createTargetCount();
        this.incrementTargetCount(this.blockPos);

        // buttons
        const restartLvBtn = new CustomButton(this, 80, 570, "button", "buttonPressed", "RESTART LV", 18);
        restartLvBtn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
            this.scene.start('playGame', { levelIndex: this.currentLevelIndex });
        })

        const menuBtn = new CustomButton(this, 80, 650, "button", "buttonPressed", "MENU", 32);
        menuBtn.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
            this.scene.start("menu");
        })
    }

    initTiles()
    {
        // add frame at the postion that is not air block
        // row
        for(var i = this.levelHeight - Math.floor(this.levelHeight/2); i < this.levelHeight; i++)
        {
            // column
            for(var j = 0; j < this.levelLength; j++)
            {
                if (!this.airPos.some(pos => pos[0] === i && pos[1] === j)) 
                {
                    var frame = this.addFrame(i, j);
    
                    // Keep track of the tile's position in our tileGrid
                    this.frameGrid[i][j] = frame;
                }
            }
        }

        // remove frame at removeFramePos[]
        // row
        for(var i = this.levelHeight - this.halfRows; i < this.levelHeight; i++)
        {
            // column
            for(var j = 0; j < this.levelLength; j++)
            {
                if (this.frameGrid[i][j] && this.removeFramePos.some(pos => pos[0] === i && pos[1] === j)) 
                {
                    this.frameGrid[i][j].destroy();
                    this.frameGrid[i][j] = null;
                }
            }
        }

        // add target/background blocks
        for (var k = 0; k < this.blockPos.length; k++) 
        {
            var pos = this.blockPos[k];
            this.addBlock(pos[0], pos[1]);
        }

        // add air blocks
        for(var i = 0; i < this.tileGrid.length; i++)
        {
            // column
            for(var j = 0; j < this.levelLength; j++)
            {
                // put air block in init loop
                if (this.airPos.some(pos => pos[0] === i && pos[1] === j))
                {
                    var tile = this.tiles.create((j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                           //x
                                -((this.levelHeight - i - Math.floor(this.levelHeight / 2)) * this.tileHeight),                                     //y
                                'air');
                    tile.tileMode = this.tileMode[this.tileMode.length - 1];
                    tile.disableInteractive();
                    this.tileGrid[i][j] = tile;
                }
            }
        }

        // add tiles
        // row
        for(var i = 0; i < this.tileGrid.length; i++)
        {
            // column
            for(var j = this.fillStart; j < this.fillEnd; j++)
            {
                // Add the tile to the game at this grid position where is not for air block
                if (!this.airPos.some(pos => pos[0] === i && pos[1] === j)) 
                {
                    var tile = this.addTile(i, j);

                    // Keep track of the tile's position in our tileGrid
                    this.tileGrid[i][j] = tile;
                }
            }
        }

        // add locks
        for (var k = 0; k < this.lockPos.length; k++) 
        {
            var pos = this.lockPos[k];
            this.addLock(pos[0], pos[1]);
        }

        // var sampleLevel = this.cache.json.get('sampleLevel');
        // console.log(sampleLevel.level[0]);

        this.resetTile();
        this.fillTile();
    }

    addFrame(i, j) 
    {
        const frame = new Block(this, (j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                          //x
                                       i * this.tileHeight + (this.tileHeight / 2) + this.topMargin,                        //y
                                    'frame');                                                                               // texture
        frame.setOrigin(0.5, 0.5);
        frame.setScale(1);
        //this.frameGrid[i][j] = frame;
        return frame;
    }

    // the background blocks that player needs to destroy to win the level
    addBlock(i, j) 
    {
        const block = new Block(this, (j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                          //x
                                       i * this.tileHeight + (this.tileHeight / 2) + this.topMargin,                        //y
                                    'block');                                                                               // texture
        block.setOrigin(0.5, 0.5);
        block.setScale(1);
        this.blockGrid[i][j] = block;
    }

    setBlockHardness()
    {
        if (this.blockHardness2Pos)
        {
            // scan through all the block in blockGrid
            for (var row = 0; row < this.levelHeight; row++)
            {
                for (var column = 0; column < this.levelLength; column++)
                {
                    // if this block in blockGrid is in the blockHardness2Pos then change its hardness to 2
                    if (this.blockHardness2Pos.some(pos => pos[0] === this.getTilePos(this.blockGrid, this.blockGrid[row][column]).y
                    && pos[1] === this.getTilePos(this.blockGrid, this.blockGrid[row][column]).x))
                    {
                        this.blockGrid[row][column].hardness = 2;

                        // we can change tile sprite for hardness level 2
                        this.blockGrid[row][column].changeTexture('block2');
                    }
                }
            }
        }
    }

    addLock(i, j) 
    {
        const lock = new Lock(this, (j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                            //x
                                    i * this.tileHeight + (this.tileHeight / 2) + this.topMargin,                           //y
                                    1,                                                                                      //lock level
                                    'lock');                                                                                // texture
        lock.setOrigin(0.5, 0.5);
        lock.setScale(1);
        this.lockGrid[i][j] = lock;
        
        this.tileGrid[i][j].isLocked = true;
    }

    setLockLevel()
    {
        if (this.lockLevel2Pos)
        {
            // scan through all the lock in lockGrid
            for (var row = 0; row < this.levelHeight; row++)
            {
                for (var column = 0; column < this.levelLength; column++)
                {
                    // if this lock in the lockGrid is in the lockLevel2Pos then change its level to 2
                    if (this.lockLevel2Pos.some(pos => pos[0] === this.getTilePos(this.lockGrid, this.lockGrid[row][column]).y
                    && pos[1] === this.getTilePos(this.lockGrid, this.lockGrid[row][column]).x))
                    {
                        this.lockGrid[row][column].level = 2;

                        // we can change tile sprite for hardness level 2
                        this.lockGrid[row][column].changeTexture('lock2');
                    }
                }
            }
        }
    }

    // for diagonally sliding
    addRailwaySwitchTile(row, column, diagonalLeft = false, diagonalRight = false) {
        var switchTile = new RailwaySwitchTile(row, column, diagonalLeft, diagonalRight);
        this.railwaySwitches.push(switchTile);
    }

    addTile(i, j)
    {
        this.isFilling = true;

        //Choose a random tile to add
        //this.tileTypes.length - 2 because we don't want to spawn air tile
        var tileToAdd = this.tileTypes[this.random.integerInRange(0, this.tileTypes.length - 2)];

        //Add the tile at the correct x position, but add it to the top of the game (so we can slide it in)
        var tile = this.tiles.create((j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                          //x
                                    -((this.levelHeight - i - Math.floor(this.levelHeight / 2)) * this.tileHeight),        //y
                                    tileToAdd);

        // this is for special effect like destroying row/column/color/cross
        //tile.overlaySprite;
        tile.isLocked = false;
        tile.setScale(this.tileSize);

        //Animate the tile into the correct vertical position
        this.tweens.add({
            targets: tile,
            y: i * this.tileHeight + (this.tileHeight / 2) + this.topMargin,
            duration: this.durationFill,
            ease: this.dropTweenEase,
            repeat: 0,
            yoyo: false
        });
        

        //Set the tiles anchor point to the center
        tile.setOrigin(0.5, 0.5);

        //Enable input on the tile
        //tile.inputEnabled = true;
        tile.setInteractive();

        //Keep track of the type of tile that was added
        tile.tileType = tileToAdd;
        tile.tileMode = this.tileMode[0];

        //this.add.text(40, 600, `Log: ${tile.input.enabled}`);

        //Trigger the tileDown function whenever the user clicks or taps on this tile
        //tile.on('pointerdown', this.tileDown, this);
        tile.on('pointerdown', function()
        {
            this.tileDown(tile)
        }, this);

        return tile;
    }

    tileDown(tile)
    {
        //Keep track of where the user originally clicked
        if (this.canMove)
        {
            this.activeTile1 = tile;
            this.activeTile1.setScale(0.75);
            this.startPosX = (tile.x - this.leftMargin - this.tileWidth / 2) / this.tileWidth;
            this.startPosY = (tile.y - this.topMargin - this.tileHeight / 2) / this.tileHeight;
        }
    }

    update()
    {
        this.handleTiles();

        //The user is currently dragging from a tile, so let's see if they have dragged
        //over the top of an adjacent tile
        if (this.activeTile1 && !this.activeTile2)
        {
            var hoverX = this.input.x;
            var hoverY = this.input.y;

            //Figure out what position on the grid that translates to
            var hoverPosX = Math.floor((hoverX - this.leftMargin) / (this.tileWidth));
            var hoverPosY = Math.floor((hoverY - this.topMargin) / (this.tileHeight));
            
            //See if the user had dragged over to another position on the grid
            var difX = (hoverPosX - this.startPosX);
            var difY = (hoverPosY - this.startPosY);

            //Make sure we are within the bounds of the grid
            if(!(hoverPosY > this.levelHeight - 1 || hoverPosY < 0) && !(hoverPosX > this.levelLength - 1 || hoverPosX < 0))
            {
                //If the user has dragged an entire tiles width or height in the x or y direction
                //trigger a tile swap
                //if((Math.abs(difY) == 1 && difX == 0) || (Math.abs(difX) == 1 && difY == 0))
                if(((Math.abs(Math.floor(difY)) == 1 && Math.floor(difX) == 0) || (Math.abs(Math.floor(difX)) == 1 && Math.floor(difY) == 0)) && !this.isFilling)
                {
                    //Prevent the player from making more moves whilst checking is in progress
                    this.canMove = false;

                    //Set the second active tile (the one where the user dragged to)
                    this.activeTile2 = this.tileGrid[hoverPosY][hoverPosX];

                    // if active tile 1 or 2 is air block or locked, or active tile 2 is null
                    if (this.activeTile2 && this.activeTile2.tileMode === this.tileMode[this.tileMode.length - 1]
                    || this.activeTile1.tileMode === this.tileMode[this.tileMode.length - 1] || this.activeTile2 == null
                    || this.activeTile1.isLocked || this.activeTile2.isLocked)
                    {
                        this.activeTile1.setScale(this.tileSize);
                        this.activeTile1 = null;
                        this.activeTile2 = null;

                    }

                    //Swap the two active tiles
                    this.swapTiles();

                    //After the swap has occurred, check the grid for any matches
                    this.time.delayedCall(this.durationCheckMatch, function() {
                        this.checkMatch();
                    }, null, this);
                }
            }
        }
    }

    swapTiles()
    {
        //If there are two active tiles, swap their positions
        if (this.activeTile1 && this.activeTile2)
        {
            this.activeTile1.setScale(this.tileSize);
            var tile1Pos = {x:(this.activeTile1.x - this.tileWidth / 2) / this.tileWidth, y:(this.activeTile1.y - this.tileHeight / 2) / this.tileHeight};
            var tile2Pos = {x:(this.activeTile2.x - this.tileWidth / 2) / this.tileWidth, y:(this.activeTile2.y - this.tileHeight / 2) / this.tileHeight};
            
            //Swap them in our "theoretical" grid
            var tile1InGridPosX = (this.activeTile1.x - this.tileWidth / 2 - this.leftMargin) / this.tileWidth      // return postition in int from 0
            var tile2InGridPosX = (this.activeTile2.x - this.tileWidth / 2 - this.leftMargin) / this.tileWidth
            var tile1InGridPosY = (this.activeTile1.y - this.tileWidth / 2 - this.topMargin) / this.tileHeight      // return postition in int from 0
            var tile2InGridPosY = (this.activeTile2.y - this.tileWidth / 2 - this.topMargin) / this.tileHeight

            if (Number.isInteger(tile1InGridPosY) && Number.isInteger(tile2InGridPosY))
            {
                this.tileGrid[tile1InGridPosY][tile1InGridPosX] = this.activeTile2;
                this.tileGrid[tile2InGridPosY][tile2InGridPosX] = this.activeTile1;

                //Actually move them on the screen
                this.tweens.add({
                    targets: this.activeTile1,
                    x:tile2Pos.x * this.tileWidth + (this.tileWidth/2),
                    y:tile2Pos.y * this.tileHeight + (this.tileHeight/2),
                    duration: this.durationSwap,
                    ease: 'Linear',
                    repeat: 0,
                    yoyo: false,
                });

                this.tweens.add({
                    targets: this.activeTile2,
                    x:tile1Pos.x * this.tileWidth + (this.tileWidth/2),
                    y:tile1Pos.y * this.tileHeight + (this.tileHeight/2),
                    duration: this.durationSwap,
                    ease: 'Linear',
                    repeat: 0,
                    yoyo: false,
                });

                this.activeTile1 = this.tileGrid[tile1InGridPosY][tile1InGridPosX];
                this.activeTile2 = this.tileGrid[tile2InGridPosY][tile2InGridPosX];
            }

            
        }
    }

    checkMatch()
    {
        // We need to check if the 2 tiles we are interacting are special tiles first
        if (this.activeTile2)
        {
            if (this.activeTile1.tileMode !== this.tileMode[0])
            {
                this.checkSpecialTile(this.activeTile2, this.activeTile1);
            }
            if (this.activeTile2.tileMode !== this.tileMode[0])
            {
                this.checkSpecialTile(this.activeTile1, this.activeTile2);
            }
        }

        // Call the getMatches function to check for spots where there is
        // a run of three or more tiles in a row to destroy or change tile mode
        // matches is a 3D array as shown belown:
        //           --- matches[0]: arrays of horizontal matches like: [[blue, blue, blue], [red, red, red],...]
        //  matches--|
        //           --- matches[1]: arrays of vertical matches like: [[yellow, yellow, yellow, yellow], [purple, purple, purple],...]
        var matches = this.getMatches(this.tileGrid);

        
        // if there is no matches
        if (matches[0].length == 0 && matches[1].length == 0)
        {
            //no match, no special tile, just swap back
            if (this.activeTile2 && this.activeTile2.tileMode == this.tileMode[0] && this.activeTile1.tileMode == this.tileMode[0])
                this.swapTiles();

            // if the grid isn't in filling session, player can make a move right after the swapping is done
            if (!this.isFilling)
            {
                this.time.delayedCall(this.durationSwap, function(){
                    this.tileUp();
                    this.canMove = true;
                }, null, this);
            }
            else    // if the grid is in filling session, isFilling will be turned off after the last fill tween is done
            {
                this.time.delayedCall(this.durationFill - this.durationCheckMatchAgain, function(){
                    this.isFilling = false;
                    this.canMove = true;
                }, null, this);
            }
        }
        else
        {
            //Remove the tiles
            this.removeTileGroup(matches);
            this.resetTile();
            this.fillTile();
            this.postFill();
        }
    }

    checkSpecialTile(clickedTile, swappedTile)
    {
        // if there are background blocks at the tiles we are interacting with then destroy them
        if (this.blockPos.some(pos => pos[1] == this.getTilePos(this.tileGrid, swappedTile).x && pos[0] == this.getTilePos(this.tileGrid, swappedTile).y))
        {
            this.destroyBackgroundBlockAtTile(swappedTile);
        }
        
        // if the tile is not normal mode, we will destroy the tile grid base on the tile's mode
        if (swappedTile.tileMode !== this.tileMode[0])
        {
            swappedTile.overlaySprite.destroy();

            // switch(gem mode) to execute
            switch(swappedTile.tileMode) 
            {
                // destroy the whole column
                case 'horizontal':
                    this.removeRow(swappedTile);
                    break;

                case 'vertical':
                    this.removeColumn(swappedTile);
                    break;

                case 'color':
                    this.destroyTilesOfSameType(swappedTile, clickedTile);
                    break;

                case 'cross':
                    this.destroyCross(swappedTile);
                    break;
            }
            // after destroy tiles with a special tile, move tiles down, fill blank space and check match again
            this.resetTile();           // move exsiting tiles down
            this.fillTile();            // fill the blank spaces after moving existing tiles down
            this.postFill();            // reset activeTile1 and 2 then check for new matches
        }
    }

    postFill()
    {
        //Trigger the tileUp event to reset the active tiles
        this.time.delayedCall(this.durationSwap, function(){
            this.tileUp();
        }, null, this);

        //Check again to see if the repositioning of tiles caused any new matches
        this.time.delayedCall(this.durationCheckMatchAgain, function(){
            this.checkMatch();
        }, null, this);
    }

    tileUp(){

        //Reset the active tiles
        this.activeTile1 = null;
        this.activeTile2 = null;
    }

    getMatches(tileGrid)
    {
        var matches = [];
        var matchesRow = [];
        var matchesColumn = [];
        var groups = [];

        //Check for horizontal matches, we only need to check from half row down to bottom row
        for (var i = tileGrid.length - Math.floor(this.levelHeight/2); i < tileGrid.length; i++)
        {
            var tempArr = tileGrid[i];
            groups = [];

            // loop through every item in row
            for (var j = 0; j < tempArr.length; j++)
            {
                if(j < tempArr.length - 2)  // because match 3, we will have to left the last 2 to check them
                {
                    if (tileGrid[i][j] && tileGrid[i][j + 1] && tileGrid[i][j + 2]) // check 3 tiles next to each other
                    {
                        if (tileGrid[i][j].tileType == tileGrid[i][j+1].tileType && tileGrid[i][j+1].tileType == tileGrid[i][j+2].tileType
                            && tileGrid[i][j].tileMode != this.tileMode[3] && tileGrid[i][j+1].tileMode != this.tileMode[3] && tileGrid[i][j+2].tileMode != this.tileMode[3]
                        ) // match 3
                        {
                            // we push more in if we already have a match-3 (the snippet below this snippet) but there is a match-4 or match-5...
                            if (groups.length > 0)
                            {
                                if (groups.indexOf(tileGrid[i][j]) == -1)
                                {
                                    matchesRow.push(groups);

                                    // here is where we reset the group array for new matches
                                    groups = [];
                                }
                            }
                            
                            // this is where we create a match-3
                            // the match-3 tiles are not in the groups yet, so we push them in
                            if (groups.indexOf(tileGrid[i][j]) == -1)
                            {
                                groups.push(tileGrid[i][j]);
                            }
                            if (groups.indexOf(tileGrid[i][j+1]) == -1)
                            {
                                groups.push(tileGrid[i][j+1]);
                            }
                            if (groups.indexOf(tileGrid[i][j+2]) == -1)
                            {
                                groups.push(tileGrid[i][j+2]);
                            }
                        }
                    }
                }
            }

            // if we pushed the matched tiles in the groups, we then push the groups data into matches
            //if (groups.length > 0) matches.push(groups);
            if (groups.length > 0) matchesRow.push(groups);
        }

        //Check for vertical matches, we check the columns from left to right
        //we also only need to check from half row down to bottom row
        for (i = 0; i < this.levelLength; i++)
        {
            //var tempArr = tileGrid[j];
            groups = [];
            for (j = tileGrid.length - Math.floor(this.levelHeight/2); j < tileGrid.length; j++)
            {
                if(j < tileGrid.length - 2)
                {
                    if (tileGrid[j][i] && tileGrid[j+1][i] && tileGrid[j+2][i])
                    {
                        if (tileGrid[j][i].tileType == tileGrid[j+1][i].tileType && tileGrid[j+1][i].tileType == tileGrid[j+2][i].tileType
                            && tileGrid[j][i].tileMode != this.tileMode[3] && tileGrid[j + 1][i].tileMode != this.tileMode[3] && tileGrid[j + 2][i].tileMode != this.tileMode[3]
                        )
                        {
                            if (groups.length > 0)
                            {
                                if (groups.indexOf(tileGrid[j][i]) == -1)
                                {
                                    matchesColumn.push(groups);
                                    groups = [];
                                }
                            }

                            if (groups.indexOf(tileGrid[j][i]) == -1)
                            {
                                groups.push(tileGrid[j][i]);
                            }
                            if (groups.indexOf(tileGrid[j+1][i]) == -1)
                            {
                                groups.push(tileGrid[j+1][i]);
                            }
                            if (groups.indexOf(tileGrid[j+2][i]) == -1)
                            {
                                groups.push(tileGrid[j+2][i]);
                            }
                        }
                    }
                }
            }

            //if(groups.length > 0) matches.push(groups);
            if(groups.length > 0) matchesColumn.push(groups);
        }

        matches.push(matchesRow);
        matches.push(matchesColumn);

        return matches;
    }

    removeTileGroup(matches)
    {
        // loop twice k = 0 for row matches, and k = 1 for vertical matches
        for (var k = 0; k < 2; k++)
        {
            //Loop through all the matches and remove the associated tiles
            for(var i = 0; i < matches[k].length; i++)
                {
                    var tempArr = matches[k][i];
                
                    for(var j = 0; j < tempArr.length; j++)
                    {
                        var tile = tempArr[j];

                        // if special tile then execute here
                        if (tile.tileMode != this.tileMode[0])
                        {
                            // we can only trigger cross destroy at k = 0
                            // else the cross destroy gem won't be created, it will be immediately triggered at k = 1 
                            if (tile.tileMode == this.tileMode[4])
                            {
                                if (k == 0 && !tile.isLocked)
                                    this.destroyTile(tile);
                            }
                            else
                                if (!tile.isLocked)
                                {
                                    this.destroyTile(tile);
                                }

                            this.activeTile1 = null;
                            this.activeTile2 = null;
                        }

                        // this is where we check if the tile will turn from normal mode to other modes
                        // if destroy 4 gems, the gem player clicked will turn to another mode (destroy row/column/color)

                        if (tile != null && tile == this.activeTile2)
                        {
                            this.changeTileMode(tile, tempArr, matches, k);
                        }

                        if (tile != null && tile == this.activeTile1)
                        {
                            this.changeTileMode(tile, tempArr, matches, k);
                        }

                        // if there are special matches without player's interaction
                        // the first tile's mode in the matches[] is changed
                        if ((!this.activeTile1 || !this.activeTile2) && tile == tempArr[0])
                        {
                            this.changeTileMode(tile, tempArr, matches, k);
                        }
                    
                        //Find where this tile lives in the theoretical grid
                        var tilePos = this.getTilePos(this.tileGrid, tile);
                    
                        //remove the tiles that is normal mode and not player clicked on, or the ones that is clicked on but stay normal after matching
                        // this is where we need the activate function
                        if ((tile != this.activeTile2 && tile.tileMode == this.tileMode[0]) || (tile == this.activeTile2 && tile.tileMode == this.tileMode[0])
                        || (tile != this.activeTile1 && tile.tileMode == this.tileMode[0]) || (tile == this.activeTile2 && tile.tileMode == this.tileMode[0]))
                        {
                            if (tile.isLocked)
                            {
                                this.destroyTile(tile) // decrease the lock level
                            }
                            else
                            {
                                this.tiles.remove(tile);
                                this.destroyTile(tile);
                                // remove from grid
                                if(tilePos.x != -1 && tilePos.y != -1)
                                    this.tileGrid[tilePos.y][tilePos.x] = null;
                            }
                        }
                    }
                
                    //scoring
                    this.incrementScore(tempArr);
                }
        }
    }

    changeTileMode(tile, tempArr, matches, k)
    {
        // check to turn tile to cross mode
        var horizontalMatches = this.flatten(matches[0]);
        var verticalMatches = this.flatten(matches[1]);
        
        if (tile.tileMode == this.tileMode[0] && verticalMatches.includes(tile) && horizontalMatches.includes(tile) && !tile.isLocked)
        {
            tile.tileMode = this.tileMode[4];
            
            if (k == 0)
            {
                var overlaySprite = this.add.sprite(tile.x, tile.y, 'cross');
                overlaySprite.setScale(this.tileSize); // If you need to scale it
                overlaySprite.setOrigin(0.5, 0.5);
                tile.overlaySprite = overlaySprite;
            }
        }

        if (tempArr.length == 4  && !tile.isLocked)
        {
            if (k == 0)
            {
                if (tile.tileMode == this.tileMode[0])
                {
                    tile.tileMode = this.tileMode[2];   // 1 horizontal match-4 = 1 destroy vertically mode gem
    
                    var overlaySprite = this.add.sprite(tile.x, tile.y, 'column');
                    overlaySprite.setScale(this.tileSize); // If you need to scale it
                    overlaySprite.setOrigin(0.5, 0.5);
                    tile.overlaySprite = overlaySprite;
                }
            }
            else
            {
                if (tile.tileMode == this.tileMode[0])
                {
                    tile.tileMode = this.tileMode[1];   // 1 vertical match-4 = 1 destroy horizontally mode gem
    
                    var overlaySprite = this.add.sprite(tile.x, tile.y, 'row');
                    overlaySprite.setScale(this.tileSize); // If you need to scale it
                    overlaySprite.setOrigin(0.5, 0.5);
                    tile.overlaySprite = overlaySprite;
                }
            }
        }

        // destroy color mode
        if (tile.tileMode == this.tileMode[0] && tempArr.length >= 5  && !tile.isLocked)
        {
            tile.tileMode = this.tileMode[3];
            
            var overlaySprite = this.add.sprite(tile.x, tile.y, 'color');
            overlaySprite.setScale(this.tileSize); // If you need to scale it
            overlaySprite.setOrigin(0.5, 0.5);
            tile.overlaySprite = overlaySprite;
        }
    }

    flatten(array) {
        return array.reduce((acc, val) => acc.concat(val), []);
    }

    getTilePos(tileGrid, tile)
    {
        var pos = {x:-1, y:-1};

        //Find the position of a specific tile in the grid
        for(var i = 0; i < tileGrid.length ; i++)
        {
            for(var j = 0; j < tileGrid[i].length; j++)
            {
                //There is a match at this position so return the grid coords
                if(tile == tileGrid[i][j])
                {
                    pos.x = j;
                    pos.y = i;
                    break;
                }
            }
        }

        return pos;
    }

    resetTile() {
        // Loop through each column from left to right
        for (var i = 0; i < this.levelLength; i++) {
            // Loop through each item in column
            for (var j = this.levelHeight - 1; j > 0; j--) {
                // Check if current position is a railway switch tile
                var isSwitchTile = this.railwaySwitches.some(switchTile => switchTile.row === j && switchTile.column === i);

                if (isSwitchTile) 
                {
                    var switchTile = this.railwaySwitches.find(switchTile => switchTile.row === j && switchTile.column === i);
                    if (switchTile.diagonalLeft && this.tileGrid[j - 1][i]) 
                    {
                        if (this.tileGrid[j][i - 1] == null)
                        {
                            // Move tile diagonally left
                            var tempTile = this.tileGrid[j - 1][i];
                            this.tileGrid[j][i - 1] = tempTile;
    
                            this.tweens.add({
                                targets: tempTile,
                                x: (this.tileWidth * (i - 1)) + (this.tileWidth / 2) + this.leftMargin,
                                y: (this.tileHeight * j) + (this.tileHeight / 2) + this.topMargin,
                                duration: this.durationFill,
                                ease: this.dropTweenEase,
                                repeat: 0,
                                yoyo: false,
                            });

                            this.tileGrid[j - 1][i] = null;

                            i = 0;
                            j = this.levelHeight;                            
                        }
                        else    // vertical drop
                        {
                            if (this.tileGrid[j][i] == null && this.tileGrid[j - 1][i].tileMode != this.tileMode[this.tileMode.length - 1] && !this.tileGrid[j - 1][i].isLocked)
                            {
                                // Normal vertical drop
                                this.moveDownVertically(this.tileGrid, i, j)

                                i = 0;
                                j = this.levelHeight;
                            }
                        }

                    } 

                    if (switchTile.diagonalRight && this.tileGrid[j - 1][i]) 
                    {
                        if (this.tileGrid[j][i + 1] == null)
                        {
                            // Move tile diagonally right
                            var tempTile = this.tileGrid[j - 1][i];
                            this.tileGrid[j][i + 1] = tempTile;

                            this.tweens.add({
                                targets: tempTile,
                                x: (this.tileWidth * (i + 1)) + (this.tileWidth / 2) + this.leftMargin,
                                y: (this.tileHeight * j) + (this.tileHeight / 2) + this.topMargin,
                                duration: this.durationFill,
                                ease: this.dropTweenEase,
                                repeat: 0,
                                yoyo: false,
                            });

                            this.tileGrid[j - 1][i] = null;

                            i = 0;
                            j = this.levelHeight;
                        }
                        else
                        {
                            if (this.tileGrid[j][i] == null && this.tileGrid[j - 1][i].tileMode != this.tileMode[this.tileMode.length - 1] && !this.tileGrid[j - 1][i].isLocked)
                            {   
                                // Normal vertical drop
                                this.moveDownVertically(this.tileGrid, i, j)

                                i = 0;
                                j = this.levelHeight;
                            }
                        }
                    }    
                } 
                else
                {
                    if (this.tileGrid[j][i] == null && this.tileGrid[j - 1][i] && this.tileGrid[j - 1][i].tileMode != this.tileMode[this.tileMode.length - 1] && !this.tileGrid[j - 1][i].isLocked) {
                        // Normal vertical drop
                        this.moveDownVertically(this.tileGrid, i, j)
                        
                        i = 0;
                        j = this.levelHeight;
                    }
                }
            }
        }
    }

    moveDownVertically(tileGrid, i, j)
    {
        var tempTile = tileGrid[j - 1][i];

        tileGrid[j][i] = tempTile;
        this.tweens.add({
            targets: tempTile,
            y:(this.tileHeight * j) + (this.tileHeight / 2) + this.topMargin,
            duration: this.durationFill,
            ease: this.dropTweenEase,
            repeat: 0,
            yoyo: false,
        });

        if (tempTile != null && tempTile.overlaySprite != null)
        {
            tempTile.overlaySprite.x = tempTile.x;
            tempTile.overlaySprite.y = tempTile.y;
        }

        tileGrid[j - 1][i] = null;
    }


    fillTile()
    {
        this.isFilling = true;

        //Check for blank spaces in the grid and add new tiles at that position
        for(var i = 0; i < this.levelHeight; i++)
        {
            for(var j = this.fillStart; j < this.fillEnd; j++)
            {
                if (this.tileGrid[i][j] == null)
                {
                    //Found a blank spot
                    var tile = this.addTile(i, j);

                    //And also update our "theoretical" grid
                    this.tileGrid[i][j] = tile;
                }
            }
        }
    }

    createScore()
    {
        var scoreFont = "50px Arial";

        this.scoreLabel = this.add.text((Math.floor(this.levelLength / 2) * this.tileWidth) + this.leftMargin,
                                         this.levelHeight * this.tileHeight + this.topMargin, 
                                         "0", {font: scoreFont, fill: "#fff"});

        this.scoreLabel.setOrigin(0.5, 0);
        this.scoreLabel.align = 'center';
    }

    incrementScore(array)
    {
        // 1 gem = 3 points
        if (array)
        {
            this.score += array.length * 3;
            this.scoreLabel.text = "SCORE: " + this.score;
        }
        else
        {
            this.scoreLabel.text = "SCORE: " + this.score;
        }

    }

    createTargetCount()
    {
        var targetCountFont = "35px Arial";

        this.targetCountLabel = this.add.text((Math.floor(this.levelLength / 2) * this.tileWidth) + this.leftMargin,
                                         40, 
                                         "0", {font: targetCountFont, fill: "#fff"});

        this.targetCountLabel.setOrigin(0.5, 0);
        //this.targetCountLabel.align = 'center';
    }

    incrementTargetCount(array)
    {
        // 1 gem = 3 points
        this.targetCountLabel.text = "TARGET: " + this.targetCount + "/" + array.length;
        if (this.targetCount == array.length)
        {
            this.scene.start('playGame', { levelIndex: this.nextLevel });
        }
    }

    // this function is to make the drop gem look more stable
    // we divide the tileGrid by two half, the half down is where player interact with the grid
    // and the half up is where the gems are spawn
    // this function to make this function works properly we also need to modify the get matches function
    handleTiles()
    {
        for (var row = 0; row < this.levelHeight; row++) 
        {
            for (var column = 0; column < this.tileGrid[row].length; column++) 
            {
                var tile = this.tileGrid[row][column];

                if (tile)
                {
                    // Check if the row is lower (i.e., above) than halfRows
                    if (row < this.halfRows) 
                    {
                        tile.visible = false;
                        tile.disableInteractive();
                    }
                    else 
                    {
                        tile.setInteractive();
                        tile.visible = true;
                    }

                    if (tile.overlaySprite)
                    {
                        tile.overlaySprite.x = tile.x;
                        tile.overlaySprite.y = tile.y;
                    }
                }
            }
        }
    }

    removeColumn(tile)
    {
        if (tile.overlaySprite)
            tile.overlaySprite.destroy();
        var tilePos = this.getTilePos(this.tileGrid, tile);
        var destroyCount = 0;


        //Remove the tile from the theoretical grid
        for (var row = this.levelHeight - this.halfRows; row < this.levelHeight; row++)
        {
            var tileToRemove = this.tileGrid[row][tilePos.x];

            // remove from screen
            if (tileToRemove && tileToRemove.tileMode !== this.tileMode[this.tileMode.length - 1]) 
            {
                if (tileToRemove == tile) 
                {
                    destroyCount++;
                    this.tiles.remove(tileToRemove);
                    tileToRemove.destroy();

                    // remove from grid
                    if (!tileToRemove.isLocked)
                        this.tileGrid[row][tilePos.x] = null;
                }
                else
                {
                    // if the tile we are destroying is not destroy by color mode
                    if (tileToRemove.tileMode !== this.tileMode[3])
                    {
                        if (tileToRemove.isLocked)
                        {
                            this.destroyTile(tileToRemove) // decrease the lock level
                        }
                        else
                        {
                            destroyCount++;
                            this.tiles.remove(tileToRemove);
                            this.destroyTile(tileToRemove);     // lock from 1 -> 0: tileToRemove.isLock = false;
                            // remove from grid
                            this.tileGrid[row][tilePos.x] = null;
                        }
                    }
                }
            }
        }

        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr)
    }

    removeRow(tile)
    {
        if (tile.overlaySprite)
            tile.overlaySprite.destroy();
        var tilePos = this.getTilePos(this.tileGrid, tile);
        var destroyCount = 0;

        //Remove the tile from the theoretical grid
        for (var column = 0; column < this.levelLength; column++)
        {
            if (tilePos.y != -1 && this.tileGrid[tilePos.y][column])
                var tileToRemove = this.tileGrid[tilePos.y][column];

            // remove from screen, also check for air tile
            if (tileToRemove && tileToRemove.tileMode !== this.tileMode[this.tileMode.length - 1]) 
            {
                // if the current tile is the special tile we passed into this func
                if (tileToRemove == tile) 
                {
                    destroyCount++;
                    this.tiles.remove(tileToRemove);
                    tileToRemove.destroy();
                    // remove from grid
                    this.tileGrid[tilePos.y][column] = null;
                }
                else
                {
                    // if the tile is not in destroy by color mode
                    if (tileToRemove.tileMode !== this.tileMode[3])
                    {
                        if (tileToRemove.isLocked)
                        {
                            this.destroyTile(tileToRemove) // decrease the lock level
                        }
                        else
                        {
                            destroyCount++;
                            this.tiles.remove(tileToRemove);
                            this.destroyTile(tileToRemove);     // lock from 1 -> 0: tileToRemove.isLock = false;
                            // remove from grid
                            this.tileGrid[tilePos.y][column] = null;
                        }
                    }
                }
            }
        }

        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr)
    }

    destroyTilesOfSameType(colorTile, tile) {
        var destroyCount = 0;

        colorTile.overlaySprite.destroy();

        if (colorTile.overlaySprite != null)
            colorTile.overlaySprite.destroy();
    
        for (var row = this.levelHeight - this.halfRows; row < this.levelHeight; row++) 
        {
            for (var column = 0; column < this.tileGrid[row].length; column++) 
            {
                var tileToRemove = this.tileGrid[row][column];

                // destroy the special tile that we passed into this func
                if (tileToRemove == colorTile)
                {
                    
                    destroyCount++;
                    this.tiles.remove(tileToRemove);
                    tileToRemove.destroy();

                    if (!tileToRemove.isLocked)
                        this.tileGrid[row][column] = null;

                }
                
                if (tileToRemove)
                {
                    if (tileToRemove.isLocked)
                    {
                        if (tileToRemove.tileType == tile.tileType)
                        {
                            this.destroyTile(tileToRemove);
                        }
                    }
                    else
                    {
                        // destroy the tiles that has the same color
                        if (tileToRemove.tileType == tile.tileType) 
                        {
                            if (tileToRemove == tile) 
                                tileToRemove.destroy();
                            else
                            {
                                this.destroyTile(tileToRemove);
                            }
        
                            //BUG
                            // we don't use color destroy tile to destroy another destroy tile
                            if (tileToRemove.tileMode != this.tileMode[3])
                            {
                                destroyCount++;
                                
                                this.tileGrid[row][column] = null;
                                
                                this.tiles.remove(tileToRemove);
                            }
                        }
                    }
                }

                
            }
        }
    
        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr);
    }

    destroyCross(tile)
    {
        var tilePos = this.getTilePos(this.tileGrid, tile);

        if (tile.overlaySprite)
            tile.overlaySprite.destroy();

        var destroyCount = 0;
        var destroyedTiles = [];

        // Destroy all tiles in the same row
        for (var column = 0; column < this.levelLength; column++) 
        {
            if (tilePos.y != -1)
                var tileToRemove = this.tileGrid[tilePos.y][column];
            if (tileToRemove && tileToRemove.tileMode !== this.tileMode[this.tileMode.length - 1])
            {
                // if the tile we are scanning is the tile we passed into this func
                if (tileToRemove == tile) 
                {
                    destroyCount++;
                    this.tiles.remove(tileToRemove);
                    tileToRemove.destroy();

                    // remove from grid
                    this.tileGrid[tilePos.y][column] = null;
                }
                else
                {
                    if (tileToRemove.tileMode !== this.tileMode[3])
                    {
                        if (tileToRemove.isLocked)
                        {
                            this.destroyTile(tileToRemove) // decrease the lock level
                        }
                        else
                        {
                            destroyCount++;
                            this.tiles.remove(tileToRemove);
                            this.destroyTile(tileToRemove);     // lock from 1 -> 0: tileToRemove.isLock = false;
                            // remove from grid
                            this.tileGrid[tilePos.y][column] = null;
                        }
                    }
                }
                destroyedTiles.push(tileToRemove);
                destroyCount++;
            }
        }

        // Destroy all tiles in the same column
        for (var row = this.levelHeight - this.halfRows; row < this.levelHeight; row++) 
        {
            if (tilePos.x != -1)
                var tileToRemove = this.tileGrid[row][tilePos.x];

            // Ensure we don't re-destroy already destroyed tiles that has already destroyed
            if (tileToRemove && !destroyedTiles.includes(tileToRemove) && tileToRemove.tileMode !== this.tileMode[this.tileMode.length - 1]) 
            { 
                // if the tile we are scanning is the tile we passed into this func
                if (tileToRemove == tile) 
                {
                    destroyCount++;
                    this.tiles.remove(tileToRemove && !tileToRemove.isLocked);

                    // remove from grid
                    this.tileGrid[row][tilePos.x] = null;

                    tileToRemove.destroy();
                }
                else
                {
                    if (tileToRemove.tileMode !== this.tileMode[3])
                    {
                        if (tileToRemove.isLocked)
                        {
                            this.destroyTile(tileToRemove) // decrease the lock level
                        }
                        else
                        {
                            destroyCount++;
                            this.tiles.remove(tileToRemove);
                            this.destroyTile(tileToRemove);     // lock from 1 -> 0: tileToRemove.isLock = false;
                            // remove from grid
                            this.tileGrid[row][tilePos.x] = null;
                        }
                    }
                }
                destroyedTiles.push(tileToRemove);
                destroyCount++;
            }
        }

        // Increment score for destroyed tiles
        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr);
    }

    // activate tile's mode when destroyed
    destroyTile(tile)
    {
        if (!tile.isLocked)
        {
            // destroy the background blocks
            this.destroyBackgroundBlockAtTile(tile);

            // destroy tile based on its mode
            switch(tile.tileMode) 
            {
                case 'normal':
                    tile.destroy(tile);
                    break;
    
                case 'horizontal':
                    this.removeRow(tile);
                    break;
    
                case 'vertical':
                    this.removeColumn(tile);
                    break;
                
                case 'color':
                    break;
    
                case 'cross':
                    this.destroyCross(tile);
                    break;
    
                case 'air':
                    break;
            }
            if (tile.overlaySprite)
                tile.overlaySprite.destroy();
        }
        else    // the tile is locked
        {
            var tilePos = this.getTilePos(this.tileGrid, tile);
            this.lockGrid[tilePos.y][tilePos.x].decreaseLevel();

            // unlock if lock lever reach 0
            if (this.lockGrid[tilePos.y][tilePos.x] && this.lockGrid[tilePos.y][tilePos.x].level <= 0)
            {
                // destroy the railwaySwith tiles that works ONLY with this lock, because railwaySwitch tile also works with air block
                var switchTileDownLeft = this.railwaySwitches.find(switchTile => switchTile.row === tilePos.y + 1 && switchTile.column === tilePos.x - 1);

                // check if there's any air block 2 block away to the left of the lock, because if there is, we can't destroy the down left railwaySwitch tile as shown below
                //  [air]   [normal]   [LOCK]
                //             |  
                //    ----------
                //    |
                //    v
                // [normal] [switch]  [normal]
                var gotAirBlockHere = this.airPos.some(airTile => airTile[0] === tilePos.y && airTile[1] === tilePos.x - 2)

                if (switchTileDownLeft && !gotAirBlockHere)
                {
                    // Remove the switchTile from the railwaySwitches array
                    this.railwaySwitches = this.railwaySwitches.filter(item => item !== switchTileDownLeft);
                }
                // we don't need to destroy the switch tile down right because the vertical drop of the left column is already prioritzed

                // destroy lock and unlock tile
                this.lockGrid[tilePos.y][tilePos.x].destroy();
                tile.isLocked = false;
            }
        }
    }

    destroyBackgroundBlockAtTile(tile)
    {
        var tilePos = this.getTilePos(this.tileGrid, tile);

        if (tilePos.x != -1 && tilePos.y != -1 && this.blockGrid[tilePos.y][tilePos.x])
        {
            this.blockGrid[tilePos.y][tilePos.x].hardnessDecrease();

            // execute the block based on its hardness
            switch (this.blockGrid[tilePos.y][tilePos.x].hardness)
            {
                case 1:
                    // we can change tile sprite for hardness level 1
                    this.blockGrid[tilePos.y][tilePos.x].changeTexture('block');
                    break;

                case 0:
                    this.targetCount++;
                    this.blockGrid[tilePos.y][tilePos.x].destroy();
                    this.blockGrid[tilePos.y][tilePos.x] = null;
                    this.incrementTargetCount(this.blockPos);
                    break;
            }
        }
    }
}