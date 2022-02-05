const createError = require("http-errors");
//code của mình
const ConversationModel = require("../../models/conversation.models");
const UserModel = require("../../models/user.models");
module.exports.getConversation = async (req, res, next) => {
  try {
    //lấy thông tin cơ bản của một conversation để thực hiện cho các phương thức sau
    const { conversationId } = req.body;
    const { _id: userId } = req.user;
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      users: { $in: [userId] },
    });

    if (!conversation) {
      return next(createError(404, "ERROR_CONVERSATION_NOT_FOUND"));
    }

    res.locals.conversation = conversation;
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//dựa vào một mảng _id người dùng ta sẽ lấy ra các thông tin cơ bản như informations avatar và _id
module.exports.getBasicUsers = async (req, res, next) => {
  try {
    //lấy thông tin cơ bản của một conversation để thực hiện cho các phương thức sau
    const { usersId } = req.body;

    if (!usersId || usersId.length <= 0) {
      return next(createError(404, "ERROR_USERS_CAN_NOT_FOUND"));
    }

    //tìm những người dùng có _id xuất hiện trong mảng usersId
    const users = await UserModel.find({ _id: { $in: usersId } })
      .populate({
        path: "avatar",
        populate: "files",
        select: "files",
      })
      .select("_id informations avatar");
    if (users.length <= 0) {
      return next(createError(404, "ERROR_USERS_CAN_NOT_FOUND"));
    }

    res.locals.users = users;
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
