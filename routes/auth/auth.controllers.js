const bcrypt = require("bcrypt");
const createError = require("http-errors");

const UserModel = require("../../models/user.models");
const { serverErrorMessage } = require("../../contants/errorMessage");
const {
  generateAccessToken,
  generateRefreshToken,
  decodeToken,
  getUser,
  generateVerificationCode,
  createEmailVerifyToken,
} = require("./auth.methods");
const randToken = require("rand-token");

//xử lý đăng ký
module.exports.registerHandler = async (req, res, next) => {
  try {
    //lấy thông tin ra
    const { username, password, displayName, email, gender } = req.body;

    //tạo mật khẩu
    const hashPassword = bcrypt.hashSync(password, 12);

    const user = {
      username,
      password: hashPassword,
      informations: {
        displayName,
        gender,
      },
      email,
      method: "AtPage",
    };
    const newUser = new UserModel(user);
    await newUser.save();

    await createEmailVerifyToken({ user: newUser, req });

    return res.status(200).json({
      code: "SUCCESS_REGISTER_NOT_VERIFY_EMAIL",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý đăng nhập
module.exports.loginHandler = async (req, res, next) => {
  try {
    const { username } = req.body;
    const user = await getUser({
      filter: { username },
    });

    //kiểm tra xem là đã kích hoạt email chưa ?
    const {verifyEmail} = user;

    //nếu chưa kích hoạt thì báo lỗi
    //****tạm thời đóng để test dữ liệu
    if(!verifyEmail || !verifyEmail.isVerify){

      //nếu không có cái verifyEmail ==> tài khoản cũ ==> chưa được gửi mail ==> tiến hành gửi
      if(!verifyEmail){
        await createEmailVerifyToken({ user: user, req }); 
      }

      return next(createError(400, "ERROR_ACCOUNT_NOT_VERIFY_EMAIL"));
    }

    //gọi hàm để tạo access_token - ta nhận được {access_token, expires_in, token_type}
    const token = generateAccessToken({ _id: user._id.toString() });

    //gọi hàm để tạo refresh_token - hàm này sẽ tạo (nếu user chưa có) và lưu lại luôn trong user
    await generateRefreshToken(user);

    return res.status(200).json({
      user: {
        //nếu ta sài dạng này thì phải ._doc để lấy ra dữ liệu
        // vì user khi dùng save là một đối tượng lớn
        ...user._doc,
        token,
      },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý đăng nhập bằng google

module.exports.googleLoginHandler = async (req, res, next) => {
  try {
    const { email, name: displayName } = req.body;
    //kiểm tra xem là tài khoản google đang đăng nhập đã tồn tại chưa
    const filter = { email, method: "Google" };
    let user = await getUser({ filter });
    //nếu chưa có thì tạo mới
    if (!user) {
      //đăng nhập = google thì không có gender - ta mặc định là male - người dùng sẽ tự đổi lại
      const newUser = {
        username: email,
        email,
        informations: {
          displayName,
          gender: "male",
        },
        method: "Google",
      };
      user = new UserModel(newUser);
      await user.save();
      //tiến hành lấy lại thông tin user trong csdl
      user = await getUser({ filter });
    }
    //gọi hàm để tạo access_token - ta nhận được {access_token, expires_in, token_type}
    const token = generateAccessToken({ _id: user._id.toString() });

    //gọi hàm để tạo refresh_token - hàm này sẽ tạo (nếu user chưa có) và lưu lại luôn trong user
    await generateRefreshToken(user);
    //trả về user
    return res.status(200).json({
      user: {
        //nếu ta sài dạng này thì phải ._doc để lấy ra dữ liệu
        // vì user khi dùng save là một đối tượng lớn
        ...user._doc,
        token,
      },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
//xử lý refresh
module.exports.refreshHandler = async (req, res, next) => {
  try {
    //kiểm tra sự tồn tại của refresh token
    if (!req.body.refresh_token) {
      return next(createError(400, "Refresh Token is not found"));
    }

    const { refresh_token } = req.body;
    const access_token = req.access_token;
    //giải mã để lấy thông tin
    const decodeData = decodeToken(access_token);
    if (!decodeData) {
      return next(createError(401, "Access Token is not valid"));
    }
    //lấy _id từ thông tin giải mã
    const _id = decodeData.payload._id;

    //kiểm tra sự tồn tại người dùng
    const user = await getUser({
      filter: { _id },
    });
    if (!user) {
      return next(createError(400, "User not found"));
    }

    //kiểm tra sự giống nhau giữa refresh token gửi lên và ở trong db
    if (user.refresh_token !== refresh_token) {
      return next(createError(400, "Refresh Token is not valid"));
    }

    //tạo một access token mới
    const token = generateAccessToken({ _id });

    user.token = token;

    return res.status(200).json({
      user: {
        ...user._doc,
        token,
      },
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý verify
module.exports.verifyHandler = async (req, res) => {
  //nếu tới được đây đã thành công valid token và lấy được thông tin user từ token

  const { _id } = req.user;

  //tạo một access token mới
  const token = generateAccessToken({ _id });
  const user = await getUser({
    filter: { _id },
  });

  return res.status(200).json({
    user: {
      ...user._doc,
      token,
    },
  });
};

//xử lý forgot-password
module.exports.forgotPasswordHandler = async (req, res, next) => {
  try {
    const { email, username } = req.body;
    const filter = { email, username };
    const user = await getUser({ filter });
    //hàm tạo, lưu vào csdl và gửi mã xác nhận để lấy lại mật khẩu
    await generateVerificationCode(user);
    //nếu đã đến được đây thì mail đã được gửi và không có lỗi gì xảy ra
    return res.status(200).json({
      message: `Đã gửi mã xác nhận để lấy lại mật khẩu của bạn thông qua email ${email}. Mã xác nhận sẽ có hiệu lực trong 5 phút, vui lòng sử dụng trong đúng thời gian chỉ định.`,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý nhận được verification code
module.exports.sendVerificationCodeHandler = async (req, res, next) => {
  try {
    //tới được đây thì đã qua các bước kiểm tra tính hợp lệ của verification code

    //ta đơn giản là trả về một tin nhắn thành công
    return res.status(200).json({
      message: "Verification code is valid",
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xử lý đặt lại mật khẩu mới từ mã xác nhận
module.exports.newPasswordHandler = async (req, res, next) => {
  try {
    const { newPassword, username } = req.body;
    const hashPassword = bcrypt.hashSync(newPassword, 12);
    const filter = { username };
    const user = await getUser({
      filter,
      select: "-friends -friend_requested -friend_sent",
    });
    user.password = hashPassword;
    user.verification_code = null;
    await user.save();
    return res.status(200).json({
      message: "Reset password is successful",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.verifyEmailHandler = async (req, res, next) => {
  try {
    const { token } = req.body;

    //nếu không có token
    if (!token) {
      return next(createError(400, "ERROR_INVALID_TOKEN"));
    }

    //từ mã token ==> lấy ra thông tin tài khoản

    const user = await UserModel.findOne({
      "verifyEmail.token": token,
    }).select("verifyEmail email");

   

    //nếu không có thì cũng trả về lỗi
    if (!user) {
      return next(createError(400, "ERROR_INVALID_TOKEN"));
    }

    //nếu có thì kiểm tra xem còn thời hạn không ?

    const verifyEmailInfor = user.verifyEmail;

    //lấy ra thời gian hết hạn của token
    const { expiredAt } = verifyEmailInfor;

    //nếu thời gian hiện tại - thời gian hết hạn (trong tương lai) <= 0 ==> còn hạn
    //ngược lại thì không
    // bé - lớn ==> âm
    // lớn - bé ==> dương

    const remainingTime = new Date().getTime() - expiredAt.getTime();

    //nếu còn hạn
    if (remainingTime <= 0) {
      //tiến hành sửa đổi dữ liệu tài khoản -- set cái mã token để verify email thành null (verify 1 lần rồi thì không cần verify nữa)
      user.verifyEmail = {
        token:null,
        isVerify: true
      }

      await user.save();

      //rồi trả về thông báo đã verify thành công
      return res.status(200).json({
        code:"SUCCESS_VERIFY_IS_OK"
      })


    }
    //nếu hết hạn
    else {
      //nếu không còn thì tạo ra một token mới và lưu lại vào tài khoản ==> gửi mail
      await createEmailVerifyToken({ user: user, req });
      //sau đó trả về thông báo đã hết hạn rồi - và dã gửi một mã khác cho người dùng qua email - yêu cầu người dùng đó kiểm tra lại email
      return res.status(200).json({
        code:"SUCCESS_VERIFY_IS_EXPIRED"
      })
    }
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
