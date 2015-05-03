app.config(function ($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignUpCtrl',
        resolve:{
            coords: function(TruckFactory) {
                return TruckFactory.getLocation();
            }
        }
    });
});

app.controller('SignUpCtrl', function($scope, coords, TruckFactory){

    console.log(coords);

    $scope.truck = {
        email: '',
        password: '',
        name: '',
        cuisine: '',
        coordinates: coords
    }

    $scope.createTruck = function(){
        TruckFactory.newTruck($scope.truck).then(function(truck){
            console.log(truck);
        });
    }

});

