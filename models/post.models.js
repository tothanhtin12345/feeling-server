const mongoose = require("mongoose");

const schema = mongoose.Schema;

const postSchema = schema(
  {
    //quyền riêng tư của bài viết
    privacy: {
      type: String,
      enum: ["groups", "public"],
      default: "public",
    },
    type: {
      type: String,
      enum: ["individual", "share", "groups", "system", "groups-system"],
      default: "individual",
    },

    owner: {
      type: schema.Types.ObjectId,
      ref: "User",
    },
    //sẽ có khi bài viết là thuộc dạng system
    title: String,
    content: {
      type: String,
      default: "",
    },
    tags: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    files: [
      {
        type: schema.Types.ObjectId,
        ref: "File",
      },
    ],

    //group mà bài viết thuộc về - sẽ có nếu type bài viết là groups
    group: {
      type: schema.Types.ObjectId,
      ref: "Group",
    },

    //bài viết được share - sẽ có nếu type bài viết là share
    sharedPost: {
      type: schema.Types.ObjectId,
      ref: "Post",
    },

    comments: [
      {
        type: schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    commentCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        owner: { type: schema.Types.ObjectId, ref: "User" },
        emotion: {
          type: String,
          enum: ["like", "haha", "sad", "angry"],
        },
        likeAt: schema.Types.Date,
      },
    ],
    likeCount: {
      like: {
        type: Number,
        default: 0,
      },
      haha: {
        type: Number,
        default: 0,
      },
      sad: {
        type: Number,
        default: 0,
      },
      angry: {
        type: Number,
        default: 0,
      },
    },
    //những người đã share
    shares: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    shareCount: {
      type: Number,
      default: 0,
    },

    //những báo cáo về bài post
    reports: [
      {
        //nội dung báo cáo
        content: { type: String },
        //người báo cáo
        owner: { type: schema.Types.ObjectId, ref: "User" },
      },
    ],
    reportCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
