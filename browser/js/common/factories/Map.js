
app.factory('MapFactory', function($http){
	return {
		getTrucks: function(){
			return $http.get('/api/yelp/').then(function(response){
				return response.data;
			});
		},
		makeMarker: function(coordinates, id, clickFunc){
			var marker= {
				id: id,
				coords: coordinates,
				options: {draggable: false},
				labelContent: coordinates
			}
			return marker;
		}
	};
});