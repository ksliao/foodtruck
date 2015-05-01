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