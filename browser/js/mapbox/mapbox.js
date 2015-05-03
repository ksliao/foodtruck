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


app.controller('MapBoxController', function($scope, trucks, $http){

    $scope.formatMarkers = function(arr){

        _.remove(arr, function(elem){
            return !elem.coordinates;
        });

        return arr.map(function(truck){
            return {
                lat: truck.coordinates.latitude,
                lng: truck.coordinates.longitude
            }
        });
    };

    $scope.markers = $scope.formatMarkers(trucks);

    angular.extend($scope, {
            center: {
                autoDiscover: true
            },
            layers: {
                baselayers: {
                    mapbox_light: {
                        name: 'Mapbox Light',
                        url: 'http://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
                        type: 'xyz',
                        layerOptions: {
                            apikey: 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q',
                            mapid: 'bufanuvols.lia22g09'
                        }
                    },
                    osm: {
                        name: 'OpenStreetMap',
                        url: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        type: 'xyz'
                    }
                }
            }

        });

});
