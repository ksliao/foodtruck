'use strict';

var express = require('express');

var path = require('path');

 var Promise = require('bluebird');
// var request = Promise.promisify(require('request'));
var router = express.Router();

module.exports = router;


var yelp = require('yelp').createClient({
    consumer_key: "6OwiyhWLnumLQGwuZtUfIg",
    consumer_secret: "WhKASN_kZdzghciz3980k0mmo9w",
    token: "WnANgVnx9Ls1Md0-nBeBou4JBuXGQeTc",
    token_secret: "Oqd_YxDBJog4j95Oxygvi4-GZBM"
  
});



router.get('/', function(req, res, next) {
	console.log('hey im in the route');
	var foodTrucks = [];
	var reqArr = [];

	for(var i = 0; i <= 7; i ++){
		var thisPromise = new Promise(function(resolve, reject){
			yelp.search({term: "food", category_filter:"foodtrucks", offset: 20 * i, location: "nyc"}, function(error, data) {
				if(error) reject(error);
				else resolve(data);
			});
		})
		reqArr.push(thisPromise);
	};

	Promise.all(reqArr)
	.then(function(data){
		data.map(function(e){
			return e.businesses.forEach(function(e){
				
				var truckObj = {
					coordinates: e.location.coordinate,
					 name: e.name, 
					 rating: e.rating_img_url,
					 review: e.snippet_text
				}

				if(e.categories[1]) truckObj.cuisine = e.categories[1][1];
				else truckObj.cuisine = e.categories[0][1];

				foodTrucks.push(truckObj);
				
			});
		});
		res.json(foodTrucks);
	});
	
 
});

router.get('/filter', function(req, res, next) {
	var foodTrucks = [];
	var truckObj = {};


yelp.search({term: "food", category_filter:"foodtrucks", location: "nyc", radius_filter:1000 }, function(error, data, next) {
		if(error) return next(error);
		data.businesses.forEach(function(e){
			truckObj = {
				coordinates: e.location.coordinate,
					 name: e.name, 
					 rating: e.rating_img_url,
					 review: e.snippet_text
			};
			foodTrucks.push(truckObj);
		});
		res.json(foodTrucks);
	});

	});

