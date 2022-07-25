const path = require("path");
const http = require("http");
const express = require("express");
const serverio = require("socket.io");
const Filter = require("bad-words");
const {
  addUser,
  getUser,
  removeUser,
  getUsersInRoom,
} = require("./utils/users");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const io = serverio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

//io.on run when a user is coonect
io.on("connection", (socket) => {
  //connection is a built in event
  console.log("New Web Socket Connection....!");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!")); //for that socket user only
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      ); //except that socket user and send to other all
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
    callback();
  });
  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`
      )
    );
    callback();
  });

  socket.on("disconnect", () => {
    //disconnect is a built in event
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("admin", `${user.username} has Left!!`)
      );

      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      })
    }
  });
});

server.listen(port, () => {
  console.log(`server is up on port ${port}!!`);
});

//socket.emit = for specific client
//io.emit = send event to every connected client
//socket.broadcast.emit = send to everyone except to this socket

//io.to.emit = it emits an event to everybody in a specific room
// socket.broadcast.to.emit = for a specific chat room

// let count = 0;

//   socket.emit("countUpdated", count);
//     //from chat.js
//   socket.on('increment', ()=>{
//     count++;
//     socket.emit('countUpdated',count)
//     // io.emit('countUpdated',count)
//   })

// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

// server (emit) -> client (receive) --acknowledgement--> server
// client (emit) -> server (receive) --acknowledgement--> client
