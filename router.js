//các gói dữ liệu
const router = require("express").Router();

//các phần file code tự tạo

//import trước các file model để hệ thống chạy chúng và có thể dùng cho toàn bộ app
//nếu không thêm thì có thể code sẽ bị lỗi do không nhận biết được model

require("./models/conversation.models");
require("./models/user.models");
require("./models/message.models");
require("./models/notification.models");
require("./models/comment.models");

const authRoute = require("./routes/auth/auth.routes");
const userRoute = require("./routes/user/user.routes");

const fileRoute = require("./routes/file/file.routes");
const postRoute = require("./routes/post/post.routes");
const notificationRoute = require("./routes/notification/notification.routes");
const conversationRoute = require("./routes/conversation/conversations.routers");
const messageRoute = require("./routes/message/message.routes");
const groupRoute = require("./routes/group/group.routes");
const searchRoute = require("./routes/search/search.routes");
const managerRoute = require("./routes/manager/manager.routes");

const {
  getAccessToken,
  isValidAccessToken,
} = require("./routes/auth/auth.middlewares");

router.use((req, res, next) => {
  console.log("check body value");
  console.log(req.body);
  next();
});

//route cho auth
router.use("/auth", authRoute);

//phần route bên dưới đây yêu cầu phải có token và token phải hợp lệ
router.use(getAccessToken, isValidAccessToken);

//route cho user
router.use("/user", userRoute);

//router liên quan đến file (upload, delete,...)
router.use("/file", fileRoute);

//router liên quan đến post
router.use("/post", postRoute);

//router liên quan đến notification
router.use("/notification", notificationRoute);

//router liên quan đến conversation
router.use("/conversation", conversationRoute);

//router liên quan đến message
router.use("/message", messageRoute);

//router liên quan đến group
router.use("/group", groupRoute);

//router liên quan đến search
router.use("/search",searchRoute)

//router liên quan đến manager
router.use("/manager",managerRoute);

//vào đây thì bị lỗi
router.use((err, req, res, next) => {
  console.log("handle err");

  //nếu message của lỗi có noijio dung như dưới thì set lại cho nó một nội dung phù hợp
  if (
    err.message.includes("Cast to ObjectId failed") ||
    err.message.includes("ERROR_NOT_FOUND")
  ) {
    err.message = "ERROR_NOT_FOUND";
    err.status = 404;
  }

  const message = err.message || "ERROR_UNDEFINED";
  const code = err.message || "ERROR_UNDEFINED";
  const status = err.status || 500;
  console.log(message, status);
  return res.status(status).json({
    message,
    code,
  });
});

module.exports = router;
