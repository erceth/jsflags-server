var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var childProcess = require('child_process')

var options = {
    port: 8004,
    startingPortOfSpawnedGames: 8005,
    maxNumberOfGames: 2
}

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
	this.port = options.startingPortOfSpawnedGames++;
	this.id = Math.random().toString(36).substr(2);
	this.instance = null;
	this.aiInstance = null;
}

Game.prototype = {
	getId: function() {
		return this.id;
	}
};


/*** main ***/
(function() {
	var socket = null;
    var games = [];

    var gameModes = [
    	{name:'Human vs. Human', modeId: 0, map: 'one_vs_one.json'},
    	{name:'Four Human FFA - obstacles', modeId: 1, map: 'square.json'},
    	{name:'Four Human FFA - no obstacles', modeId: 2, map: 'plain_field.json'},
    	{name:'Human vs. Impossible AI', modeId: 3, map: 'one_vs_one.json', ai: true}
    ]

    // FOR DEVELOPMENT
    // for (var i = 0; i < 1; i++) {
    //     games.push(new Game());
    // }
    // FOR DEVELOPMENT

    //connections on default namespace
    io.on("connection", function(sock) {
    	socket = sock;
    	sendOptions();
    });

    function sendOptions() {
    	var gameStatuses = games.map(function(g) {
    		return {
    			port: g.port,
    			id: g.id
    		}
    	});

    	var frontEndOptions = {
            games: gameStatuses,
            numberOfAllowedGames: options.maxNumberOfGames,
            gameModes: gameModes
        };
        socket.on('createGame', createGame);
        io.emit("options", frontEndOptions);
    }

    function createGame(newGameOptions) {
    	if (games.length + 1 <= options.maxNumberOfGames) {
    		var newGame = new Game();
    		games.push(newGame);
    		var mode = gameModes[newGameOptions.mode];
    		var forkOptions = [
    			'map=' + mode.map, 
    			'port=' + newGame.port
    		];
    		newGame.instance = childProcess.fork(__dirname + '/jsflags/index.js', forkOptions, 
    		{
    			cwd: __dirname + '/jsflags'
    		});
    		if (mode.ai) {
    			var aiForkOptions = [
	    			'0', //player number
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

})();



