'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: 'HomeCtrl'
    });
});


app.controller('HomeCtrl', function($scope, $timeout, $log){
	
	$scope.loading = true;
	var newyork = {latitude: 40.69847032728747, longitude:-73.9514422416687};
	var userLocation;

	$scope.initialize = function(){
		
		if(navigator.geolocation) {
		    navigator.geolocation.getCurrentPosition(function(position) {
		    $scope.loading = false;
		     userLocation = {latitude: position.coords.latitude, longitude: position.coords.longitude};
		    	console.log(userLocation);
		    $scope.map = {center: userLocation, zoom:17};
		    $scope.options = {scrollwheel: false};
		    $scope.coordsUpdates=0;
		    $scope.dynamicMoveCtr = 0;
		    $scope.marker = {
		    	id: 0,
		    	coords: userLocation,
		    	options: {draggable: false},
		    	events: {
		    		dragend: function(marker, eventName, args){
		    			$log.log('marker dragend');
		    			var lat = marker.getPosition().lat();
		    			var ln = marker.getPosition.lng();
		    			$log.log(lat);
		    			$log.log(ln);

		    			$scope.marker.options = {
				            draggable: false,
				            labelContent: "lat: " + $scope.marker.coords.latitude + ' ' + 'lon: ' + $scope.marker.coords.longitude,
				            labelAnchor: "100 0",
				            labelClass: "marker-labels"
				          };
		    		}
		    	}
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

// 	$scope.map = {center: userLocation, zoom: 17 };
// 	    console.log(userLocation);
// 	    // $scope.map = {center: {latitude: 40.704607, longitude: -74.009453 }, zoom: 17 };
// 	    $scope.options = {scrollwheel: false};
// 	    $scope.coordsUpdates = 0;
// 	    $scope.dynamicMoveCtr = 0;
// 	    $scope.marker = {
// 	      id: 0, //IP address
// 	      coords: 
// 	        userLocation
// 	      ,
// 	      options: { draggable: false },
// 	      events: {
// 	        dragend: function (marker, eventName, args) {
// 	          $log.log('marker dragend');
// 	          var lat = marker.getPosition().lat();
// 	          var lon = marker.getPosition().lng();
// 	          $log.log(lat);
// 	          $log.log(lon);

// 	          $scope.marker.options = {
// 	            draggable: false,
// 	            labelContent: "lat: " + $scope.marker.coords.latitude + ' ' + 'lon: ' + $scope.marker.coords.longitude,
// 	            labelAnchor: "100 0",
// 	            labelClass: "marker-labels"
// 	          };
// 	        }
// 	      }
// 	    };
// 	    $scope.$watchCollection("marker.coords", function (newVal, oldVal) {
// 	      if (_.isEqual(newVal, oldVal))
// 	        return;
// 	      $scope.coordsUpdates++;
// 	    });
// 	    $timeout(function () {
// 	      $scope.marker.coords = {
// 	        userLocation
// 	      };
// 	      $scope.dynamicMoveCtr++;
// 	      $timeout(function () {
// 	        $scope.marker.coords = {
// 	          userLocation
// 	        };
// 	        $scope.dynamicMoveCtr++;
// 	      }, 2000);
// 	    }, 1000);
});