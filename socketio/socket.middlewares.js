const { verifyToken } = require("../routes/auth/auth.methods");
const { getUser } = require("../routes/user/user.methods");
const UserModel = require("../models/user.models");
//midleware xác mịnh token cho socketio
module.exports.socketioAuth = async (socket, next) => {
  try {
    const access_token = socket.handshake.auth.access_token;
    //xác minh access_token lấy được userId từ access_token
    const verifyResult = verifyToken({ access_token });
    const { _id } = verifyResult.payload;
    //lấy user từ csdl
    const user = await UserModel.findById(_id)
      .populate({
        path: "avatar",
        populate: {
          path: "files",
        },
        select: "files",
      })
      .populate({
        path: "cover",
        populate: {
          path: "files",
        },
        select: "files",
      });

    if (!user) {
      //có thể bắn ra lỗi - lỗi sẽ được nhận ở sự kiện connect_error ở phía client
      next(new Error("ERROR_USER_NOT_FOUND"));
    }

    //gắn access_token và user vào socket
    socket.access_token = access_token;
    socket.user = user;
    //xử lý kiểm tra token
    next();
  } catch (err) {
    console.log(err);
    next(new Error(err.message || "ERROR_UNDEFINED"));
  }
};
