
app.factory('MapFactory', function($http){
	return {
		getTrucks: function(){
			return $http.get('/api/yelp/').then(function(response){
				return response.data;
			});
		},

		getFilteredTrucks: function(){
			return $http.get('/api/yelp/filter').then(function(response){
				return response.data;
			});
		},
		makeMarker: function(truck, id){
			var marker= {
				id: id,
				coords: truck.coordinates,
				options: {draggable: false},
				show:false,
				title: truck.name,
				rating: truck.rating,
				review: truck.review,
				cuisine: truck.cuisine,
				icon: 'truck.png'
			}
			marker.onClick = function(){
				marker.show = !marker.show;
			}
			return marker;
		}
	};
});

app.factory('GeoFactory', function($q){
	    
	    var userLocation = {};

	    userLocation.getGeo = function (){
        return $q(function (resolve, reject){
          if (userLocation.latitude && userLocation.longitude) {
            resolve();
          }
          else {
            if(navigator.geolocation){                          
              navigator.geolocation.getCurrentPosition(function (position){
                userLocation.latitude = position.coords.latitude;
                userLocation.longitude = position.coords.longitude;
                resolve();
              });
            } 
            else {
              console.log("Geolocation is not supported by this browser");
              reject();
            }
          }
        });
      };

      return userLocation;
  });
