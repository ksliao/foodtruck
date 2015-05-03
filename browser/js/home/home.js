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


app.controller('HomeCtrl', function($scope, $rootScope, $timeout, $log, trucks, MapFactory, Socket){
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


	var userLocation;

	$scope.renderTrucks = function(truckArr){
		truckArr.forEach(function(truck, index){
			$scope.cuisines.push(truck.cuisine);
			$scope.truckMarkers.push(MapFactory.makeMarker(truck, index));
		});
	};


	$scope.initialize = function(){
		
		if(navigator.geolocation) {
		    navigator.geolocation.getCurrentPosition(function(position) {
		    $scope.loading = false;
		     userLocation = {latitude: position.coords.latitude, longitude: position.coords.longitude};
		    $scope.map = {center: newyork, zoom:13};
		    $scope.options = {scrollwheel: false};
		    $scope.coordsUpdates=0;
		    $scope.dynamicMoveCtr = 0;
		    $scope.marker = {
		    	id: 0,
		    	coords: userLocation,
		    	options: {draggable: false}
		    };

			$scope.$watchCollection("marker.coords", function (newVal, oldVal) {
				      if (_.isEqual(newVal, oldVal))
				        return;
				      $scope.coordsUpdates++;
				    });
				    $timeout(function () {
				      $scope.marker.coords = userLocation;
				      
				      $scope.dynamicMoveCtr++;
				      $timeout(function () {
				        $scope.marker.coords = userLocation;
				        
				        $scope.dynamicMoveCtr++;
				      }, 2000);
				    }, 1000);
		    });
			}
		  // Browser doesn't support Geolocation
		 else {
		 	$scope.loading = false;
		    userLocation = newyork; 
		  }
	};

	$scope.initialize();
	$scope.renderTrucks($scope.trucks);
 
});
