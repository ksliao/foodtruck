app.factory('TruckFactory', function($http, $q){
    return {
        getLocation: function () {
            var deferred = $q.defer();
            if (navigator && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position){
                    var coords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }
                    deferred.resolve(coords);
                });
            };
            return deferred.promise;
        },
        newTruck: function(truck){
            return $http.post('/api/user/', truck).then(function(response){
                return response.data;
            });
        }
    }
});