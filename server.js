const app = require("./app");

const dotenv = require("dotenv")
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

process.on("uncaughtException", (err) => {
    console.log(err);
    console.log("UNCAUGHT Exception! Shutting down ...");
    process.exit(1); // Exit Code 1 indicates that a container shut down, either because of an application failure.
});

const http = require("http");

const server = http.createServer(app);


const DB  = process.env.DBURI.replace(
    "<PASSWORD>",process.env.DBPASSWORD);


mongoose.connect(DB,{
    // useNewUrlParser : true ,
    // useCreateIndex : true ,
    // useFindAndModify :false ,
     // useUnifiedTopology: true, // Set to true to opt in to using the MongoDB driver's new connection management engine. You should set this option to true , except for the unlikely case that it prevents you from maintaining a stable connection.


})
.then((con)=> {
    console.log("DB Connection successful");
  });
const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log(`App running on port ${port} ...`);
});

process.on("unhandledRejection", (err) => {
    console.log(err);
    console.log("UNHANDLED REJECTION! Shutting down ...");
    server.close(() => {
        process.exit(1); //  Exit Code 1 indicates that a container shut down, either because of an application failure.
    });
});