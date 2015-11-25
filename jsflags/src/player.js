var globals = require('../index');
var options = globals.options;
var io = globals.io;
var Tank = require('./tank');

/* Player AND Connection */
var Player = function(base, dimensions) {
	this.playerNumber = base.playerNumber;
	this.namespace = "player" + this.playerNumber;
	this.connection = io.of(this.namespace);
	this.playerColor = base.color;
	this.tanks = [];
	this.base = {
		position: base.position,
		size: base.size
	};
	this.connected = false;

	var self = this;

	for (var i = 0; i < options.numOfTanks; i++) {
		this.tanks.push(new Tank(this.base, this.playerColor, i, dimensions));
	}

	//connection part
	this.connection.on("connect", function(socket) {
		console.log(self.playerColor + " connected");
		self.connected = true;
		self.gameInit();  //resend init data
		if (options.resetOnJoin) {
			self.resetGame();
		}
		//reset game for new player

		socket.on("disconnect", function() {
			self.connected = false;
			self.gameInit();  //resend init data
			console.log("goodbye y'all");
		});
		socket.on("move", function(orders) {
			self.moveTanks(orders);
		});
		socket.on("fire", function(orders) {
			self.fireTanks(orders);	
		});
	});

};

Player.prototype = {
	moveTanks: function(orders) {
		for (var i = 0; i < orders.tankNumbers.length; i++) {
			var tankNumber = parseInt(orders.tankNumbers[i], 10);
			if ((tankNumber || tankNumber === 0) && (tankNumber < this.tanks.length && tankNumber >= 0)) {
				this.tanks[tankNumber].moveTanks({speed: orders.speed, angleVel: orders.angleVel});
			}
		}
	},
	fireTanks: function(orders) {
		for (var i = 0; i < orders.tankNumbers.length; i++) {
			var tankNumber = parseInt(orders.tankNumbers[i], 10);
			if ((tankNumber || tankNumber === 0) && (tankNumber < this.tanks.length && tankNumber >= 0)){
				this.tanks[tankNumber].fireTanks({speed: orders.speed, angleVel: orders.angleVel});
			}
		}
	}
};

module.exports = Player;
