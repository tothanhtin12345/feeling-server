//code của mình
const ConversationModel = require("../../models/conversation.models");
const { createMessage } = require("../message/message.methods");
//tạo một cuộc hội thoại

//kiểm tra sự tồn tại của một cuộc hội thoại - thường dùng cho cuộc hội cá nhân giữa 2 người
module.exports.isExistConversation = async ({ filter }) => {
  const conversation = await ConversationModel.findOne(filter).select("_id");
  if (conversation) {
    return true;
  }
  return false;
};

//startText: một tin nhắn để mở đầu cho conversation
module.exports.createConversation = async ({
  displayName,
  type,
  users,
  startText = "Hãy bắt đầu cuộc trò chuyện đi nào",
}) => {
  const conversation = new ConversationModel({ type, users, displayName });

  //tạo một message kiểu hệ thống cho cuộc trò chuyện
  const message = await createMessage({
    conversation: conversation._id,
    type: "system",
    text: startText,
  });

  //thêm các thông tin về message hệ thống mới tạo vào trong cuộc hội thoại
  // conversation.messageCount += 1; //không dùng đến
  conversation.lastMessage = message._id;

  //lưu lại
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
    .populate({
      path: "lastMessage",
    })
    .execPopulate();

  return conversation;
};

//fetch conversations
module.exports.fetchConversations = async ({
  skip = 0,
  limit = 10,
  select = "",
  filter,
  userId,
  sort = { updatedAt: -1 },
}) => {
  const conversations = await ConversationModel.find(filter)
    .populate({
      path: "users",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar informations",
    })
    .populate({
      path: "read",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar informations",
    })
    .populate({
      path: "lastMessage",
      populate: {
        path: "owner",
        populate: {
          path: "avatar",
          populate: "files",
          select: "files",
        },
        select: "_id avatar informations",
      },
    })
    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    .sort(sort)
    .select(select);

  //xét từng conversation xem người dùng đã đọc tin nhắn cuối cùng chưa ?
  const conversationsResult = [];
  conversations.forEach((item) => {
    let isRead = false;
    //nếu _id người dùng không nằm trong mảng read => người dùng chưa đọc tin nhắn cuối cùng
    const userIndex = item.read.findIndex(
      (f) => f._id.toString() === userId.toString()
    );
    if (userIndex >= 0) {
      isRead = true;
    }
    conversationsResult.push({
      ...item._doc,
      isRead,
    });
  });
  return conversationsResult;
};

module.exports.getConversationDetails = async ({ filter, select = "" }) => {
  const conversation = await ConversationModel.findOne(filter)
    .populate({
      path: "users",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar informations",
    })
    .populate({
      path: "read",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar informations",
    })
    .select(select);
  return conversation;
};
