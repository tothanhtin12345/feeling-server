const createError = require("http-errors");

const UserModel = require("../../models/user.models");
const { isFriend } = require("./user.methods");
const { serverErrorMessage } = require("../../contants/errorMessage");
const {addPost} = require("../post/post.methods");




//lấy ra thông tin của một người đang tương tác và gắn vào locals
//bước này cũng sẽ kiểm tra các bước cần thiết
module.exports.getContactUser = async (req,res,next) => {
  try{
    const {wallUserId} = req.body;
    // console.log(wallUserId);
    const _id = wallUserId;
    //nếu cùng là một user => trả về lỗi
    if(_id === req.user._id.toString()){
      return next(createError(400,"ERROR_USER_IS_SAME"));
    }
    const contactUser = await UserModel.findOne({_id});
    if(!contactUser){
      return next(createError(404,"ERROR_USER_NOT_FOUND"));
    }
    
    res.locals = {
      ...res.locals,
      contactUser,
    }
    
    return next();
  }
  catch(err){
    
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
}





//tạo ra một post cho phần hình ảnh (ảnh đại diện và ảnh bìa) - sau đó gắn vào res để tiếp tục xử lý
module.exports.addPostForImage = async (req,res,next) => {
  try{
    
    const newPost = await addPost(req,res);
    
    res.locals.imagePost = newPost;
    return next();
  }
  catch(err){
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
}

//hàm gắn thêm một số thông tin cho phần tạo post cho ảnh đại diện
module.exports.addMoreInformationForAvatarPost = (req,res,next) => {
  res.locals.systemType = "avatar";
  return next();
}

//hàm gắn thêm một số thông tin cho phần tạo post cho ảnh bìa
module.exports.addMoreInformationForCoverPost = (req,res,next) => {
  res.locals.systemType = "cover";
  return next();
}