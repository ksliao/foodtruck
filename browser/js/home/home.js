'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: 'HomeCtrl',
        resolve: {
        	trucks: function(MapFactory){
        		return MapFactory.getFilteredTrucks();
        	}
        }
    });
});



app.controller('HomeCtrl', function($scope, $timeout, $log, $rootScope, trucks, MapFactory, GeoFactory, uiGmapGoogleMapApi, Socket){


	$scope.trucks = trucks;
	$scope.truckMarkers = [];
	$scope.loading = true;
	$scope.currentMarker = null;
	$scope.cuisines = [];

	var windowOptions = {
	     show: false
	 }
	    
	$scope.nycAll = function(){
	 	MapFactory.getTrucks()
	 	.then(function(trucks){
	 		$scope.trucks = trucks;
	 		$scope.renderTrucks($scope.trucks);

	 	})
	 };


	$rootScope.$on('showAllTrucks', $scope.nycAll);

	Socket.on('addedTruck', function(truck){
		console.log(truck);
		$scope.trucks.push(truck.truck);
		$rootScope.$apply(Socket, $scope.renderTrucks($scope.trucks));
	});



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
              $scope.map = { 
                center: initialLocation, 
                zoom: 17,
              };
              $scope.marker = {id: 0, coords: userLocation, options: {draggable: false}, icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'};
            })
          }
        });


	$scope.renderTrucks($scope.trucks);

	// $scope.clusterOptions = {minimumClusterSize: 5};
	// $scope.mc = new MarkerClusterer($scope.map, $scope.truckMarkers, {gridSize: 10, maxZoom: 10});
	
 
});
