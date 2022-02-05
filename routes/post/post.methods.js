//code của mình
const PostModel = require("../../models/post.models");
const CommentModel = require("../../models/comment.models");
const UserModel = require("../../models/user.models");
const { updateFile } = require("../file/file.methods");

const {
  createNotificationForGroup,
} = require("../notification/notification.methods");

//thêm một bài post - đồng thời populate luôn các thông tin cần thiết
module.exports.addPost = async (req, res) => {
  //lấy các thông tin ra
  //các dữ liệu đã được lấy ra, xử lý và kiểm tra ở middleware
  let newPostData = res.locals;

  let { _id: userId, informations, avatar } = req.user;

  newPostData = {
    ...newPostData,
    owner: userId,
  };
  const newPost = new PostModel(newPostData);
  //save và populate
  await newPost.save().then((data) =>
    data
      .populate({
        path: "files",
      })
      .populate({
        path: "sharedPost",
        populate: [
          {
            path: "files",
          },
          {
            path: "owner",
            populate: {
              path: "avatar",
              populate: {
                path: "files",
              },
              select: "files",
            },
            select: "_id avatar informations",
          },
        ],
        select: "_id content owner type privacy files createdAt updatedAt",
      })
      .populate({
        path: "tags",
        populate: {
          path: "avatar",
          populate: {
            path: "files",
          },
          select: "files",
        },
        select: "_id informations avatar",
      })
      .populate({
        path: "group",
        select: "_id informations",
      })

      .execPopulate()
  );

  //cập nhật thêm thông tin owner - chính là người dùng hiện tại
  newPost._doc.owner = {
    informations,
    _id: userId,
    avatar,
  };

  return newPost;
};

//lấy ra một bài post
module.exports.getPost = async ({ filter, select = "" }) => {
  const post = await PostModel.findOne(filter)

    .populate({
      path: "files",
    })
    .populate({
      path: "tags",
      populate: {
        path: "avatar",
        populate: {
          path: "files",
        },
        select: "files",
      },
      select: "_id informations avatar",
    })
    .populate({
      path: "sharedPost",
      populate: [
        {
          path: "files",
        },
        {
          path: "owner",
          populate: {
            path: "avatar",
            populate: {
              path: "files",
            },
            select: "files",
          },
          select: "_id avatar informations",
        },
      ],
      select: "_id content owner group type privacy files createdAt updatedAt",
    })
    .select(select);

  // const post = await PostModel.findOne(filter);

  return post;
};

//lấy ra nhiều bài post dựa theo các tham số
//role là quyên của người dùng
module.exports.fetchPost = async ({ filter, skip, limit, userId, role, isManager = false, lastId }) => {
  if(lastId){
    filter = {
      ...filter,
      _id: {$lt: lastId},
    };
  }
  const list = await PostModel.find(filter)
    .populate({
      path: "owner",
      populate: {
        path: "avatar",
        populate: {
          path: "files",
        },
        select: "files",
      },
      select: "_id avatar informations",
    })
    .populate({
      path: "files",
    })
    .populate({
      path: "tags",
      populate: {
        path: "avatar",
        populate: {
          path: "files",
        },
        select: "files",
      },
      select: "_id informations avatar",
    })
    .populate({
      path: "sharedPost",
      populate: [
        {
          path: "files",
        },
        {
          path: "owner",
          populate: {
            path: "avatar",
            populate: {
              path: "files",
            },
            select: "files",
          },
          select: "_id avatar informations",
        },
      ],
      select: "_id content owner type privacy files createdAt updatedAt",
    })
    .populate({
      path: "group",
      populate: { path: "cover", populate: "files", select: "files" },
      select: "informations cover _id",
    })
    .sort({ createdAt: -1, _id: -1, })
    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    .select("-comments -shares");

  //thêm một số dữ liệu
  const listResult = [];
  list.forEach((item) => {
    //kiểm tra xem người dùng đã like bài viết này chưa
    let isLike = (isOwner = isAdmin = false);

    let ownerLike = item.likes.find((item)=>item.owner._id.toString() === userId.toString());
    //dùng để hiển thị thị người dùng đã like theo cảm xúc nào
    let emotion;

    if (ownerLike) {
      isLike = true;
      emotion = ownerLike.emotion;
    }
    //kiểm tra xem người dùng hiện tại có phải chủ nhân của bài viết
    if (item.owner._id.toString() === userId.toString()) {
      isOwner = true;
    }
    //kiểm tra xem người dùng hiện tại đang tương tác có phải là admin
    if (role === "admin") {
      isAdmin = true;
    }

    listResult.push({
      ...item._doc,
      isLike,
      emotion,
      isOwner,
      isAdmin,
      isManager,
      //dùng để xác định xem là bài viết có comment hay không - dựa vào đây client có thể hiện chữ "xem thêm comment" hoặc không
      commentCanLoad: true,
      // số lượng skip comment ban đầu
      commentSkip: 0,
      //cho mảng comments trước tiên là rỗng, người dùng sẽ fetch lại sau
      comments: [],
      //giá trị kiểm tra xem post này có đang thực hiện load comment không
      commentLoading: false,
      
    });
  });
  return listResult;
};

module.exports.fetchComments = async ({
  userId,
  userRole,
  filter,
  select = "",
  skip = 0,
  limit = 10,
}) => {
  const comments = await CommentModel.find(filter)
    .populate({
      path: "owner",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "avatar _id informations",
    })
    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    //lấy từ ngày mới nhất trở xuống
    .sort({ createdAt: -1 })
    .select(select);

  const commentsResult = [];

  comments.forEach((comment) => {
    let isAdmin = (isOwner = false);
    if (comment.owner._id.toString() === userId.toString()) {
      isOwner = true;
    }
    if (userRole === "admin") {
      isAdmin = true;
    }
    commentsResult.push({
      ...comment._doc,
      isOwner,
      isAdmin,
    });
  });
  return commentsResult;
};

//lấy comment cho chi tiết một bài post
module.exports.fetchComment = async ({ userId, userRole, filter }) => {
  try {
    const comments = await this.fetchComments({
      userId,
      userRole,
      filter,
      select: "",
      limit: 1,
      skip: 0,
    });
    if (!comments || comments.length <= 0) {
      return null;
    }
    return comments[0];
  } catch (err) {
    return null;
  }
};

//kiểm tra xem post dạng gì - nếu thuộc dạng groups thì cập nhật lại giá trị public của mỗi file trong bài post là false
//files: là mảng giá trị các _id
module.exports.checkPostTypeToUpdatePublicFile = async ({
  postType,
  files,
}) => {
  //kiểm tra xem post dạng gì - nếu là post dạng group thì ta cần phải sửa lại public của file là false
  if (postType === "groups") {
    for (let i = 0; i < files.length; i++) {
      await updateFile({
        filter: { _id: files[i] },
        updateData: { public: false },
      });
    }
  }
};

//xử lý khi quản trị viên tương tác với bài post trong nhóm (như sửa, xóa)
module.exports.notifyWhenManagerInteractToPostInGroup = async ({
  req,
  res,
  url,
  content,
  type,
}) => {

  const post = res.locals.currentPost;
  const user = req.user;

  //kiểm tra xem - bài post có phải thuộc group không ?
  if (!post.group) return;

  
  //vì quản trị viên có thể xóa bài post của một thành viên (đã kiểm trả ở middleware)
  // nên ta kiểm tra xem là nếu người hiện tại đang xóa bài viết != chủ nhân bài viết
  // và chủ nhân bài viết hiện vẫn đang ở trong group (vẫn là members của group)
  // thì ta sẽ gửi thông báo cho người đó

  //lấy ra thông tin nhóm
  const groupDetails = res.locals.groupDetails;
  //xác định chủ nhân của nhóm
  const owner = post.owner.toString();

  //nếu chủ nhân bài viết != người dùng đang tương tác và chủ nhân bài viết vẫn còn là thành viên của nhóm
  // thì tạo và gửi thông báo
  if (owner !== user._id.toString() && groupDetails.members.includes(owner)) {
    const notification = await createNotificationForGroup({
      userId: post.owner,
      groupDetails,
      type,
      url,
      content,
    });

    //lấy ra người dùng đó
    const userNotification = await UserModel.findOne({ _id: post.owner });
    //tăng số lượng thông báo chưa đọc của người dùng này lên 1
    userNotification.unReadNotificationCount += 1;
    await userNotification.save();

    res.locals.io.emit(`${owner}-group-notification`, {
      notification: notification._doc,
    });
  }
};
