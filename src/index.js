const express = require("express");
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const formatMessage = require("./utils/formatMessage.js");

const {
    addPlayer,
    getAllPlayers,
    getPlayer,
    removePlayer,
} = require("./utils/players.js");


const app = express();
const server = http.createServer(app); // create the HTTP server using the Express app created on the previous line
const io = socketio(server); // connect Socket.IO to the HTTP server

const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

io.on('connection', socket => { // listen for new connections to Socket.IO
    console.log('A new player just connected');
    socket.on('join', ({ playerName, room }, callback) => {
        const { error, newPlayer } = addPlayer({ id: socket.id, playerName, room });

        if (error) return callback(error.message);
        callback(); // The callback can be called without data.

        socket.join(newPlayer.room);

        socket.emit('message', formatMessage('Admin', 'Welcome!'));
    });
})

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});