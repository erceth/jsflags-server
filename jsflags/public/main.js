// disable context menu on right click
document.oncontextmenu =new Function("return false;")

/**
 * Main
 */
window.onload = function() {
	var gameScreen = new GameScreen();
	var manualControls = new ManualControls();
}

/*** GAME SCREEN ***/

var TEXT_SPACING = 15;

function GameScreen() {
	var self = this;
	this.canvas = document.getElementById("canvas");
	this.screen = this.canvas.getContext("2d");
	this.backgroundCanvas = document.getElementById("background");
    this.backgroundScreen = this.backgroundCanvas.getContext("2d");
	this.socket = io();
	this.dimensions = {};
	this.scoreboard = {};
	this.connected = false;
	this.initData = null;

	this.tankImg = {
		red: null,
		blue: null,
		green: null,
		purple: null
	};
    this.flagImg = {
    	red: null,
		blue: null,
		green: null,
		purple: null
    };
    this.wallImg = {};
    this.backgroundImg = {};
    this.baseImg = {};
    this.options = {};

    this.init(function() { //gets init data
    	self.loadImages();	
    });
    var timesTocheck = 5;
    wait(5, 500, this.areImagesLoadedYet, this, function() {
    	self.fillBackground();
    	self.listen();
    });
    
};

GameScreen.prototype = {
	init: function(callback) {
		var self = this;
		this.socket.on("init", function(initData) {
			if (self.connected) {
				return;
			}
			self.connected = true;
			self.initData = initData;
			self.dimensions = self.initData.dimensions;
			self.scoreboard = self.initData.scoreboard;
			self.canvas.width = self.dimensions.width;
			self.canvas.height = self.dimensions.height;

			self.backgroundCanvas.width = self.dimensions.width;
	        self.backgroundCanvas.height = self.dimensions.height;

	        self.options = initData.options;

	        callback();

		});
	},
	fillBackground: function() {
		//fill grass
		this.backgroundScreen.rect(0, 0, this.dimensions.width, this.dimensions.height);
	    var backgroundPattern = this.backgroundScreen.createPattern(this.backgroundImg.img, "repeat");
	    this.backgroundScreen.fillStyle = backgroundPattern;
	    this.backgroundScreen.fill();

	    //fill scoreboard
        this.backgroundScreen.fillStyle = "black";
	    this.backgroundScreen.fillRect(this.scoreboard.position.x - this.scoreboard.size.width / 2, this.scoreboard.position.y - this.scoreboard.size.height / 2, this.scoreboard.size.width, this.scoreboard.size.height);

	    //fill bases
	    var b, img;
	    for (var i = 0, max = this.initData.players.length; i < max; i++) {
	    	b = this.initData.players[i].base;
	    	img = this.baseImg[this.initData.players[i].playerColor].img;
	    	this.backgroundScreen.drawImage(img, b.position.x - (b.size.width / 2), b.position.y - (b.size.height / 2), b.size.height, b.size.width);
	    }
	},
	areImagesLoadedYet: function() {
		var result = 
		this.tankImg.red.loaded && this.tankImg.blue.loaded && this.tankImg.green.loaded && this.tankImg.purple.loaded &&
		this.baseImg.red.loaded && this.baseImg.blue.loaded && this.baseImg.green.loaded && this.baseImg.purple.loaded &&
		this.flagImg.red.loaded && this.flagImg.blue.loaded && this.flagImg.green.loaded && this.flagImg.purple.loaded &&
		this.wallImg.loaded && this.backgroundImg.loaded;

		return result;
	},
	loadImages: function() {
		var self = this;

		//load tanks
		this.tankImg = {
			red: {img: new Image(self.options.tankSize, self.options.tankSize), loaded: false}, //TODO: set size from server
	    	blue: {img: new Image(self.options.tankSize, self.options.tankSize), loaded: false},
	    	green: {img: new Image(self.options.tankSize, self.options.tankSize), loaded: false},
	    	purple: {img: new Image(self.options.tankSize, self.options.tankSize), loaded: false}
		};
		this.tankImg.red.img.src = "img/red_tank.png";
		this.tankImg.blue.img.src = "img/blue_tank.png";
		this.tankImg.green.img.src = "img/green_tank.png";
		this.tankImg.purple.img.src = "img/purple_tank.png";
		this.tankImg.red.img.onload = function() { self.tankImg.red.loaded = true; };
		this.tankImg.blue.img.onload = function() { self.tankImg.blue.loaded = true; };
		this.tankImg.green.img.onload = function() { self.tankImg.green.loaded = true; };
		this.tankImg.purple.img.onload = function() { self.tankImg.purple.loaded = true; };

		//load bases
		this.baseImg = {
			red: {img: new Image(self.options.baseSize, self.options.baseSize), loaded: false},
	    	blue: {img: new Image(self.options.baseSize, self.options.baseSize), loaded: false},
	    	green: {img: new Image(self.options.baseSize, self.options.baseSize), loaded: false},
	    	purple: {img: new Image(self.options.baseSize, self.options.baseSize), loaded: false}
		};
		this.baseImg.red.img.src = "img/red_basetop.png";
		this.baseImg.blue.img.src = "img/blue_basetop.png";
		this.baseImg.green.img.src = "img/green_basetop.png";
		this.baseImg.purple.img.src = "img/purple_basetop.png";
		this.baseImg.red.img.onload = function() { self.baseImg.red.loaded = true; };
		this.baseImg.blue.img.onload = function() { self.baseImg.blue.loaded = true; };
		this.baseImg.green.img.onload = function() { self.baseImg.green.loaded = true; };
		this.baseImg.purple.img.onload = function() { self.baseImg.purple.loaded = true; };

		//load flags
		this.flagImg = {
			red: {img: new Image(self.options.flagSize, self.options.flagSize), loaded: false},
	    	blue: {img: new Image(self.options.flagSize, self.options.flagSize), loaded: false},
	    	green: {img: new Image(self.options.flagSize, self.options.flagSize), loaded: false},
	    	purple: {img: new Image(self.options.flagSize, self.options.flagSize), loaded: false}
		};
		this.flagImg.red.img.src = "img/red_flag.png";
		this.flagImg.blue.img.src = "img/blue_flag.png";
		this.flagImg.green.img.src = "img/green_flag.png";
		this.flagImg.purple.img.src = "img/purple_flag.png";
		this.flagImg.red.img.onload = function() { self.flagImg.red.loaded = true; };
		this.flagImg.blue.img.onload = function() { self.flagImg.blue.loaded = true; };
		this.flagImg.green.img.onload = function() { self.flagImg.green.loaded = true; };
		this.flagImg.purple.img.onload = function() { self.flagImg.purple.loaded = true; };

		//load wall
		this.wallImg = {
			img: new Image(this.options.wallSize, this.options.wallSize), loaded: false
		};
		this.wallImg.img.src = "img/wall.png";
		this.wallImg.img.onload = function() {
			self.wallImg.loaded = true; 
		};

		//load background
		this.backgroundImg = {
			img: new Image(this.options.backgroundSize, this.options.backgroundSize), loaded: false
		};
		this.backgroundImg.img.src = "img/grass.png";
		this.backgroundImg.img.onload = function() {
			self.backgroundImg.loaded = true; 
		};
	},
	listen: function() {
		var self = this;

		this.socket.on('refresh', function (gameState) {
			self.gameState = gameState;
			self.screen.clearRect(0, 0, self.dimensions.width, self.dimensions.height);

			var i;

			//update score
			if (self.gameState.flags.length > 0) {
	        	var score;
	        	i = self.gameState.flags.length;
	        	self.screen.fillStyle = 'white';
	        	self.screen.font = "15px sans-serif";
	        	while((i-=1) >= 0) {
	        		score = self.gameState.score[self.gameState.flags[i].color];
	        		self.screen.fillText(score.color, (self.scoreboard.position.x - self.scoreboard.size.width / 2) + TEXT_SPACING, self.scoreboard.position.y - self.scoreboard.size.height / 2 + TEXT_SPACING * (i + 1));
	        		self.screen.fillText(score.score, self.scoreboard.position.x, self.scoreboard.position.y - (self.scoreboard.size.height / 2) + TEXT_SPACING * (i + 1));
	        	}
	        }

	        //loop tanks
	        var i = self.gameState.tanks.length, o, color;
	        while((i-=1) >= 0) {
	        	o = self.gameState.tanks[i];
	        	if (o.dead) {continue;}
	        	var t = self.tankImg[o.color].img; 
	        	t.height = o.size.height;
	            t.width = o.size.width;
	        	drawRotatedImage(t, o.position.x, o.position.y, o.radians, self.screen);
	        }

	        if (self.gameState.boundaries.length > 0) {
	        	i = self.gameState.boundaries.length;
	        	while ((i-=1) >= 0) {
	        		o = self.gameState.boundaries[i];
	        		color = (o.color) ? o.color : "black";
	        		self.screen.fillStyle = color;
	        		self.screen.fillRect(o.position.x - o.size.width / 2, o.position.y - o.size.height / 2, o.size.height, o.size.width);
	        	}
	        }
	        if (self.gameState.bullets.length > 0) {
	        	i = self.gameState.bullets.length;
	        	while ((i-=1) >= 0) {
	        		o = self.gameState.bullets[i];
	        		color = (o.color) ? o.color : "black";
	        		self.screen.fillStyle = color;
	        		self.screen.fillRect(o.position.x - o.size.width / 2, o.position.y - o.size.height / 2, o.size.height, o.size.width);
	        	}
	        }
	        if (self.gameState.flags.length > 0) {
	        	i = self.gameState.flags.length;
	        	while ((i-=1) >= 0) {
	        		o = self.gameState.flags[i];
	        		var f = self.flagImg[o.color].img;
	        		f.height = o.size.height;
		            f.width = o.size.width;
		            self.screen.drawImage(f, o.position.x - o.size.width / 2, o.position.y - o.size.height / 2, o.size.height, o.size.width);
	        	}
	        }
	        //show which tanks are selected
	        var selectedTanks = self.getSelectedTanks(), tank; //get selected tanks from ManualControl
	        if (selectedTanks) {
	        	i = selectedTanks.length;
		        while ((i-=1) >= 0) {
		        	tank = selectedTanks[i]
		        	self.screen.beginPath();
		        	self.screen.arc(tank.position.x, tank.position.y, tank.size.width * 0.66, 0, 2*Math.PI )
		        	self.screen.stroke();
		   //      	ctx.beginPath();
					// ctx.arc(100,75,50,0,2*Math.PI);
					
		        	//self.screen.fillRect(selectedTanks[i].position.x, selectedTanks[i].position.y, selectedTanks[i].size.height, selectedTanks[i].size.width);
		        }
	        }
	        
	        

		});

		function drawRotatedImage(img, x, y, radians, context) {
			// save the current co-ordinate system 
			// before we screw with it
			context.save(); 
		 
			// move to the middle of where we want to draw our image
			context.translate(x, y);

			//context.fillText(round(object.angle,2), -25, -25); //print angle next to tank
		 
			// rotate around that point
			context.rotate(radians);
		 
			// draw it up and to the left by half the width
			// and height of the image 

			context.drawImage(img, -img.width/2, -img.height/2, img.height, img.width);
			//context.fillRect(0, 0, 1, 1); //puts a wee dot on the origin

			// and restore the co-ords to how they were when we began
			context.restore(); 
		}
	}
	//A GameScreen functions lives in Manual Controls
};




/*** VIEWING ***/
	




//handy waiting function
function wait (timesToCheck, timeToWait, isItTimeYetFn, scope, callback) {
	var self = this;
	timesToCheck -=1;
	if (timesToCheck <= 0) {
		console.log("time expired");
		return;
	}
	setTimeout(function() {
		if (isItTimeYetFn.call(scope)) {
			callback();
		} else {
			self.wait(timesToCheck, timeToWait, isItTimeYetFn, scope, callback);
		}
	}, timeToWait);
}

function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}



/*** MANUAL CONTROLS  ***/
function ManualControls() {
	var self = this;
	this.myTanks = [];
	this.socket = io();
	this.connected = null;
	this.initData = null;
	this.playerSocket = null;
	this.color;

	this.init(function() {
		self.createBodies();
		self.createControls();
		self.refresh();

		//send back commands
		setInterval(function() {
			self.calculateGoalsAndSendBackCommands();
		}, 200);

		//TODO: change this?
	 //    setInterval(function() {
		// 	var orders = {
		// 		tankNumbers: [0,1,2,3]
		// 	}
		// 	self.playerSocket.emit("fire", orders);
		// }, 1000);setInterval(function() {
		// 	var orders = {
		// 		tankNumbers: [0,1,2,3]
		// 	}
		// 	self.playerSocket.emit("fire", orders);
		// }, 1000);
	});

};

ManualControls.prototype = {
	init: function(callback) {
		var self = this;
		this.socket.on("init", function(initData) {
			// if (self.connected) {
			// 	return;
			// }
			// self.connected = true;
			self.initData = initData;

			var buttonWrapper = $("#button-wrapper");
		    buttonWrapper.empty();
		    for (var i = 0; i < self.initData.players.length; i++) {
		        var button = $("<span data-player-index='" + i + "' class='player-button' style='background-color:" + self.initData.players[i].playerColor + " '>Player Number " + self.initData.players[i].playerNumber + "</span>").click(function() {
		            var playerIndex = $(this).data("player-index");
		            self.playerSocket = io("/" + self.initData.players[playerIndex].namespace);
		            self.color = self.initData.players[playerIndex].playerColor;
		            $('#selector').addClass(self.color);
		            $(this).off();  //prevents multiple clicks
		            callback();
		        });
		        buttonWrapper.append(button);

		    }

		    //add observer button
		    buttonWrapper.append("<span class='player-button' style='background-color:#666'>Observer</span>");

		    //fade out on selection
		    buttonWrapper.click(function() {
		        $("#selectionBoard").fadeOut(3500);
		    });

		    //gives GameScreen access to selected tanks
		    GameScreen.prototype.getSelectedTanks = function() {
		    	if (self.myTanks) {
					return self.myTanks.filter(function(t) {
						return t.selected;
					});
				}
				return false;
		    }
		});
	},
	createBodies: function() {
		var self = this;
		var myTanks = this.initData.tanks.filter(function(t) {
			return t.color === self.color;
		});
		for (var i = 0; i < myTanks.length; i++) {
			this.myTanks.push(new Tank(i, this.color, myTanks[i].size));
		}
	},
	createControls: function() {
		var self = this;
		var canvas = $('#canvas');
		var selector = $('#selector');
		var clickStart = {};

		$(canvas).mousedown(startSelector);

		function startSelector(e) {
			if (e.which === 1) {  //left click
				selector.css({
		            'left': e.pageX,
		            'top': e.pageY
		        });
		        clickStart.x = e.pageX;
		        clickStart.y = e.pageY;
		        $(document).bind("mousemove", openSelector);
		        $(document).bind("mouseup", selectElements);
			} else if (e.which === 3) {
				for (var j = 0; j < self.myTanks.length; j++) {
					if (self.myTanks[j].selected) {
						self.myTanks[j].setTarget(e.pageX, e.pageY);
					}
				}
			}
		}

		function openSelector(e) {
			var w = Math.abs(clickStart.x - e.pageX);
	    	var h = Math.abs(clickStart.y - e.pageY);

	    	selector.css({
		        'width': w,
		        'height': h
		    });

		    if (e.pageX <= clickStart.x && e.pageY >= clickStart.y) {
		    	selector.css({
		    		'left': e.pageX
		    	});
		    } else if (e.pageY <= clickStart.y && e.pageX >= clickStart.x) {
		    	selector.css({
		    		'top': e.pageY
		    	});
		    } else if (e.pageX < clickStart.x && e.pageY < clickStart.y) {
		    	selector.css({
		    		'left': e.pageX,
		    		'top': e.pageY
		    	});
		    }
		}

		function selectElements(e) {
			$(document).unbind("mousemove", openSelector);
	    	$(document).unbind("mouseup", selectElements);
	    	for (var i = 0; i < self.myTanks.length; i++) {
	    		self.myTanks[i].selected = false;
		    	if ((parseInt(selector.css('left'), 10) < self.myTanks[i].position.x && //selector surrounds tanks
		    		parseInt(selector.css('left'), 10) + parseInt(selector.css('width'), 10) > self.myTanks[i].position.x && 
		    		parseInt(selector.css('top'), 10) < self.myTanks[i].position.y &&
		    		parseInt(selector.css('top'), 10) + parseInt(selector.css('height'), 10) > self.myTanks[i].position.y) 
		    		||
		    		(self.myTanks[i].position.x - self.myTanks[i].size.width / 2 < parseInt(selector.css('left'), 10) && //tank surrounds selector
		    		self.myTanks[i].position.x + self.myTanks[i].size.width / 2 > parseInt(selector.css('left'), 10) + parseInt(selector.css('width'), 10) && 
		    		self.myTanks[i].position.y - self.myTanks[i].size.height / 2 < parseInt(selector.css('top'), 10) && 
		    		self.myTanks[i].position.y + self.myTanks[i].size.height / 2 > parseInt(selector.css('top'), 10) + parseInt(selector.css('height'), 10))) {
			    		self.myTanks[i].selected = !self.myTanks[i].selected;
			    	}
		    }

	    	selector.css({
		        'width': 0,
		        'height': 0
		    });
		}

		$(document).keydown(function(evt) {
	    	for (var i = 0; i < self.myTanks.length; i++) {
	    		if (self.myTanks[i].selected) {
	    			self.playerSocket.emit("fire", {tankNumbers: [i]});
	    		}
	    	}
		});

	},
	refresh: function() {
		var self = this;
		var myTanksNewPosition;
		this.socket.on("refresh", function(gameState) {
			myTanksNewPosition = gameState.tanks.filter(function(t) {
				return self.myTanks[0].color === t.color;
			});

			//update my tanks
			for (var i = 0; i < self.myTanks.length; i++) {
				for (var j = 0; j < myTanksNewPosition.length; j++) {
					if (self.myTanks[i].tankNumber === myTanksNewPosition[j].tankNumber) { //change to j for all tanks
						self.myTanks[i].position = myTanksNewPosition[j].position;
						self.myTanks[i].angle = myTanksNewPosition[j].angle;
						self.myTanks[i].dead = myTanksNewPosition[j].dead;
					}
				}
				self.myTanks[i].refresh();
			}

		});

	},
	calculateGoalsAndSendBackCommands: function() {
		var orders = {};
		var i = this.myTanks.length, speed, angleVel; 
		while((i-=1) >=0) {
			this.myTanks[i].calculateGoal();
			orders.tankNumbers = [this.myTanks[i].tankNumber];
			orders.speed = this.myTanks[i].speed;
			orders.angleVel = this.myTanks[i].angleVel;
			this.playerSocket.emit("move", orders);
		}
	}
};


var Tank = function(tankNumber, color, size) {
	this.tankNumber = tankNumber;
	this.color = color;
	this.position = {x: 0, y: 0};
	this.size = size;
	this.angle;
	this.speed = 0;
	this.angleVel = 0;
	this.selected = false;
	this.dead = true;
	
	this.target = {
		x: 100,
		y: 100
	};
	this.hasATarget = false;

};

Tank.prototype = {
	getTarget: function() {
		return this.target;
	},
	hasTarget: function() {
		return this.hasATarget;
	},
	setTarget: function(x, y) {
		this.target.x = x;
		this.target.y = y;
		this.hasATarget = true;
	},
	missionAccomplished: function() {
		this.hasATarget = false;
	},
	calculateGoal: function() {
		if (this.hasATarget) {

			var distance;
			var angle;
			var degrees;
			var relativeX;
			var relativeY;


			distance = round(Math.sqrt(Math.pow(( this.target.x - this.position.x ), 2) + Math.pow(( this.target.y - this.position.y ), 2)), 4);
			relativeX = this.target.x - this.position.x; //relative
			relativeY = this.target.y - this.position.y;
			angle = round(Math.atan2(-(relativeY), relativeX), 4);
			degrees = round(angle * (180 / Math.PI), 4);  //convert from radians to degrees
			degrees = -(degrees); // tank degrees ascends clockwise. atan2 ascends counter clockwise.
			
			//convert from -180/180 to 0/360
			if (degrees < 0) {
				degrees = (degrees + 360) % 360;
			}

			var angleDifference = this.angle - degrees;

			if (angleDifference > 0) {
				if (angleDifference < 180) {
					this.angleVel = -1;
				} else {
					this.angleVel = 1;
				}
			} else {
				if (angleDifference > -180) {
					this.angleVel = 1;
				} else {
					this.angleVel = -1;
				}
			}


			//update tank position
			//set angle and speed

			// var angleDiff = 0;
			// if (degrees > this.angle) { // +
			// 	this.angleVel = 1;
			// } else { // -
			// 	this.angleVel = -1;
			// } 

			//set speed
			if (distance >= 10) {
				this.speed = 1;
			} else {
				this.speed = 0;
				this.angleVel = 0;
				this.missionAccomplished();
			}
		}
	},
	refresh: function() {
		if (this.dead) {
			this.missionAccomplished();
			this.selected = false;
			this.speed = 0;
			this.angleVel = 0;
		}
	}

};



