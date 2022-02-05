const router = require("express").Router();

//code của mình
const {
  parseFilesPostData,
  parsePostData,
  isValidPostData,
  isExistPost,
  isOwnerOfPost,
  isInAGroup,
} = require("./post.middlewares");
const {
  addPostHandler,
  editPostHandler,
  sharePostHandler,
  deletePostHandler,
  fetchWallPostHandler,
  fetchCommentsPostHandler,
  getPostFormPhotoHandler,
  getPostDetailsHandler,
  postReportHandler,
  fetchPostReportContentHandler,
  deletePostReportHandler,
  fetchGroupPostHandler,
  fetchGroupDashboardPostsHandler,
  fetchHomePostHandler,
  getLikeOwnerInformation,
} = require("./post.controller");
const { multiMediaUploadChecking } = require("../file/file.middlewares");
const {
  validFetchPost,
  validFetchComments,
  validPostReport,
  validFetchPostReportContent,
  validDeletePostReport,
} = require("./post.validators");
const { formValid } = require("../../middlewares/form");
const {
  getGroupDetailsMid,
  checkIsMember,
} = require("../group/group.middlewares");
//origin: /post

//thêm một bài post
router.post(
  "/",
  multiMediaUploadChecking,
  parseFilesPostData,
  parsePostData,
  isValidPostData,
  addPostHandler
);

//chỉnh sửa một bài post
router.put(
  "/",
  multiMediaUploadChecking,
  isExistPost,
  isOwnerOfPost,
  parseFilesPostData,
  parsePostData,
  isValidPostData,
  editPostHandler
);

//chia sẻ một bài post
router.post(
  "/share",
  isExistPost,
  isInAGroup,
  parsePostData,
  isValidPostData,
  sharePostHandler
);

//xóa một bài post
router.delete("/", isExistPost, isOwnerOfPost, deletePostHandler);

//fetch posts của tường nhà
router.get("/wall", validFetchPost, formValid, fetchWallPostHandler);

//fetch posts của group
router.get(
  "/group",
  validFetchPost,
  formValid,
  getGroupDetailsMid,
  checkIsMember,
  fetchGroupPostHandler
);
//fetch posts của group dashboard
router.get("/group-dashboard",validFetchPost,formValid,fetchGroupDashboardPostsHandler)
//fetch posts home
router.get("/home",validFetchPost,formValid,fetchHomePostHandler)

//fetch comments của bài post
router.get(
  "/comments",
  validFetchComments,
  formValid,
  fetchCommentsPostHandler
);

//lấy ra một bài post từ photo (nghĩa là file có dạng image)
router.get("/from-photo", getPostFormPhotoHandler);

//lấy chi tiết một bài post
router.get("/details", getPostDetailsHandler);

//báo cáo một bài post
router.put("/report", validPostReport, formValid, postReportHandler);

//fetch nội dung của bài report (fetch hết vì thường một bài post sẽ không có nhiều báo cáo)
router.get(
  "/report",
  validFetchPostReportContent,
  formValid,
  fetchPostReportContentHandler
);

//xóa một report
router.delete(
  "/report",
  validDeletePostReport,
  formValid,
  deletePostReportHandler
);


//lấy thông tin về like
router.get("/like-informations",getLikeOwnerInformation)

module.exports = router;
