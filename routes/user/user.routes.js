const router = require("express").Router();

const {
  updateAvatarHandler,
  updateCoverHandler,
  getUserDetailsHandler,
  updateUserInformationHandler,
  changePasswordHandler,
  updateUserConfigHandler,
  sendFriendRequestHandler,
  cancelFriendRequestHandler,
  cancelFriendSentHandler,
  followUserHandler,
  unFollowUserHandler,
  acceptFriendHandler,
  cancelFriendHandler,
  readANotificationHandler,
  readAllNotificationHandler,
  fetchFriendsHandler,
  fetchFriendsRequestedHandler,
  fetchFriendsSentHandler,
  fetchTagFriendsHandler,
  fetchFriendsWithConversationHandler,
  fetchPhotos,
  deletePhotoHandler,
} = require("./user.controllers");
const {
  validInformationForm,
  changePasswordValidator,
  validUpdateUserConfigValidator,
  validFetchFriends,
  validFetchPhotos,
} = require("./user.validators");
const { formValid } = require("../../middlewares/form");

const { multiMediaUploadChecking } = require("../file/file.middlewares");
const {
  parseFilesPostData,
  parsePostData,
  isValidPostData,
} = require("../post/post.middlewares");
const { addPostForImage, getContactUser } = require("./user.middlewares");

//origin: /user

//lấy thông tin một user
router.get("/details", getUserDetailsHandler);

//cập nhật thông tin cá nhân
router.put(
  "/update-information",
  validInformationForm,
  formValid,
  updateUserInformationHandler
);

//cập nhật hình ảnh đại diện
router.put(
  "/update-avatar",
  multiMediaUploadChecking,
  parseFilesPostData,
  parsePostData,
  isValidPostData,

  addPostForImage,
  updateAvatarHandler
);
//cập nhật ảnh bìa
router.put(
  "/update-cover",
  multiMediaUploadChecking,
  parseFilesPostData,
  parsePostData,
  isValidPostData,

  addPostForImage,
  updateCoverHandler
);

//thay đổi mật khẩu
router.put(
  "/change-password",
  changePasswordValidator,
  formValid,
  changePasswordHandler
);

//cập nhật config
router.put(
  "/update-config",
  validUpdateUserConfigValidator,
  formValid,
  updateUserConfigHandler
);

//gửi yêu cầu kết bạn
router.put("/send-friend-request", getContactUser, sendFriendRequestHandler);

//hủy yêu cầu kết bạn mà mình đã gửi
router.put("/cancel-friend-sent", getContactUser, cancelFriendSentHandler);

//hủy yêu cầu kết bạn mà người ta gửi cho mình
router.put(
  "/cancel-friend-requested",
  getContactUser,
  cancelFriendRequestHandler
);

//theo dõi một người dùng
router.put("/follow", getContactUser, followUserHandler);

//Hủy theo dõi một người dùng
router.put("/unfollow", getContactUser, unFollowUserHandler);

//chấp nhận làm bạn
router.put("/accept-friend", getContactUser, acceptFriendHandler);

//hủy bạn bè
router.put("/cancel-friend", getContactUser, cancelFriendHandler);

//đọc 1 tin thông báo - nói chính xác hơn là giảm 1 đơn vị trong unReadNotificationCount
router.put("/read-a-notification", readANotificationHandler);
//đọc tất cả thông báo - nói chính xác hơn là set  unReadNotificationCount = 0
router.put("/read-all-notification", readAllNotificationHandler);

//lấy danh sách bạn bè của một người
router.get("/friends", validFetchFriends, formValid, fetchFriendsHandler);

//lấy danh sách bạn bè của một người - kèm conversationId tương ứng cho mỗi người
router.get(
  "/friends-and-conversation",
  validFetchFriends,
  formValid,
  fetchFriendsWithConversationHandler
);

//lấy danh sách những người đã gửi lời mời kết bạn cho mình
router.get(
  "/friends-requested",
  validFetchFriends,
  formValid,
  fetchFriendsRequestedHandler
);

//lấy danh sách những người mà mình đã gửi lời mời kết bạn
router.get(
  "/friends-sent",
  validFetchFriends,
  formValid,
  fetchFriendsSentHandler
);

//lấy danh sách bạn bè cho phần tag của post - hoặc phần tìm bạn bè cho tạo nhóm chat
//ta dùng phương thức post bởi vì có thêm một dữ liệu mảng
router.post(
  "/friends-tag",
  validFetchFriends,
  formValid,
  fetchTagFriendsHandler
);

//lấy photos của người dùng
router.get("/photos", validFetchPhotos, fetchPhotos);

//xóa 1 photo
router.delete("/photo",deletePhotoHandler);

module.exports = router;
