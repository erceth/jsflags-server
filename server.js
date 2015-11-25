//parse commandline args
var commandlineArgs = {};
for (var i = 2; i < process.argv.length; i++) {
	if (process.argv[i].indexOf('=')) {
		var keyValue = process.argv[i].split('=');
		keyValue[1] = parseInt(keyValue[1], 10) || keyValue[1]; //if int change to int
		commandlineArgs[keyValue[0]] = keyValue[1];
	}
}

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var childProcess = require('child_process')

var options = {
	maxNumberOfGames: 2,
    port: commandlineArgs.port || 9000
};

console.log(options)

app.get('/', function(req, res) {
    res.sendFile(__dirname + "/public/index.html");
});

app.get('/js/main.js', function(req, res) {
    res.sendFile(__dirname + "/public/js/main.js");
});

app.get('/css/styles.css', function(req, res) {
    res.sendFile(__dirname + "/public/css/styles.css");
});

http.listen(options.port, function() {
    console.log('listening on *:' + options.port);
});


var Game = function() {
	this.available = true;
	this.port = main.getNextPort(options.port);
	this.id = Math.random().toString(36).substr(2);
	this.instance = null;
	this.aiInstance = null;
	this.maxNumPlayers = 0;
	this.numPlayersConnected = 0;
}

Game.prototype = {
	getId: function() {
		return this.id;
	},
	addInstance: function(instance) {
		this.instance = instance;
		this.listenToInstance();
	},
	listenToInstance: function() {
		var self = this;
		this.instance.on('message', function(m) {
			if (m['join/leave']) {
				self.maxNumPlayers = m['join/leave'].maxNumPlayers;
				self.numPlayersConnected = m['join/leave'].numPlayersConnected;
				main.sendOptions();
			}
		});

		this.instance.on('exit', function(m) {
			main.deleteGame(self.id);
		});

	},
	getMaxNumPlayers: function() {
		return this.maxNumPlayers;
	},
	getNumPlayersConnected: function() {
		return this.numPlayersConnected;
	}
};


/*** main ***/
var main = (function() {
	var socket = null;
    var games = [];

    var gameModes = [
    	{name:'Human vs. Human', modeId: 0, map: 'one_vs_one.json', AICount: 0},
    	{name:'Four Human FFA - obstacles', modeId: 1, map: 'square.json', AICount: 0},
    	{name:'Four Human FFA - no obstacles', modeId: 2, map: 'plain_field.json', AICount: 0},
    	{name:'Human vs. Impossible AI', modeId: 3, map: 'one_vs_one.json', AICount: 1}
    ]

    // FOR DEVELOPMENT
    // for (var i = 0; i < 1; i++) {
    //     games.push(new Game());
    // }
    // FOR DEVELOPMENT

    //connections on default namespace
    io.on("connection", function(sock) {
    	socket = sock;
    	socket.on('createGame', createGame);
    	sendOptions();
    });

    function sendOptions() {
    	var gameStatuses = games.map(function(g) {
    		return {
    			port: g.port,
    			id: g.id,
    			getMaxNumPlayers: g.getMaxNumPlayers(),
    			getNumPlayersConnected: g.getNumPlayersConnected()
    		}
    	});

    	var frontEndOptions = {
            games: gameStatuses,
            numberOfAllowedGames: options.maxNumberOfGames,
            gameModes: gameModes
        };
        
        io.emit("options", frontEndOptions);
    }

    function createGame(newGameOptions) {
    	if (games.length + 1 <= options.maxNumberOfGames) {
    		var newGame = new Game();
    		games.push(newGame);
    		var mode = gameModes[newGameOptions.mode];
    		var forkOptions = [
    			'map=' + mode.map, 
    			'port=' + newGame.port,
    			'AICount=' + mode.AICount
    		];
    		var newInstance = childProcess.fork(__dirname + '/jsflags/index.js', forkOptions, 
    		{
    			cwd: __dirname + '/jsflags'
    		});
    		newGame.addInstance(newInstance);
    		if (mode.AICount > 0) {
    			var aiForkOptions = [
	    			'0', //player number //TODO: choose AI number
	    			'port=' + newGame.port

	    		];
    			newGame.aiInstance = childProcess.fork(__dirname + '/jsflags-ai/index.js', aiForkOptions, 
    			{
	    			cwd: __dirname + '/jsflags-ai'
	    		});
    		}
	    		
    		sendOptions();
    	}
    }

    function deleteGame(gameId) {
    	for(var i = 0; games.length; i++) {
    		if (games[i].id === gameId) {
    			games.splice(i,1);
    			sendOptions();
    			break;
    		}
    	}
    }

    /**
     * Gets the next available port - recursive
     */
    function getNextPort(nextPort) {
    	nextPort++;
    	for (var i = 0; i < games.length; i++) {
    		if (games[i].port === nextPort) {
    			return getNextPort(nextPort);
    		}
    	}
    	return nextPort;
	}

    return {
    	sendOptions: sendOptions,
    	deleteGame: deleteGame,
    	getNextPort: getNextPort
    }

})();



