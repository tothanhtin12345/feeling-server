const router = require("express").Router();



//code của mình
const {fetchGraphValidator} = require("./manager.validators");
const { formValid } = require("../../middlewares/form");
const {checkIsAdmin} = require("./manager.middlewares");
const {fetchGraphs,fetchUsersManager, fetchPostsManager, fetchGroupsManager} = require("./manager.controllers")

//orgin: manager

//lấy danh sách users
router.get("/users",checkIsAdmin,fetchUsersManager);

//lấy danh sách bài posts
router.get("/posts",checkIsAdmin,fetchPostsManager);

//lấy danh sách groups
router.get("/groups",checkIsAdmin, fetchGroupsManager);

//lấy dữ liệu đồ thị (dựa theo type)
router.get("/line-graph-data",checkIsAdmin,fetchGraphs)





module.exports = router;