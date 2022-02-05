const createError = require("http-errors");

//code của mình
const GroupModel = require("../../models/group.models");

//lấy nhóm để check thông tin
module.exports.getGroupDetailsMid = async (req, res, next) => {
  try {
    
    

    // dành cho trường hợp mà request là get
    if (req.query.groupId) {
      req.body.groupId = req.query.groupId;
    }

    const { groupId } = req.body;
    if (!groupId) {
      return next(createError(400, "ERROR_NOT_FOUND"));
    }
    //lấy toàn bộ thông tin
    const group = await GroupModel.findOne({ _id: groupId }).populate({
      path: "cover",
      populate: "files",
      select: "files",
    });

 

    if(!group){
      return next(createError(400,"ERROR_GROUP_NOT_FOUND"));
    }

    //gắn vào locals để xử lý ở các tuyến khác
    res.locals.groupDetails = group;

    

    next();
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//có phải người lập ra nhóm không ? (chỉ có người lập ra nhóm mới có quyền tiếp tục task tiếp theo)
module.exports.checkIsOwnerOfGroup = async (req, res, next) => {
  const groupsDetails = res.locals.groupDetails;
  if (req.user.role === "admin") {
    res.locals.isManager = true;
    return next();
  }
  const isOwner = groupsDetails.groupOwner.toString() === req.user._id.toString();
  if (!isOwner) {
    res.locals.isManager = true;
    return next(createError(401, "ERROR_AUTHORIZED"));
  }
  return next();
};

//có phải là inspector hay không ?
module.exports.checkIsInspector = async (req, res, next) => {
  const groupDetails = res.locals.groupDetails;
  const user = req.user;
  //nếu người dùng admin thì next
  if (user.role === "admin") {
    res.locals.isManager = true;
    res.locals.isAdmin = true;
    return next();
  }

  //kiểm tra xem có phải chủ nhân của nhóm hay không ? - nếu phải thì user này cũng có quyền inspector trong nhóm
  // nên next luôn
  if (groupDetails.groupOwner.toString() === user._id.toString()) {
    //gắn thông tin để tái sử dụng
    res.locals.isManager = true;
    return next();
  }

  //kiểm tra xem là trong mảng inspectors của group là user hay không ? nếu không có thì không phải inspector
  if (groupDetails.inspectors.includes(user._id)) {
    //gắn thông tin để tái sử dụng
    res.locals.isInspector = true;
    return next();
  }

  //đến đây thì ta hiểu là người dùng không có quyền
  return next(createError(401, "ERROR_AUTHORIZED"));
};

//có phải member của nhóm không ?

//có phải là inspector hay không ?
module.exports.checkIsMember = async (req, res, next) => {
  const groupDetails = res.locals.groupDetails;
  const user = req.user;
  //nếu người dùng admin thì next
  if (user.role === "admin") {
    res.locals.isMember = true;
    return next();
  }

  //kiểm tra xem là trong mảng members của group là user hay không ? nếu không có thì không phải members
  if (groupDetails.members.includes(user._id)) {
    //gắn thông tin để tái sử dụng
    res.locals.isMember = true;
    return next();
  }

  //đến đây thì ta hiểu là người dùng không có quyền
  return next(createError(401, "ERROR_AUTHORIZED_GET_MEMBERS"));
};
