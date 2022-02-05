const { countDocuments } = require("../../models/comment.models");
const CommentModel = require("../../models/comment.models");
const PostModel = require("../../models/post.models");
const UserModel = require("../../models/user.models");
const {
  createNotificationForPost,
  createNotificationForUser,
} = require("../../routes/notification/notification.methods");

const getPost = async ({ filter, select }) => {
  const post = await PostModel.findOne(filter).select(select);
  return post;
};

//add comment vào một bài post
module.exports.commentPostHandler = async (
  socket,

  { text, postId, fromWhere }
) => {
  const post = await getPost({
    filter: { _id: postId },
    select: "_id comments commentCount owner",
  });
  if (!post) {
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi bình luận bài viết",
      message: "Bài viết không tồn tại hoặc đã bị xóa",
    });
    return;
  }
  const { _id, avatar, informations, role } = socket.user;

  const comment = CommentModel({ text, owner: _id, post: postId });
  await comment.save();

  //thêm comment vào bài post
  post.comments.unshift(comment._id);
  post.commentCount += 1;

  await post.save();

  const owner = {
    _id,
    avatar,
    informations,
  };

  //bắn cho người dùng vừa comment
  socket.emit(`${post._id}-comment-post`, {
    comment: {
      ...comment._doc,
      //có phải chủ nhân của comment không ?
      isOwner: true,
      //người dùng hiện tại có phải là admin không
      isAdmin: role === "admin",
      owner,
    },
    fromWhere,

    postId,
  });

  //bắn cho những người dùng đang bật socket theo dõi bài post
  socket.broadcast.emit(`${post._id}-comment-post`, {
    comment: {
      ...comment._doc,
      //có phải chủ nhân của comment không ?
      isOwner: false,

      owner,
    },
    fromWhere,

    postId,
  });

  // //tạo thông báo để gửi cho chủ nhân bài viết - nếu chủ nhân bài viết không phải là mình
  if (post.owner.toString() === _id.toString()) {
    return;
  }

  // ta sẽ tạo ra một thông báo mà không cân thiết phải cộng dồn - ai comment thì chỉ đích danh người đó ra luôn
  // const notification = await createNotificationForPost({
  //   user: {
  //     _id,
  //     avatar,
  //   },
  //   contactUser: {
  //     _id: post.owner,
  //   },
  //   content: contentForNotification,
  //   type: "post_comment",
  //   url: `post/details?_id=${post._id}&commentId=${comment._id}`,
  //   postId: post._id,
  //   forPurpose: "comment",
  // });

  const notification = await createNotificationForUser({
    user: {
      _id,
      avatar,
    },
    contactUser: {
      _id: post.owner,
    },
    content: `<b>${informations.displayName}</b> đã bình luận về bài viết của bạn`,
    type: "post_comment",
    url: `/post/details?_id=${post._id}&commentId=${comment._id}`,
  });

  //tăng số lượng thông báo mới của người dùng được nhận thông báo lên
  const result = await UserModel.updateOne(
    { _id: post.owner },
    { $inc: { unReadNotificationCount: 1 } }
  );

  socket.broadcast.emit(`${post.owner}-comment-post-notification`, {
    notification,
  });
};
//delete comment
module.exports.deleteCommentHandler = async (
  socket,
  { commentId, fromWhere },
  errorCallback
) => {
  const comment = await CommentModel.findOne({ _id: commentId });

  

  if (!comment) {
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi xóa bình luận",
      message: "Bình luận không tồn tại hoặc đã bị xóa",
    });
    
    errorCallback()
    return;
  }

  const { post, owner } = comment;
  const { role, _id } = socket.user;
  //kiểm tra xem - nếu người dùng là chủ comment hoặc người dùng hiện tại là admin thì mới cho phép thực hiện xóa
  //nếu không thì báo lỗi
  if (!_id.toString() === owner && !role === "admin") {
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi xóa bình luận",
      message: "Bạn không thể xóa bình luận này",
    });
    errorCallback()
    return;
  }

  //xóa comments trong csdl
  await CommentModel.findOneAndDelete({ _id: commentId });
  //xóa comments và giảm count trong bài post
  await PostModel.updateOne(
    { _id: post },
    { $pull: { comments: commentId }, $inc: { commentCount: -1 } }
  );

  //bắn cho người dùng vừa xóa comment
  socket.emit(`${post._id}-delete-comment-post`, {
    commentId,
    postId: post,
    fromWhere,
  });

  //bắn cho những người dùng đang bật socket theo dõi bài post
  socket.broadcast.emit(`${post._id}-delete-comment-post`, {
    commentId,
    postId: post,
    fromWhere,
  });
};

//edit comment
module.exports.editCommentHandler = async (socket,{commentId,text,fromWhere}, errorCallback, editCommentSuccess) => {
  const comment = await CommentModel.findOne({ _id: commentId });

  if (!comment) {
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi thực hiện chỉnh sửa bình luận",
      message: "Bình luận không tồn tại hoặc đã bị xóa",
    });
    errorCallback()
    return;
  }
  //post: đang ở dạng _id chưa populate
  const { post, owner } = comment;
  const {  _id } = socket.user;
  //kiểm tra xem - nếu người dùng là chủ comment thì mới cho chỉnh sửa
  //nếu không thì báo lỗi
  if (!_id.toString() === owner) {
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi thực hiện chỉnh sửa bình luận",
      message: "Bạn không thể chỉnh sửa bình luận này",
    });
    errorCallback()
    return;
  }

  //cập nhật nội dung comment mới
  comment.text = text;

  await comment.save();

  

  //bắn lại cho người dùng vừa comment
  socket.emit(`${post.toString()}-edit-comment-post`,{commentId, postId: post, text, fromWhere});

  //gọi hàm xử lý thành công
  editCommentSuccess()

}