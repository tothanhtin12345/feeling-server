const createError = require("http-errors");

const MessageModel = require("../../models/message.models");

//lấy một message theo _id và nó ở trong phòng người dùng có tham gia

module.exports.checkMessage = async (req, res, next) => {
  try {
    const { messageId } = req.body;
    const { _id: userId } = req.user;
    if (!messageId) {
      return next(createError(400, "ERROR_MESSAGE_ID_NOT_FOUND"));
    }

    const message = await MessageModel.findOne({ _id: messageId }).populate({
      path: "conversation",
      select: "users",
    });

    if (!message) {
      return next(createError(404, "ERROR_MESSAGE_NOT_FOUND"));
    }

    //nếu người dùng không có liên quan gì đến  tin nhắn => không hợp lệ
    if (!message.conversation.users.includes(userId)) {
      return next(createError(401, "ERROR_MESSAGE_CAN_NOT_BE_DELETE"));
    }

    res.locals.message = message;
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
