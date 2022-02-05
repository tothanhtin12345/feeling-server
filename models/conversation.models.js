const mongoose = require("mongoose");

const schema = mongoose.Schema;

const conversationSchema = schema(
  {
      //tên của cuộc thoại - chỉ có nếu cuộc hội thoại thuộc dạng group
    displayName: String,
    //những người tham gia
    users: [{ type: schema.Types.ObjectId, ref: "User" }],
    //kiểu cuộc hội thoại - cá nhân (giữa 2 người) - nhóm (cá nhiều người tham gia)
    type: {
      type: String,
      enum: ["individual", "group"],
    },
    //số lượng tin nhắn
    messageCount: {
      type: Number,
      default: 0,
    },
    //tin nhắn cuối cùng
    lastMessage: {
      type: schema.Types.ObjectId,
      ref: "Message",
    },
    //ai đã xem tin nhắn cuối cùng
    read: [{ type: schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Conversation", conversationSchema);
