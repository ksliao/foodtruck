'use strict';

var express = require('express');
var path = require('path');
var Promise = require('bluebird');
var router = express.Router();

var Twitter = require('twitter');

var client = new Twitter({
    consumer_key: '0P1YX3KtIpxVqjq9jcetTM6MV',
    consumer_secret: 'KTzNyXh9Y0XJBk2lHYqtq9lCEos79b3Aiscz4gagN2Vb4zEyna',
    access_token_key: '67450711-N9czlg8C52XUhGICfV64AzJieYLxnr1QZXniCkt4D',
    access_token_secret: 'I28jMHZNe6LhxVc3hHLUnzD509wrGZSpaQ8wMOyEI7KKo'
});

client.stream('statuses/filter', {follow: "3222728733"}, function(stream){

   stream.on('data', function(tweet){
       var io = require('../../../io')();
       console.log(tweet.text);
       var tweet = {
        text: tweet.text,
        name: tweet.user.name
       }
       io.sockets.emit('newTweet', tweet);

   });

    stream.on('error', function(error){
        console.log(error);
    })

});


module.exports = router;
