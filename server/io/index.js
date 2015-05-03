'use strict';
var socketio = require('socket.io');
var io = null;

module.exports = function (server) {

    if (io) return io;

    io = socketio(server);

    io.on('connection', function (socket) {
        socket.on('newTruck', function(truck){
            console.log('received truck');
            io.sockets.emit('addedTruck', {
                truck: truck
            });
        })
    });
    
    return io;

};
