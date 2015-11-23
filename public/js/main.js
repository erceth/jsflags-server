angular.module("app", []).config(config).controller("AppCtrl", AppCtrl);

function config() {

}

function AppCtrl($scope) {
    var socket = io();
    socket.on('options', function(options) {
        $scope.activeGames = options.games;
        var availableGames = options.numberOfAllowedGames - options.games.length;
        $scope.availableGames = new Array(availableGames);
        updateScope();
    });


    /**
     * function to run when join game button is clicked
     */
    $scope.createGame = function() {
        socket.emit('createGame');
    }

    function updateScope() {
        if (!$scope.$$phase) {
            $scope.$apply();
        }
    }


}

