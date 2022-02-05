const router = require("express").Router();

//code của mình
const { formValid } = require("../../middlewares/form");

const {
  validNewGroup,
  validFetchGroups,
  validFetchJoinRequestList,
  validFetchMembers,
} = require("./group.validators");

const {
  addGroupHandler,
  fetchGroupsManagingHandler,
  getGroupDetailsHandler,
  updateGroupCoverHandler,
  updateGroupInformationsHandler,
  joinGroupRequestHandler,
  cancelJoinGroupRequestHandler,
  fetchJoinGroupRequestList,
  denyJoinGroupRequestHandler,
  acceptJoinGroupRequestHandler,
  fetchMembersHandler,
  setInSpectorHandler,
  unSetInSpectorHandler,
  dissmissMemberHandler,
  searchUserToInviteToGroupHandler,
  inviteUserToGroupHandler,
  fetchGroupsJoiningHandler,
  outGroupHandler,
  fetchGroupsSentdHandler,
  deleteGroupHandler,

} = require("./group.controller");

const { multiMediaUploadChecking } = require("../file/file.middlewares");
const {
  parseFilesPostData,
  parsePostData,
  isValidPostData,
} = require("../post/post.middlewares");
const { addPostForImage } = require("../user/user.middlewares");
const {
  getGroupDetailsMid,
  checkIsOwnerOfGroup,
  checkIsInspector,
  checkIsMember,
} = require("./group.middlewares");

//origin: /group

//lấy danh sách nhóm mình đang tham gia
router.get("/joining", validFetchGroups, formValid, fetchGroupsJoiningHandler);

//lấy danh sách nhóm mình đang quản lý
router.get(
  "/managing",
  validFetchGroups,
  formValid,
  fetchGroupsManagingHandler
);
//lấy danh sách nhóm mà mình đã xin vào nhưng chưa được đồng ý
router.get("/sent", validFetchGroups, formValid, fetchGroupsSentdHandler);



//thêm một nhóm mới (có tên nhóm là bắt buộc, mô tả)
router.post("/", validNewGroup, formValid, addGroupHandler);

//xóa nhóm mình đang quản lý
router.delete("/",getGroupDetailsMid,checkIsOwnerOfGroup, deleteGroupHandler)

//lấy chi tiết một nhóm
router.get("/", getGroupDetailsHandler);

//cập nhật thông tin nhóm (tên nhóm, mô tả)

router.put(
  "/update-cover",
  multiMediaUploadChecking,
  parseFilesPostData,
  //middleware
  getGroupDetailsMid,
  checkIsOwnerOfGroup,
  parsePostData,
  isValidPostData,
  addPostForImage,

  updateGroupCoverHandler
);

//cập nhật thông tin của nhóm
router.put(
  "/update-informations",
  validNewGroup,
  formValid,
  getGroupDetailsMid,
  checkIsOwnerOfGroup,
  updateGroupInformationsHandler
);

//lấy ra danh sách các người dùng đang xin vào
router.get(
  "/join-request",
  validFetchJoinRequestList,
  formValid,
  getGroupDetailsMid,
  checkIsInspector,
  fetchJoinGroupRequestList
);

//yêu cầu tham gia một nhóm
router.put("/join-request", getGroupDetailsMid, joinGroupRequestHandler);

//hủy yêu cầu tham gia đến nhóm
router.put(
  "/join-request-cancel",
  getGroupDetailsMid,
  cancelJoinGroupRequestHandler
);

//đồng ý cho một người vào
router.put(
  "/accept-join-request",
  getGroupDetailsMid,
  checkIsInspector,
  acceptJoinGroupRequestHandler
);

//từ chối cho một người vào nhóm
router.put(
  "/deny-join-request",
  getGroupDetailsMid,
  checkIsInspector,

  denyJoinGroupRequestHandler
);

//ủy quyền cho một người (có quyền kiểm duyệt người dùng)
router.put(
  "/members/set-inspector",

  getGroupDetailsMid,
  checkIsOwnerOfGroup,
  setInSpectorHandler
);
//hủy ủy quyền cho một người
router.put(
  "/members/un-set-inspector",

  getGroupDetailsMid,
  checkIsOwnerOfGroup,
  unSetInSpectorHandler
);

//mời một người ra khỏi nhóm
router.put(
  "/members/dismiss-member",
  getGroupDetailsMid,
  checkIsInspector,
  dissmissMemberHandler
);

//lấy ra các members của nhóm
router.get(
  "/members",
  validFetchMembers,
  formValid,
  getGroupDetailsMid,
  checkIsMember,
  fetchMembersHandler
);

//tìm kiếm một người để thêm vào nhóm
// ta thực hiện ở route này bởi vì ta cần phải xử lý một số bước liên quan đến group
// trước khi tìm kiếm trong csdl
router.post(
  "/user-search",
  getGroupDetailsMid,
  checkIsMember,
  searchUserToInviteToGroupHandler
);



//mời bạn vào nhóm
router.post(
  "/invite",
  getGroupDetailsMid,
  checkIsMember,
  inviteUserToGroupHandler
);

//rời nhóm
router.put("/out", getGroupDetailsMid, checkIsMember, outGroupHandler);


module.exports = router;

