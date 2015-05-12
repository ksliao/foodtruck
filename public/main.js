'use strict';
var app = angular.module('FoodTruckApp', [
    'ui.router', 
    'uiGmapgoogle-maps',
    'ui.map',
    'fsaPreBuilt',
    'leaflet-directive'
    ]);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function (state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });

    });

});
'use strict';
app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });

});

app.controller('AboutController', function ($scope) {

    // Images of beautiful Fullstack people.
    $scope.images = [
        'https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large',
        'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg',
        'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg',
        'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg',
        'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large',
        'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large'
    ];

});
(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.
    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function ($location) {

        if (!window.io) throw new Error('socket.io not found!');

        var socket;

        if ($location.$$port) {
            socket = io('http://localhost:1337');
        } else {
            socket = io('/');
        }

        return socket;

    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function (response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push([
            '$injector',
            function ($injector) {
                return $injector.get('AuthInterceptor');
            }
        ]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function () {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.
            if (this.isAuthenticated()) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });

        };

        this.login = function (credentials) {
            return $http.post('/login', credentials)
                .then(onSuccessfulLogin)
                .catch(function (response) {
                    return $q.reject({ message: 'Invalid login credentials.' });
                });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };

        function onSuccessfulLogin(response) {
            var data = response.data;
            Session.create(data.id, data.user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return data.user;
        }

    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.id = null;
        this.user = null;

        this.create = function (sessionId, user) {
            this.id = sessionId;
            this.user = user;
        };

        this.destroy = function () {
            this.id = null;
            this.user = null;
        };

    });

})();
'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/home',
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

app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });

});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });

    };

});
'use strict';
app.config(function ($stateProvider) {
    $stateProvider.state('map', {
        url: '/',
        templateUrl: 'js/mapbox/mapbox.html',
        controller: 'MapBoxController',
        resolve: {
            trucks: function(MapFactory){
                return MapFactory.getTrucks();
            }
        }
    });
});


app.controller('MapBoxController', function($scope, trucks, $http, $rootScope, MapFactory, GeoFactory, Socket){

    $scope.tweetArray = [];

    Socket.on('newTweet', function(tweet){
        console.log("tweet", tweet);
        if(!tweet) return;
       $rootScope.$apply($scope.tweetArray.push(tweet));
        if($scope.tweetArray.length > 5){
            $scope.tweetArray.shift();
        }
         console.log("tweetArr",$scope.tweetArray);
    });

    GeoFactory.getGeo().then(function (){ 
          if (GeoFactory.latitude && GeoFactory.longitude){
            $scope.userMarker = {
                lat: GeoFactory.latitude,
                lng: GeoFactory.longitude,
                title: "User",
                draggable: false,
                message: "Me!",
                icon: {
                    type: 'awesomeMarker',
                    icon: 'cog',
                    markerColor: 'red'
                },
                label: {
                    message: "Me!"
                }
            };
            $scope.markers.push($scope.userMarker); //QUESTION
          }
        });

    Socket.on('addedTruck', function(truck){
        $rootScope.$apply(trucks.push(truck.truck)); //QUESTION
        $scope.markers = $scope.formatMarkers(trucks);
        //$rootScope.$apply(Socket, $scope.renderTrucks($scope.trucks));
    });

    $scope.getAllTrucks = function(){
        $scope.markers = $scope.formatMarkers(trucks);
    };

    $scope.nearByTrucks = function(){
        MapFactory.getFilteredTrucks()
            .then(function(trucks){
                $scope.markers = $scope.formatMarkers(trucks);
            });
    }

    $rootScope.$on('showAllTrucks', $scope.getAllTrucks); //QUESTION
    $rootScope.$on('limitTrucks', $scope.nearByTrucks);


    $scope.getTweets = function(){
        console.log('hi');
    };


    $scope.formatMarkers = function(arr){

        _.remove(arr, function(elem){ //QUESTION
            return !elem.coordinates;
        });

        return arr.map(function(truck){
            return {
                layer: 'truckCluster',
                lat: truck.coordinates.latitude,
                lng: truck.coordinates.longitude,
                message: truck.name+'</br><img ng-src='+truck.rating+'></img>',
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
                        name: 'Map - Light',
                        url: 'http://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
                        type: 'xyz',
                        layerOptions: {
                            apikey: 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q',
                            mapid: 'bufanuvols.lia22g09'
                        }
                    },
                    mapbox_color: {
                        name: "Map - Color",
                        url: 'http://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
                        type: 'xyz',
                        layerOptions: {
                            apikey: 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q',
                            mapid: 'mapbox.run-bike-hike'
                        }
                    },
                    mapbox_street: {
                        name: "Map - Street",
                        url: 'http://api.tiles.mapbox.com/v4/{mapid}/{z}/{x}/{y}.png?access_token={apikey}',
                        type: 'xyz',
                        layerOptions: {
                            apikey: 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q',
                            mapid: 'mapbox.streets-basic'
                        }
                    }

                },
                overlays: {
                    truckCluster: {
                        name: "truck cluster",
                        type: "markercluster",
                        visible: true
                    }
                }
            //     directions:{
            //     driving:{
            //         name: 'Driving Directions',
            //         type: 'directions',
            //         url: 'http://api.tiles.mapbox.com/v4/directions/mapbox.driving/{waypoints}.json?access_token={apikey}',
            //         apikey: 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q'
            //     },
            //     walking:{
            //         name: 'Walking Directions',
            //         type: 'directions',
            //         url: 'http://api.tiles.mapbox.com/v4/directions/mapbox.walking/{waypoints}.json?access_token={apikey}',
            //         apikey: 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q'
            //     }
            // }

            }

        });

});

//L.mapbox.accessToken = 'pk.eyJ1Ijoia3NsaWFvIiwiYSI6Ik5oWVdkMk0ifQ.qxYkSJPf31GOND3vg6Zq-Q';
//
//var geolocate = document.getElementById('geolocate');
//
//var map = L.mapbox.map('map', 'ksliao.kk2oj092')
//    .addControl(L.mapbox.geocoderControl('mapbox.places', {
//        autocomplete: true
//    }));
//
//var geocoder = L.mapbox.geocoder('mapbox.places');
//
//
//if (!navigator.geolocation) {
//    geolocate.innerHTML = 'Geolocation not available';
//}
//else {
//    geolocate.onclick = function(e){
//        e.preventDefault();
//        e.stopPropagation();
//        map.locate();
//    };
//}
//
//// Once we've got a position, zoom and center the map
//// on it, and add a single marker.
//map.on('locationfound', function(e) {
//    map.fitBounds(e.bounds);
//
//    myLayer.setGeoJSON({
//        type: 'Feature',
//        geometry: {
//            type: 'Point',
//            coordinates: [e.latlng.lng, e.latlng.lat]
//        },
//        properties: {
//            'title': 'Here I am!',
//            'marker-color': '#ff8888',
//            'marker-symbol': 'star'
//        }
//    });
//});
//
//// If the user chooses not to allow their location
//// to be shared, display an error message.
//map.on('locationerror', function() {
//    geolocate.innerHTML = 'Position could not be found';
//});
//
//// L.mapbox.featureLayer('examples.map-h61e8o8e').on('ready', function(e) {
////     // The clusterGroup gets each marker in the group added to it
////     // once loaded, and then is added to the map
////     var clusterGroup = new L.MarkerClusterGroup();
////     e.target.eachLayer(function(layer) {
////         clusterGroup.addLayer(layer);
////     });
////     map.addLayer(clusterGroup);
//// });
//
//var featureLayer = L.mapbox.featureLayer({
//    type: 'FeatureCollection',
//    features: [{
//        type: 'Feature',
//        properties: {
//            // 'from': 'Duke Point',
//            // 'to': 'Tsawwassen',
//            'marker-color': '#548cba',
//            'marker-size': 'large',
//            'marker-symbol': 'ferry'
//        },
//        geometry: {
//            type: 'Point',
//            coordinates: [-123.89128804206847, 49.16351524490678]
//        }
//    }]
//})
//    .addTo(map);
//
//// Note that calling `.eachLayer` here depends on setting GeoJSON _directly_
//// above. If you're loading GeoJSON asynchronously, like from CSV or from a file,
//// you will need to do this within a `featureLayer.on('ready'` event.
//featureLayer.eachLayer(function(layer) {
//
//    // here you call `bindPopup` with a string of HTML you create - the feature
//    // properties declared above are available under `layer.feature.properties`
//    var content = '<h2>A ferry ride!<\/h2>' +
//        '<p>From: ' + layer.feature.properties.from + '<br \/>' +
//        'to: ' + layer.feature.properties.to + '<\/p>';
//    layer.bindPopup(content);
//});
//
//var myLayer = L.mapbox.featureLayer().addTo(map);
//
//var geojson = {
//    type: 'FeatureCollection',
//    features: [{
//        type: 'Feature',
//        properties: {
//            title: 'Washington, D.C.',
//            'marker-color': '#f86767',
//            'marker-size': 'large',
//            'marker-symbol': 'star',
//            url: 'http://en.wikipedia.org/wiki/Washington,_D.C.'
//        },
//        geometry: {
//            type: 'Point',
//            coordinates: [-77.03201, 38.90065]
//        }
//    },
//        {
//            type: 'Feature',
//            properties: {
//                title: 'Baltimore, MD',
//                'marker-color': '#7ec9b1',
//                'marker-size': 'large',
//                'marker-symbol': 'star',
//                url: 'http://en.wikipedia.org/wiki/Baltimore'
//            },
//            geometry: {
//                type: 'Point',
//                coordinates: [-76.60767, 39.28755]
//            }
//        }]
//};
//
//myLayer.setGeoJSON(geojson);
//myLayer.on('mouseover', function(e) {
//    e.layer.openPopup();
//});
//myLayer.on('mouseout', function(e) {
//    e.layer.closePopup();
//});
//
//function showMap(err, data) {
//    // The geocoder can return an area, like a city, or a
//    // point, like an address. Here we handle both cases,
//    // by fitting the map bounds to an area or zooming to a point.
//    if (data.lbounds) {
//        map.fitBounds(data.lbounds);
//    } else if (data.latlng) {
//        map.setView([data.latlng[0], data.latlng[1]], 13);
//    }
//}
//
//var filters = document.getElementById('filters');
//var checkboxes = document.getElementsByClassName('filter');
//
//function change() {
//    // Find all checkboxes that are checked and build a list of their values
//    var on = [];
//    for (var i = 0; i < checkboxes.length; i++) {
//        if (checkboxes[i].checked) on.push(checkboxes[i].value);
//    }
//    // The filter function takes a GeoJSON feature object
//    // and returns true to show it or false to hide it.
//    map.featureLayer.setFilter(function (f) {
//        // check each marker's symbol to see if its value is in the list
//        // of symbols that should be on, stored in the 'on' array
//        return on.indexOf(f.properties['marker-symbol']) !== -1;
//    });
//    return false;
//}
//
//// When the form is touched, re-filter markers
//filters.onchange = change;
//// Initially filter the markers
//change();


app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: '<img ng-repeat="item in stash" width="300" ng-src="{{ item }}" />',
        controller: function ($scope, SecretStash) {
            SecretStash.getStash().then(function (stash) {
                $scope.stash = stash;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });

});

app.factory('SecretStash', function ($http) {

    var getStash = function () {
        return $http.get('/api/members/secret-stash').then(function (response) {
            return response.data;
        });
    };

    return {
        getStash: getStash
    };

});
app.config(function ($stateProvider) {

    $stateProvider.state('signup', {
        url: '/signup',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignUpCtrl',
        resolve:{
            coords: function(TruckFactory) {
                return TruckFactory.getLocation();
            }
        }
    });
});

app.controller('SignUpCtrl', function($scope, coords, TruckFactory, Socket){

    console.log(coords);

    $scope.truck = {
        email: '',
        password: '',
        name: '',
        cuisine: '',
        coordinates: coords
    }

    $scope.createTruck = function(){
        TruckFactory.newTruck($scope.truck).then(function(truck){
            Socket.emit('newTruck', truck);
        });
    }

});


'use strict';
app.config(function ($stateProvider) {

    $stateProvider.state('tutorial', {
        url: '/tutorial',
        templateUrl: 'js/tutorial/tutorial.html',
        controller: 'TutorialCtrl',
        resolve: {
            tutorialInfo: function (TutorialFactory) {
                return TutorialFactory.getTutorialVideos();
            }
        }
    });

});

app.factory('TutorialFactory', function ($http) {

    return {
        getTutorialVideos: function () {
            return $http.get('/api/tutorial/videos').then(function (response) {
                return response.data;
            });
        }
    };

});

app.controller('TutorialCtrl', function ($scope, tutorialInfo) {

    $scope.sections = tutorialInfo.sections;
    $scope.videos = _.groupBy(tutorialInfo.videos, 'section');

    $scope.currentSection = { section: null };

    $scope.colors = [
        'rgba(34, 107, 255, 0.10)',
        'rgba(238, 255, 68, 0.11)',
        'rgba(234, 51, 255, 0.11)',
        'rgba(255, 193, 73, 0.11)',
        'rgba(22, 255, 1, 0.11)'
    ];

    $scope.getVideosBySection = function (section, videos) {
        return videos.filter(function (video) {
            return video.section === section;
        });
    };

});

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

'use strict';
app.factory('RandomGreetings', function () {

    var getRandomFromArray = function (arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = [
        '/../scss/img/lime.png',
        '/../scss/img/orange.jpg',
        '/../scss/img/pink.png',
        '/../scss/img/red.png',
        '/../scss/img/yellow.png'
    ];

    return {
        greetings: greetings,
        getRandomGreeting: function () {
            return getRandomFromArray(greetings);
        }
    };

});
'use strict';

app.factory('socket', function($rootScope){});
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
        },
        allTrucks: function(truck){
            return $http.get('api/user/').then(function(response){
               return response.data;
            });
        }
    }
});
'use strict';

app.directive('tutorialSection', function () {
    return {
        restrict: 'E',
        scope: {
            name: '@',
            videos: '=',
            background: '@'
        },
        templateUrl: 'js/tutorial/tutorial-section/tutorial-section.html',
        link: function (scope, element) {
            element.css({ background: scope.background });
        }
    };
});
'use strict';
app.directive('tutorialSectionMenu', function () {
    return {
        restrict: 'E',
        require: 'ngModel',
        templateUrl: 'js/tutorial/tutorial-section-menu/tutorial-section-menu.html',
        scope: {
            sections: '='
        },
        link: function (scope, element, attrs, ngModelCtrl) {

            scope.currentSection = scope.sections[0];
            ngModelCtrl.$setViewValue(scope.currentSection);

            scope.setSection = function (section) {
                scope.currentSection = section;
                ngModelCtrl.$setViewValue(section);
            };

        }
    };
});
'use strict';
app.directive('tutorialVideo', function ($sce) {

    var formYoutubeURL = function (id) {
        return 'https://www.youtube.com/embed/' + id;
    };

    return {
        restrict: 'E',
        templateUrl: 'js/tutorial/tutorial-video/tutorial-video.html',
        scope: {
            video: '='
        },
        link: function (scope) {
            scope.trustedYoutubeURL = $sce.trustAsResourceUrl(formYoutubeURL(scope.video.youtubeID));
        }
    };

});
'use strict';
app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});
'use strict';
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function (scope) {

            scope.items = [
                // { label: 'Home', state: 'home' },
                // { label: 'About', state: 'about' },
                // { label: 'Tutorial', state: 'tutorial' },
                // { label: 'Members Only', state: 'membersOnly', auth: true },
                { label: 'Truck Sign Up', state: 'signup'},
                { label: 'Login', state: 'login'}
            ];

            scope.user = null;

            scope.showAllTrucks = function(){
                $rootScope.$emit('showAllTrucks');
            };

            scope.limitTrucks = function(){
                $rootScope.$emit('limitTrucks');
            }

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                   $state.go('home');
                });
            };

            var setUser = function () {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function () {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);

        }

    };

});
'use strict';
app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function (scope) {
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
    };

});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZnNhL2ZzYS1wcmUtYnVpbHQuanMiLCJob21lL2hvbWUuanMiLCJsb2dpbi9sb2dpbi5qcyIsIm1hcGJveC9tYXBib3guanMiLCJtYXBib3gvc2NyYXRjaC5qcyIsIm1lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidHV0b3JpYWwvdHV0b3JpYWwuanMiLCJjb21tb24vZmFjdG9yaWVzL01hcC5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9Tb2NrZXQuanMiLCJjb21tb24vZmFjdG9yaWVzL1RydWNrLmpzIiwidHV0b3JpYWwvdHV0b3JpYWwtc2VjdGlvbi90dXRvcmlhbC1zZWN0aW9uLmpzIiwidHV0b3JpYWwvdHV0b3JpYWwtc2VjdGlvbi1tZW51L3R1dG9yaWFsLXNlY3Rpb24tbWVudS5qcyIsInR1dG9yaWFsL3R1dG9yaWFsLXZpZGVvL3R1dG9yaWFsLXZpZGVvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUMzSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDOUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDL0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDN0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN0QkE7QUFDQTtBQUNBO0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xudmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGb29kVHJ1Y2tBcHAnLCBbXG4gICAgJ3VpLnJvdXRlcicsIFxuICAgICd1aUdtYXBnb29nbGUtbWFwcycsXG4gICAgJ3VpLm1hcCcsXG4gICAgJ2ZzYVByZUJ1aWx0JyxcbiAgICAnbGVhZmxldC1kaXJlY3RpdmUnXG4gICAgXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZSdcbiAgICBdO1xuXG59KTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCRsb2NhdGlvbikge1xuXG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG5cbiAgICAgICAgdmFyIHNvY2tldDtcblxuICAgICAgICBpZiAoJGxvY2F0aW9uLiQkcG9ydCkge1xuICAgICAgICAgICAgc29ja2V0ID0gaW8oJ2h0dHA6Ly9sb2NhbGhvc3Q6MTMzNycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc29ja2V0ID0gaW8oJy8nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzb2NrZXQ7XG5cbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnL2hvbWUnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0hvbWVDdHJsJyxcbiAgICAgICAgcmVzb2x2ZToge1xuICAgICAgICBcdHRydWNrczogZnVuY3Rpb24oTWFwRmFjdG9yeSl7XG4gICAgICAgIFx0XHRyZXR1cm4gTWFwRmFjdG9yeS5nZXRGaWx0ZXJlZFRydWNrcygpO1xuICAgICAgICBcdH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cblxuXG5hcHAuY29udHJvbGxlcignSG9tZUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICR0aW1lb3V0LCAkbG9nLCAkcm9vdFNjb3BlLCB0cnVja3MsIE1hcEZhY3RvcnksIEdlb0ZhY3RvcnksIHVpR21hcEdvb2dsZU1hcEFwaSwgU29ja2V0KXtcblxuXG5cdCRzY29wZS50cnVja3MgPSB0cnVja3M7XG5cdCRzY29wZS50cnVja01hcmtlcnMgPSBbXTtcblx0JHNjb3BlLmxvYWRpbmcgPSB0cnVlO1xuXHQkc2NvcGUuY3VycmVudE1hcmtlciA9IG51bGw7XG5cdCRzY29wZS5jdWlzaW5lcyA9IFtdO1xuXG5cdHZhciB3aW5kb3dPcHRpb25zID0ge1xuXHQgICAgIHNob3c6IGZhbHNlXG5cdCB9XG5cdCAgICBcblx0JHNjb3BlLm55Y0FsbCA9IGZ1bmN0aW9uKCl7XG5cdCBcdE1hcEZhY3RvcnkuZ2V0VHJ1Y2tzKClcblx0IFx0LnRoZW4oZnVuY3Rpb24odHJ1Y2tzKXtcblx0IFx0XHQkc2NvcGUudHJ1Y2tzID0gdHJ1Y2tzO1xuXHQgXHRcdCRzY29wZS5yZW5kZXJUcnVja3MoJHNjb3BlLnRydWNrcyk7XG5cblx0IFx0fSlcblx0IH07XG5cblxuXHQkcm9vdFNjb3BlLiRvbignc2hvd0FsbFRydWNrcycsICRzY29wZS5ueWNBbGwpO1xuXG5cdFNvY2tldC5vbignYWRkZWRUcnVjaycsIGZ1bmN0aW9uKHRydWNrKXtcblx0XHRjb25zb2xlLmxvZyh0cnVjayk7XG5cdFx0JHNjb3BlLnRydWNrcy5wdXNoKHRydWNrLnRydWNrKTtcblx0XHQkcm9vdFNjb3BlLiRhcHBseShTb2NrZXQsICRzY29wZS5yZW5kZXJUcnVja3MoJHNjb3BlLnRydWNrcykpO1xuXHR9KTtcblxuXG5cblx0dmFyIG5ld3lvcmsgPSB7bGF0aXR1ZGU6IDQwLjY5ODQ3MDMyNzI4NzQ3LCBsb25naXR1ZGU6LTczLjk1MTQ0MjI0MTY2ODd9O1xuXG5cdCRzY29wZS5yZW5kZXJUcnVja3MgPSBmdW5jdGlvbih0cnVja0Fycil7XG5cdFx0dHJ1Y2tBcnIuZm9yRWFjaChmdW5jdGlvbih0cnVjaywgaW5kZXgpe1xuXHRcdFx0JHNjb3BlLmN1aXNpbmVzLnB1c2godHJ1Y2suY3Vpc2luZSk7XG5cdFx0XHQkc2NvcGUudHJ1Y2tNYXJrZXJzLnB1c2goTWFwRmFjdG9yeS5tYWtlTWFya2VyKHRydWNrLCBpbmRleCkpO1xuXHRcdH0pO1xuXHR9O1xuXG5cdEdlb0ZhY3RvcnkuZ2V0R2VvKCkudGhlbihmdW5jdGlvbiAoKXsgXG4gICAgICAgICAgaWYgKEdlb0ZhY3RvcnkubGF0aXR1ZGUgJiYgR2VvRmFjdG9yeS5sb25naXR1ZGUpe1xuICAgICAgICAgICAgdWlHbWFwR29vZ2xlTWFwQXBpLnRoZW4oZnVuY3Rpb24gKG1hcHMpe1xuICAgICAgICAgICAgdmFyIGluaXRpYWxMb2NhdGlvbiA9IHtsYXRpdHVkZTogR2VvRmFjdG9yeS5sYXRpdHVkZSwgbG9uZ2l0dWRlOiBHZW9GYWN0b3J5LmxvbmdpdHVkZX07XG4gICAgICAgICAgICB2YXIgdXNlckxvY2F0aW9uID0ge2xhdGl0dWRlOiBHZW9GYWN0b3J5LmxhdGl0dWRlLCBsb25naXR1ZGU6IEdlb0ZhY3RvcnkubG9uZ2l0dWRlfTtcbiAgICAgICAgICAgICAgJHNjb3BlLm1hcCA9IHsgXG4gICAgICAgICAgICAgICAgY2VudGVyOiBpbml0aWFsTG9jYXRpb24sIFxuICAgICAgICAgICAgICAgIHpvb206IDE3LFxuICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAkc2NvcGUubWFya2VyID0ge2lkOiAwLCBjb29yZHM6IHVzZXJMb2NhdGlvbiwgb3B0aW9uczoge2RyYWdnYWJsZTogZmFsc2V9LCBpY29uOiAnaHR0cDovL21hcHMuZ29vZ2xlLmNvbS9tYXBmaWxlcy9tcy9pY29ucy9ibHVlLWRvdC5wbmcnfTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuXG5cdCRzY29wZS5yZW5kZXJUcnVja3MoJHNjb3BlLnRydWNrcyk7XG5cblx0Ly8gJHNjb3BlLmNsdXN0ZXJPcHRpb25zID0ge21pbmltdW1DbHVzdGVyU2l6ZTogNX07XG5cdC8vICRzY29wZS5tYyA9IG5ldyBNYXJrZXJDbHVzdGVyZXIoJHNjb3BlLm1hcCwgJHNjb3BlLnRydWNrTWFya2Vycywge2dyaWRTaXplOiAxMCwgbWF4Wm9vbTogMTB9KTtcblx0XG4gXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbWFwJywge1xuICAgICAgICB1cmw6ICcvJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9tYXBib3gvbWFwYm94Lmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTWFwQm94Q29udHJvbGxlcicsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHRydWNrczogZnVuY3Rpb24oTWFwRmFjdG9yeSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hcEZhY3RvcnkuZ2V0VHJ1Y2tzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCdNYXBCb3hDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCB0cnVja3MsICRodHRwLCAkcm9vdFNjb3BlLCBNYXBGYWN0b3J5LCBHZW9GYWN0b3J5LCBTb2NrZXQpe1xuXG4gICAgJHNjb3BlLnR3ZWV0QXJyYXkgPSBbXTtcblxuICAgIFNvY2tldC5vbignbmV3VHdlZXQnLCBmdW5jdGlvbih0d2VldCl7XG4gICAgICAgIGNvbnNvbGUubG9nKFwidHdlZXRcIiwgdHdlZXQpO1xuICAgICAgICBpZighdHdlZXQpIHJldHVybjtcbiAgICAgICAkcm9vdFNjb3BlLiRhcHBseSgkc2NvcGUudHdlZXRBcnJheS5wdXNoKHR3ZWV0KSk7XG4gICAgICAgIGlmKCRzY29wZS50d2VldEFycmF5Lmxlbmd0aCA+IDUpe1xuICAgICAgICAgICAgJHNjb3BlLnR3ZWV0QXJyYXkuc2hpZnQoKTtcbiAgICAgICAgfVxuICAgICAgICAgY29uc29sZS5sb2coXCJ0d2VldEFyclwiLCRzY29wZS50d2VldEFycmF5KTtcbiAgICB9KTtcblxuICAgIEdlb0ZhY3RvcnkuZ2V0R2VvKCkudGhlbihmdW5jdGlvbiAoKXsgXG4gICAgICAgICAgaWYgKEdlb0ZhY3RvcnkubGF0aXR1ZGUgJiYgR2VvRmFjdG9yeS5sb25naXR1ZGUpe1xuICAgICAgICAgICAgJHNjb3BlLnVzZXJNYXJrZXIgPSB7XG4gICAgICAgICAgICAgICAgbGF0OiBHZW9GYWN0b3J5LmxhdGl0dWRlLFxuICAgICAgICAgICAgICAgIGxuZzogR2VvRmFjdG9yeS5sb25naXR1ZGUsXG4gICAgICAgICAgICAgICAgdGl0bGU6IFwiVXNlclwiLFxuICAgICAgICAgICAgICAgIGRyYWdnYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogXCJNZSFcIixcbiAgICAgICAgICAgICAgICBpY29uOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhd2Vzb21lTWFya2VyJyxcbiAgICAgICAgICAgICAgICAgICAgaWNvbjogJ2NvZycsXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlckNvbG9yOiAncmVkJ1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgbGFiZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJNZSFcIlxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICAkc2NvcGUubWFya2Vycy5wdXNoKCRzY29wZS51c2VyTWFya2VyKTsgLy9RVUVTVElPTlxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICBTb2NrZXQub24oJ2FkZGVkVHJ1Y2snLCBmdW5jdGlvbih0cnVjayl7XG4gICAgICAgICRyb290U2NvcGUuJGFwcGx5KHRydWNrcy5wdXNoKHRydWNrLnRydWNrKSk7IC8vUVVFU1RJT05cbiAgICAgICAgJHNjb3BlLm1hcmtlcnMgPSAkc2NvcGUuZm9ybWF0TWFya2Vycyh0cnVja3MpO1xuICAgICAgICAvLyRyb290U2NvcGUuJGFwcGx5KFNvY2tldCwgJHNjb3BlLnJlbmRlclRydWNrcygkc2NvcGUudHJ1Y2tzKSk7XG4gICAgfSk7XG5cbiAgICAkc2NvcGUuZ2V0QWxsVHJ1Y2tzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgJHNjb3BlLm1hcmtlcnMgPSAkc2NvcGUuZm9ybWF0TWFya2Vycyh0cnVja3MpO1xuICAgIH07XG5cbiAgICAkc2NvcGUubmVhckJ5VHJ1Y2tzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgTWFwRmFjdG9yeS5nZXRGaWx0ZXJlZFRydWNrcygpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbih0cnVja3Mpe1xuICAgICAgICAgICAgICAgICRzY29wZS5tYXJrZXJzID0gJHNjb3BlLmZvcm1hdE1hcmtlcnModHJ1Y2tzKTtcbiAgICAgICAgICAgIH0pO1xuICAgIH1cblxuICAgICRyb290U2NvcGUuJG9uKCdzaG93QWxsVHJ1Y2tzJywgJHNjb3BlLmdldEFsbFRydWNrcyk7IC8vUVVFU1RJT05cbiAgICAkcm9vdFNjb3BlLiRvbignbGltaXRUcnVja3MnLCAkc2NvcGUubmVhckJ5VHJ1Y2tzKTtcblxuXG4gICAgJHNjb3BlLmdldFR3ZWV0cyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIGNvbnNvbGUubG9nKCdoaScpO1xuICAgIH07XG5cblxuICAgICRzY29wZS5mb3JtYXRNYXJrZXJzID0gZnVuY3Rpb24oYXJyKXtcblxuICAgICAgICBfLnJlbW92ZShhcnIsIGZ1bmN0aW9uKGVsZW0peyAvL1FVRVNUSU9OXG4gICAgICAgICAgICByZXR1cm4gIWVsZW0uY29vcmRpbmF0ZXM7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBhcnIubWFwKGZ1bmN0aW9uKHRydWNrKXtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbGF5ZXI6ICd0cnVja0NsdXN0ZXInLFxuICAgICAgICAgICAgICAgIGxhdDogdHJ1Y2suY29vcmRpbmF0ZXMubGF0aXR1ZGUsXG4gICAgICAgICAgICAgICAgbG5nOiB0cnVjay5jb29yZGluYXRlcy5sb25naXR1ZGUsXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogdHJ1Y2submFtZSsnPC9icj48aW1nIG5nLXNyYz0nK3RydWNrLnJhdGluZysnPjwvaW1nPicsXG4gICAgICAgICAgICAgICAgbGFiZWw6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogdHJ1Y2submFtZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgJHNjb3BlLm1hcmtlcnMgPSAkc2NvcGUuZm9ybWF0TWFya2Vycyh0cnVja3MpO1xuICAgIFxuXG4gICAgYW5ndWxhci5leHRlbmQoJHNjb3BlLCB7XG4gICAgICAgICAgICBjZW50ZXI6IHtcbiAgICAgICAgICAgICAgICBhdXRvRGlzY292ZXI6IHRydWUsXG4gICAgICAgICAgICAgICAgem9vbTogMjBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB1c2VySWNvbjp7XG4gICAgICAgICAgICAgICAgbWFya2VyQ29sb3I6ICdyZWQnXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgICAgICAgbWFwOiB7XG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZTogWydtb3ZlZW5kJywgJ3BvcHVwb3BlbiddLFxuICAgICAgICAgICAgICAgICAgICBsb2dpYzogJ2VtaXQnXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBtYXJrZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgbG9naWM6ICdlbWl0J1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBsYXllcnM6IHtcbiAgICAgICAgICAgICAgICBiYXNlbGF5ZXJzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1hcGJveF9saWdodDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogJ01hcCAtIExpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogJ2h0dHA6Ly9hcGkudGlsZXMubWFwYm94LmNvbS92NC97bWFwaWR9L3t6fS97eH0ve3l9LnBuZz9hY2Nlc3NfdG9rZW49e2FwaWtleX0nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3h5eicsXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXllck9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlrZXk6ICdway5leUoxSWpvaWEzTnNhV0Z2SWl3aVlTSTZJazVvV1Zka01rMGlmUS5xeFlrU0pQZjMxR09ORDN2ZzZacS1RJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXBpZDogJ2J1ZmFudXZvbHMubGlhMjJnMDknXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG1hcGJveF9jb2xvcjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogXCJNYXAgLSBDb2xvclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiAnaHR0cDovL2FwaS50aWxlcy5tYXBib3guY29tL3Y0L3ttYXBpZH0ve3p9L3t4fS97eX0ucG5nP2FjY2Vzc190b2tlbj17YXBpa2V5fScsXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAneHl6JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxheWVyT3B0aW9uczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWtleTogJ3BrLmV5SjFJam9pYTNOc2FXRnZJaXdpWVNJNklrNW9XVmRrTWswaWZRLnF4WWtTSlBmMzFHT05EM3ZnNlpxLVEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1hcGlkOiAnbWFwYm94LnJ1bi1iaWtlLWhpa2UnXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIG1hcGJveF9zdHJlZXQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiTWFwIC0gU3RyZWV0XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6ICdodHRwOi8vYXBpLnRpbGVzLm1hcGJveC5jb20vdjQve21hcGlkfS97en0ve3h9L3t5fS5wbmc/YWNjZXNzX3Rva2VuPXthcGlrZXl9JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICd4eXonLFxuICAgICAgICAgICAgICAgICAgICAgICAgbGF5ZXJPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpa2V5OiAncGsuZXlKMUlqb2lhM05zYVdGdklpd2lZU0k2SWs1b1dWZGtNazBpZlEucXhZa1NKUGYzMUdPTkQzdmc2WnEtUScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFwaWQ6ICdtYXBib3guc3RyZWV0cy1iYXNpYydcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvdmVybGF5czoge1xuICAgICAgICAgICAgICAgICAgICB0cnVja0NsdXN0ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwidHJ1Y2sgY2x1c3RlclwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogXCJtYXJrZXJjbHVzdGVyXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICB2aXNpYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uczp7XG4gICAgICAgICAgICAvLyAgICAgZHJpdmluZzp7XG4gICAgICAgICAgICAvLyAgICAgICAgIG5hbWU6ICdEcml2aW5nIERpcmVjdGlvbnMnLFxuICAgICAgICAgICAgLy8gICAgICAgICB0eXBlOiAnZGlyZWN0aW9ucycsXG4gICAgICAgICAgICAvLyAgICAgICAgIHVybDogJ2h0dHA6Ly9hcGkudGlsZXMubWFwYm94LmNvbS92NC9kaXJlY3Rpb25zL21hcGJveC5kcml2aW5nL3t3YXlwb2ludHN9Lmpzb24/YWNjZXNzX3Rva2VuPXthcGlrZXl9JyxcbiAgICAgICAgICAgIC8vICAgICAgICAgYXBpa2V5OiAncGsuZXlKMUlqb2lhM05zYVdGdklpd2lZU0k2SWs1b1dWZGtNazBpZlEucXhZa1NKUGYzMUdPTkQzdmc2WnEtUSdcbiAgICAgICAgICAgIC8vICAgICB9LFxuICAgICAgICAgICAgLy8gICAgIHdhbGtpbmc6e1xuICAgICAgICAgICAgLy8gICAgICAgICBuYW1lOiAnV2Fsa2luZyBEaXJlY3Rpb25zJyxcbiAgICAgICAgICAgIC8vICAgICAgICAgdHlwZTogJ2RpcmVjdGlvbnMnLFxuICAgICAgICAgICAgLy8gICAgICAgICB1cmw6ICdodHRwOi8vYXBpLnRpbGVzLm1hcGJveC5jb20vdjQvZGlyZWN0aW9ucy9tYXBib3gud2Fsa2luZy97d2F5cG9pbnRzfS5qc29uP2FjY2Vzc190b2tlbj17YXBpa2V5fScsXG4gICAgICAgICAgICAvLyAgICAgICAgIGFwaWtleTogJ3BrLmV5SjFJam9pYTNOc2FXRnZJaXdpWVNJNklrNW9XVmRrTWswaWZRLnF4WWtTSlBmMzFHT05EM3ZnNlpxLVEnXG4gICAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgICAgLy8gfVxuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbn0pO1xuIiwiLy9MLm1hcGJveC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWEzTnNhV0Z2SWl3aVlTSTZJazVvV1Zka01rMGlmUS5xeFlrU0pQZjMxR09ORDN2ZzZacS1RJztcbi8vXG4vL3ZhciBnZW9sb2NhdGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZ2VvbG9jYXRlJyk7XG4vL1xuLy92YXIgbWFwID0gTC5tYXBib3gubWFwKCdtYXAnLCAna3NsaWFvLmtrMm9qMDkyJylcbi8vICAgIC5hZGRDb250cm9sKEwubWFwYm94Lmdlb2NvZGVyQ29udHJvbCgnbWFwYm94LnBsYWNlcycsIHtcbi8vICAgICAgICBhdXRvY29tcGxldGU6IHRydWVcbi8vICAgIH0pKTtcbi8vXG4vL3ZhciBnZW9jb2RlciA9IEwubWFwYm94Lmdlb2NvZGVyKCdtYXBib3gucGxhY2VzJyk7XG4vL1xuLy9cbi8vaWYgKCFuYXZpZ2F0b3IuZ2VvbG9jYXRpb24pIHtcbi8vICAgIGdlb2xvY2F0ZS5pbm5lckhUTUwgPSAnR2VvbG9jYXRpb24gbm90IGF2YWlsYWJsZSc7XG4vL31cbi8vZWxzZSB7XG4vLyAgICBnZW9sb2NhdGUub25jbGljayA9IGZ1bmN0aW9uKGUpe1xuLy8gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbi8vICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuLy8gICAgICAgIG1hcC5sb2NhdGUoKTtcbi8vICAgIH07XG4vL31cbi8vXG4vLy8vIE9uY2Ugd2UndmUgZ290IGEgcG9zaXRpb24sIHpvb20gYW5kIGNlbnRlciB0aGUgbWFwXG4vLy8vIG9uIGl0LCBhbmQgYWRkIGEgc2luZ2xlIG1hcmtlci5cbi8vbWFwLm9uKCdsb2NhdGlvbmZvdW5kJywgZnVuY3Rpb24oZSkge1xuLy8gICAgbWFwLmZpdEJvdW5kcyhlLmJvdW5kcyk7XG4vL1xuLy8gICAgbXlMYXllci5zZXRHZW9KU09OKHtcbi8vICAgICAgICB0eXBlOiAnRmVhdHVyZScsXG4vLyAgICAgICAgZ2VvbWV0cnk6IHtcbi8vICAgICAgICAgICAgdHlwZTogJ1BvaW50Jyxcbi8vICAgICAgICAgICAgY29vcmRpbmF0ZXM6IFtlLmxhdGxuZy5sbmcsIGUubGF0bG5nLmxhdF1cbi8vICAgICAgICB9LFxuLy8gICAgICAgIHByb3BlcnRpZXM6IHtcbi8vICAgICAgICAgICAgJ3RpdGxlJzogJ0hlcmUgSSBhbSEnLFxuLy8gICAgICAgICAgICAnbWFya2VyLWNvbG9yJzogJyNmZjg4ODgnLFxuLy8gICAgICAgICAgICAnbWFya2VyLXN5bWJvbCc6ICdzdGFyJ1xuLy8gICAgICAgIH1cbi8vICAgIH0pO1xuLy99KTtcbi8vXG4vLy8vIElmIHRoZSB1c2VyIGNob29zZXMgbm90IHRvIGFsbG93IHRoZWlyIGxvY2F0aW9uXG4vLy8vIHRvIGJlIHNoYXJlZCwgZGlzcGxheSBhbiBlcnJvciBtZXNzYWdlLlxuLy9tYXAub24oJ2xvY2F0aW9uZXJyb3InLCBmdW5jdGlvbigpIHtcbi8vICAgIGdlb2xvY2F0ZS5pbm5lckhUTUwgPSAnUG9zaXRpb24gY291bGQgbm90IGJlIGZvdW5kJztcbi8vfSk7XG4vL1xuLy8vLyBMLm1hcGJveC5mZWF0dXJlTGF5ZXIoJ2V4YW1wbGVzLm1hcC1oNjFlOG84ZScpLm9uKCdyZWFkeScsIGZ1bmN0aW9uKGUpIHtcbi8vLy8gICAgIC8vIFRoZSBjbHVzdGVyR3JvdXAgZ2V0cyBlYWNoIG1hcmtlciBpbiB0aGUgZ3JvdXAgYWRkZWQgdG8gaXRcbi8vLy8gICAgIC8vIG9uY2UgbG9hZGVkLCBhbmQgdGhlbiBpcyBhZGRlZCB0byB0aGUgbWFwXG4vLy8vICAgICB2YXIgY2x1c3Rlckdyb3VwID0gbmV3IEwuTWFya2VyQ2x1c3Rlckdyb3VwKCk7XG4vLy8vICAgICBlLnRhcmdldC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcbi8vLy8gICAgICAgICBjbHVzdGVyR3JvdXAuYWRkTGF5ZXIobGF5ZXIpO1xuLy8vLyAgICAgfSk7XG4vLy8vICAgICBtYXAuYWRkTGF5ZXIoY2x1c3Rlckdyb3VwKTtcbi8vLy8gfSk7XG4vL1xuLy92YXIgZmVhdHVyZUxheWVyID0gTC5tYXBib3guZmVhdHVyZUxheWVyKHtcbi8vICAgIHR5cGU6ICdGZWF0dXJlQ29sbGVjdGlvbicsXG4vLyAgICBmZWF0dXJlczogW3tcbi8vICAgICAgICB0eXBlOiAnRmVhdHVyZScsXG4vLyAgICAgICAgcHJvcGVydGllczoge1xuLy8gICAgICAgICAgICAvLyAnZnJvbSc6ICdEdWtlIFBvaW50Jyxcbi8vICAgICAgICAgICAgLy8gJ3RvJzogJ1RzYXd3YXNzZW4nLFxuLy8gICAgICAgICAgICAnbWFya2VyLWNvbG9yJzogJyM1NDhjYmEnLFxuLy8gICAgICAgICAgICAnbWFya2VyLXNpemUnOiAnbGFyZ2UnLFxuLy8gICAgICAgICAgICAnbWFya2VyLXN5bWJvbCc6ICdmZXJyeSdcbi8vICAgICAgICB9LFxuLy8gICAgICAgIGdlb21ldHJ5OiB7XG4vLyAgICAgICAgICAgIHR5cGU6ICdQb2ludCcsXG4vLyAgICAgICAgICAgIGNvb3JkaW5hdGVzOiBbLTEyMy44OTEyODgwNDIwNjg0NywgNDkuMTYzNTE1MjQ0OTA2NzhdXG4vLyAgICAgICAgfVxuLy8gICAgfV1cbi8vfSlcbi8vICAgIC5hZGRUbyhtYXApO1xuLy9cbi8vLy8gTm90ZSB0aGF0IGNhbGxpbmcgYC5lYWNoTGF5ZXJgIGhlcmUgZGVwZW5kcyBvbiBzZXR0aW5nIEdlb0pTT04gX2RpcmVjdGx5X1xuLy8vLyBhYm92ZS4gSWYgeW91J3JlIGxvYWRpbmcgR2VvSlNPTiBhc3luY2hyb25vdXNseSwgbGlrZSBmcm9tIENTViBvciBmcm9tIGEgZmlsZSxcbi8vLy8geW91IHdpbGwgbmVlZCB0byBkbyB0aGlzIHdpdGhpbiBhIGBmZWF0dXJlTGF5ZXIub24oJ3JlYWR5J2AgZXZlbnQuXG4vL2ZlYXR1cmVMYXllci5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcbi8vXG4vLyAgICAvLyBoZXJlIHlvdSBjYWxsIGBiaW5kUG9wdXBgIHdpdGggYSBzdHJpbmcgb2YgSFRNTCB5b3UgY3JlYXRlIC0gdGhlIGZlYXR1cmVcbi8vICAgIC8vIHByb3BlcnRpZXMgZGVjbGFyZWQgYWJvdmUgYXJlIGF2YWlsYWJsZSB1bmRlciBgbGF5ZXIuZmVhdHVyZS5wcm9wZXJ0aWVzYFxuLy8gICAgdmFyIGNvbnRlbnQgPSAnPGgyPkEgZmVycnkgcmlkZSE8XFwvaDI+JyArXG4vLyAgICAgICAgJzxwPkZyb206ICcgKyBsYXllci5mZWF0dXJlLnByb3BlcnRpZXMuZnJvbSArICc8YnIgXFwvPicgK1xuLy8gICAgICAgICd0bzogJyArIGxheWVyLmZlYXR1cmUucHJvcGVydGllcy50byArICc8XFwvcD4nO1xuLy8gICAgbGF5ZXIuYmluZFBvcHVwKGNvbnRlbnQpO1xuLy99KTtcbi8vXG4vL3ZhciBteUxheWVyID0gTC5tYXBib3guZmVhdHVyZUxheWVyKCkuYWRkVG8obWFwKTtcbi8vXG4vL3ZhciBnZW9qc29uID0ge1xuLy8gICAgdHlwZTogJ0ZlYXR1cmVDb2xsZWN0aW9uJyxcbi8vICAgIGZlYXR1cmVzOiBbe1xuLy8gICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbi8vICAgICAgICBwcm9wZXJ0aWVzOiB7XG4vLyAgICAgICAgICAgIHRpdGxlOiAnV2FzaGluZ3RvbiwgRC5DLicsXG4vLyAgICAgICAgICAgICdtYXJrZXItY29sb3InOiAnI2Y4Njc2NycsXG4vLyAgICAgICAgICAgICdtYXJrZXItc2l6ZSc6ICdsYXJnZScsXG4vLyAgICAgICAgICAgICdtYXJrZXItc3ltYm9sJzogJ3N0YXInLFxuLy8gICAgICAgICAgICB1cmw6ICdodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dhc2hpbmd0b24sX0QuQy4nXG4vLyAgICAgICAgfSxcbi8vICAgICAgICBnZW9tZXRyeToge1xuLy8gICAgICAgICAgICB0eXBlOiAnUG9pbnQnLFxuLy8gICAgICAgICAgICBjb29yZGluYXRlczogWy03Ny4wMzIwMSwgMzguOTAwNjVdXG4vLyAgICAgICAgfVxuLy8gICAgfSxcbi8vICAgICAgICB7XG4vLyAgICAgICAgICAgIHR5cGU6ICdGZWF0dXJlJyxcbi8vICAgICAgICAgICAgcHJvcGVydGllczoge1xuLy8gICAgICAgICAgICAgICAgdGl0bGU6ICdCYWx0aW1vcmUsIE1EJyxcbi8vICAgICAgICAgICAgICAgICdtYXJrZXItY29sb3InOiAnIzdlYzliMScsXG4vLyAgICAgICAgICAgICAgICAnbWFya2VyLXNpemUnOiAnbGFyZ2UnLFxuLy8gICAgICAgICAgICAgICAgJ21hcmtlci1zeW1ib2wnOiAnc3RhcicsXG4vLyAgICAgICAgICAgICAgICB1cmw6ICdodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0JhbHRpbW9yZSdcbi8vICAgICAgICAgICAgfSxcbi8vICAgICAgICAgICAgZ2VvbWV0cnk6IHtcbi8vICAgICAgICAgICAgICAgIHR5cGU6ICdQb2ludCcsXG4vLyAgICAgICAgICAgICAgICBjb29yZGluYXRlczogWy03Ni42MDc2NywgMzkuMjg3NTVdXG4vLyAgICAgICAgICAgIH1cbi8vICAgICAgICB9XVxuLy99O1xuLy9cbi8vbXlMYXllci5zZXRHZW9KU09OKGdlb2pzb24pO1xuLy9teUxheWVyLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbihlKSB7XG4vLyAgICBlLmxheWVyLm9wZW5Qb3B1cCgpO1xuLy99KTtcbi8vbXlMYXllci5vbignbW91c2VvdXQnLCBmdW5jdGlvbihlKSB7XG4vLyAgICBlLmxheWVyLmNsb3NlUG9wdXAoKTtcbi8vfSk7XG4vL1xuLy9mdW5jdGlvbiBzaG93TWFwKGVyciwgZGF0YSkge1xuLy8gICAgLy8gVGhlIGdlb2NvZGVyIGNhbiByZXR1cm4gYW4gYXJlYSwgbGlrZSBhIGNpdHksIG9yIGFcbi8vICAgIC8vIHBvaW50LCBsaWtlIGFuIGFkZHJlc3MuIEhlcmUgd2UgaGFuZGxlIGJvdGggY2FzZXMsXG4vLyAgICAvLyBieSBmaXR0aW5nIHRoZSBtYXAgYm91bmRzIHRvIGFuIGFyZWEgb3Igem9vbWluZyB0byBhIHBvaW50LlxuLy8gICAgaWYgKGRhdGEubGJvdW5kcykge1xuLy8gICAgICAgIG1hcC5maXRCb3VuZHMoZGF0YS5sYm91bmRzKTtcbi8vICAgIH0gZWxzZSBpZiAoZGF0YS5sYXRsbmcpIHtcbi8vICAgICAgICBtYXAuc2V0VmlldyhbZGF0YS5sYXRsbmdbMF0sIGRhdGEubGF0bG5nWzFdXSwgMTMpO1xuLy8gICAgfVxuLy99XG4vL1xuLy92YXIgZmlsdGVycyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWx0ZXJzJyk7XG4vL3ZhciBjaGVja2JveGVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZSgnZmlsdGVyJyk7XG4vL1xuLy9mdW5jdGlvbiBjaGFuZ2UoKSB7XG4vLyAgICAvLyBGaW5kIGFsbCBjaGVja2JveGVzIHRoYXQgYXJlIGNoZWNrZWQgYW5kIGJ1aWxkIGEgbGlzdCBvZiB0aGVpciB2YWx1ZXNcbi8vICAgIHZhciBvbiA9IFtdO1xuLy8gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGVja2JveGVzLmxlbmd0aDsgaSsrKSB7XG4vLyAgICAgICAgaWYgKGNoZWNrYm94ZXNbaV0uY2hlY2tlZCkgb24ucHVzaChjaGVja2JveGVzW2ldLnZhbHVlKTtcbi8vICAgIH1cbi8vICAgIC8vIFRoZSBmaWx0ZXIgZnVuY3Rpb24gdGFrZXMgYSBHZW9KU09OIGZlYXR1cmUgb2JqZWN0XG4vLyAgICAvLyBhbmQgcmV0dXJucyB0cnVlIHRvIHNob3cgaXQgb3IgZmFsc2UgdG8gaGlkZSBpdC5cbi8vICAgIG1hcC5mZWF0dXJlTGF5ZXIuc2V0RmlsdGVyKGZ1bmN0aW9uIChmKSB7XG4vLyAgICAgICAgLy8gY2hlY2sgZWFjaCBtYXJrZXIncyBzeW1ib2wgdG8gc2VlIGlmIGl0cyB2YWx1ZSBpcyBpbiB0aGUgbGlzdFxuLy8gICAgICAgIC8vIG9mIHN5bWJvbHMgdGhhdCBzaG91bGQgYmUgb24sIHN0b3JlZCBpbiB0aGUgJ29uJyBhcnJheVxuLy8gICAgICAgIHJldHVybiBvbi5pbmRleE9mKGYucHJvcGVydGllc1snbWFya2VyLXN5bWJvbCddKSAhPT0gLTE7XG4vLyAgICB9KTtcbi8vICAgIHJldHVybiBmYWxzZTtcbi8vfVxuLy9cbi8vLy8gV2hlbiB0aGUgZm9ybSBpcyB0b3VjaGVkLCByZS1maWx0ZXIgbWFya2Vyc1xuLy9maWx0ZXJzLm9uY2hhbmdlID0gY2hhbmdlO1xuLy8vLyBJbml0aWFsbHkgZmlsdGVyIHRoZSBtYXJrZXJzXG4vL2NoYW5nZSgpO1xuXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvbWVtYmVycy1hcmVhJyxcbiAgICAgICAgdGVtcGxhdGU6ICc8aW1nIG5nLXJlcGVhdD1cIml0ZW0gaW4gc3Rhc2hcIiB3aWR0aD1cIjMwMFwiIG5nLXNyYz1cInt7IGl0ZW0gfX1cIiAvPicsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIFNlY3JldFN0YXNoKSB7XG4gICAgICAgICAgICBTZWNyZXRTdGFzaC5nZXRTdGFzaCgpLnRoZW4oZnVuY3Rpb24gKHN0YXNoKSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnN0YXNoID0gc3Rhc2g7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgYXV0aGVudGljYXRlOiB0cnVlXG4gICAgICAgIH1cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdTZWNyZXRTdGFzaCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldFN0YXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21lbWJlcnMvc2VjcmV0LXN0YXNoJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0U3Rhc2g6IGdldFN0YXNoXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdzaWdudXAnLCB7XG4gICAgICAgIHVybDogJy9zaWdudXAnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdTaWduVXBDdHJsJyxcbiAgICAgICAgcmVzb2x2ZTp7XG4gICAgICAgICAgICBjb29yZHM6IGZ1bmN0aW9uKFRydWNrRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBUcnVja0ZhY3RvcnkuZ2V0TG9jYXRpb24oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWduVXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBjb29yZHMsIFRydWNrRmFjdG9yeSwgU29ja2V0KXtcblxuICAgIGNvbnNvbGUubG9nKGNvb3Jkcyk7XG5cbiAgICAkc2NvcGUudHJ1Y2sgPSB7XG4gICAgICAgIGVtYWlsOiAnJyxcbiAgICAgICAgcGFzc3dvcmQ6ICcnLFxuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgY3Vpc2luZTogJycsXG4gICAgICAgIGNvb3JkaW5hdGVzOiBjb29yZHNcbiAgICB9XG5cbiAgICAkc2NvcGUuY3JlYXRlVHJ1Y2sgPSBmdW5jdGlvbigpe1xuICAgICAgICBUcnVja0ZhY3RvcnkubmV3VHJ1Y2soJHNjb3BlLnRydWNrKS50aGVuKGZ1bmN0aW9uKHRydWNrKXtcbiAgICAgICAgICAgIFNvY2tldC5lbWl0KCduZXdUcnVjaycsIHRydWNrKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG59KTtcblxuIiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCd0dXRvcmlhbCcsIHtcbiAgICAgICAgdXJsOiAnL3R1dG9yaWFsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy90dXRvcmlhbC90dXRvcmlhbC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ1R1dG9yaWFsQ3RybCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICAgIHR1dG9yaWFsSW5mbzogZnVuY3Rpb24gKFR1dG9yaWFsRmFjdG9yeSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBUdXRvcmlhbEZhY3RvcnkuZ2V0VHV0b3JpYWxWaWRlb3MoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ1R1dG9yaWFsRmFjdG9yeScsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0VHV0b3JpYWxWaWRlb3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvdHV0b3JpYWwvdmlkZW9zJykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdUdXRvcmlhbEN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCB0dXRvcmlhbEluZm8pIHtcblxuICAgICRzY29wZS5zZWN0aW9ucyA9IHR1dG9yaWFsSW5mby5zZWN0aW9ucztcbiAgICAkc2NvcGUudmlkZW9zID0gXy5ncm91cEJ5KHR1dG9yaWFsSW5mby52aWRlb3MsICdzZWN0aW9uJyk7XG5cbiAgICAkc2NvcGUuY3VycmVudFNlY3Rpb24gPSB7IHNlY3Rpb246IG51bGwgfTtcblxuICAgICRzY29wZS5jb2xvcnMgPSBbXG4gICAgICAgICdyZ2JhKDM0LCAxMDcsIDI1NSwgMC4xMCknLFxuICAgICAgICAncmdiYSgyMzgsIDI1NSwgNjgsIDAuMTEpJyxcbiAgICAgICAgJ3JnYmEoMjM0LCA1MSwgMjU1LCAwLjExKScsXG4gICAgICAgICdyZ2JhKDI1NSwgMTkzLCA3MywgMC4xMSknLFxuICAgICAgICAncmdiYSgyMiwgMjU1LCAxLCAwLjExKSdcbiAgICBdO1xuXG4gICAgJHNjb3BlLmdldFZpZGVvc0J5U2VjdGlvbiA9IGZ1bmN0aW9uIChzZWN0aW9uLCB2aWRlb3MpIHtcbiAgICAgICAgcmV0dXJuIHZpZGVvcy5maWx0ZXIoZnVuY3Rpb24gKHZpZGVvKSB7XG4gICAgICAgICAgICByZXR1cm4gdmlkZW8uc2VjdGlvbiA9PT0gc2VjdGlvbjtcbiAgICAgICAgfSk7XG4gICAgfTtcblxufSk7IiwiXG5hcHAuZmFjdG9yeSgnTWFwRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKXtcblx0cmV0dXJuIHtcblx0XHRnZXRUcnVja3M6IGZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3llbHAvJykudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGdldEZpbHRlcmVkVHJ1Y2tzOiBmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS95ZWxwL2ZpbHRlcicpLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0bWFrZU1hcmtlcjogZnVuY3Rpb24odHJ1Y2ssIGlkKXtcblx0XHRcdHZhciBtYXJrZXI9IHtcblx0XHRcdFx0aWQ6IGlkLFxuXHRcdFx0XHRjb29yZHM6IHRydWNrLmNvb3JkaW5hdGVzLFxuXHRcdFx0XHRvcHRpb25zOiB7ZHJhZ2dhYmxlOiBmYWxzZX0sXG5cdFx0XHRcdHNob3c6ZmFsc2UsXG5cdFx0XHRcdHRpdGxlOiB0cnVjay5uYW1lLFxuXHRcdFx0XHRyYXRpbmc6IHRydWNrLnJhdGluZyxcblx0XHRcdFx0cmV2aWV3OiB0cnVjay5yZXZpZXcsXG5cdFx0XHRcdGN1aXNpbmU6IHRydWNrLmN1aXNpbmUsXG5cdFx0XHRcdGljb246ICd0cnVjay5wbmcnXG5cdFx0XHR9XG5cdFx0XHRtYXJrZXIub25DbGljayA9IGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG1hcmtlci5zaG93ID0gIW1hcmtlci5zaG93O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG1hcmtlcjtcblx0XHR9XG5cdH07XG59KTtcblxuYXBwLmZhY3RvcnkoJ0dlb0ZhY3RvcnknLCBmdW5jdGlvbigkcSl7XG5cdCAgICBcblx0ICAgIHZhciB1c2VyTG9jYXRpb24gPSB7fTtcblxuXHQgICAgdXNlckxvY2F0aW9uLmdldEdlbyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICByZXR1cm4gJHEoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCl7XG4gICAgICAgICAgaWYgKHVzZXJMb2NhdGlvbi5sYXRpdHVkZSAmJiB1c2VyTG9jYXRpb24ubG9uZ2l0dWRlKSB7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgaWYobmF2aWdhdG9yLmdlb2xvY2F0aW9uKXsgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uIChwb3NpdGlvbil7XG4gICAgICAgICAgICAgICAgdXNlckxvY2F0aW9uLmxhdGl0dWRlID0gcG9zaXRpb24uY29vcmRzLmxhdGl0dWRlO1xuICAgICAgICAgICAgICAgIHVzZXJMb2NhdGlvbi5sb25naXR1ZGUgPSBwb3NpdGlvbi5jb29yZHMubG9uZ2l0dWRlO1xuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IFxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiR2VvbG9jYXRpb24gaXMgbm90IHN1cHBvcnRlZCBieSB0aGlzIGJyb3dzZXJcIik7XG4gICAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gdXNlckxvY2F0aW9uO1xuICB9KTtcbiIsIid1c2Ugc3RyaWN0JztcbmFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJy8uLi9zY3NzL2ltZy9saW1lLnBuZycsXG4gICAgICAgICcvLi4vc2Nzcy9pbWcvb3JhbmdlLmpwZycsXG4gICAgICAgICcvLi4vc2Nzcy9pbWcvcGluay5wbmcnLFxuICAgICAgICAnLy4uL3Njc3MvaW1nL3JlZC5wbmcnLFxuICAgICAgICAnLy4uL3Njc3MvaW1nL3llbGxvdy5wbmcnXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZmFjdG9yeSgnc29ja2V0JywgZnVuY3Rpb24oJHJvb3RTY29wZSl7fSk7IiwiYXBwLmZhY3RvcnkoJ1RydWNrRmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwLCAkcSl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0TG9jYXRpb246IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBkZWZlcnJlZCA9ICRxLmRlZmVyKCk7XG4gICAgICAgICAgICBpZiAobmF2aWdhdG9yICYmIG5hdmlnYXRvci5nZW9sb2NhdGlvbikge1xuICAgICAgICAgICAgICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24ocG9zaXRpb24pe1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29vcmRzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGF0aXR1ZGU6IHBvc2l0aW9uLmNvb3Jkcy5sYXRpdHVkZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvbmdpdHVkZTogcG9zaXRpb24uY29vcmRzLmxvbmdpdHVkZVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoY29vcmRzKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfSxcbiAgICAgICAgbmV3VHJ1Y2s6IGZ1bmN0aW9uKHRydWNrKXtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3VzZXIvJywgdHJ1Y2spLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0sXG4gICAgICAgIGFsbFRydWNrczogZnVuY3Rpb24odHJ1Y2spe1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnYXBpL3VzZXIvJykudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuXG5hcHAuZGlyZWN0aXZlKCd0dXRvcmlhbFNlY3Rpb24nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHtcbiAgICAgICAgICAgIG5hbWU6ICdAJyxcbiAgICAgICAgICAgIHZpZGVvczogJz0nLFxuICAgICAgICAgICAgYmFja2dyb3VuZDogJ0AnXG4gICAgICAgIH0sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdHV0b3JpYWwvdHV0b3JpYWwtc2VjdGlvbi90dXRvcmlhbC1zZWN0aW9uLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuY3NzKHsgYmFja2dyb3VuZDogc2NvcGUuYmFja2dyb3VuZCB9KTtcbiAgICAgICAgfVxuICAgIH07XG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZGlyZWN0aXZlKCd0dXRvcmlhbFNlY3Rpb25NZW51JywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy90dXRvcmlhbC90dXRvcmlhbC1zZWN0aW9uLW1lbnUvdHV0b3JpYWwtc2VjdGlvbi1tZW51Lmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgc2VjdGlvbnM6ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsQ3RybCkge1xuXG4gICAgICAgICAgICBzY29wZS5jdXJyZW50U2VjdGlvbiA9IHNjb3BlLnNlY3Rpb25zWzBdO1xuICAgICAgICAgICAgbmdNb2RlbEN0cmwuJHNldFZpZXdWYWx1ZShzY29wZS5jdXJyZW50U2VjdGlvbik7XG5cbiAgICAgICAgICAgIHNjb3BlLnNldFNlY3Rpb24gPSBmdW5jdGlvbiAoc2VjdGlvbikge1xuICAgICAgICAgICAgICAgIHNjb3BlLmN1cnJlbnRTZWN0aW9uID0gc2VjdGlvbjtcbiAgICAgICAgICAgICAgICBuZ01vZGVsQ3RybC4kc2V0Vmlld1ZhbHVlKHNlY3Rpb24pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICB9XG4gICAgfTtcbn0pOyIsIid1c2Ugc3RyaWN0JztcbmFwcC5kaXJlY3RpdmUoJ3R1dG9yaWFsVmlkZW8nLCBmdW5jdGlvbiAoJHNjZSkge1xuXG4gICAgdmFyIGZvcm1Zb3V0dWJlVVJMID0gZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHJldHVybiAnaHR0cHM6Ly93d3cueW91dHViZS5jb20vZW1iZWQvJyArIGlkO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3R1dG9yaWFsL3R1dG9yaWFsLXZpZGVvL3R1dG9yaWFsLXZpZGVvLmh0bWwnLFxuICAgICAgICBzY29wZToge1xuICAgICAgICAgICAgdmlkZW86ICc9J1xuICAgICAgICB9LFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLnRydXN0ZWRZb3V0dWJlVVJMID0gJHNjZS50cnVzdEFzUmVzb3VyY2VVcmwoZm9ybVlvdXR1YmVVUkwoc2NvcGUudmlkZW8ueW91dHViZUlEKSk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCIndXNlIHN0cmljdCc7XG5hcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgLy8geyBsYWJlbDogJ1R1dG9yaWFsJywgc3RhdGU6ICd0dXRvcmlhbCcgfSxcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnVHJ1Y2sgU2lnbiBVcCcsIHN0YXRlOiAnc2lnbnVwJ30sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0xvZ2luJywgc3RhdGU6ICdsb2dpbid9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuc2hvd0FsbFRydWNrcyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kZW1pdCgnc2hvd0FsbFRydWNrcycpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubGltaXRUcnVja3MgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGVtaXQoJ2xpbWl0VHJ1Y2tzJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7IiwiJ3VzZSBzdHJpY3QnO1xuYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==