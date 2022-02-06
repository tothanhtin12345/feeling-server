const createError = require("http-errors");
const bcrypt = require("bcrypt");

const {
  checkIsFriend,
  checkIsFriendRequested,
  addFriendRequest,
  cancelFriendRequested,
  cancelFriendSent,
  acceptFriend,
  cancelFriend,
  followUser,
  unFollowUser,
  fetchFriendsSubdocuments,
  fetchFriends,
  fetchFriendsWithConversation,
  getUserForList,
} = require("./user.methods");

const UserModel = require("../../models/user.models");
const FileModel = require("../../models/file.models");
const PostModel = require("../../models/post.models");
const {
  createNotificationForUser,
} = require("../notification/notification.methods");

const {
  isExistConversation,
  createConversation,
} = require("../conversation/conversation.methods");

const {
  getFile,
  removeFile,
  removeFileFromDB,
} = require("../file/file.methods");
const { getPost } = require("../post/post.methods");

//cập nhật thông tin cá nhân
module.exports.updateUserInformationHandler = async (req, res, next) => {
  try {
    let user = req.user;
    const {
      displayName,
      birthday = "",
      numberphone = "",
      gender,
      homeAddress = "",
      workAddress = "",
    } = req.body;
    let newInformation = {
      displayName,
      birthday,
      numberphone,
      gender,
      homeAddress,
      workAddress,
    };

    await UserModel.findOneAndUpdate(
      { _id: user._id },
      { informations: newInformation }
    );

    //trả về các dữ liệu ta mới vừa cập nhật - kèm một tin nhắn
    return res.status(200).json({
      message: "SUCCESS_UPDATE_INFORMATION",
      code: "SUCCESS_UPDATE_INFORMATION",
      informations: newInformation,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//cập nhật ảnh đại diện
module.exports.updateAvatarHandler = async (req, res, next) => {
  try {
    const user = req.user;
    const { imagePost } = res.locals;
    //lưu thông tin ảnh đại diện vào
    user.avatar = imagePost._id;

    await user.save();

    //lấy ra lại thông tin avatar mới
    await user
      .populate({ path: "avatar", populate: "files", select: "files" })
      .execPopulate();

    imagePost._doc.owner.avatar = user.avatar;

    //trả về image post có hình đại diện vừa mới cập nhật
    return res.status(200).json({
      imagePost: {
        ...imagePost._doc,
        isOwner: true,
      },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//cập nhật ảnh bìa
module.exports.updateCoverHandler = async (req, res, next) => {
  try {
    const user = req.user;
    const { imagePost } = res.locals;
    //lưu thông tin ảnh đại diện vào
    user.cover = imagePost._id;

    await user.save();

    //trả về image post có hình đại diện vừa mới cập nhật
    return res.status(200).json({
      imagePost: {
        ...imagePost._doc,
        isOwner: true,
      },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy chi tiết một user
module.exports.getUserDetailsHandler = async (req, res, next) => {
  try {
    const { userId: _id } = req.query;

    const populateSelect = "-comments -likes -shares";

    let userDetails = await UserModel.findOne({ _id })
      .populate({
        path: "avatar",
        populate: "files",
        select: populateSelect,
      })
      .populate({
        path: "cover",
        populate: "files",
        select: populateSelect,
      })
      .select(
        "-password -refresh_token -verification_code -friends -followers -friend_requested -friend_sent"
      );

    if (!userDetails) {
      return createError(404, "ERROR_USER_NOT_FOUND");
    }

    const userDetailsId = userDetails._id;
    //lấy ra user hiện tại
    const user = req.user;
    let isCurrentUser = (isFriend = isFollow = isSent = isRequested = false);

    //kiểm tra xem các thông tin sau
    if (userDetailsId.toString() === user._id.toString()) {
      isCurrentUser = true;
    } else {
      //có phải bạn không ?
      isFriend = user.friends.includes(userDetailsId);
      //có phải đang theo dõi người ta không ?
      isFollow = user.following.includes(userDetailsId);
      //có phải đang yêu cầu kết bạn với người ta không ?
      isSent = user.friend_sent.includes(userDetailsId);
      //có phải người ta đã gửi yêu cầu kết bạn với mình không ?
      isRequested = user.friend_requested.includes(userDetailsId);
    }
    userDetails._doc = {
      ...userDetails._doc,
      isCurrentUser,
      isFriend,
      isFollow,
      isSent,
      isRequested,
    };

    return res.status(200).json({
      user: userDetails._doc,
    });
  } catch (err) {
    console.log(err);
    let errMessage = err.message.includes("Cast to ObjectId failed")
      ? "ERROR_USER_NOT_FOUND"
      : err.message;
    return next(createError(500, errMessage || "ERROR_UNDEFINED"));
  }
};

//xử lý thay đổi mật khẩu
module.exports.changePasswordHandler = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    //ta lấy ra mật khẩu trong csdl
    const user = await UserModel.findOne({ _id: req.user._id }).select(
      "_id password method"
    );

    if (user.method === "Google") {
      return next(createError(400, "ERROR_CHANGE_PASSWORD_NOT_SUPPORTED"));
    }

    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return next(createError(400, "ERROR_PASSWORD_NOT_SAME"));
    }
    const newPasswordBcrypt = bcrypt.hashSync(newPassword, 12);
    user.password = newPasswordBcrypt;
    await user.save();
    return res.status(200).json({
      code: "SUCCESS_CHANGE_PASSWORD",
      message: "SUCCESS_CHANGE_PASSWORD",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//cập nhật cài đặt tường nhà
module.exports.updateUserConfigHandler = async (req, res, next) => {
  try {
    const { user } = req;

    const newConfig = ({
      showFollowerCount,
      showBirthday,
      showNumberphone,
      showWorkAddress,
      showHomeAddress,
    } = req.body);

    user.userConfig = {
      ...newConfig,
    };
    await user.save();

    return res.status(200).json({
      userConfig: user.userConfig,
      message: "SUCCESS_UPDATE_USER_CONFIG",
      code: "SUCCESS_UPDATE_USER_CONFIG",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu kết bạn
module.exports.sendFriendRequestHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    if (checkIsFriend({ user, contactUser })) {
      return next(createError(400, "ERROR_IS_FRIEND"));
    }

    //nếu người kia đã gửi lời mời rồi thì thông báo lỗi
    if (contactUser.friend_sent.includes(user._id)) {
      return next(createError(400, "ERROR_FRIEND_REQUEST_HAS_ALREADY"));
    }
    //ngược lại thì thực hiện gửi lời mời kết bạn như thông thường
    else {
      //hàm này thực hiện thêm dữ liệu và save lại luôn
      await addFriendRequest({ user, contactUser });
    }

    //tạo ra một notification - dạng cho user - nghĩa là có thông tin fromUser
    //thông báo này được tạo ra đã vào user và contactUser để thêm thông tin cho fromUser
    //và trả lại đây
    const notification = await createNotificationForUser({
      user,
      contactUser,
      content: `<b>${user.informations.displayName}</b> đã gửi một lời mời kết bạn`,
      type: "friend_request",
      url: `/wall/${user._id}`,
    });

    //tăng số lượng thông báo chưa đọc lên cho contactUser
    contactUser.unReadNotificationCount += 1;

    await user.save();
    await contactUser.save();

    let requestedUser = await getUserForList({
      filter: { _id: user._id },
    });
    requestedUser.isRequested= true
    

    res.locals.io.emit(`${contactUser._id.toString()}-friend-request`, {
      fromId: user._id,
      notification: notification._doc,
      requestedUser,
    });

    return res.status(200).json({
      message: "SUCCESS_SEND_FRIEND_REQUEST",
      code: "SUCCESS_SEND_FRIEND_REQUEST",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu hủy kết bạn mà người ta đã gửi cho mình
module.exports.cancelFriendRequestHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    await cancelFriendRequested({ user, contactUser });
    await user.save();
    await contactUser.save();

    res.locals.io.emit(`${contactUser._id.toString()}-cancel-friend-request`, {
      fromId: user._id,
      userSentId: user._id,
    });

    return res.status(200).json({
      message: "SUCCESS_CANCEL_FRIEND_REQUESTED",
      code: "SUCCESS_CANCEL_FRIEND_REQUESTED",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu hủy kết bạn mà mình đã gửi cho người ta
module.exports.cancelFriendSentHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    await cancelFriendSent({ user, contactUser });
    await user.save();
    await contactUser.save();

    res.locals.io.emit(`${contactUser._id.toString()}-cancel-friend-sent`, {
      fromId: user._id,
      userRequestId: user._id,
    });

    return res.status(200).json({
      message: "SUCCESS_CANCEL_FRIEND_SENT",
      code: "SUCCESS_CANCEL_FRIEND_SENT",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu theo dõi người dùng
module.exports.followUserHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    await followUser({ user, contactUser });
    await user.save();
    await contactUser.save();
    return res.status(200).json({
      message: "SUCCESS_FOLLOW_USER",
      code: "SUCCESS_FOLLOW_USER",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu hủy theo dõi người dùng
module.exports.unFollowUserHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    await unFollowUser({ user, contactUser });
    await user.save();
    await contactUser.save();
    return res.status(200).json({
      message: "SUCCESS_UNFOLLOW_USER",
      code: "SUCCESS_UNFOLLOW_USER",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu chấp nhận kết bạn
module.exports.acceptFriendHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    //kiểm tra xem đã là bạn chưa ?
    if (checkIsFriend({ user, contactUser })) {
      return next(createError("ERROR_IS_FRIEND"));
    }

    //kiểm tra xem người ta có gửi lời mời kết bạn với mình chưa ?
    //nếu chưa gửi thì báo lỗi
    if (!checkIsFriendRequested({ user, contactUser })) {
      return next(createError("ERROR_FRIEND_REQUESTED_NOT_FOUND"));
    }

    acceptFriend({ user, contactUser });

    //tạo ra một notification - dạng cho user - nghĩa là có thông tin fromUser
    //thông báo này được tạo ra đã vào user và contactUser để thêm thông tin cho fromUser
    //và trả lại đây
    const notification = await createNotificationForUser({
      user,
      contactUser,
      content: `<b>${user.informations.displayName}</b> đã chấp nhận lời mời kết bạn`,
      type: "friend_accept",
      url: `/wall/${user._id}`,
    });

    //tăng số lượng thông báo chưa đọc lên cho contactUser
    contactUser.unReadNotificationCount += 1;

    await user.save();
    await contactUser.save();

    //thông báo cho người dùng được chấp nhận một thông báo là đã chấp nhận
    res.locals.io.emit(`${contactUser._id.toString()}-friend-accept`, {
      fromId: user._id,
      notification: notification._doc,
    });

    //bắn đến cả 2 người dùng để cập nhật trạng thái online
    res.locals.io.emit(
      `${contactUser._id.toString()}-new-friend-online`,
      user._id.toString()
    );

    res.locals.io.emit(
      `${user._id.toString()}-new-friend-online`,
      contactUser._id.toString()
    );

    //kiểm tra xem là giữa 2 người dùng này đã tồn tại một cuộc hội thoại chưa ? nếu chưa thì tạo và bắn cho cả 2 người
    const conversationExisted = await isExistConversation({
      filter: {
        type: "individual",
        //all là phải thỏa tất cả giá trị trong mảng - còn $in là chỉ cần 1 giá trị trong mảng
        users: { $all: [user._id, contactUser._id] },
      },
    });
    //nếu chưa tồn tại thì tạo mới
    if (!conversationExisted) {
      const newConversation = await createConversation({
        type: "individual",
        users: [user._id, contactUser._id],
      });
      //thêm thuộc tính new để hiển thị là có một tin nhắn mới trong hộp thoại
      //còn sau này khi fetch các conversation thì ta phải kiểm tra xem là trong mảng read của hộp thoại có include người dùng không
      //nếu có thì new = false (nghĩa là đã đọc) - true: chưa đọc
      newConversation._doc.new = true;

      //bắn lại cho người dùng 2 bên là có cuộc trò chuyện mới để cập nhật vào store

      res.locals.io
        .in(contactUser._id.toString())
        .emit(`new-conversation`, newConversation);
      res.locals.io
        .in(user._id.toString())
        .emit(`new-conversation`, newConversation);
    }

    //lấy lại thông tin của người dùng được chấp nhận bạn bè để trả về

    let acceptedUser = await getUserForList({
      filter: { _id: contactUser._id },
    });

    acceptedUser.isFriend = true;
    acceptedUser.isFollow = false;
    if (user.following.includes(acceptedUser._id)) {
      acceptedUser.isFollow = true;
    }

    return res.status(200).json({
      message: "SUCCESS_ACCEPT_FRIEND",
      code: "SUCCESS_ACCEPT_FRIEND",
      friend: acceptedUser,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý yêu cầu hủy kết bạn
module.exports.cancelFriendHandler = async (req, res, next) => {
  try {
    const { user } = req;
    const { contactUser } = res.locals;

    //kiểm tra xem đã là bạn chưa ?
    if (!checkIsFriend({ user, contactUser })) {
      return next("ERROR_IS_NOT_FRIEND");
    }

    cancelFriend({ user, contactUser });
    await user.save();
    await contactUser.save();

    res.locals.io.emit(`${contactUser._id.toString()}-cancel-friend`, {
      fromId: user._id,
      cancelUserId: user._id,
    });

    return res.status(200).json({
      message: "SUCCESS_CANCEL_FRIEND",
      code: "SUCCESS_CANCEL_FRIEND",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý giảm 1 đơn vị trong unReadNotificationCount
module.exports.readANotificationHandler = async (req, res, next) => {
  try {
    const { user } = req;
    user.unReadNotificationCount -= 1;
    await user.save();
    return res.status(200).json({
      message: "SUCCESS_USER_READ_A_NOTIFICATION",
      code: "SUCCESS_USER_READ_A_NOTIFICATION",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

// xử lý set unReadNotificationCount = 0
module.exports.readAllNotificationHandler = async (req, res, next) => {
  try {
    const { user } = req;
    user.unReadNotificationCount = 0;
    await user.save();
    return res.status(200).json({
      message: "SUCCESS_USER_READ_ALL_NOTIFICATION",
      code: "SUCCESS_USER_READ_ALL_NOTIFICATION",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý lấy danh sách bạn bè
module.exports.fetchFriendsHandler = async (req, res, next) => {
  try {
    const {
      _id: userId,
      friends,
      friend_sent,
      following,
      friend_requested,
    } = req.user;
    const { userId: _id, skip = 0, limit = 10, displayName = "" } = req.query;

    const result = await fetchFriendsSubdocuments({
      _id,
      skip,
      limit,
      displayName,
      path: "friends",
    });

    const friendsData = result.friends;

    //duyệt qua từng friends để kiểm tra tra một số thông tin sau

    const friendsResult = []; //mảng mới để lưu kết quả trả về

    friendsData.forEach((item) => {
      let isCurrentUser = (isFriend = isFollow = isSent = isRequested = false);
      let friendId = item._id.toString();
      if (userId.toString() === friendId) {
        isCurrentUser = true;
      } else {
        // console.log(friends)
        if (friends.includes(friendId)) {
          isFriend = true;
        }
        if (friend_sent.includes(friendId)) {
          isSent = true;
        }
        if (following.includes(friendId)) {
          isFollow = true;
        }
        if (friend_requested.includes(friendId)) {
          isRequested = true;
        }
      }
      friendsResult.push({
        ...item._doc,
        isCurrentUser,
        isFriend,
        isFollow,
        isSent,
        isRequested,
      });
    });
    // console.log(friendsResult);

    return res.status(200).json({
      friends: friendsResult,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.fetchFriendsWithConversationHandler = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const { skip = 0, limit = 10, displayName } = req.query;

    const friendsResult = await fetchFriendsWithConversation({
      userId,
      skip,
      limit,
      displayName,
    });

    return res.status(200).json({
      friends: friendsResult,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý lấy những người đã gửi lời mời kết bạn cho mình
module.exports.fetchFriendsRequestedHandler = async (req, res, next) => {
  try {
    const { userId: _id, skip = 0, limit = 10, displayName = "" } = req.query;

    const result = await fetchFriendsSubdocuments({
      _id,
      skip,
      limit,
      displayName,
      path: "friend_requested",
    });

    //gắn thêm thông tin
    const friendsRequestedResult = [];
    result.friend_requested.forEach((item) => {
      friendsRequestedResult.push({
        ...item._doc,
        isRequested: true,
      });
    });

    return res.status(200).json({
      friendsRequested: friendsRequestedResult,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý lấy những người mà mình đã gửi lời mời kết bạn
module.exports.fetchFriendsSentHandler = async (req, res, next) => {
  try {
    const { userId: _id, skip = 0, limit = 10, displayName = "" } = req.query;

    const result = await fetchFriendsSubdocuments({
      _id,
      skip,
      limit,
      displayName,
      path: "friend_sent",
    });

    //gắn thêm thông tin
    const friendsSentResult = [];
    result.friend_sent.forEach((item) => {
      friendsSentResult.push({
        ...item._doc,
        isSent: true,
      });
    });

    return res.status(200).json({
      friendsSent: friendsSentResult,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý lấy danh sách bạn bè cho phần tag - hay có thể dùng để fetch bạn bè
module.exports.fetchTagFriendsHandler = async (req, res, next) => {
  try {
    const { skip = 0, limit = 10, displayName = "" } = req.query;

    const { tags = [] } = req.body;
    const { friends } = req.user;

    const filter = {
      //lấy các người dùng có _id thuộc mảng friends
      // và không có trong mảng tags
      _id: {
        $in: friends,
        $nin: tags,
      },
      "informations.displayName": {
        $regex: displayName,
      },
    };

    const result = await fetchFriends({
      limit,
      filter,
    });

    return res.status(200).json({
      friends: result,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy danh sách hình ảnh của một người (chỉ tính những file thuộc image, có public là true)
module.exports.fetchPhotos = async (req, res, next) => {
  try {
    const { userId, skip = 0, limit = 10 } = req.query;
    const { _id: currentUserId } = req.user;

    //lấy ra các file hình mà người dùng đã đăng (chỉ tính những file thuộc image, có public là true)

    const photos = await FileModel.find({
      owner: userId,
      fileType: "image",
      public: true,
    })
      .skip(Number.parseInt(skip))
      .limit(Number.parseInt(limit));

    //có phải người lấy là người dùng hiện tại không
    const isCurrentUser = userId.toString() === currentUserId.toString();

    return res.status(200).json({
      photos,
      isCurrentUser,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xóa 1 photo
module.exports.deletePhotoHandler = async (req, res, next) => {
  try {
    const { fileId } = req.query;
    const user = req.user;
    const { _id: userId, avatar, cover } = user;
    //lấy ra photo theo id người dùng và id file
    const file = await getFile({
      filter: {
        _id: fileId,
        owner: userId,
      },
    });
    //nếu không có file thì có thể người đang xóa không phải chủ nhân của file hoặc file không tồn tại
    if (!file) {
      return (
        res.status(404),
        json({
          message: "ERROR_PHOTO_NOT_FOUND",
          code: "ERROR_PHOTO_NOT_FOUND",
        })
      );
    }

    //lấy ra bài post chứa file
    const post = await getPost({
      filter: {
        files: { $in: [fileId] },
      },
      select: "_id files content",
    });

    //kiểm tra bài post này có phải là ảnh bìa hay avatar của người dùng không
    //nếu phải thì xóa ảnh bìa - hoặc xóa ảnh đại diện ra khỏi user
    let isAvatar = false;
    let isCover = false;
    if (avatar && avatar._id.toString() === post._id.toString()) {
      isAvatar = true;
      user.avatar = undefined;
    } else if (cover && cover._id.toString() === post._id.toString()) {
      isCover = true;
      user.cover = undefined;
    }

    //kiểm tra xem là bài post có phải chỉ có 1 file (chính là file đang xét) và không có nội dung hay không
    // hoặc là nếu bài post là của một avatar hay cover thì cũng xóa luôn
    //nếu phải thì xóa luôn bài post
    //còn không thì chỉ cần xóa file trong bài post
    let deletePost = false;
    if (
      isAvatar ||
      isCover ||
      (post.files.length === 1 &&
        (!post.content || post.content.trim().length <= 0))
    ) {
      deletePost = true; //lát sẽ xét xem là nếu true => xóa cả bài post - false: xóa 1 file trong bài post
    }

    //nếu thỏa điều kiện xóa bài post thì thực hiện xóa cả bài post
    //ngược lại thì chỉ cần xóa file trong bài post
    if (deletePost === true) {
      //xóa cả bài post
      await PostModel.findOneAndDelete({ _id: post._id });
    } else {
      //xóa file ra khỏi bài post
      post.files.pull(fileId);
      await post.save();
    }

    //xóa file trên server
    await removeFile(file.path);
    //xóa file trong csdl
    await removeFileFromDB({ filter: { _id: fileId } });

    //lưu lại người dùng
    await user.save();

    return res.status(200).json({
      isAvatar,
      isCover,
      deletePost,
      postId: post._id,
      //trả về _id người thực hiện để ở dưới client dùng
      userId,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
