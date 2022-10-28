const { log } = require("console");
const express = require("express");
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const fs = require('fs').promises


const formatMessage = require("./utils/formatMessage.js");
const { setGame } = require('./utils/game.js');

const {
    addPlayer,
    getAllPlayers,
    getPlayer,
    removePlayer,
} = require("./utils/players.js");

async function logId(id){
    let filePath = path.join(__dirname, '../src/utils/userId.txt')
    await fs.appendFile(filePath, ` ${id}`)
    return 'Id logged successfully'
}

const app = express();
const server = http.createServer(app); // create the HTTP server using the Express app created on the previous line
const io = socketio(server); // connect Socket.IO to the HTTP server

const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

io.on('connection', socket => { // listen for new connections to Socket.IO
    console.log('A new player just connected');
    socket.on('join', ({ playerName, room }, callback) => {
        const { error, newPlayer } = addPlayer({ id: socket.id, playerName, room });
        let ops = logId(socket.id)
        ops.then( report=> console.log(report))
        if (error) return callback(error.message);
        callback(); // The callback can be called without data.

        socket.join(newPlayer.room);

        socket.emit('message', formatMessage('Admin', 'Welcome!'));

        socket.broadcast.to(newPlayer.room).emit(
            'message',
            formatMessage('Admin', `${newPlayer.playerName} has joined the game!`)
        );

          // Emit a "room" event to all players to update their Game Info sections
        io.in(newPlayer.room).emit('room', {
            room: newPlayer.room,
            players: getAllPlayers(newPlayer.room),
        });

        socket.on("disconnect", () => {
            console.log("A player disconnected.");

            const disconnectedPlayer = removePlayer(socket.id);

            if (disconnectedPlayer) {
                const { playerName, room } = disconnectedPlayer;
                io.in(room).emit(
                "message",
                formatMessage("Admin", `${playerName} has left!`)
                );

                io.in(room).emit("room", {
                room,
                players: getAllPlayers(room),
                });
            }
        });

        socket.on("sendMessage", (message, callback) => {
            const { error, player } = getPlayer(socket.id);

            if (error) return callback(error.message);

            if (player) {
                io.to(player.room).emit(
                "message",
                formatMessage(player.playerName, message)
                );
                callback(); // invoke the callback to trigger event acknowledgment
            }
        });

        socket.on("getQuestion", async (data, callback) => {
            const { error, player } = getPlayer(socket.id);

            if (error) return callback(error.message);

            if (player) {
                // Pass in a callback function to handle the promise that's returned from the API call
                // setGame((game) => {
                // // Emit the "question" event to all players in the room
                // io.to(player.room).emit("question", {
                //     playerName: player.playerName,
                //     ...game.prompt,
                // });
                // });
                const game = await setGame();
                io.to(player.room).emit('question', {
                    playerName: player.playerName,
                    ...game.prompt,
                    });
            }
            });

    });
})

const port = process.env.PORT || 8080;
server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});