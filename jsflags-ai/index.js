//parse commandline args
var commandlineArgs = {};
for (var i = 2; i < process.argv.length; i++) {
	if (process.argv[i].indexOf('=')) {
		var keyValue = process.argv[i].split('=');
		keyValue[1] = parseInt(keyValue[1], 10) || keyValue[1]; //if int change to int
		commandlineArgs[keyValue[0]] = keyValue[1];
	}
}

var port = commandlineArgs.port || "8003";
var url = 'http://localhost:' + port;
var socketio = require('socket.io-client');
var socket = socketio(url);
var command;  //socket to send commands on
var initData;

var connected = false;

//global vars
var selectedPlayer;
var myTanks = [];
var enemyTanks = [];
var allTanks = [];
var allFlags = [];
var enemyFlags = [];
var myFlag;
var allObstacles = [];

var playerSelection;
if (process.argv[2]) {
	playerSelection = parseInt(process.argv[2], 10);
}


socket.on("init", function(initD) {
	if (connected) {
		return false;
	}
	socket.on("disconnect", function() {
		//process.exit(1);
	});
	connected = true;
	initData = initD;
	selectedPlayer = initData.players[playerSelection];
	command = socketio(url + "/" + selectedPlayer.namespace);
	var serverTanks = initData.tanks.filter(function(t) {
		return selectedPlayer.playerColor === t.color;
	});
	for (var i = 0; i < serverTanks.length; i++) {
		myTanks.push(new Tank(i));
	}

	setTimeout(function() {
		startInterval();
	}, 2000);

});


/*** AI logic goes after here ***/

/** send back to server **/
function startInterval() {
	setInterval(function() {
		commander();
	}, 1000/50);
}


/** Commander function **/
function commander() {

	var unassignedTanks = myTanks.filter(function(t) {
		return !t.dead;
	});

	//if tanks have enemy flag, go home
	var tanksThatHaveFlag = unassignedTanks.filter(function(t) {
		return t.hasFlag;
	});
	for (var i = 0; i < tanksThatHaveFlag.length; i+=1) {
		tanksThatHaveFlag[i].goHome();
	}

	unassignedTanks = unassignedTanks.filter(function(t) {
		return !t.hasFlag;
	});

	//protect our flag
	var closestTank = {tank: null, distance: Infinity};
	if (myFlag.tankToFollow) {
		for (var i = 0; i < unassignedTanks.length; i+=1) {
			var distance = round(Math.sqrt(Math.pow(( myFlag.position.x - unassignedTanks[i].position.x ), 2) + Math.pow(( myFlag.position.y - unassignedTanks[i].position.y ), 2)), 4);
			if (distance < closestTank.distance) {
				closestTank.distance = distance;
				closestTank.tank = unassignedTanks[i];
			}
		}
		if (closestTank.tank) {
			closestTank.tank.protectHomeFlag();	
		}
	}
	if (closestTank.tank) {
		unassignedTanks = unassignedTanks.filter(function(t) {
			return t.tankNumber !== closestTank.tank.tankNumber;
		});	
	}
	
	for (i = 0; i < unassignedTanks.length; i+=1) {
		unassignedTanks[i].attack();
	}

	

	//TODO: if fellow tank has flag and 100 distance, protect him

	sendOrders();

}

function sendOrders() {
	var speed, angleVel, orders;
	for (var i = 0; i < myTanks.length; i++) {
		myTanks[i].carryOutOrders();
		speed = myTanks[i].getSpeed();
		angleVel = myTanks[i].getAngleVel();
		orders = {
			tankNumbers: [myTanks[i].tankNumber], //an array of numbers e.g. [0,1,2,3]
			speed: speed,                         //speed of tank value of -1 to 1, numbers outside of this range will default to -1 or 1, whichever is closer.
			angleVel: angleVel                    //turning speed of tank positive turns right, negative turns left
		}
		command.emit("move", orders);
	}
}


/** recieve from server **/
socket.on("refresh", function(gameState) {
	var myTanksNewPosition = gameState.tanks.filter(function(t) {
		return selectedPlayer.playerColor === t.color;
	});

	for (var i = 0; i < myTanks.length; i++) {
		for (var j = 0; j < myTanksNewPosition.length; j++) {
			if (myTanks[i].tankNumber === myTanksNewPosition[j].tankNumber) {
				myTanks[i].updateTank(myTanksNewPosition[j]);
			}
		}
	}


	enemyTanks = gameState.tanks.filter(function(t) {
		return selectedPlayer.playerColor !== t.color;
	});

	allTanks = gameState.tanks;

	allObstacles = gameState.boundaries;

	myFlag = gameState.flags.filter(function(f) {
		return f.color === selectedPlayer.playerColor;
	})[0];

	enemyFlags = gameState.flags.filter(function(f) {
		return f.color !== selectedPlayer.playerColor;
	});

	allFlags = gameState.flags;
	
});




var CONSTANTS = {
	AVOID_OBSTACLE_STRENGTH :  5.15,
	AVOID_TANKS_STRENGTH : 5.5,
	CALCULATE_ROUTE_STRENGTH : 1,  // ranges from -4 to 4

	AVOID_OBSTACLE_BUFFER: 1,
	AVOID_TANKS_BUFFER: 1,
	ENEMY_ENGAGE_DISTANCE: 300,
	ANGLE_TO_FIRE: 5

}

/*** TANK ***/
var Tank = function(tankNumber) {
	this.tankNumber = tankNumber;
	this.position = {x: 0, y: 0};
	this.angle;
	this.hasFlag;
	this.dead;
	this.angleToTarget;
	this.distanceToTarget;

	this.goal = {
		speed: 0,
		angleVel: 0
	};
	this.avoidObstacle = {
		speed: 0,
		angleVel: 0
	};
	this.avoidTank = {
		speed: 0,
		angleVel: 0
	}
	this.resetTarget();
};

Tank.prototype = {
	updateTank: function(myTanksNewPosition) {
		this.position = myTanksNewPosition.position;
		this.angle = myTanksNewPosition.angle;
		this.hasFlag = myTanksNewPosition.hasFlag;
		this.dead = myTanksNewPosition.dead;
		if (this.dead) {
			this.resetTarget();
		}
	},
	getSpeed: function() {
		return this.goal.speed + this.avoidObstacle.speed + this.avoidTank.speed;
	},
	getAngleVel: function() {
		return this.goal.angleVel + this.avoidObstacle.angleVel + this.avoidTank.angleVel;
	},
	resetTarget: function() {
		this.target = {
			type: "", //flag, tank, home base
			color: "",
			number: "", //only for tanks
			position: {
				x: 100,
				y: 100
			}
		};
		this.hasATarget = false;
		this.tanksToIgnore = [];
	},
	goHome: function() {
		this.target.type = "base"; //TODO: make constant
		this.target.color = selectedPlayer.color;
		this.target.number = null; // N/A
		this.target.position = selectedPlayer.base.position;

		this.calculateRoute();
		this.calculateObstacle();
		this.avoidOtherTanks("enemy");
	},
	attack: function() {
  		var self = this;
  		var priorityTarget;
		if (!this.target.type !== "flag") {
			this.generateTarget();
		} else {
			this.updateTarget();
		}

		var closestTank = {tank: null, distance: Infinity}, distance = Infinity;
		for (var i = 0; i < enemyTanks.length; i+=1) {
			if (enemyTanks[i].dead) { continue; }
			distance = round(Math.sqrt(Math.pow(( enemyTanks[i].position.x - this.position.x ), 2) + Math.pow(( enemyTanks[i].position.y - this.position.y ), 2)), 4);
			if (distance < CONSTANTS.ENEMY_ENGAGE_DISTANCE && distance < closestTank.distance) { //TODO: check tanks to ignore
				closestTank.tank = enemyTanks[i];
				closestTank.distance = distance;
			}
		}

		if (closestTank.tank) {
			priorityTarget = closestTank.tank.position; //attack local tank
			//TODO: attack nose
			//priorityTarget = {x: closestTank.tank.position.x + Math.cos(closestTank.tank.radians) * 20, y: closestTank.tank.position.y - Math.sin(closestTank.tank.radians) * 20};
			// if (this.tankNumber === 0) {
			// 	console.log(closestTank.tank.angle, closestTank.tank.position.x, closestTank.tank.position.y, priorityTarget.x, priorityTarget.y);
			// }
			//console.log(priorityTarget.x, closestTank.tank.position.x, priorityTarget.y, closestTank.tank.position.y );

		} else {
			priorityTarget = this.target.position; //head for the flag
		}
		
		this.calculateRoute(priorityTarget);
		this.calculateObstacle();
		this.avoidOtherTanks();

		//When to fire
		if (this.distanceToTarget < CONSTANTS.ENEMY_ENGAGE_DISTANCE && Math.abs(this.angleToTarget) < CONSTANTS.ANGLE_TO_FIRE) {
			command.emit("fire", {tankNumbers: [this.tankNumber]});
		}
	},
	//priorityTarget is optional
	calculateRoute: function(priorityTarget) {
		if (!priorityTarget) {
			priorityTarget = this.target.position;
		}

		var relativeX = priorityTarget.x - this.position.x;
		var relativeY = priorityTarget.y - this.position.y;

		distance = round(Math.sqrt(Math.pow(( relativeX ), 2) + Math.pow(( relativeY ), 2)), 4);

		//find angle difference to face goal
		angle = round(Math.atan2(-(relativeY), relativeX), 4);
		degrees = round(angle * (180 / Math.PI), 4);  //convert from radians to degrees
		degrees = -(degrees); // tank degrees ascends clockwise. atan2 ascends counter clockwise. this fixes that difference

		//turn in the direction whichever is closer
		if (degrees < 0) {
			degrees = (degrees + 360) % 360;
		}

		angleDifference = this.angle - degrees; //between -360 and 360

		//update
		this.distanceToTarget = distance;
		this.angleToTarget = angleDifference;

		if (angleDifference > 0) {
			if (angleDifference < 180) {
				this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH * (round(angleDifference / 60), 4);
				//this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH;
			} else {
				this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH * (round(angleDifference / 60), 4);
				//this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH;
			}
		} else {
			if (angleDifference > -180) {
				this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH * (round(angleDifference / 60), 4);
				//this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH;
				
			} else {
				this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH * (round(angleDifference / 60), 4);
				//this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH;
			}
		}

		// if (angleDifference >= 0) { 
		// 	this.goal.angleVel = -CONSTANTS.CALCULATE_ROUTE_STRENGTH - (angleDifference / 60); //smaller turns with small difference and larger turns with larger difference
		// 	//this.goal.angleVel = -1;
		// } else {
		// 	this.goal.angleVel = CONSTANTS.CALCULATE_ROUTE_STRENGTH + (angleDifference / 60);  //ranges between 0 to 3  (180/60)
		// 	//this.goal.angleVel = 1;
		// }


		//set speed
		if (distance >= 10) {
			this.goal.speed = 1;
		}


	},
	calculateObstacle: function() {
		var distance, relativeX, relativeY, angle, degrees, obstacleRadius, howClose;

		//reset
		this.avoidObstacle.angleVel = 0;
		this.avoidObstacle.speed = 0;

		for (var j = 0, maxj = allObstacles.length; j < maxj; j++) {

			distance = round( Math.sqrt( Math.pow( allObstacles[j].position.x - this.position.x, 2 ) + 
							  			 Math.pow( allObstacles[j].position.y - this.position.y, 2 ) ), 4);

			obstacleRadius = round( Math.sqrt( Math.pow( allObstacles[j].size.height, 2 ) + 
									 		   Math.pow( allObstacles[j].size.width,  2 ) ), 4 );

			if (distance < (obstacleRadius + CONSTANTS.AVOID_OBSTACLE_BUFFER) ) {
				var angleToObstacle = round(Math.atan2(-(allObstacles[j].position.y - this.position.y), -(allObstacles[j].position.x - this.position.x) ), 4);
				angleToObstacle = round(angleToObstacle * (180 / Math.PI), 4);  //convert from radians to degrees

				if (angleToObstacle < 0) {
					angleToObstacle = (angleToObstacle + 360) % 360;
				}

				angleDifference = this.angle - angleToObstacle;

				if (angleDifference > 0) {
					if (angleDifference < 180) {
						this.avoidObstacle.angleVel = (round( -CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_OBSTACLE_BUFFER)/distance, 4));
					} else {
						this.avoidObstacle.angleVel = (round( CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_OBSTACLE_BUFFER)/distance, 4));
					}
				} else {
					if (angleDifference > -180) {
						this.avoidObstacle.angleVel = (round( CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_OBSTACLE_BUFFER)/distance, 4));
					} else {
						this.avoidObstacle.angleVel = (round( -CONSTANTS.AVOID_OBSTACLE_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_OBSTACLE_BUFFER)/distance, 4));
					}
				}

				this.goal.speed = 1;

			} 


		}


	},
	//whichTanksToAvoid is optional
	avoidOtherTanks: function(whichTanksToAvoid) {
		var tanksToAvoid = [];
		if (whichTanksToAvoid === "enemy") {
			tanksToAvoid = allTanks.filter(function(t) {
				return t.color !==selectedPlayer.playerColor;
			});
		} else {
			tanksToAvoid = allTanks;
		}
		var distance, relativeX, relativeY, angle, degrees, obstacleRadius, howClose;

		//reset
		this.avoidTank.angleVel = 0;
		this.avoidTank.speed = 0;

		for (var j = 0, maxj = tanksToAvoid.length; j < maxj; j++) {
			if ((tanksToAvoid[j].color === selectedPlayer.playerColor && tanksToAvoid[j].tankNumber === this.tankNumber) ||
				(tanksToAvoid[j].dead)) {
				continue;
			}


			distance = round( Math.sqrt( Math.pow( tanksToAvoid[j].position.x - this.position.x, 2 ) + 
							  			 Math.pow( tanksToAvoid[j].position.y - this.position.y, 2 ) ), 4);

			obstacleRadius = round( Math.sqrt( Math.pow( tanksToAvoid[j].size.height, 2 ) + 
									 		   Math.pow( tanksToAvoid[j].size.width,  2 ) ), 4 );

			if (distance < (obstacleRadius + CONSTANTS.AVOID_TANKS_BUFFER) ) {
				var angleToObstacle = round(Math.atan2(-(tanksToAvoid[j].position.y - this.position.y), -(tanksToAvoid[j].position.x - this.position.x) ), 4);
				angleToObstacle = round(angleToObstacle * (180 / Math.PI), 4);  //convert from radians to degrees

				if (angleToObstacle < 0) {
					angleToObstacle = (angleToObstacle + 360) % 360;
				}

				angleDifference = this.angle - angleToObstacle;

				if (angleDifference > 0) {
					if (angleDifference < 180) {
						this.avoidTank.angleVel = (round( -CONSTANTS.AVOID_TANKS_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_TANKS_BUFFER)/distance, 4));
					} else {
						this.avoidTank.angleVel = (round( CONSTANTS.AVOID_TANKS_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_TANKS_BUFFER)/distance, 4));
					}
				} else {
					if (angleDifference > -180) {
						this.avoidTank.angleVel = (round( CONSTANTS.AVOID_TANKS_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_TANKS_BUFFER)/distance, 4));
					} else {
						this.avoidTank.angleVel = (round( -CONSTANTS.AVOID_TANKS_STRENGTH * (obstacleRadius + CONSTANTS.AVOID_TANKS_BUFFER)/distance, 4));
					}
				}

				this.goal.speed = 1;

			} 


		}

	},

	protectHomeFlag: function() {
		this.target.type = "flag";
		this.target.color = selectedPlayer.playerColor;
		this.updateTarget();

		this.calculateRoute();
		this.calculateObstacle();
		this.avoidOtherTanks();

		//When to fire
		if (this.distanceToTarget < CONSTANTS.ENEMY_ENGAGE_DISTANCE && Math.abs(this.angleToTarget) < CONSTANTS.ANGLE_TO_FIRE) {
			command.emit("fire", {tankNumbers: [this.tankNumber]});
		}
	},
	generateTarget: function() {
		var randomNumber = Math.floor(Math.random() * (10 * enemyFlags.length) % enemyFlags.length); //random num between 0 and allFlags.length
		this.target.position = enemyFlags[randomNumber].position;
		this.target.type = "flag";
		this.target.color = enemyFlags[randomNumber].color;

		this.hasATarget = true;
	},
	updateTarget: function() {
		var self = this;
		if (this.target.type === "flag") {
			var flag = allFlags.filter(function(f) {
				return f.color === self.target.color;
			})[0];
			this.target.position.x = flag.position.x;
			this.target.position.y = flag.position.y;
		}
	},
	carryOutOrders: function() {

	},
	missionAccomplished: function() {
		this.target = {
			type: "", //flag, tank, home base
			color: "",
			number: "", //only for tanks
			position: {
				x: 100,
				y: 100
			}
		}
		this.hasATarget = false;
	}
};


//rounds number (value) to specified number of decimals
function round(value, decimals) {
    return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}


