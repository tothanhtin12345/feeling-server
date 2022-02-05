const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const randToken = require("rand-token");

//code của mình
const UserModel = require("../../models/user.models");
const { sendMail } = require("../../services/mail");
dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const ACCESS_TOKEN_LIFE = Number.parseInt(process.env.ACESS_TOKEN_LIFE) || 3600;

//create access token
//payload là _id người dùng {_id:"..."}
/*trả về {
  access_token
  expires_in,
  token_type
}*/
module.exports.generateAccessToken = (payload) => {
  try {
    const access_token = jwt.sign(
      {
        payload,
      },
      ACCESS_TOKEN_SECRET,
      {
        expiresIn: ACCESS_TOKEN_LIFE,
      }
    );
    return {
      access_token,
      expires_in: ACCESS_TOKEN_LIFE,
      token_type: "Bearer",
    };
  } catch (err) {
    throw err;
  }
};

//create refresh_token - nếu tài khoản người dùng chưa có
module.exports.generateRefreshToken = async (user) => {
  try {
    let refresh_token = user.refresh_token;
    //kiểm tra xem có refresh token chưa ?
    if (!refresh_token) {
      //chua thì tạo
      refresh_token = randToken.generate(16);
      user.refresh_token = refresh_token;
    }

    //có rồi thì vẫn có dữ liệu cũ
    //save người dùng lại
    await user.save();
  } catch (err) {
    throw err;
  }
};

//verify token
module.exports.verifyToken = ({ access_token, ignoreExpiration = false }) => {
  try {
    //thực hiện xác minh token - bị lỗi sẽ đi vào thằng catch
    //lỗi có thể là token không hợp lệ hoặc token hết hạn
    const verifyResult = jwt.verify(access_token, ACCESS_TOKEN_SECRET, {
      ignoreExpiration,
    });
    return verifyResult;
  } catch (err) {
    //lỗi thường là hết hạn hoặc không hợp lệ
    if (err.message === "jwt expired") {
      err.message = "token expired";
    }
    return { message: err.message };
  }
};

//verify token - bỏ qua việc nó bị hết hạn

//decode token => get payload ta được {username}
module.exports.decodeToken = (access_token) => {
  try {
    const decodeData = jwt.verify(access_token, ACCESS_TOKEN_SECRET, {
      //cho phép verify cho dù token đã hết hạn
      //mục đích của việc verify chỉ là lấy thông tin từ payload ra thôi
      ignoreExpiration: true,
    });
    return decodeData;
  } catch (err) {
    return null;
  }
};

//hàm lấy ra một user
module.exports.getUser = async ({
  filter,
  select = "-password -verification_code -friends -friend_requested -friend_sent",
}) => {
  // const user = await UserModel.findOne(filter).select({
  //   password: -1,
  //   verification_code: -1,
  //   friends: -1,
  //   friend_requested: -1,
  //   friend_sent: -1,
  // });

  const user = await UserModel.findOne(filter)
    .populate({
      path: "avatar",
      populate: "files",
      select: "-comments -likes -shares",
    })
    .populate({
      path: "cover",
      populate: "files",
      select: "-comments -likes -shares",
    })
    .select(select);
  return user;
};

//hàm tạo ra một mã verification code
//đồng thời lưu lại luôn trong database
//và gửi luôn đến email người nhận
module.exports.generateVerificationCode = async (user) => {
  const verificationCode = randToken.generate(6);
  //60000 * 5 bởi vì 1 phút = 60000 miliseconds giây
  // ta lấy thời gian timestamps hiện tại cộng thêm số ở trên = thời gian hết hạn
  const expirationTime = new Date(
    new Date().getTime() + 60000 * 5
  ).toISOString();
  user.verification_code = {
    code: verificationCode,
    //thời gian hết hạn được lưu ở dạng ISO String
    expirationTime,
  };
  await user.save();

  //thực hiện gửi mail
  const sendMailRes = await sendMail({
    to: user.email,
    subject: "Gửi mã xác nhận để lấy lại mật khẩu",
    html: `Đây là mã xác nhận của bạn: <h1>${verificationCode}</h1> Mã có hiệu lực trong vòng 5 phút, vui lòng sử dụng đúng thời gian chỉ định`,
  });
  return sendMailRes;
};

//hàm tạo và lưu lại email verify token
// đồng thời gửi mail đến người dùng
module.exports.createEmailVerifyToken = async ({ user, req }) => {
  //tạo mã token để verify email
  const token = randToken.generate(16);

  //xác định thời gian hiện tại
  const currentDate = new Date();

  //xác định thời gian token để verify email hết hạn = cách đổi thời gian hiện tại ra mili seconds + 5 phút (ở dạng mili seconds luôn)
  let expiredAt = currentDate.getTime() + 300000;

  //sau đó đổi lại thành dạng Date
  expiredAt = new Date(expiredAt);

  user.verifyEmail = {
    token,
    //xác định thời gian hết hạn (sẽ hết hạn sau 5p)
    expiredAt,
    //trạng thái là chưa verify
    isVerify: false,
  };

  //origin là domain của thằng app client (ví dụ như http://localhost:3000)
  const origin = req.get("origin");

  await user.save();

  //đường dẫn
  let urlTo = `${origin}/verify-email?token=${token}`;

  //sau thì lưu rồi thì gửi mail cho user
  const sendMailRes = await sendMail({
    to: user.email,
    subject: "Xác nhận email cho tài khoản của bạn",
    html: `Hãy nhấn vào liên kết dưới đây để có thể xác minh email của bạn. Lưu ý: thời hạn của liên kết này chỉ có 5 phút. 
    <div> <a href="${urlTo}">${urlTo}</a></div>`,
  });

  return sendMailRes;
};
