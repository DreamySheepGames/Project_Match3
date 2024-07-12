class LevelMaker extends Phaser.Scene
{
    constructor()
    {
        super("playGame");
    }

    create()
    {
        // set tile dimension
        this.levelHeight = 16;      // only the bottom half of the tile grid is seen and interactable, remember to also modify this.topMargin after you change this
        this.levelLength = 16;

        // set tile postition
        this.leftMargin = 200;
        this.topMargin = -400;

        // the size of the gems
        this.gemSize = 0.9;
        
        // Gem drop tween ease
        this.dropTweenEase = 'Cubic.easeOut';

        // set time duration for actions and tweening
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

        // Declare assets that will be used as tiles
        this.tileTypes = ['blue', 'green', 'red', 'purple', 'cyan', 'yellow'];

        // Declare gem modes:
        // normal: self explained
        // horizontal: when removed, destroy the whole row it is moved to
        // vertical: when removed, destroy the whole column it is moved to
        // color: when removed, destroy every gem that has the same color with the gem it is swapped with
        // cross: when rememoved: destroy the whole row AND column it is moved to
        this.tileMode = ['normal', 'horizontal', 'vertical', 'color', 'cross'];
        this.score = 0;

        // Keep track which tiles the user is trying to swap
        this.activeTile1 = null;
        this.activeTile2 = null;

        // Controls whether the player can make a move or not
        this.canMove = false;
        this.isFilling = true;

        // destroyTile helper
        this.horizontalTile = null;
        this.verticalTile = null;

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
        // row
        for(var i = 0; i < this.tileGrid.length; i++)
        {
            // column
            for(var j = 0; j < this.tileGrid[0].length; j++)
            {
                //Add the tile to the game at this grid position
                var tile = this.addTile(i, j);

                //Keep a track of the tiles position in our tileGrid
                this.tileGrid[i][j] = tile;
            }
        }
    }

    addTile(i, j)
    {
        this.isFilling = true;

        //Choose a random tile to add
        var tileToAdd = this.tileTypes[this.random.integerInRange(0, this.tileTypes.length - 1)];

        //Add the tile at the correct x position, but add it to the top of the game (so we can slide it in)
        var tile = this.tiles.create((j * this.tileWidth) + this.tileWidth / 2 + this.leftMargin,                          //x
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
            this.startPosX = (tile.x - this.leftMargin - this.tileWidth / 2) / this.tileWidth;
            this.startPosY = (tile.y - this.topMargin - this.tileHeight / 2) / this.tileHeight;
        }
    }

    update()
    {
        this.disableTiles();

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
        //matches is a 3D array as shown belown:
        //          --- matches[0]: arrays of horizontal matches like: [[blue, blue, blue], [red, red, red],...]
        // matches--|
        //          --- matches[1]: arrays of vertical matches like: [[yellow, yellow, yellow, yellow], [purple, purple, purple],...]

        var matches = this.getMatches(this.tileGrid);

        // We need to check if the 2 tiles we are interacting are special tiles first
        if (this.activeTile2)
        {
            //No match, the gem is normal, we move the tiles back to their original position and reset
            if (this.activeTile1.tileMode != this.tileMode[0])
            {
                this.checkSpecialTile(this.activeTile2, this.activeTile1);
            }
            if (this.activeTile2.tileMode != this.tileMode[0])
            {
                this.checkSpecialTile(this.activeTile1, this.activeTile2);
            }
        }
        
        if (matches[0].length == 0 && matches[1].length == 0)
        {
            //no match, no special tile, just swap back
            if (this.activeTile1 && this.activeTile2.tileMode == this.tileMode[0] && this.activeTile1.tileMode == this.tileMode[0])
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
        // if the tile is not normal mode, we will destroy the tile grid base on the tile's mode
        if (swappedTile.tileMode !== this.tileMode[0])
        {
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
        for (var i = tileGrid.length - this.halfRows; i < tileGrid.length; i++)
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
            for (j = tileGrid.length - this.halfRows; j < tileGrid.length; j++)
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
                    
                        // this is where we check if the tile will turn from normal mode to other modes
                        // if destroy 4 gems, the gem player clicked will turn to another mode (destroy row/column/color)
                        if (tile == this.activeTile2)
                        {
                            this.changeTileMode(tile, tempArr, matches, k);
                        }

                        if (tile == this.activeTile1)
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
                            //Remove the tile from the screen
                            this.tiles.remove(tile);
                            //tile.destroy();
                            this.destroyTile(tile);
                        
                            //Remove the tile from the theoretical grid
                            if(tilePos.x != -1 && tilePos.y != -1)
                            {
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
        if (tempArr.length == 4)
        {
            if (k == 0)
            {
                tile.tileMode = this.tileMode[2];   // 1 horizontal match-4 = 1 destroy vertically mode gem
            }
            else
            {
                tile.tileMode = this.tileMode[1];   // 1 vertical match-4 = 1 destroy horizontally mode gem
            }
            tile.setTint(0xCCCCCC); // This makes the tile darker
        }

        // check to turn tile to cross mode
        var horizontalMatches = this.flatten(matches[0]);
        var verticalMatches = this.flatten(matches[1]);

        if (horizontalMatches.includes(tile) && verticalMatches.includes(tile))
        {
            tile.tileMode = this.tileMode[4];
            tile.setTint(0x787878); // This makes the tile darker
        }

        if (tempArr.length >= 5)
        {
            tile.tileMode = this.tileMode[3];       // destroy color mode
            tile.setTint(0x000000); // This makes the tile darker
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

    // this function is to make the drop gem look more stable
    // we divide the tileGrid by two half, the half down is where player interact with the grid
    // and the half up is where the gems are spawn
    // this function to make this function works properly we also need to modify the get matches function
    disableTiles()
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
                        // Make tile invisible
                        // if (tile) 
                        // {
                        tile.visible = false;
                        tile.disableInteractive();
                        //}
                        
                    }
                    else 
                    {
                        tile.setInteractive();
                        tile.visible = true;
                    }
                }
            }
        }
    }

    removeColumn(tile)
    {
        var tilePos = this.getTilePos(this.tileGrid, tile);
        var destroyCount = 0;

        //Remove the tile from the theoretical grid
        for (var row = this.levelHeight - this.halfRows; row < this.levelHeight; row++)
        {
            var tileToRemove = this.tileGrid[row][tilePos.x];

            // remove from screen
            if (tileToRemove) 
            {
                if (tileToRemove == tile) 
                    tileToRemove.destroy();
                else
                    this.destroyTile(tileToRemove);

                destroyCount++;
                this.tiles.remove(tileToRemove);
            };

            // remove from grid
            this.tileGrid[row][tilePos.x] = null;
        }

        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr)
    }

    removeRow(tile)
    {
        var tilePos = this.getTilePos(this.tileGrid, tile);
        var destroyCount = 0;

        //Remove the tile from the theoretical grid
        for (var column = 0; column < this.levelLength; column++)
        {
            var tileToRemove = this.tileGrid[tilePos.y][column];

            // remove from screen
            if (tileToRemove) 
            {
                // if the current tile is the special tile we passed into this func
                if (tileToRemove == tile) 
                    tileToRemove.destroy();
                else
                    this.destroyTile(tileToRemove);

                destroyCount++;
                this.tiles.remove(tileToRemove);
            }

            // remove from grid
            this.tileGrid[tilePos.y][column] = null;
        }

        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr)
    }

    destroyTilesOfSameType(colorTile, tile) {
        var destroyCount = 0;
    
        for (var row = this.levelHeight - this.halfRows; row < this.levelHeight; row++) 
        {
            for (var column = 0; column < this.tileGrid[row].length; column++) 
            {
                var tileToRemove = this.tileGrid[row][column];
    
                // destroy the special tile that we passed into this func
                if (tileToRemove == colorTile)
                {
                    tileToRemove.destroy();
                    
                    destroyCount++;
                    this.tiles.remove(tileToRemove);
                    this.tileGrid[row][column] = null;
                }

                // destroy the tiles that has the same color
                if (tileToRemove && tileToRemove.tileType == tile.tileType) 
                {
                    if (tileToRemove == tile) 
                        tileToRemove.destroy();
                    else
                        this.destroyTile(tileToRemove);

                    destroyCount++;
                    this.tiles.remove(tileToRemove);
                    this.tileGrid[row][column] = null;
                }
            }
        }
    
        var tempArr = new Array(destroyCount).fill(null);
        this.incrementScore(tempArr);
    }

    destroyCross(tile)
    {
        var tilePos = this.getTilePos(this.tileGrid, tile);
    
        if (tilePos.x === -1 || tilePos.y === -1) {
            // Tile not found in the grid
            return;
        }

        var destroyCount = 0;
        var destroyedTiles = [];

        // Destroy all tiles in the same row
        for (var column = 0; column < this.levelLength; column++) 
        {
            var tileToRemove = this.tileGrid[tilePos.y][column];
            if (tileToRemove)
            {
                if (tileToRemove == tile) 
                    tileToRemove.destroy();
                else
                    this.destroyTile(tileToRemove);

                this.tiles.remove(tileToRemove);
                this.tileGrid[tilePos.y][column] = null;
                destroyedTiles.push(tileToRemove);
                destroyCount++;
            }
        }

        // Destroy all tiles in the same column
        for (var row = this.levelHeight - this.halfRows; row < this.levelHeight; row++) 
        {
            var tileToRemove = this.tileGrid[row][tilePos.x];

            // Ensure we don't re-destroy already destroyed tiles
            if (tileToRemove && !destroyedTiles.includes(tileToRemove)) 
            { 
                if (tileToRemove == tile) 
                    tileToRemove.destroy();
                else
                    this.destroyTile(tileToRemove);

                this.tiles.remove(tileToRemove);
                this.tileGrid[row][tilePos.x] = null;
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
        // destroy tile based on its mode
        switch(tile.tileMode) 
        {
            case 'normal':
                tile.destroy(tile);
                break;

            case 'horizontal':
                this.horizontalTile = tile;
                this.removeRow(tile);
                break;

            case 'vertical':
                this.verticalTile = tile;
                this.removeColumn(tile);
                break;
            
            case 'color':
                // if tile.x == horTile then remove
                var horPos = this.getTilePos(this.tileGrid, this.horizontalTile);
                var verPos = this.getTilePos(this.tileGrid, this.verticalTile);
                var curTilePos = this.getTilePos(this.tileGrid, tile);
                
                if (curTilePos.x == horPos.x)
                    this.destroyTilesOfSameType(tile, this.horizontalTile);
                else
                {
                    if (curTilePos.y == verPos.y)
                        this.destroyTilesOfSameType(tile, this.verticalTile);
                }

                this.horizontalTile = null;
                this.verticalTile = null;

                break;

            case 'cross':
                this.destroyCross(tile);
                break;
        }
    }
}