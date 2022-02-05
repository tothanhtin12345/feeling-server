const createError = require("http-errors");
//code của mình

const UserModel = require("../../models/user.models");
const PostModel = require("../../models/post.models");
const GroupModel = require("../../models/group.models");

const { createGraphAggregate, createMonthData } = require("./manager.methods");

const { fetchGroups, fetchGroupsWithGroupOwnerDetail } = require("../group/group.methods");
const { fetchFriends } = require("../user/user.methods");
const { fetchPost } = require("../post/post.methods");

//năm mà hệ thống chạy
const systemStartAtYear = 2020;

//fetchs users ở trang manager
module.exports.fetchUsersManager = async (req, res, next) => {
  try {
    //displayName: tên hiển thị
    //email: địa chỉ email
    // createdAtStart và createdAtEnd: kiểu Date, bắt đầu tham gia từ ngày nào đến ngày nào
    const {
      displayName = "",
      email = "",
      createdAtStart,
      createdAtEnd,
      skip = 0,
      limit = 10,
    } = req.query;

    //tìm kiếm regex với displayName và email
    // tìm kiếm  với >= createdAtStart và <= createdAtEnd

    let filter = {
      "informations.displayName": {
        $regex: displayName,
      },
      email: {
        $regex: displayName,
      },
    };

    if (createdAtStart && createdAtEnd) {
      filter = {
        ...filter,
        createdAt: {
          $gte: new Date(createdAtStart),
          $lte: new Date(createdAtEnd),
        },
      };
    }

    const users = await fetchFriends({
      skip,
      limit,
      filter,
      select: "_id informations avatar friendCount email createdAt",
    });
    //đếm số lượng dữ liệu có trong db
    const documentCount = await UserModel.count(filter);

    return res.status(200).json({
      data: users,
      documentCount,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch posts ở trang manager
module.exports.fetchPostsManager = async (req, res, next) => {
  try {
    //skip
    //limit
    //theo lượt like từ bao nhiêu đến bao nhiêu
    // theo lượt cmt từ bao nhiêu đến bao nhiêu
    // theo lượt báo cáo
    // trong khoảng thời gian tạo
    const {
      skip,
      limit,
      createdAtStart,
      createdAtEnd,
      likeCountStart,
      likeCountEnd,
      commentCountStart,
      commentCountEnd,
      reportCountStart,
      reportCountEnd,
    } = req.query;

    const { user } = req;

    let filter = {};

    if (createdAtStart && createdAtEnd) {
      filter = {
        ...filter,
        createdAt: {
          $gte: new Date(createdAtStart),
          $lte: new Date(createdAtEnd),
        },
      };
    }

    if (likeCountStart) {
      filter.likeCount = {
        ...filter.likeCount,
        $gte: parseInt(likeCountStart),
      };
    }
    if (likeCountEnd) {
      filter.likeCount = {
        ...filter.likeCount,
        $lte: parseInt(likeCountEnd),
      };
    }

    if (commentCountStart) {
      filter.commentCount = {
        ...filter.commentCount,
        $gte: parseInt(commentCountStart),
      };
    }

    if (commentCountEnd) {
      filter.commentCount = {
        ...filter.commentCount,
        $lte: parseInt(commentCountEnd),
      };
    }

    if (reportCountStart) {
      filter.reportCount = {
        ...filter.reportCount,
        $gte: parseInt(reportCountStart),
      };
    }
    if (reportCountEnd) {
      filter.reportCount = {
        ...filter.reportCount,
        $lte: parseInt(reportCountEnd),
      };
    }

    // console.log(filter);

    //cần lấy ra:
    //id bài viết
    // id và tên chủ nhân của nó
    // số lượt báo cáo
    // số cmt
    // số like

    const posts = await fetchPost({
      skip,
      limit,
      filter,
      userId: user._id,
      role: user.role,
    });

    //đếm số lượng bài post phù hợp với điều kiện filter
    //đếm số lượng dữ liệu có trong db
    const documentCount = await PostModel.count(filter);

    return res.status(200).json({
      data: posts,
      documentCount,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch groups ở trang manager
module.exports.fetchGroupsManager = async (req, res, next) => {
  try {
    //tìm theo tên nhóm
    // và số lượng thành viên (khoảng)
    // và ngày lập nhóm

    const {
      displayName = "",
      memberCountStart,
      memberCountEnd,
      createdAtStart,
      createdAtEnd,
      skip,
      limit,
    } = req.query;


    let filter = {};

    if (createdAtStart && createdAtEnd) {
      filter = {
        ...filter,
        createdAt: {
          $gte: new Date(createdAtStart),
          $lte: new Date(createdAtEnd),
        },
      };
    }

    if (memberCountStart) {
      filter.memberCount = {
        ...filter.memberCount,
        $gte: parseInt(memberCountStart),
      };
    }
    if (memberCountEnd) {
      filter.memberCount = {
        ...filter.memberCount,
        $lte: parseInt(memberCountEnd),
      };
    }

    console.log(filter)

    //lấy ra:
    // tên nhóm
    // số lượng thành viên
    // chủ nhóm
    // ngày lập nhóm

    const groups = await fetchGroupsWithGroupOwnerDetail({
      skip,
      limit,
      displayName,
      filter,
      select: "_id informations groupOwner createdAt memberCount",
    });
  

    const documentCount = await GroupModel.count(filter);

    return res.status(200).json({
      data:groups,
      documentCount,
    })
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch dữ liệu đồ thị cho users ở trang manager
module.exports.fetchGraphs = async (req, res, next) => {
  try {
    //lấy ra năm hiện tại
    const currentYear = new Date().getFullYear();

    //trả về: dữ liệu từng tháng theo năm
    const { year = currentYear, type } = req.query;

    let data = [];
    if (type === "users") {
      data = await UserModel.aggregate(createGraphAggregate(year));
    } else if (type === "groups") {
      data = await GroupModel.aggregate(createGraphAggregate(year));
    } else if (type === "posts") {
      data = await PostModel.aggregate(createGraphAggregate(year));
    }

    const monthData = createMonthData(data);

    //từ dữ liệu ở trên - ta sẽ map vào 12 tháng - tháng nào không có trong data thì ta gán = 0

    return res.status(200).json({
      monthData,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
