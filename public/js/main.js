angular.module("app", []).config(config).controller("AppCtrl", AppCtrl);

function config() {

}

function AppCtrl($scope) {
    var socket = io();
    socket.on('options', function(options) {
        $scope.activeGames = options.games;
        var availableGames = options.numberOfAllowedGames - options.games.length;
        $scope.availableGames = [];
        for (var i = 0; i < availableGames; i++) {
        	$scope.availableGames.push({});
        }
        $scope.gameModes = options.gameModes;
        updateScope();
    });


    /**
     * function to run when join game button is clicked
     */
    $scope.createGame = function(mode) {
        socket.emit('createGame', {mode: mode});
    }

    function updateScope() {
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }


}

