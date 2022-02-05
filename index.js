//gói dữ liệu
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const socketio = require("socket.io");

//các phần file code tự tạo
const router = require("./router");
const { socketConnectionHandler } = require("./socketio/socket.controllers");
const { socketioAuth } = require("./socketio/socket.middlewares");
const {likePostHandler} = require("./socketio/post/post.controller.socket");
const {commentPostHandler, deleteCommentHandler, editCommentHandler} = require("./socketio/post/comment.controller.socket");
const {readLastMessageHandler, outConversationHandler} = require("./socketio/conversation/conversation.controller.socket");
const {joinConversation, leaveConversation, sendMessage} = require("./socketio/conversation/message.controller.socket");


//khai báo biến môi trường
dotenv.config();
const PORT = process.env.PORT;
const MONGODB_URL = process.env.MONGODB_URL;

//tạo biến để dùng
const app = express();
const httpServer = http.createServer(app);

const io = socketio(httpServer, { cors: true });

app.use(cors());
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//phần thực hiện socketio

//middleware kiểm tra access token
io.use(socketioAuth);

//khi có kết nối từ client đến
io.on("connect", (socket) => {
  //lấy ra friends (list _id của bạn mình) từ socket.user
  const { friends, _id, informations, avatar } = socket.user;
  // console.log(socket.user);
  //join room là _id của mình - thông qua room này mình có thể nhận tin nhắn từ mọi người
  //_id đang là kiểu objectId nên ta phải biến nó thành String
  socket.join(_id.toString());

  //tương tự ta thực hiện biến toàn bộ các _id trong mảng friends thành kiểu String
  const friendsString = friends.toString(); //các _id được nối với nhau thành chuỗi _id1,_id2
  const friendsList = friendsString.split(","); //dùng split , để biến lại thành một mảng chuỗi

  const users = [];
  //path mặc định là "/"
  //sk là mỗi socket đang hoạt động trên hệ thống
  io.of("/").sockets.forEach((sk) => {
    //lấy ra id của người dùng trong sk
    const userId = sk.user._id;
    //nếu socket hiện tại là bạn của người dùng hiện tại (nằm trong mảng friends) thì thêm vào users
    if (friends.includes(userId)) {
      users.push({
        _id: sk.user._id,
        informations: sk.user.informations,
        avatar: sk.user.avatar,
        status:"online"
      });
    }
  });

  //trả về lại danh sách users hiện tại đang online trên hệ thống
  socket.emit("online-users", users);

  


  //thông báo cho mỗi người bạn biết rằng mình đang online thông qua room chính là _id của mỗi người bạn
  // trong mảng friendsList
  const userOnline = { _id, informations, avatar, status:"online" }; //ta chuẩn bị 3 thông tin này để emit
  //có thể dùng room to đối với một mảng chuỗi
  //những người nào đang join vào một phần tử trong mảng friendsList sẽ nhận được sự kiện new-user-online
  socket.to(friendsList).emit("new-online-user", userOnline);

  //sự kiện nhận _id của bạn mới để cập nhật vào friendsList
  socket.on("new-friend", (friendId) => {
    

    //nếu chưa tồn tại mới thêm vào mảng bạn bè
    if (!friendsList.includes(friendId)) {
     
      friendsList.push(friendId);

      //bắn về là mình đang online cho người dùng vừa mới kết bạn để hiển thị lên view
      socket.to(friendId).emit("new-online-user", userOnline);

    }
  });


  //khi like một bài post
  socket.on("like-post",likePostHandler.bind(null,socket, io));

  //khi comment một bài post
  socket.on("comment-post",commentPostHandler.bind(null,socket));

  //khi xóa một comment của bài post
  socket.on("delete-comment-post",deleteCommentHandler.bind(null,socket));

  //khi chỉnh sủa một comment của bài post
  socket.on("edit-comment-post",editCommentHandler.bind(null,socket));

  //khi đọc tin nhắn cuối cùng của một conversation
  socket.on("read-last-message",readLastMessageHandler.bind(null,socket,io))

  //join vào một conversation
  socket.on("join-conversation",joinConversation.bind(null,socket));

  //rời khởi một conversation
  socket.on("leave-conversation",leaveConversation.bind(null,socket));

  //gửi một tin nhắn
  socket.on("send-message",sendMessage.bind(null,socket,io));

  //tự ý rời khỏi một conversation
  socket.on("out-conversation",outConversationHandler.bind(null,socket));
  


  //khi client đóng kết nối
  //trả về một id để các người dùng khác hiển thị off
  socket.on("disconnect", () => {
   
    //có thể người dùng mở 2 tab - tắt 1 tab thì tab kia còn online
    //ta phải kiểm tra xem là không còn _id nào của người dùng tồn tại sockets nữa
    //thì mới tiến hành offline
    let off = true;
    io.of("/").sockets.forEach((sk) => {
      if (sk.user._id.toString() === _id.toString()) {
        off = false;
        return;
      }
    });
    // console.log(off);
    //nếu người dùng đã offline hoàn toàn ở các tab thì mới thông báo cho các người bạn của người dùng
    if (off === true) {
      
      socket.to(friendsList).emit("offline-user", _id);
    }
  });

  //khi bị lỗi
  socket.on("error", (err) => {
    console.log(err);
  });
});



app.use((req, res, next) => {
  res.locals.io = io;
  next();
});

//điều hướng đến router để xử lý path
app.use(router);

//kết nối db và lắng nghe port
mongoose.connect(
  MONGODB_URL,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err) => {
    if (err) {
      console.log(err);
      return;
    }
    httpServer.listen(PORT, () => {
      console.log("Connecting to " + PORT);
    });
  }
);
