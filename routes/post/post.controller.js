const createError = require("http-errors");
const mongoose = require("mongoose");
//code của mình
const PostModel = require("../../models/post.models");
const CommentModel = require("../../models/comment.models");
const GroupModel = require("../../models/group.models");
const UserModel = require("../../models/user.models");
const {
  addPost,
  getPost,
  fetchPost,
  fetchComments,
  checkPostTypeToUpdatePublicFile,
  fetchComment,
  notifyWhenManagerInteractToPostInGroup,
} = require("./post.methods");
const { removeFile, removeFileFromDB } = require("../file/file.methods");
const {
  createNotificationForUser,
  createNotificationForPost,
  createNotificationForGroup,
} = require("../notification/notification.methods");

//thêm một bài post - do chính người dùng thêm
module.exports.addPostHandler = async (req, res, next) => {
  try {
    //xóa đi giá trị _id bởi vì nếu có _id thì chỉ dành cho việc chỉnh sửa post
    delete res.locals._id;
    //tương tự với sharedPost
    delete res.locals.sharedPost;

    const newPost = await addPost(req, res);

    //lấy ra tags và kiểm tra xem nếu có gắn thẻ thì gửi thông báo cho những người được gắn
    const { tags = [], files = [] } = res.locals;

    for (let i = 0; i < tags.length; i++) {
      //
      const contactUser = { _id: tags[i] };
      const user = ({ _id, avatar } = req.user);
      const notification = await createNotificationForUser({
        user,
        contactUser,
        content: `<b>${user.informations.displayName}</b> đã gắn thẻ bạn trong một bài viết`,
        type: "post_tag",
        url: `/post/details?_id=${newPost._id}`,
      });
      res.locals.io.emit(`${contactUser._id.toString()}-post-tag`, {
        fromId: user._id,
        notification: notification._doc,
      });
    }
    //hàm thực hiện kiểm tra post type và cập nhật lại giá trị public của file (sẽ là false nếu post type === groups)
    await checkPostTypeToUpdatePublicFile({ postType: newPost.type, files });

    //thêm isOwner = true để hiển thị các chức năng tương ứng
    newPost._doc.isOwner = true;

    return res.status(200).json({
      post: newPost._doc,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//chỉnh sửa một bài post
module.exports.editPostHandler = async (req, res, next) => {
  try {
    const { _id, files, content, filesToDelete = [], tags = [] } = res.locals;
    const filter = { _id };
    //lấy bài post đó ra
    const post = await getPost({ filter });

    //thực hiện xóa các files trong mảng filesToDelete
    for (let i = 0; i < filesToDelete.length; i++) {
      //các item của filesToDelete đang ở dạng chuỗi json
      //ta chuyển nó thành đôi tượng json
      const file = JSON.parse(filesToDelete[i]);

      //xóa file ở storage
      removeFile(file.path);
      const filter = { _id: file._id };
      //xóa file ở bảng File
      await removeFileFromDB({ filter });
      //xóa file ở trong mảng files của bài viết
      const fileIndex = post.files.findIndex((f) => f == file._id);
      if (fileIndex >= 0) {
        const result = post.files.splice(fileIndex, 1);
      }
    }

    // //thực hiện xóa tags
    // for(let i=0; i<tags.length; i++){
    //   //là một giá trị _id của người dùng
    //   const tag = tags[i];
    //   const tagIndex = post.tags.findIndex((t)=>t === tag);
    //   if(tagIndex >=0){
    //     post.tags.splice(tagIndex, 1);
    //   }
    // }

    if (files.length > 0) {
      post.files.push(files);
    }

    post.tags = tags;
    post.content = content;

    await post.save();

    //hàm thực hiện kiểm tra post type và cập nhật lại giá trị public của file (sẽ là false nếu post type === groups)
    await checkPostTypeToUpdatePublicFile({ postType: post.type, files });

    const groupDetails = res.locals.groupDetails;

    if (post.group && groupDetails) {
      await notifyWhenManagerInteractToPostInGroup({
        req,
        res,
        type: "group-update-post",
        url: `/post/details?_id=${post._id}`,
        content: `Bài viết của bạn tại nhóm <b>${groupDetails.informations.displayName}</b> đã bị chỉnh sửa.`,
      });
    }

    //lấy lại bài post - có kèm theo populate

    const editPost = await getPost({
      filter,
      select: "_id content updatedAt tags files",
    });

    return res.status(200).json({
      post: editPost._doc,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//chia sẻ một bài post
module.exports.sharePostHandler = async (req, res, next) => {
  try {
    const { sharedPost, content, tags = [] } = res.locals;

    let { _id: userId } = req.user;

    const newPostData = {
      sharedPost,
      content,
      tags,
      //bài viết là dạng share nên ta chỉ định luôn type và privacy
      type: "share",
      privacy: "public",
      owner: userId,
    };
    res.locals = {
      ...res.locals,
      newPostData,
    };
    const newPost = await addPost(req, res);

    for (let i = 0; i < tags.length; i++) {
      //
      const contactUser = { _id: tags[i] };
      const user = ({ _id, avatar } = req.user);
      const notification = await createNotificationForUser({
        user,
        contactUser,
        content: `<b>${user.informations.displayName}</b> đã gắn thẻ bạn trong một bài viết`,
        type: "post_tag",
        url: `/post/details?_id=${newPost._id}`,
      });
      res.locals.io.emit(`${contactUser._id.toString()}-post-tag`, {
        fromId: user._id,
        notification: notification._doc,
      });
    }

    return res.status(200).json({
      post: newPost._doc,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xóa một bài post
module.exports.deletePostHandler = async (req, res, next) => {
  try {
    //tìm và xóa bài post - đồng thời nhận được bài post bị xóa
    const { deletePostId } = req.query;
    const { user } = req;

    const deleteResult = await PostModel.findOneAndDelete({
      _id: deletePostId,
    }).populate("files");

    //lấy ra các file để chuẩn bị xóa trên storage
    const files = deleteResult.files;

    for (let i = 0; i < files.length; i++) {
      //các item của filesToDelete đang ở dạng chuỗi json
      //ta chuyển nó thành đôi tượng json
      const file = files[i];

      //xóa file ở storage
      removeFile(file.path);
      const filter = { _id: file._id };
      //xóa file ở bảng File
      await removeFileFromDB({ filter });
    }

    //xóa các comments thuộc về bài post có _id là deletePostId
    await CommentModel.deleteMany({ post: deletePostId });

    //thực hiện một số hành động liên quan đến việc kiểm tra tương tác giữa manager với bài post trong nhóm (nếu có)

    const groupDetails = res.locals.groupDetails;
    const post = res.locals.currentPost;
    if (post.group && groupDetails) {
      await notifyWhenManagerInteractToPostInGroup({
        req,
        res,
        type: "group-delete-post",
        url: `/groups/${groupDetails._id}`,
        content: `Bài viết của bạn tại nhóm <b>${groupDetails.informations.displayName}</b> đã bị xóa.`,
      });
    }

    return res.status(200).json({
      message: "SUCCESS_POST_DELETE",
      code: "SUCCESS_POST_DELETE",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch bài post cho tường nhà
module.exports.fetchWallPostHandler = async (req, res, next) => {
  try {
    //_id của user
    const { _id, skip = 0, limit = 10, lastId } = req.query;
    let filter = {
      owner: _id,
      // "individual", "share", "groups", "system","groups-system"
      type: { $in: ["individual", "share", "system"] },
    };

    const posts = await fetchPost({
      skip,
      limit,
      filter,
      userId: req.user._id,
      role: req.user.role,
      lastId,
    });

    return res.status(200).json({
      posts,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch bài post cho một group
module.exports.fetchGroupPostHandler = async (req, res, next) => {
  try {
    //_id của user
    const { skip = 0, limit = 10, groupId, lastId } = req.query;
    //lấy các bài viết theo _id của group
    const filter = {
      group: groupId,
      // "individual", "share", "groups", "system","groups-system"
      type: { $in: ["groups", "groups-system"] },
    };
    const groupDetails = res.locals.groupDetails;

    //kiểm tra xem là - người đang lấy danh sách bài viết của nhóm có phải là một manager của nhóm không ?
    const isManager =
      groupDetails.groupOwner.toString() === req.user._id.toString();

    const posts = await fetchPost({
      skip,
      limit,
      filter,
      userId: req.user._id,
      role: req.user.role,
      isManager,
      lastId,
    });

    return res.status(200).json({
      posts,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch bài post cho group dashboard (tất cả bài viết của các nhóm mà người dùng đã tham gia)
module.exports.fetchGroupDashboardPostsHandler = async (req, res, next) => {
  try {
    //_id của user
    const { skip = 0, limit = 10, lastId } = req.query;
    const user = req.user;

    //lấy các nhóm mà người dùng đã tham gia
    const groupsData = await GroupModel.find({
      members: { $in: [user._id] },
    }).select("_id");

    //chỉ lấy ra các dữ liệu _id (không lấy key _id)
    const groupsId = [];

    groupsData.forEach((item) => {
      groupsId.push(item._id);
    });

    //lấy các bài viết theo _id của group
    const filter = {
      group: { $in: groupsId },
      // "individual", "share", "groups", "system","groups-system"
      type: { $in: ["groups", "groups-system"] },
    };

    const posts = await fetchPost({
      skip,
      limit,
      filter,
      userId: user._id,
      role: user.role,
      lastId,
    });

    return res.status(200).json({
      posts,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch bài post cho home
module.exports.fetchHomePostHandler = async (req, res, next) => {
  try {
    const { skip = 0, limit = 10, lastId } = req.query;
    const user = req.user;
    //tìm những bài post mà
    // user mà mình đang theo dõi
    // nhóm mà mình đang tham gia

    //danh sách id của người dùng mà mình đang theo dõi
    const followingUsersId = user.following;

    //lấy các nhóm mà người dùng đã tham gia
    const groupsData = await GroupModel.find({
      members: { $in: [user._id] },
    }).select("_id");

    //chỉ lấy ra các dữ liệu _id (không lấy key _id)
    const groupsId = [];

    groupsData.forEach((item) => {
      groupsId.push(item._id);
    });

    //lấy các bài viết theo _id của group
    const filter = {
      $or: [
        //chủ nhân là mình
        { owner: user._id },
        //hoặc là chủ nhân bài viết là user mà ta đang theo dõi
        //nhưng bài viết không thuộc nhóm
        {
          $and: [
            { owner: { $in: followingUsersId } },
            { group: { $exists: false } },
          ],
        },
        //hoặc là chủ nhân bài viết là user mà ta đang theo dõi
        //nhưng bài viết thuộc nhóm
        //và ta phải là thành viên nhóm đó
        {
          $and: [
            { owner: { $in: followingUsersId } },
            { group: { $exists: true } },
            { group: { $in: groupsId } },
          ],
        },

        // hoặc là bài viết thuộc nhóm mà ta đang tham gia
        { group: { $in: groupsId } },
      ],
    };

    const posts = await fetchPost({
      skip,
      limit,
      filter,
      userId: user._id,
      role: user.role,
      lastId,
    });

 

    return res.status(200).json({
      posts,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.fetchCommentsPostHandler = async (req, res, next) => {
  try {
    const { postId, skip, limit, commentIdIgnore } = req.query;

    const { _id: userId, role: userRole } = req.user;
    //lấy dựa theo _id của bài post
    let filter = { post: postId };
    //nếu có thêm giá trị comment nào bị bỏ qua thì thêm vào filter
    if (commentIdIgnore) {
      filter = {
        ...filter,
        _id: { $ne: commentIdIgnore },
      };
    }

    const comments = await fetchComments({
      filter,
      skip,
      limit,
      //lấy hết thông tin
      select: "",
      userId,
      userRole,
    });

    return res.status(200).json({
      comments,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};


module.exports.getPostFormPhotoHandler = async (req, res, next) => {
  try {
    const { fileId } = req.query;
    const { _id: userId, role } = req.user;
    const posts = await fetchPost({
      filter: { files: { $in: [fileId] } },
      skip: 0,
      limit: 1,
      userId,
      role,
    });

    if (!posts || posts.length <= 0) {
      return res.status(404).json({
        message: "ERROR_POST_NOT_FOUND",
      });
    }

    const post = posts[0];

    return res.status(200).json({
      post: { _id: post._id, fileId },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.getPostDetailsHandler = async (req, res, next) => {
  try {
    //commentId: comment muốn lấy
    //fileId: file muốn lấy
    const { _id, commentId, fileId } = req.query;
    const { _id: userId, role } = req.user;

    const posts = await fetchPost({
      filter: { _id },
      skip: 0,
      limit: 1,
      userId,
      role,
    });

    if (!posts || posts.length <= 0) {
      return res.status(404).json({
        message: "ERROR_POST_NOT_FOUND",
        code: "ERROR_POST_NOT_FOUND",
      });
    }

    let post = posts[0];

    //nếu có thêm comment Id thì lấy comment tương ứng
    if (commentId) {
      const comment = await fetchComment({
        userId,
        userRole: role,
        filter: { _id: commentId },
      });
      if (comment) {
        post.comments.push(comment);
        //giá trị để bỏ qua comment khi fetch thêm comment
        post.commentIdIgnore = comment._id;
      }
    }

    //nếu có fileId => người dùng chỉ muốn lấy 1 file => ta chỉ chọn file đó vào mảng
    if (fileId) {
      //lấy ra file được chọn ban đầu
      const fileSelected = post.files.find(
        (item) => item._id.toString() === fileId
      );

      post = {
        ...post,
        files: [fileSelected],
      };
    }

    return res.status(200).json({
      post,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.postReportHandler = async (req, res, next) => {
  try {
    const { postId, content } = req.body;
    const { _id: userId } = req.user;

    //lấy ra bài post
    const post = await PostModel.findOne({ _id: postId })
      .populate({
        path: "owner",
        populate: {
          path: "avatar",
          populate: {
            path: "files",
          },
          select: "files",
        },
        select: "avatar _id",
      })
      .select("_id reports reportCount owner");
    if (!post) {
      return next(createError(404, "ERROR_POST_NOT_FOUND"));
    }

    // console.log(post);

    //thêm report và tăng giá trị đếm
    post.reports.push({
      content,
      owner: userId,
    });
    post.reportCount += 1;

    await post.save();

    //tạo thông báo - vì việc báo cáo một bài viết là bảo mật, nên ta không thể show
    // cho chủ nhân bài viết biết ai là người đã báo cáo
    // do vậy, ta tạo một thông báo và set chủ nhân của thông báo chính là chủ nhân bài viết luôn

    const contentForNotification = `Đã có ${post.reportCount} lượt báo cáo về bài viết của bạn`;

    const postOwner = post.owner;

    const notification = await createNotificationForPost({
      user: {
        _id: postOwner._id,
        avatar: postOwner.avatar,
      },
      contactUser: {
        _id: postOwner._id,
      },
      content: contentForNotification,
      type: "post_report",
      url: `/post/details?_id=${post._id}`,
      postId: post._id,
      forPurpose: "report",
    });

    //tăng số lượng thông báo mới của người dùng được nhận thông báo lên
    await UserModel.updateOne(
      { _id: postOwner._id },
      { $inc: { unReadNotificationCount: 1 } }
    );

    //bắn socket thông báo cho chủ nhân của bài viết
    res.locals.io.emit(`${postOwner._id.toString()}-new-post-report`, {
      fromId: postOwner._id,
      notification: notification._doc,
    });

    return res.status(200).json({
      message: "SUCCESS_POST_REPORT",
      code: "SUCCESS_POST_REPORT",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//fetch nội dung báo cáo của một bài post - chỉ hiển thị với chủ nhân bài post và admin
module.exports.fetchPostReportContentHandler = async (req, res, next) => {
  try {
    //lấy ra quyền của người dùng đang thực hiên fetch
    const { role, _id: userId } = req.user;
    const { postId } = req.query;
    let filter = {
      _id: postId,
    };

    //ta lấy ra trước bài post dựa vào id của nó
    //và kiểm tra xem là - liệu bài post có phải thuộc group hay không
    let isManager = false;
    const postTmp = await PostModel.findOne({ _id: postId }).select("group");
    if (postTmp.group) {
      //nếu phải - kiểm tra xem là người dùng đang yêu cầu xem nội dung báo cáo có phải
      // là một manager của group hay không ?
      const group = await GroupModel.findOne({ _id: postTmp.group }).select(
        "groupOwner"
      );
      isManager = group.groupOwner.toString() === userId.toString();
    }

    //nếu không phải là admin và cũng phải người quản trị viên của nhóm - thì ta thêm filter chủ nhân bài viết
    if (role !== "admin" && !isManager) {
      filter = { ...filter, owner: userId };
    }

    //tìm ra bài post
    const post = await PostModel.findOne(filter).select("_id reports");

    if (!post) {
      return next(createError(404, "ERROR_POST_NOT_FOUND"));
    }

    //lấy reports của bài port ra
    const reports = post.reports;

    return res.status(200).json({
      //isAdmin: dùng cho client hiển thị thêm thông tin
      isAdmin: role === "admin",
      reports,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.deletePostReportHandler = async (req, res, next) => {
  try {
    const { role } = req.user;
    const { postId, reportId } = req.query;

    //chỉ có admin mới có quyền xóa bài post report
    if (role !== "admin") {
      return next(createError(401, "ERROR_DELETE_POST_REPORT_ROLE"));
    }

    //lấy ra bài post dựa theo id bài post và id của bài report
    const post = await PostModel.findOne({
      _id: postId,
      "reports._id": { $in: [reportId] },
    }).select("_id reports reportCount");

    if (!post) {
      return next(createError(404, "ERROR_DELETE_POST_REPORT_NOT_FOUND"));
    }

    post.reports.pull(reportId);
    post.reportCount -= 1;

    await post.save();

    return res.status(200).json({
      message: "SUCCESS_DELETE_POST_REPORT",
      code: "SUCCESS_DELETE_POST_REPORT",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//lấy thông tin những người like bài viết
module.exports.getLikeOwnerInformation = async (req, res, next) => {
  try {
    const { limit = 10, skip = 0, lastId, postId } = req.query;

    let match = {};
    if (lastId) {
      match = {
        ...match,
        _id: { $lt: lastId },
      };
    }

    const result = await PostModel.findOne({ _id: postId })
      .populate({
        path: "likes",
        populate: {
          path: "owner",
          populate: {
            path: "avatar",
            populate: "files",
            select: "files",
          },
          select: "_id informations avatar",
        },

        select: "owner emotion likeAt",
      })

      .select("likes");

    let likes = result.likes;

    //lấy ra những id bé hơn last id (nếu có)
    if (lastId) {
      likes = likes.filter(
        (item) => item._id < mongoose.Types.ObjectId(lastId)
      );
    }

    //sắp xếp theo thứ tự giảm dần id
    likes = likes.sort((a, b) => {
      if (a._id > b._id) {
        return -1;
      } else if (a._id < b._id) {
        return 1;
      }
      return 0;
    });

    let final = [];
    let count = 0;
    let i = 0;
    while (i < likes.length) {
      if (count == limit) {
        break;
      }
      final.push(likes[i]);
      count += 1;
      i++;
    }

    return res.status(200).json({ likes: final });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
