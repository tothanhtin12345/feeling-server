const createError = require("http-errors");

//code của mình
const {} = require("../user/user.methods");
const { getUser } = require("../auth/auth.methods");
const { getFile, mediaUpload } = require("../file/file.methods");
const { getPost } = require("./post.methods");

const GroupModel = require("../../models/group.models");

//middlewares gọi hàm xử lý tải file lên storage và lưu vào csdl
//và gắn thông tin vừa lưu vào req.body để thêm
module.exports.parseFilesPostData = async (req, res, next) => {
  try {
    const filesResult = await mediaUpload(req);
    //lấy ra các _id của các file được lưu trong csdl
    const files = [];
    filesResult.forEach((file) => {
      files.push(file._id);
    });

    //gắn vào body để tiếp tục sử dụng ở các bước sau
    req.body.files = files;
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//phân tách các dữ liệu của một bài post được gửi lên
//lưu vào local
module.exports.parsePostData = (req, res, next) => {
  //lấy các thông tin ra
  //files là một mảng các _id của file
  //_id, filesToDelte: sẽ có nếu người dùng thực hiện chức năng chỉnh sửa bài post
  //group: sẽ có nếu bài đăng từ group
  const {
    files,
    content,
    privacy,
    type,
    tags,
    _id,
    filesToDelete,
    sharedPost,
    title,
    groupId: group,
  } = req.body;
  //lưu vào local
  res.locals = {
    ...res.locals,
    files,
    content,
    privacy,
    type,
    tags,
    _id,
    filesToDelete,
    sharedPost,
    title,
    group,
  };
  return next();
};
//kiểm tra dữ liệu của data bài post
module.exports.isValidPostData = async (req, res, next) => {
  try {
    const { files = [], content = "", tags, sharedPost, group } = res.locals;
    //bắt buộc phải có 1 trong 3 dữ liệu là files (các id của file)
    //hoặc content hoặc bài viết được chia sẻ
    // if (!sharedPost && (!files || files.length <= 0) && content.trim().length <= 0) {
    //   return next(createError(400, "ERROR_POST_NOT_ENOUGH_DATA"));
    // }
    //kiểm tra xem nếu có tags (mảng các _id người dùng)
    //và các _id người dùng này có tồn tại trong csdl không ?
    if (tags && tags.length > 0) {
      for (let i = 0; i < tags.length; i++) {
        //_id người dùng
        const _id = tags[i];
        const filter = { _id };
        const select = "username";
        const user = await getUser({ filter, select });
        if (!user) {
          return next(createError(400, "ERROR_POST_TAGS_NOT_FOUND_USER"));
        }
      }
    }

    //nếu có thông tin về nhóm ==> đăng bài cho nhóm ==> kiểm tra xem nhóm có tồn tại không ?
    if(group){
      const groupInfor = await GroupModel.findOne({_id: group});
      if(!groupInfor){
        return next(createError(400, "ERROR_POST_GROUP_NOT_EXIST"));
      }
    }

    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra xem một bài post có tồn tại hay không ?
module.exports.isExistPost = async (req, res, next) => {
  try {
    //_id: id của bài được chỉnh sửa - sẽ có khi thực hiện chức năng chỉnh sửa bài viết
    //sharedPost: id của bài viết được chia sẻ - sẽ có khi thực hiện chức năng chia sẻ bài viết
    const { _id, sharedPost } = req.body;
    const { deletePostId } = req.query;

    const filter = { _id: _id || sharedPost || deletePostId };

    const post = await getPost({
      filter,
      select: "_id privacy type owner group",
    });
    if (!post) {
      return next(createError(400, "ERROR_POST_NOT_EXIST"));
    }

    //gán vào biến local bài post vừa lấy ra để khỏi mắc công truy vấn lại csdl và có thể dùng về phía sau
    res.locals.currentPost = post;
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra xem có phải chủ nhân của bài post hay không ?
module.exports.isOwnerOfPost = async (req, res, next) => {
  try {
    const user = req.user;
    

    //lấy ra bài viết đang tương tác ở middlewares trước (khỏi mắc công truy vấn lại)
    const post = res.locals.currentPost;

    

    //nếu bài post thuộc nhóm
    
    if (post.group) {
      //thì lấy ra nhóm đó
      const group = await GroupModel.findOne({ _id: post.group }).populate({
        path: "cover",
        populate: "files",
        select: "files",
      });
      
      //và kiểm tra xem - người dùng hiện tại có phải là chủ nhân (quản trị viên của nhóm không ?)
      //nếu phải thì đi tiếp
      if (group.groupOwner.toString() === user._id.toString()) {
        res.locals.groupDetails = group;
        return next();
      }
    }

    //nếu người dùng là admin thì cho phép đi tiếp
    if (user.role === "admin") {
      return next();
    }

    //kiểm tra là người dùng có phải là chủ bài post ?
    if (post.owner.toString() !== user._id.toString()) {
      return next(createError(400, "ERROR_POST_NOT_OWNER"));
    }

    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra xem có phải bài post muốn chia sẻ là thuộc một group không (type === groups). Nếu phải thì => không cho phép share nữa
module.exports.isInAGroup = async (req, res, next) => {
  try {
    //lấy ra bài viết được truy vấn ở middlewares trước
    const post = res.locals.currentPost;
    if (post.type === "groups") {
      return next(createError(400, "ERROR_POST_UNSUPPORTED"));
    }
    next();
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
