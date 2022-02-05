const PostModel = require("../../models/post.models");
const UserModel = require("../../models/user.models");
const {
  createNotificationForPost,
} = require("../../routes/notification/notification.methods");

const getPost = async ({ filter, select }) => {
  const post = await PostModel.findOne(filter).select(select);
  return post;
};

module.exports.likePostHandler = async (
  socket,
  io,
  { postId, emotion, fromWhere, errorCallback }
) => {
  const { _id, avatar, informations } = socket.user;
  const filter = { _id: postId };
  const post = await getPost({ filter, select: "_id likes owner likeCount" });

  //xử lý lỗi
  if (!post) {
    if (errorCallback)
      errorCallback({ message: "Bài viết không tồn tại hoặc đã bị xóa" });
    socket.emit("error-chanel", {
      title: "Đã xảy ra lỗi khi thích bài viết",
      message: "Bài viết không tồn tại hoặc đã bị xóa",
    });
    return;
  }

 

  //lấy ra thông tin người dùng trong mảng likes

  let likeOwner = post.likes.find(
    (item) => item.owner.toString() === _id.toString()
  );

  let isLike;

  //kiểm tra thông tin người dùng đã tương tác với bài viết bao giờ chưa ?
  if (!likeOwner) {
    //nếu chưa tương tác thì cập nhật dữ liệu like mới với emotion
    post.likes.push({
      owner: _id,
      emotion,
      likeAt: new Date(),
    });
    isLike = true;
    post.likeCount[emotion] += 1;
  } else {
    //nếu rồi thì

    //nếu người dùng tương tác với emotion mới === emotion cũ ==> pull để hủy like
    if (likeOwner.emotion === emotion) {
      //xóa theo _id của cái like
      post.likes.pull({ _id: likeOwner._id });
      isLike = false;
      post.likeCount[emotion] -= 1;
    } else {
      //giảm count emotion cũ
      post.likeCount[likeOwner.emotion] -= 1;
      // nếu người dùng tương tác với emotion miows !=== emotion cũ ===> update lại emotion
      likeOwner.emotion = emotion;
      likeOwner.likeAt = new Date();
      isLike = true;
      
      //tăng count emotion mới
      post.likeCount[emotion] += 1;
    }
  }

  await post.save();
  // console.log(post);
  

  //emit lại cho người vừa like
  socket.emit(`${postId}-like-post`, {
    postId,
    emotion,
    isLike,
    fromWhere,
    likeCount: post.likeCount,
  });

  //emit lại cho những người đã fetch bài viết này
  socket.broadcast.emit(`${postId}-like-post`, {
    postId,
    emotion,
    fromWhere,
    likeCount: post.likeCount,
    anotherPerson: true,
  });

  // //emit một thông báo cho chủ nhân của bài viết (nếu chủ nhân đó không phải là mình và hành động like này là like chứ không phải unlike)

  if (post.owner.toString() === _id.toString() || isLike === false) {
    return;
  }

  let contentForNotification = "";
  let likeSum = 0;
  const likeCount = post.likeCount;
  const likeCountArrays = Object.entries(likeCount);

  likeCountArrays.forEach((item) => likeSum += item[1]);


  if (likeSum === 1) {
    contentForNotification = `<b>${informations.displayName}</b> đã thích bài viết của bạn`;
  } else if (likeSum > 1) {
    contentForNotification = `<b>${informations.displayName}</b> và ${
      likeSum - 1
    } người khác đã thích bài viết của bạn`;
  }

  const notification = await createNotificationForPost({
    user: {
      _id,
      avatar,
    },
    contactUser: {
      _id: post.owner,
    },
    content: contentForNotification,
    type: "post_like",
    url: `/post/details?_id=${post._id}`,
    postId: post._id,
    forPurpose: "like",
  });

  //tăng số lượng thông báo mới của người dùng được nhận thông báo lên
  const result = await UserModel.updateOne(
    { _id: post.owner },
    { $inc: { unReadNotificationCount: 1 } }
  );

  socket.broadcast.emit(`${post.owner}-like-post-notification`, {
    notification,
  });
};
