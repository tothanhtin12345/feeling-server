const bcrypt = require("bcrypt");
const createError = require("http-errors");

//code của mình
const UserModel = require("../../models/user.models");
const { serverErrorMessage } = require("../../contants/errorMessage");
const { verifyToken, getUser } = require("./auth.methods");

//exist user (dựa vào username)
const isExistUser = async (req) => {
  try {
    const { username } = req.body;
    const user = await UserModel.findOne({ username });
    if (user) {
      return user;
    }
    return null;
  } catch (err) {
    throw err;
  }
};

//Kiểm tra sự tồn tại của một email
//nếu có thì trả về tài khoản có email đó
const isExistEmail = async (req) => {
  try {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    if (user) {
      return user;
    }
    return null;
  } catch (err) {
    throw err;
  }
};

//kiểm tra tồn tại tài khoản trước khi register
module.exports.isExistRegister = async (req, res, next) => {
  try {
    const user = await isExistUser(req);
    if (user) {
      return next(createError(400, "ERROR_USERNAME_EXIST"));
    }
    next();
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra sự tồn tại của email trước khi register
module.exports.isExistEmailRegister = async (req, res, next) => {
  try {
    const user = await isExistEmail(req);
    if (user) {
      return next(createError(400, "ERROR_EMAIL_EXIST"));
    }
    next();
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra tồn tại tài khoản trước khi login
module.exports.isExistLogin = async (req, res, next) => {
  try {
    const user = await isExistUser(req);
    //nếu tài khoản không tồn tại hoặc
    //nếu tài khoản thuộc phương thức đăng nhập bằng google thì trả về lỗi
    if (!user || user.method === "Google") {
      return next(createError(400, "ERROR_ACCOUNT_NOT_EXIST"));
    }

    //check password
    const passwordReq = req.body.password;
    const hashPassword = user.password;
    if (!bcrypt.compareSync(passwordReq, hashPassword)) {
      return next(createError(400, "ERROR_ACCOUNT_NOT_EXIST"));
    }
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra xem là email từ hình thức đăng nhập = google đã được dùng để tạo một tài khoản nào đó chưa ?
module.exports.isUsedGoogleEmail = async (req, res, next) => {
  try {
    //kiểm tra xem là email từ hình thức đăng nhập bằng Google đã được dùng để tạo một tài khoản dạng AtPage nào đó chưa ?
    const filter = { email: req.body.email, method: "AtPage" };
    const user = await getUser({ filter });

    if (user) {
      return next(createError(400, "ERROR_EMAIL_EXIST"));
    }
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//hàm dùng để lấy accessToken từ Headers trong request của người dùng
//sau đó gắn vào req
exports.getAccessToken = (req, res, next) => {
  const authorization = req.header("Authorization");
  if (!authorization) {
    return next(createError(401, "Access Token is not found"));
  }
  //token gửi lên sẽ có dạng Bear token..
  //do đó ta phân tách ra là lấy ở vị trí 1 là token
  const tokenData = authorization.split(" ");
  const access_token = tokenData[1];
  if (!access_token) {
    return next(createError(401, "Access Token is not found"));
  }

  //gắn vào req
  req.access_token = access_token;
  next();
};

//valid token và gắn thông tin user lấy được từ việc giải mã gắn vào req => req.user
module.exports.isValidAccessToken = async (req, res, next) => {
  try {
    //xem xét có bỏ qua việc hết hạn hay không (mặc định nếu không có là false)
    const { ignoreExpiration = false } = res.locals;
    //kiểm tra tính valid của token
    //ignoreExpiration có nghĩa là valid ngay cả khi nó bị hết hạn - nhưng vẫn phải hợp lệ
    const verifyResult = verifyToken({
      access_token: req.access_token,
      ignoreExpiration,
    });
    //nếu có message nghĩa là có lỗi trong quá trình valid
    //bị không hợp lệ hoặc hết hạn
    if (verifyResult.message) {
      return next(createError(401, verifyResult.message));
    }
    //nếu không có lỗi thì lấy ra id của người dùng --> tìm trong csdl --> gắn vào req
    const userId = verifyResult.payload._id;
    // console.log(verifyResult);
    const user = await UserModel.findById(userId)
      .populate({
        path:"avatar",
        populate:"files",
      })
      .populate({
        path:"cover",
        populate:"files",
      })

    if (!user) {
      return next(createError(400, "User not found"));
    }
    // //kiểm tra xem có avatar không để cập nhật
    // if (!user._doc.avatar) {
    //   user._doc.avatar = {
    //     fileUrl:
    //       "https://firebasestorage.googleapis.com/v0/b/react-http-c3250.appspot.com/o/public%2Fsoldier_helmet_art_123765_1920x1080.jpg?alt=media&token=45fa6580-f8c2-470b-aeb2-c7100b0b7721",
    //     fileType: "image",
    //     //có phải chủ nhân của hình không ?
    //     isOwner: false,
    //   };
    // }
    // //tương tự với ảnh bài
    // if (!user._doc.cover) {
    //   user._doc.cover = {
    //     fileUrl:
    //       "https://firebasestorage.googleapis.com/v0/b/react-http-c3250.appspot.com/o/public%2Fastronaut_scuba_diver_underwater_161555_1280x720.jpg?alt=media&token=99bb1d67-b7b0-4c35-8135-bd136617cd13",
    //     fileType: "image",
    //     //có phải chủ nhân của hình không ?
    //     isOwner: false,
    //   };
    // }
    req.user = user;
    return next();
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//thiết lập bỏ qua kiểm tra thời gian hết khi valid token trước khi chuyển qua isValidAccessToken
module.exports.setIgnoreExpirationTime = (req, res, next) => {
  //set true để thông báo lát nữa thông báo cho hàm isValidAccessToken() biết rằng mình chấp nhận
  //bỏ qua việc xét thời gian hết hạn
  res.locals.ignoreExpiration = true;
  return next();
};

//kiểm tra xem - thông tin username và email có phải là chung 1 tài khoản và tài khoản này phải có method là "AtPage"
//middleware dùng cho cho chức năng forgot-password
module.exports.isSameUsernameAndEmail = async (req, res, next) => {
  try {
    const { email, username } = req.body;
    const filter = { email, username };
    const user = await getUser({ filter });

    console.log(user);
    if (!user) {
      return next(createError(400, "ERROR_FORGOT_PASSWORD_NOT_SAME"));
    }
    if (user.method === "Google") {
      return next(createError(400, "ERROR_FORGOT_PASSWORD_NOT_SUPPORT"));
    }
    return next();
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//kiểm tra tính hợp lệ của verification code
module.exports.isValidVerificationCode = async (req, res, next) => {
  try {
    const { username, email, verificationCode } = req.body;
    const filter = {
      username,
      email,
    };
    const user = await getUser({
      filter,
      select: "-password -friends -friend_requested -friend_sent",
    });

    //nếu không tồn tại tài khoản
    if (!user) {
      return next(createError(400, "ERROR_ACCOUNT_NOT_EXIST"));
    }
    //nếu mã không khớp
    if (user.verification_code.code !== verificationCode) {
      return next(createError(400, "ERROR_VERIFICATION_CODE_NOT_CORRECT"));
    }

    //xử lý thời gian hết hạn
    const expirationTime = user.verification_code.expirationTime;

    const remainingTime =
      new Date(expirationTime).getTime() - new Date().getTime();
    //nếu thời gian bị hết hạn
    if (remainingTime <= 0) {
      return next(createError(400, "ERROR_VERIFICATION_CODE_EXPIRED"));
    }
    return next();
  } catch {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
