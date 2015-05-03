'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('map', {
        url: '/',
        templateUrl: 'js/mapbox/mapbox.html',
        controller: 'MapBoxController',
        resolve: {
            trucks: function(MapFactory){
                return MapFactory.getFilteredTrucks();
            }
        }
    });
});


app.controller('MapBoxController', function($scope){

    angular.extend($scope, {
            center: {
                autoDiscover: true
            }
        }
    )
});
