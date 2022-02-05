const ConversationModel = require("../../models/conversation.models");
const { createMessage } = require("../../routes/message/message.methods");

//lấy một conversation
module.exports.getConversation = async ({ filter, select }) => {
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
      path: "lastMessage",
    })

    .select(select);

  return conversation;
};

//xử lý khi người dùng đọc tin nhắn cuối cùng của conversations
module.exports.readLastMessageHandler = async (
  socket,
  io,
  { conversationId },
  errorCallback
) => {
  //lấy ra thông tin của mình
  const { _id, avatar, informations } = socket.user;

  console.log(informations);

  //lấy ra cái conversation được đọc
  const conversation = await this.getConversation({
    //tìm conversation theo _id và nhất định là người dùng đã tham gia ở trong đó mới tính
    filter: { _id: conversationId, users: { $in: [_id] } },
    select: "_id read",
  });
  if (!conversation) {
    if (errorCallback)
      errorCallback({ message: "Không tìm thấy cuộc trò chuyện" });
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi đọc tin nhắn của cuộc hội thoại",
      message: "Không tìm thấy cuộc trò chuyện",
    });
    return;
  }

  //nếu trong mảng read không có thông tin của người dùng (nghĩa là chưa đọc) thì ta mới thực hiện cập nhật dữ liệu thành đọc
  if (conversation.read.includes(_id)) return;
  conversation.read.push(_id);
  //ta cập nhật người đọc mà không cần phải cập nhật lại timestamps
  await conversation.save({ timestamps: false });

  //bắn lại socket đến người dùng đọc để cập nhật dữ liệu
  socket.emit("read-last-message", { isRead: true, _id: conversationId });
  //bắn lại socket đến những người dùng đang ở trong phần chi tiết của cuộc hội thoại này
  //để cho họ biết là người dùng hiện tại đã đọc tin nhắn (sẽ làm sau khi đã hoàn thành chức năng mở cuộc hội thoại chi tiết)
  io.in(conversationId).emit(`${conversationId}-seen-message`, {
    _id,
    avatar,
    informations,
  });
};

//xử lý một người rời khỏi phòng
module.exports.outConversationHandler = async (
  socket,
  conversationId,
  callback
) => {
  try {
    const { _id: userId, informations } = socket.user;

    const conversation = await this.getConversation({
      filter: { _id: conversationId },
      select: "",
    });

    if (!conversation) {
      throw new Error("Không tìm thấy cuộc trò chuyện");
    }

    const lastMessage = await createMessage({
      
      conversation: conversationId,
      type: "system",
      text: `${informations.displayName} đã rời khỏi cuộc trò chuyện`,
    });
    conversation.users.pull(userId);
    conversation.lastMessage = lastMessage._id;
    conversation.read = [];
    await conversation.save();

    //trả về một conversation để upadate cho các người dùng trong phòng - ngoại trừ người dùng hiện tại
    socket.broadcast
      .to(conversationId)
      .emit("update-conversation", { ...conversation._doc, lastMessage, isRead: false });

    //bắn về sự kiện member-out với _id người vừa out và lastMessage
    socket.broadcast
      .to(conversationId)
      .emit(`${conversationId}-out-member`, { userId, lastMessage });
    //gọi hàm thực hiện thành công

    //thực hiện xóa conversation bên phần danh sách của người dùng vừa out
    socket.emit("delete-conversation",conversationId);

    callback({});
  } catch (err) {
    if (callback) {
      callback({ errorMessage: err.message });
    }
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi rời khỏi nhóm chat",
      message: err.message,
    });
  }
};
