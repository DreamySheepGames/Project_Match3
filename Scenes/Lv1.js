class Lv1 extends Phaser.Scene
{
    constructor()
    {
        super("playGame");
    }

    create()
    {
        // set tile dimension
        this.levelHeight = 8;
        this.levelLength = 16;

        // set tile postition
        this.leftMargin = 200;
        this.topMargin = 100;

        // the size of the gems
        this.gemSize = 0.88;

        // set time duration for actions
        this.durationFill = 1200;                           // the time it takes to fill the tile grid
        this.durationSwap = 100;                            // the time it takes to swap 2 gems' position
        this.durationCheckMatch = 200;                      // the time it takes to check for a match-3 after swapping so we can remove the gems
        this.durationCheckMatchAgain = 500;                 // the time it takes to check for a match-3 again after removing the gems

        this.durationTileUp = 50;           // the time it takes to reset the activated gems (the gems we clicked on) to null , I don't recommend modifying this value

        // Declare assets that will be used as tiles
        this.tileTypes = ['blue', 'green', 'red', 'purple', 'cyan', 'yellow'];
        this.score = 0;
        this.spacing = 1.2

        // Gem drop tween ease
        this.dropTweenEase = 'Bounce.easeOut'

        // Keep track which tiles the user is trying to swap
        this.activeTile1 = null;
        this.activeTile2 = null;

        // Controls whether the player can make a move or not
        this.canMove = false;
        this.isFilling = true;

        // get the width and height of tiles
        let blueTileTexture = this.textures.get('blue').getSourceImage();
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
            this.tileGrid[i] = [];
            for (var j = 0; j < this.levelLength; j++) {
                this.tileGrid[i][j] = null;
            }
        }
        
        //Create a random data generator to use later
        var seed = Date.now();
        this.random = new Phaser.Math.RandomDataGenerator([seed]);
        //this.add.text(40, 40, `Log: ${this.random}`);

        this.initTiles();

        //After done spawning tiles, we check if there are matches
        this.time.delayedCall(this.durationFill, function() {
            this.checkMatch();
        }, null, this);

        this.createScore();
    }

    initTiles()
    {
        for(var i = 0; i < this.tileGrid.length; i++)
        {
            for(var j = 0; j < this.tileGrid[0].length; j++)
            {
                //Add the tile to the game at this grid position
                var tile = this.addTile(i, j);

                //Keep a track of the tiles position in our tileGrid
                this.tileGrid[i][j] = tile;
            }
        }
        //console.log(this.tiles.getChildren().length);

    }

    addTile(i, j)
    {
        this.isFilling = true;

        //Choose a random tile to add
        var tileToAdd = this.tileTypes[this.random.integerInRange(0, this.tileTypes.length - 1)];

        //Add the tile at the correct x position, but add it to the top of the game (so we can slide it in)
        var tile = this.tiles.create((j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                                           //x
                                    -((this.levelHeight - i - Math.floor(this.levelHeight / 2)) * this.tileHeight),        //y
                                    tileToAdd);

        tile.setScale(this.gemSize);

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
            this.startPosX = (tile.x - this.leftMargin - this.tileWidth / 2) / this.tileWidth;
            this.startPosY = (tile.y - this.topMargin - this.tileHeight / 2) / this.tileHeight;
        }
    }

    update()
    {
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
            var tile1Pos = {x:(this.activeTile1.x - this.tileWidth / 2) / this.tileWidth, y:(this.activeTile1.y - this.tileHeight / 2) / this.tileHeight};
            var tile2Pos = {x:(this.activeTile2.x - this.tileWidth / 2) / this.tileWidth, y:(this.activeTile2.y - this.tileHeight / 2) / this.tileHeight};
            
            //Swap them in our "theoretical" grid
            var tile1InGridPosX = (this.activeTile1.x - this.tileWidth / 2 - this.leftMargin) / this.tileWidth      // return postition in int from 0
            var tile2InGridPosX = (this.activeTile2.x - this.tileWidth / 2 - this.leftMargin) / this.tileWidth
            var tile1InGridPosY = (this.activeTile1.y - this.tileWidth / 2 - this.topMargin) / this.tileHeight      // return postition in int from 0
            var tile2InGridPosY = (this.activeTile2.y - this.tileWidth / 2 - this.topMargin) / this.tileHeight

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
                yoyo: false
            });

            this.tweens.add({
                targets: this.activeTile2,
                x:tile1Pos.x * this.tileWidth + (this.tileWidth/2),
                y:tile1Pos.y * this.tileHeight + (this.tileHeight/2),
                duration: this.durationSwap,
                ease: 'Linear',
                repeat: 0,
                yoyo: false
            });

            this.activeTile1 = this.tileGrid[tile1InGridPosY][tile1InGridPosX];
            this.activeTile2 = this.tileGrid[tile2InGridPosY][tile2InGridPosX];
        }
    }

    checkMatch()
    {
        //Call the getMatches function to check for spots where there is
        //a run of three or more tiles in a row
        var matches = this.getMatches(this.tileGrid);
        
        //If there are matches, remove them
        if(matches.length > 0)
        {
            //Remove the tiles
            this.removeTileGroup(matches);

            //Move the tiles currently on the board into their new positions
            this.resetTile();

            //Fill the board with new tiles wherever there is an empty spot, turn on isFilling
            this.fillTile();

            //Trigger the tileUp event to reset the active tiles
            this.time.delayedCall(this.durationSwap, function(){
                this.tileUp();
            }, null, this);

            //Check again to see if the repositioning of tiles caused any new matches
            this.time.delayedCall(this.durationCheckMatchAgain, function(){
                this.checkMatch();
            }, null, this);
        }
        else
        {
            //No match so just swap the tiles back to their original position and reset
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
    }

    tileUp(){

        //Reset the active tiles
        this.activeTile1 = null;
        this.activeTile2 = null;
    }

    getMatches(tileGrid)
    {
        var matches = [];
        var groups = [];

        //Check for horizontal matches
        for (var i = 0; i < tileGrid.length; i++)
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
                        if (tileGrid[i][j].tileType == tileGrid[i][j+1].tileType && tileGrid[i][j+1].tileType == tileGrid[i][j+2].tileType) // match 3
                        {
                            // we push more in if we already have a match-3 (the snippet below this snippet) but there is a match-4 or match-5...
                            if (groups.length > 0)
                            {
                                if (groups.indexOf(tileGrid[i][j]) == -1)
                                {
                                    matches.push(groups);

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
            if (groups.length > 0) matches.push(groups);
        }

        //Check for vertical matches
        for (j = 0; j < tileGrid.length; j++)
        {
            var tempArr = tileGrid[j];
            groups = [];
            for (i = 0; i < tempArr.length; i++)
            {
                if(j < tileGrid.length - 2)
                {
                    if (tileGrid[j][i] && tileGrid[j+1][i] && tileGrid[j+2][i])
                    {
                        if (tileGrid[j][i].tileType == tileGrid[j+1][i].tileType && tileGrid[j+1][i].tileType == tileGrid[j+2][i].tileType)
                        {
                            if (groups.length > 0)
                            {
                                if (groups.indexOf(tileGrid[j][i]) == -1)
                                {
                                    matches.push(groups);
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

            if(groups.length > 0) matches.push(groups);
        }

        return matches;
    }

    removeTileGroup(matches)
    {
        //Loop through all the matches and remove the associated tiles
        for(var i = 0; i < matches.length; i++)
        {
            var tempArr = matches[i];

            for(var j = 0; j < tempArr.length; j++)
            {
                var tile = tempArr[j];

                //Find where this tile lives in the theoretical grid
                var tilePos = this.getTilePos(this.tileGrid, tile);

                //Remove the tile from the screen
                this.tiles.remove(tile);
                tile.destroy();

                
                //Remove the tile from the theoretical grid
                if(tilePos.x != -1 && tilePos.y != -1){
                    this.tileGrid[tilePos.y][tilePos.x] = null;
                }
            }
            //scoring
            this.incrementScore(tempArr);
        }
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

    // move existing tiles to new position
    resetTile()
    {
        //Loop through each column from left to right
        for (var i = 0; i < this.levelLength; i++)
        {
            // Loop through each item in column
            for (var j = this.levelHeight - 1; j > 0; j--)
            {
                //If this space is blank, but not the one above, move the one above down
                if(this.tileGrid[j][i] == null && this.tileGrid[j - 1][i] != null)
                {
                    //Move the tile above down one
                    var tempTile = this.tileGrid[j - 1][i];
                    this.tileGrid[j][i] = tempTile;
                    this.tileGrid[j - 1][i] = null;

                    this.tweens.add({
                        targets: tempTile,
                        y:(this.tileHeight * j) + (this.tileHeight / 2) + this.topMargin,
                        duration: this.durationFill,
                        ease: this.dropTweenEase,
                        repeat: 0,
                        yoyo: false
                    });

                    //The positions have changed so start this process again, loop the column again from the bottom
                    //This is for the circumstances where there are multiple blank space in the one column we are working on
                    //or else the gem will only drop down one blank space, and the rest of the blank space stay blank
                    //This can not be set as this.levelHeight - 1 because j-- is executed when this loop end
                    j = this.levelHeight;
                }
            }
        }
    }

    fillTile()
    {
        this.isFilling = true;

        //Check for blank spaces in the grid and add new tiles at that position
        for(var i = 0; i < this.levelHeight; i++)
        {
            for(var j = 0; j < this.tileGrid[i].length; j++)
            {
                if (this.tileGrid[i][j] == null)
                {
                    //Found a blank spot so lets add animate a tile there
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
        this.score += array.length * 3;
        this.scoreLabel.text = this.score;
    }
}