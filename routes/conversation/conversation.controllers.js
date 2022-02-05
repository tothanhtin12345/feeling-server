const createError = require("http-errors");

//code của mình
const {
  fetchConversations,
  getConversationDetails,
  createConversation,
} = require("./conversation.methods");
const { fetchMessages, createMessage } = require("../message/message.methods");
const ConversationModel = require("../../models/conversation.models");
const { fetchFriendsWithConversation } = require("../user/user.methods");
module.exports.fetchConversationsHandler = async (req, res, next) => {
  try {
    //dùng id của người dùng để lấy các conversations của người dùng
    const { _id: userId } = req.user;
    const { skip, limit, type, updatedAt = -1, } = req.query;

    

    let filter = { users: { $in: [userId.toString()] } };

    if(type){
      filter = {
        ...filter,
        type,
      }
    }

    const conversations = await fetchConversations({
      skip,
      limit,
      filter,
      userId,
      //ta có thể hiểu là sort : {updatedAt: updatedAt (nghĩa là = giá trị nào đó, ví dụ -1)}
      sort:{updatedAt}
    });

    return res.status(200).json({
      conversations,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//cùng là fetch - nhưng chưa có thêm giá trị để search - và xử lý giá trị này sẽ hơi phức tạp
module.exports.fetchConversationsByValueHandler = async (req, res, next) => {
  try {
    //dùng id của người dùng để lấy các conversations của người dùng
    const { _id: userId } = req.user;
    const { skip, limit, displayName = "" } = req.query;

    //lấy 10 conversation dạng invidual có liên quan đến displayName và user
    const individualConversations = await fetchFriendsWithConversation({
      userId,
      skip,
      limit,
      displayName,
    });

    //lấy 10 conversation dạng group có liên quan đến displayName và user
    const groupConversations = await fetchConversations({
      filter: {
        type: "group",
        users: { $in: [userId] },
        displayName: { $regex: displayName },
      },
      skip,
      limit,
      select: "_id users displayName",
      userId,
    });

    return res.status(200).json({
      individualConversations,
      groupConversations,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.getConversationDetailsHandler = async (req, res, next) => {
  try {
    const {
      skip: messagesSkip,
      limit: messagesLimit,
      conversationId,
    } = req.query;

    const { _id } = req.user;
    const userId = _id;

    //đầu tiên là lấy dữ liệu chi tiết conversation ra trước
    const conversation = await getConversationDetails({
      //lấy conversation theo id và theo thông tin người dùng đang ở trong phòng
      filter: { _id: conversationId, users: { $in: [userId] } },
    });
    if (!conversation) {
      return next(createError(404, "ERROR_CONVERSATION_NOT_FOUND"));
    }
    //lấy thêm các messages dựa vào các trị skip và limit và thông tin của conversation
    const messages = await fetchMessages({
      filter: {
        conversation: conversationId,
        //trường hợp mà mình đã xóa (hay nói cách khác là ẩn) tin nhắn thì sẽ không lấy lại tin nhắn này
        unDisplay: { $nin: [userId] },
      },
      skip: messagesSkip,
      limit: messagesLimit,
    });
    return res.status(200).json({
      conversation,
      messages,
    });
  } catch (err) {
    console.log(err.message);
    if (err.message.includes("Cast to ObjectId failed")) {
      return next(createError(404, "ERROR_CONVERSATION_NOT_FOUND"));
    }
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.getUnreadHandler = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    //Lấy những phòng mình đã tham gia nhưng mà mình chưa đọc tin nhắn
    const unread = await ConversationModel.find({
      users: { $in: [userId.toString()] },
      read: { $nin: [userId.toString()] },
    }).select("_id");
    return res.status(200).json({
      unread,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.createGroupChatHandler = async (req, res, next) => {
  try {
    const { usersId, displayName } = req.body;
    const { informations, _id } = req.user;

    //thêm bản thân mình vào nhóm chat
    usersId.push(_id.toString());

    const conversation = await createConversation({
      displayName,
      type: "group",
      users: usersId,
      startText: `${informations.displayName} đã tạo nhóm chat`,
    });

    //dùng socket để bắn phòng mới này cho các users có trong phòng
    res.locals.io.in(usersId).emit(`new-conversation`, conversation);

    return res.status(200).json({
      message: "SUCCESS_CREATE_GROUP_CHAT",
      code: "SUCCESS_CREATE_GROUP_CHAT",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.inviteMembersHandler = async (req, res, next) => {
  try {
    //lấy ra _id những người dùng muốn theem
    //users: hiện tại là một mảng _id
    const { conversation, users } = res.locals;
    const { informations } = req.user;

    //mảng của những users id mới được thêm - dành để tương tác socket
    const usersIdAdded = [];

    //kiểm tra xem người dùng đã có trong nhóm chat chưa rồi mới thêm
    users.forEach((item) => {
      const userId = item._id.toString();
      //nếu chưa có
      if (!conversation.users.includes(userId)) {
        conversation.users.push(userId);
        usersIdAdded.push(userId);
      }
    });

    //nếu không có ai được thêm thì trả về cho người dùng biết
    //thành công nhưng không có kết quả
    if (usersIdAdded.length <= 0) {
      return res.status(200).json({
        message: "SUCCESS_NO_ONE_ADDED",
        code: "SUCCESS_NO_ONE_ADDED",
      });
    }

    //nếu có người mới được thêm vào thì ta sẽ tạo ra tin nhắn hệ thống mới
    //và thêm vào conversation
    let systemText = `${informations.displayName} đã thêm`;
    users.forEach((item, index) => {
      if (users.length >= 2 && index === users.length - 1) {
        systemText += " và";
      } else if (index !== 0) {
        systemText += ",";
      }
      systemText += ` ${item.informations.displayName}`;
    });
    const lastMessage = await createMessage({
      type: "system",
      conversation: conversation._id,
      text: systemText,
    });

    conversation.lastMessage = lastMessage._id;
    //do người dùng hiện tại là người mời, nên ta thêm đã đọc là id người mời vào
    conversation.read = [];
    //lưu lại - và populate thêm users
    await conversation.save();
    await conversation
      .populate({
        path: "users",
        populate: {
          path: "avatar",
          populate: "files",
          select: "files",
        },
        select: "_id avatar informations",
      })
      .execPopulate();

    const conversationData = {
      ...conversation._doc,
      lastMessage: lastMessage._doc,
    };

    //bắn socket cập nhật phòng cho những người dùng có tham gia phòng chat - bao gồm người mới
    //việc update ở client sẽ tự thêm nếu người dùng chưa có dữ liệu về phòng này

    conversation.users.forEach((item) => {
      res.locals.io.in(item._id.toString()).emit("update-conversation", {
        ...conversationData,

        isRead: false,
      });
    });

    //bắn socket thành viên mới để những người đang tham gia phòng có thể nhận được - có kèm theo cả tin nhắn hệ thống
    // và danh sách người dùng (đã populate)
    res.locals.io
      .in(conversation._id.toString())
      .emit(`${conversation._id.toString()}-new-members`, {
        lastMessage,
        users,
      });

    return res.status(200).json({
      message: "SUCCESS_INVITE_MEMBERS_GROUP_CHAT",
      code: "SUCCESS_INVITE_MEMBERS_GROUP_CHAT",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.getConversationIdForEachUserHandler = async (req, res, next) => {
  try {
    const { usersId } = req.body;
    const { _id: userId } = req.user;

    //thay vì làm mảng - ta dùng một object - với mỗi key là _id của bạn mình
    //để ở phía client lấy ra dễ dàng hơn
    const result = {};

    for (let i = 0; i < usersId.length; i++) {
      const friendId = usersId[i];
      const { _id: conversationId } = await getConversationDetails({
        filter: {
          type: "individual",
          users: { $all: [userId, friendId] },
        },
      });

      result[friendId] = conversationId;
    }

    //kết quả trả về là một object - với mỗi phần tử có key là _id của người dùng bạn mình
    // và giá trị conversationId tương ứng giữa mình và bạn mình
    return res.status(200).json({
      usersIdWithConversationId: result,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
