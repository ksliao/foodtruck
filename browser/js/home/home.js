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


app.controller('HomeCtrl', function($scope, $timeout, $log, trucks, MapFactory){
	$scope.trucks = trucks;
	console.log($scope.trucks[0]);
	$scope.truckMarkers = [];
	$scope.loading = true;
	$scope.currentMarker = null;
	$scope.cuisines = [];

	var windowOptions = {
	     show: false
	 }
	    


	var newyork = {latitude: 40.69847032728747, longitude:-73.9514422416687};


	var userLocation;

	$scope.renderTrucks = function(truckArr){
		truckArr.forEach(function(truck, index){
			console.log(truck.cuisine)
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
	console.log($scope.cuisines);
 
});
