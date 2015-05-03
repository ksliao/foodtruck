'use strict';

var express = require('express');
var path = require('path');
var Promise = require('bluebird');
var router = express.Router();
var mongoose = require('mongoose');

require('../../../../server/db/models/user');
var User = mongoose.model('User');


module.exports = router;


router.get('/', function(req, res, next) {
    User.find({}, function(err, users){
        if(err) return next(err);
        res.json(users);
    })
});

router.post('/', function(req, res, next) {
    User.create(req.body).then(function(user){
        res.json(user);
    }, function(err){
        return next(err);
    });

});

