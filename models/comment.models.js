const mongoose = require("mongoose");

const schema = mongoose.Schema;

const commentSchema = schema(
  {
    text: String,
    //chủ nhân của comment
    owner: {
      type: schema.Types.ObjectId,
      ref: "User",
    },
    //thuộc về bài post nào
    post: {
      type: schema.Types.ObjectId,
      ref: "Post",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Comment", commentSchema);
