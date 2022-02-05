//code của mình
const ConversationModel = require("../../models/message.models");
const { getConversation } = require("./conversation.controller.socket");
const { createMessage } = require("../../routes/message/message.methods");

//hàm dùng socket để join vào một conversation _id - và phía client socket sẽ nhận được các thông tin liên quan
module.exports.joinConversation = async (socket, { conversationId }) => {
  const userId = socket.user._id;
  //lấy ra conversation
  const conversation = await getConversation({
    filter: {
      _id: conversationId,
      users: { $in: [userId] },
    },
    select: "_id",
  });
  //nếu có conversation => người dùng có tham gia vào conversation và conversation có tồn tại
  //nên join socket vào room có conversation Id
  if (conversation) {
    socket.join(conversationId);
  }
};

//dùng một socket rời khỏi room
module.exports.leaveConversation = (socket, { conversationId }) => {
  socket.leave(conversationId);
};

module.exports.sendMessage = async (
  socket,
  io,
  //fakeId: dùng để trả lại cho người gửi - để xử lý loading tin nhắn
  { conversationId, text, type, fakeId },
  errorCallback
) => {
  
  try {
    const userId = socket.user._id;
    //lấy ra conversation
    const conversation = await getConversation({
      filter: {
        _id: conversationId,
        users: { $in: [userId] },
      },
    });
    if (!conversation) {
      throw new Error("Không tìm thấy cuộc trò chuyện");
    }

    //tạo message

    const message = await createMessage({
      owner: userId,
      type,
      text,
      conversation: conversationId,
    });
    //set lại lastMessage và read cho conversation;
    conversation.lastMessage = message._id;
    conversation.read = [userId]; // ta thêm người đọc đầu tiên nhắn đầu tiên này chính là người gửi
    conversation.save();

    //bắn lại một conversation với tin nhắn cuối cho tất cả người dùng - nhưng sẽ khác một chút về dữ liệu giữa người gửi và người nhận
    const conversationData = {
      ...conversation._doc,
      //chưa đọc
      isRead: false,
      lastMessage: message,
    };
    //bắn conversation cho chính mình - set isRead: true bởi vì người gửi thì tất nhiên phải đọc tin nhắn cuối rồi
    socket.emit("update-conversation", { ...conversationData, isRead: true });
    conversationData.users.forEach((item) => {
      //bắn cho tất cả người dùng (ngoại trừ mình)
      socket
        .to(item._id.toString())
        .emit("update-conversation", conversationData);
    });

    //bắn lại message mới cho các người dùng đang join vào _id của phòng này
    //nếu dùng socket to thì người gửi không nhận được nên ta có thể dùng io và in - hai thằng này đều dành cho room
    io.in(conversationId).emit(`${conversationId}-new-message`, {
      ...message._doc,
      fakeId,
    });
  } catch (err) {
    if (errorCallback) errorCallback({ error: err.message, fakeId, loading: false });
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi gửi tin nhắn",
      message: err.message,
    });
    return;
  }
};
