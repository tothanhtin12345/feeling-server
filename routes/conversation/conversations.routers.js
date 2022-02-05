//phần import của các gói bên ngoài
const router = require("express").Router();

//code của mình
const {
  validFetchConversations,
  validGetConversationDetails,
  validCreateGroup,
} = require("./conversations.validators");
const { formValid } = require("../../middlewares/form");
const {
  fetchConversationsHandler,
  getConversationDetailsHandler,
  getUnreadHandler,
  createGroupChatHandler,
  inviteMembersHandler,
  fetchConversationsByValueHandler,
  getConversationIdForEachUserHandler
} = require("./conversation.controllers");
const {getConversation, getBasicUsers} = require("./conversation.middlewares");

router.get("/", validFetchConversations, formValid, fetchConversationsHandler);

//có kèm theo giá trị displayName để search - nhưng xử lý khá phức tạp - vì thế ta phải tạo một route riêng thế này
router.get("/search-by-value",validFetchConversations,formValid,fetchConversationsByValueHandler)

router.get(
  "/details",
  validGetConversationDetails,
  formValid,
  getConversationDetailsHandler
);

//đếm số lượng những phòng mà người dùng chưa đọc tin nhắn cuối
router.get("/unread", getUnreadHandler);

//tạo một group chat
router.post(
  "/create-group-chat",
  validCreateGroup,
  formValid,
  createGroupChatHandler
);



//mời thêm thành viên vào group-chat
router.put("/invite-members",getConversation,getBasicUsers, inviteMembersHandler);

//với mỗi user id trong mảng usersId - lấy conversation id tương ứng giữa người dùng gửi request và user đó
router.post("/id-for-each-user",getConversationIdForEachUserHandler)

module.exports = router;
