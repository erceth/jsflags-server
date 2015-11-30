

var Player = require('./player');
var Boundary = require('./boundary');
var Flag = require('./flag');
var globals = require('../index');
var Tank = require('./tank');

var app = globals.app;
var fs = globals.fs;
var vm = globals.vm;
var http = globals.http;
var io = globals.io;
var options = globals.options;

var Game = function(map) {
	http.listen(options.port, function() {
	    console.log('listening on *:' + options.port);
	});

	//variables
	this.Players = [];
	this.gameState = {
		tanks:[],
		boundaries:[],
		bullets:[],
		flags: [],
		score: {}
	};
	this.map = JSON.parse(fs.readFileSync(map, 'utf8')); //get map

	//create players
	for (var i = 0; i < this.map.bases.length; i++) {
		this.Players.push(new Player(this.map.bases[i], this.map.dimensions));
	}

	var self = this;


	this.createBodies();

	//connections on default namespace
	io.on("connection", function(socket) {
		self.init();

		socket.on('disconnect', function() {
	        if (io.sockets.sockets.length <= options.AICount) { //no one's connected? exit process
				process.exit();
			}
	    });
	});

	// io.on("disconnect", function(socket) {
	// 	// var connected = self.Players.filter(function(p) {
	// 	// 	return p.connected;
	// 	// });
		
	// 	console.log(io.sockets.clients());
	// 	// if (this.Players) {

	// 	// }
	// });

	setInterval(function () {
		self.update();
		io.emit("refresh", self.gameState);
	}, 1000 / 60);  //denom is fps

	setInterval(function() {

		for (var i = 0, max = self.gameState.flags.length; i < max; i++) {
			if (self.gameState.flags[i].tankToFollow) {
				self.gameState.score[self.gameState.flags[i].tankToFollow.color].score += options.pointsForCarry;
			}
		}
	}, 1000 / 1);


	//a part of tank prototype
	Tank.prototype.addBulletToGame = function(bullet) {
		self.gameState.bullets.push(bullet);
	};

	Player.prototype.resetGame = function() { 
		if (self.gameState.score.red) {self.gameState.score.red.score = 0; }
		if (self.gameState.score.blue) {self.gameState.score.blue.score = 0; }
		if (self.gameState.score.green) {self.gameState.score.green.score = 0; }
		if (self.gameState.score.purple) {self.gameState.score.purple.score = 0; }
		for (var i = 0; i < self.gameState.tanks.length; i++) {
			self.gameState.tanks[i].die(5000);
		}
		for (var j = 0; j < self.gameState.flags.length; j++) {
			self.gameState.flags[j].die();
		}
	}
	Player.prototype.gameInit = function () {
		self.init();
	}
	
};


Game.prototype = {
	init: function() {
		var self = this;
		var modifiedPlayers = [];
		for (var i = 0; i < self.Players.length; i++) { //TODO: use array.map
			var modifiedPlayer = {
				connected: self.Players[i].connected,
				playerColor: self.Players[i].playerColor,
				playerNumber: self.Players[i].playerNumber,
				namespace: self.Players[i].namespace,
				base: self.Players[i].base
			};
			
			modifiedPlayers.push(modifiedPlayer);

		}

		io.emit("init", {dimensions: self.map.dimensions, players: modifiedPlayers, scoreboard: self.map.scoreboard, tanks: self.gameState.tanks, options: options});
		self.updateGameServer();
	},
	update: function() {
		//TANKS
		var b1, b2, i = this.gameState.tanks.length;
		while((i-=1) >= 0) {
			var okToMoveX = true, okToMoveY = true;
			b1 = this.gameState.tanks[i];
			b1.calculate();
			j = this.gameState.tanks.length;
			while((j-=1) >= 0) {
				if (i===j) {continue;}
				var b1Right = b1.positionStep.x + b1.size.width / 2;
				var b1Left = b1.positionStep.x - b1.size.width / 2;
				
				var b1Top = b1.positionStep.y - b1.size.height / 2;
				var b1Bottom = b1.positionStep.y + b1.size.height / 2;

				b2 = this.gameState.tanks[j];
				if (b2.ghost) {continue;} //drive through ghost tanks

				var b2Right = b2.position.x + b2.size.width / 2;
				var b2Left = b2.position.x - b2.size.width / 2;

				var b2Top = b2.position.y - b2.size.height / 2;
				var b2Bottom = b2.position.y + b2.size.height / 2;

				if (! (b1Right < b2Left || b1Left > b2Right || b1Top > b2Bottom || b1Bottom < b2Top) ) { 
					okToMoveX = false;
					okToMoveY = false;
					break;
				}
				if (b1Right > this.map.dimensions.width || b1Left < 0) {
					okToMoveX = false;
				}
				if (b1Bottom > this.map.dimensions.height || b1Top < 0) {
					okToMoveY = false;
				}
			}
			j=this.gameState.boundaries.length;
			while((j-=1) >= 0) {
				b2 = this.gameState.boundaries[j];

				b2Right = b2.position.x + b2.size.width / 2;
				b2Left = b2.position.x - b2.size.width / 2;

				b2Top = b2.position.y - b2.size.height / 2;
				b2Bottom = b2.position.y + b2.size.height / 2;
				if (! (b1Right < b2Left || b1Left > b2Right || b1Top > b2Bottom || b1Bottom < b2Top) ) {
					okToMoveX = false;
					okToMoveY = false;
					break;
				}
			}
			if (okToMoveX) {
				b1.moveX();
			}
			if (okToMoveY) {
				b1.moveY();
			}
		}
		//BULLETS
		if(this.gameState.bullets.length > 0) {
			i = this.gameState.bullets.length;
			while((i-=1) >= 0) {
				b1 = this.gameState.bullets[i];
				b1.calculate();
				j = this.gameState.tanks.length;
				while((j-=1) >= 0) {
					b2 = this.gameState.tanks[j];

					b1Right = b1.position.x + b1.size.width / 2;
					b1Left = b1.position.x - b1.size.width / 2;

					b1Top = b1.position.y - b1.size.height / 2;
					b1Bottom = b1.position.y + b1.size.height / 2;

					b2Right = b2.position.x + b2.size.width / 2;
					b2Left = b2.position.x - b2.size.width / 2;

					b2Top = b2.position.y - b2.size.height / 2;
					b2Bottom = b2.position.y + b2.size.height / 2;

					if (! (b1Right < b2Left || b1Left > b2Right || b1Top > b2Bottom || b1Bottom < b2Top) ) {
						b1.die();
						b2.die();
						break;
					}
				}
				k=this.gameState.boundaries.length;
				while((k-=1) >= 0) {
					b2 = this.gameState.boundaries[k];
					
					b2Right = b2.position.x + b2.size.width / 2;
					b2Left = b2.position.x - b2.size.width / 2;

					b2Top = b2.position.y - b2.size.height / 2;
					b2Bottom = b2.position.y + b2.size.height / 2;

					if (! (b1Right < b2Left || b1Left > b2Right || b1Top > b2Bottom || b1Bottom < b2Top) ) { 
						b1.die();
						b2.die();
						break;
					}
				}
				if (b1Right < 0 || b1Left > this.map.dimensions.width || b1Bottom < 0 || b1Top > this.map.dimensions.height) {
					b1.die();
				}
				b1.moveX();
				b1.moveY();
			}

			//filter out dead bullets
			this.gameState.bullets = this.gameState.bullets.filter(function(bullet) {
				return !bullet.dead;
			});
		}
		var tank, flag;
		i = this.gameState.flags.length;
		while ((i-=1) >= 0) {
			flag = this.gameState.flags[i];
			j = this.gameState.tanks.length;
			while ((j-=1) >= 0) {
				tank = this.gameState.tanks[j];
				if (tank.dead) {continue;}
				var flagRight = flag.position.x + flag.size.width / 2;
				var flagLeft = flag.position.x - flag.size.width / 2;
				
				var flagTop = flag.position.y - flag.size.height / 2;
				var flagBottom = flag.position.y + flag.size.height / 2;

				var tankRight = tank.position.x + tank.size.width / 2;
				var tankLeft = tank.position.x - tank.size.width / 2;

				var tankTop = tank.position.y - tank.size.height / 2;
				var tankBottom = tank.position.y + tank.size.height / 2;
				if (! (flagRight < tankLeft || flagLeft > tankRight || flagTop > tankBottom || flagBottom < tankTop) ) { 
					if (tank.color !== flag.color) {
						flag.followThisTank(tank);
						tank.carryFlag(flag);
					} else {
						//flag.die();  //same color as flag, reset
					}
					//break;
				}
			}
			flag.update();

			// j = this.Players.length;
			// while((j-=1) > 0) {
			// 	base = this.Players[j].base;
			// 	if (!flag.tankToFollow || !(flag.tankToFollow.color === base.playerColor)) { continue; } //tank returns to it's base

			// 	flagRight = flag.position.x + flag.size.width;
			// 	flagLeft = flag.position.x;
				
			// 	flagTop = flag.position.y;
			// 	flagBottom = flag.position.y + flag.size.height;

			// 	var baseRight = base.position.x + base.size.width;
			// 	var baseLeft = base.position.x;

			// 	var baseTop = base.position.y;
			// 	var baseBottom = base.position.y + base.size.height;

			// 	if (! (flagRight < baseLeft || flagLeft > baseRight || flagTop > baseBottom || flagBottom < baseTop) ) { 
			// 		this.gameState.score[b1.tankToFollow.color] += options.pointsForCapture;
			// 		flag.die();
			// 	}
			// }

		}

		//check if flag is returned to base
		var flag, base;
		i = this.gameState.flags.length;
		while ((i-=1) >= 0) {
			flag = this.gameState.flags[i];
			j = this.Players.length;
			while ((j-=1) >= 0) {
				base = this.Players[j].base;
				if (!flag.tankToFollow) { continue; }
				if (!(flag.tankToFollow.color === this.Players[j].playerColor)) { continue; } //tank returns to it's base
				flagRight = flag.position.x + flag.size.width / 2;
				flagLeft = flag.position.x - flag.size.width / 2;
				
				flagTop = flag.position.y - flag.size.height / 2;
				flagBottom = flag.position.y + flag.size.height / 2;

				var baseRight = base.position.x + base.size.width / 2;
				var baseLeft = base.position.x - base.size.width / 2;

				var baseTop = base.position.y - base.size.height / 2;
				var baseBottom = base.position.y + base.size.height / 2;

				if (! (flagRight < baseLeft || flagLeft > baseRight || flagTop > baseBottom || flagBottom < baseTop) ) { 
					this.gameState.score[flag.tankToFollow.color].score += options.pointsForCapture;
					flag.die();
				}
			}
		}


		// j = this.Players.length;
		// 	while((j-=1) > 0) {
		// 		base = this.Players[j].base;
		// 		if (!flag.tankToFollow || !(flag.tankToFollow.color === base.playerColor)) { continue; } //tank returns to it's base

		// 		flagRight = flag.position.x + flag.size.width;
		// 		flagLeft = flag.position.x;
				
		// 		flagTop = flag.position.y;
		// 		flagBottom = flag.position.y + flag.size.height;

		// 		var baseRight = base.position.x + base.size.width;
		// 		var baseLeft = base.position.x;

		// 		var baseTop = base.position.y;
		// 		var baseBottom = base.position.y + base.size.height;

		// 		if (! (flagRight < baseLeft || flagLeft > baseRight || flagTop > baseBottom || flagBottom < baseTop) ) { 
		// 			this.gameState.score[b1.tankToFollow.color] += options.pointsForCapture;
		// 			flag.die();
		// 		}
		// 	}


		//FLAGS
		// i = this.gameState.flags.length;
		// while((i-=1) >= 0) {
		// 	b1 = this.gameState.flags[i];
		// 	b1.update();
		// 	if (b1.hasTank()) {continue;}
		// 	j = this.gameState.tanks.length;
		// 	while((j-=1) >= 0) {
		// 		b1Right = b1.position.x + b1.size.width;
		// 		b1Left = b1.position.x;

		// 		b1Top = b1.position.y;
		// 		b1Bottom = b1.position.y + b1.size.height;


		// 		b2 = this.gameState.tanks[j];
		// 		b2Right = b2.positionStep.x + b2.size.width;
		// 		b2Left = b2.positionStep.x;
				
		// 		b2Top = b2.positionStep.y;
		// 		b2Bottom = b2.positionStep.y + b2.size.height;

		// 		if (! (b1Right < b2Left || b1Left > b2Right || b1Top > b2Bottom || b1Bottom < b2Top) ) {
		// 			if (b1.color !== b2.color ) {
		// 				b1.followThisTank(b2);
		// 			} else if (b1.color === b2.color) { console.log("reset");
		// 				b1.die(); //reset the flag
		// 			}
		// 		}
		// 	}
		// }
	},
	createBodies: function() {
		for (var i = 0; i < this.Players.length; i++) {
			for (var j = 0; j < this.Players[i].tanks.length; j++) {
				this.gameState.tanks.push(this.Players[i].tanks[j]);
				//TODO: add bullet function
			}

			this.gameState.flags.push(new Flag(this.Players[i].playerColor, this.Players[i].base.position ));
			this.gameState.score[this.Players[i].playerColor] = {color: this.Players[i].playerColor, score: 0};
		}
		for (var k = 0; k < this.map.boundaries.length; k++) {
			this.gameState.boundaries.push(new Boundary(this.map.boundaries[k]));
		}
	},
	updateGameServer: function() {
		//Tells game server status of game
		if (process) {
			
			var playersConnected = this.Players.filter(function(p) {
				return p.connected;
			});
			var forServerData = {
				maxNumPlayers: this.Players.length,
				numPlayersConnected: playersConnected.length,
				totalConnections: io.sockets.sockets.length,
				totalConnections: io.sockets.sockets.length
			};
			process.send({'join/leave': forServerData });
		}
	}

};


module.exports = Game;
