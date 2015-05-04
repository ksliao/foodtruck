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


app.controller('MapBoxController', function($scope, trucks, $http, $rootScope, MapFactory, GeoFactory){


    GeoFactory.getGeo().then(function (){ 
          if (GeoFactory.latitude && GeoFactory.longitude){
            $scope.userMarker = {
                lat: GeoFactory.latitude,
                lng: GeoFactory.longitude,
                title: "User",
                focus: true,
                draggable: false,
                message: "Me!",
                // label: {
                //     message: "Me!",
                //     options: {
                //         noHide: true
                //     },
                // },
                icon: {
                    type: 'awesomeMarker',
                    icon: 'cog',
                    markerColor: 'red'
                }
            };
            $scope.markers.push($scope.userMarker);
          }
        });

    $scope.getAllTrucks = function(){
        MapFactory.getTrucks()
            .then(function(trucks){
                $scope.markers = $scope.formatMarkers(trucks);
            })
    };

    $scope.nearByTrucks = function(){
        $scope.markers = $scope.formatMarkers(trucks);
    }

    $rootScope.$on('showAllTrucks', $scope.getAllTrucks);
    $rootScope.$on('limitTrucks', $scope.nearByTrucks);


    $scope.formatMarkers = function(arr){

        _.remove(arr, function(elem){
            return !elem.coordinates;
        });

        return arr.map(function(truck){
            return {
                layer: 'truckCluster',
                lat: truck.coordinates.latitude,
                lng: truck.coordinates.longitude,
                message: truck.cuisine,
                 label: {
                    message: truck.name
                    }
                }
        });
    };

    $scope.markers = $scope.formatMarkers(trucks);
    

    angular.extend($scope, {
            center: {
                autoDiscover: true,
                zoom: 20
            },
            userIcon:{
                markerColor: 'red'
            },
            events: {
                map: {
                    enable: ['moveend', 'popupopen'],
                    logic: 'emit'
                },
                marker: {
                    enable: [],
                    logic: 'emit'
                }
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

                },
                overlays: {
                    truckCluster: {
                        name: "truck cluster",
                        type: "markercluster",
                        visible: true
                    }
                }

            }

        });

});
