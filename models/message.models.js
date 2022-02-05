const mongoose = require("mongoose");

const schema = mongoose.Schema;





const messageSchema = schema({
  owner: {
    type: schema.Types.ObjectId,
    ref: "User",
  },
  //thuộc cuộc thoại nào
  conversation:{
    type: schema.Types.ObjectId,
    ref: "Conversation",
  },
  //tin nhắn dạng text, url hoặc hệ thống
  type: {
    type: String,
    enum: ["text","url","system"],
    default: "text",
  },
  // file:{
  //   type: schema.Types.ObjectId,
  //   ref: "File",
  // },
  //dạng nội dung người dùng ghi hoặc là một url file
  text:{
    type:String,
  },
  //không hiển thị với ai (dành cho chức năng xóa tin nhắn)
  unDisplay: [
    {
      type: schema.Types.ObjectId,
      ref: "User",
    },
  ],
},{timestamps: true});


module.exports = mongoose.model("Message", messageSchema);
