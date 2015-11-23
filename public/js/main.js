var socket = io();

socket.on('options', function(options){ 
	var gameElement = $('#games');
	gameElement.empty();

	//create the active game buttons, if any
	for (var i = 0; i < options.games.length; i++) {
		var buttonElement = $('<div class="button active"></div>');
		buttonElement.data(buttonElement, 'id', options.games[i].id);
		buttonElement.append('<a target="_blank" href=":' + options.games[i].port + '">Join game</a>');
		gameElement.append(buttonElement);
		//TODO show number of players playing (e.g. 3 out of 4)
	}
	//create available game buttons, if any
	var availableGames = options.numberOfAllowedGames - options.games.length;
	for (var j = 0; j < availableGames; j++) {
		var buttonElement2 = $('<div class="button available">Create Game</div>');
		gameElement.append(buttonElement2);
		buttonElement2.on('click', createGame);
	}

});

/**
 * function to run when join game button is clicked
 */
function createGame (e) {
	socket.emit('createGame');
	console.log(e);
}


