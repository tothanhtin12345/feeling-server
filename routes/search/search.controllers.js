const createError = require("http-errors");

//code của mình

const { fetchGroups } =  require("../group/group.methods");
const { fetchFriends } = require("../user/user.methods");
const {getIdsCommon} = require("../../utils/functions");
//search
// người dùng
// nhóm
// hoặc cả 2

module.exports.searchHandler = async (req, res, next) => {
  try {
    //type: both (tìm cả group và người dùng), users, groups
    const { skip, limit, displayName = "", type } = req.query;
    const {user:currentUser} = req;

    let users = [];
    let groups = [];

    if (type === "users" || type === "both") {
      let userFilter = {
        "informations.displayName": {
          $regex: displayName,
        },
      };
      users = await fetchFriends({ skip, limit, filter:userFilter,select:"_id informations avatar friends" });
      users = users.map(user=>{
        let isCurrentUser = currentUser._id.toString() === user._id.toString()
        return {
          ...user._doc,
          //nếu người dùng đang xét không phải người dùng hiện tại thì tìm
          //số lượng bạn chung - tìm bằng cách
          // lấy ra số lượng id chung giữa 2 mảng friends của người đang xét và friends của người dùng hiện tại
          sameFriendCount: isCurrentUser === false ? getIdsCommon(user.friends,currentUser.friends).length : 0,
          //số lượng bạn bè
          friendsCount: user.friends.length,
          //ta đã lấy ra mảng friends nhưng ta sẽ không trả về client ==> set cho nó mảng rỗng
          friends:[],
          isCurrentUser,
        }
      })
    }


    if (type === "groups" || type === "both") {
      groups = await fetchGroups({
        skip,
        limit,
        displayName,
        select: "informations cover memberCount",
      });
    }

    return res.status(200).json({
        users,
        groups,
    })


  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};


