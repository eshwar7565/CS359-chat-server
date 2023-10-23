const app = require("./app");

const dotenv = require("dotenv")
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });



process.on("uncaughtException", (err) => {
    console.log(err);
    console.log("UNCAUGHT Exception! Shutting down ...");
    process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
});

const { Server } = require("socket.io"); // Add this
const http = require("http");

const server = http.createServer(app);

const User = require("./models/user");

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});


const DB = process.env.DATABASE;


mongoose.connect(DB, {
    useNewUrlParser: true,

    useUnifiedTopology: true, // Set to true to opt in to using the MongoDB driver's new connection management engine. You should set this option to true , except for the unlikely case that it prevents you from maintaining a stable connection.


})
    .then((con) => {
        console.log("DB Connection successful");
    });
const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log(`App running on port ${port} ...`);
});

// Add this
// Listen for when the client connects via socket.io-client
io.on("connection", async (socket) => {
    console.log(JSON.stringify(socket.handshake.query));
    const user_id = socket.handshake.query["user_id"];

    console.log(`User connected ${socket.id}`);

    if (Boolean(user_id)) {

        await User.findByIdAndUpdate(user_id, { socket_id: socket.id, });

    }

    // We can write our socket event listeners in here...
    socket.on("friend_request", async (data) => {
        const to = await User.findById(data.to).select("socket_id");
        const from = await User.findById(data.from).select("socket_id");

        // create a friend request
        await FriendRequest.create({
            sender: data.from,
            recipient: data.to,
        });
        // emit event request received to recipient
        io.to(to?.socket_id).emit("new_friend_request", {
            message: "New friend request received",
        });
        io.to(from?.socket_id).emit("request_sent", {
            message: "Request Sent successfully!",
        });
    });
});

socket.on("accept_request", async (data) => {
    // accept friend request => add ref of each other in friends array
    console.log(data);
    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    // delete this request doc
    // emit event to both of them

    // emit event request accepted to both
    io.to(sender?.socket_id).emit("request_accepted", {
        message: "Friend Request Accepted",
    });
    io.to(receiver?.socket_id).emit("request_accepted", {
        message: "Friend Request Accepted",
    });
    socket.on("end", async (data) => {
        // Find user by ID and set status as offline

        if (data.user_id) {
            await User.findByIdAndUpdate(data.user_id, { status: "Offline" });
        }

        // broadcast to all conversation rooms of this user that this user is offline (disconnected)

        console.log("closing connection");
        socket.disconnect(0);
    });

});




process.on("unhandledRejection", (err) => {
    console.log(err);
    console.log("UNHANDLED REJECTION! Shutting down ...");
    server.close(() => {
        process.exit(1); //  Exit Code 1 indicates that a container shut down, either because of an application failure.
    });


});