const mongoose = require("mongoose");

const schema = mongoose.Schema;

const groupSchema = schema(
  {
    //tên nhóm
    informations: {
      displayName: String,
      //mô tả về nhóm
      description: String,
    },

    //ảnh bìa của nhóm
    cover: {
      type: mongoose.Types.ObjectId,
      ref: "Post",
    },

    //các thành viên trong nhóm
    members: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],

    //members count
    memberCount: {
      type: Number,
      default: 0,
    },

    //các người dùng đang chờ xác nhận
    requestedMembers: [
      {
        _id: { type: schema.Types.ObjectId, ref: "User" },
        requestedAt: {
          type: Date,
          default: new Date(),
        }
      },
    ],

    //requested member count
    requestedMemberCount: {
      type: Number,
      default: 0,
    },
    //chủ nhóm
    groupOwner: { type: schema.Types.ObjectId, ref: "User" },

    //các quản lý nhỏ
    inspectors: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Group", groupSchema);
