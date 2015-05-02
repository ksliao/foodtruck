'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: 'HomeCtrl',
        resolve: {
        	trucks: function(MapFactory){
        		return MapFactory.getTrucks();
        	}
        }
    });
});


app.controller('HomeCtrl', function($scope, $timeout, $log, trucks, MapFactory, GeoFactory, uiGmapGoogleMapApi){
	$scope.trucks = trucks;
	$scope.truckMarkers = [];
	$scope.loading = true;
	$scope.currentMarker = null;
	$scope.cuisines = [];

	var windowOptions = {
	     show: false
	 }
	    
	var newyork = {latitude: 40.69847032728747, longitude:-73.9514422416687};

	$scope.renderTrucks = function(truckArr){
		truckArr.forEach(function(truck, index){
			$scope.cuisines.push(truck.cuisine);
			$scope.truckMarkers.push(MapFactory.makeMarker(truck, index));
		});
	};

	GeoFactory.getGeo().then(function (){ 
          if (GeoFactory.latitude && GeoFactory.longitude){
            uiGmapGoogleMapApi.then(function (maps){
            var initialLocation = {latitude: GeoFactory.latitude, longitude: GeoFactory.longitude};
            var userLocation = {latitude: GeoFactory.latitude, longitude: GeoFactory.longitude};
              //$scope.maps = maps;
              $scope.map = { 
                center: initialLocation, 
                zoom: 17,
              };
              $scope.marker = {id: 0, coords: userLocation, options: {draggable: false}};
            })
          }
        });


	$scope.renderTrucks($scope.trucks);
	// $scope.mc = new MarkerClusterer($scope.map, $scope.truckMarkers, {gridSize: 50, maxZoom: 10});
	// console.log($scope.mc);
 
});
