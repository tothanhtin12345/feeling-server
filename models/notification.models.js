const mongoose = require("mongoose");

const schema = mongoose.Schema;

const notificationSchema = schema(
  {
    //chủ nhân của thông báo
    owner: {
      type: schema.Types.ObjectId,
      ref: "User",
    },

    content: String,

    //friend_request
    //friend_accept
    //post_comment
    //post_like
    //post_tag
    //post_report
    //group_accept
    type: String,
    //liên kết để chuyên hướng khi nhấn vào thông báo
    //nó là một đường dẫn tương đối
    url: {
      type: String,
    },

    //từ người dùng nào ?
    fromUser: {
      type: schema.Types.ObjectId,
      ref: "User",
    },

    //từ group nào
    fromGroup: {
      type: schema.Types.ObjectId,
      ref: "Group",
    },

    forPost: {
      post: {
        type: schema.Types.ObjectId,
        ref: "Post",
      },
      //cho mục đích gì? like, share, comment, report
      forPurpose: {
        type: String,
        enum: ["share", "like", "comment", "report"],
      },
    },

    //đọc chưa ?
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
