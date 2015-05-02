
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
				cuisine: truck.cuisine
			}
			marker.onClick = function(){
				marker.show = !marker.show;
			}
			return marker;
		}
	};
});