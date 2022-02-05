//phần import của các gói bên ngoài
const router = require("express").Router();

//phần import của code tự làm
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  verificationCodeValidator,
  newPasswordValidator,
  changePasswordValidator,
} = require("./auth.validators");
const { formValid } = require("../../middlewares/form");
const {
  isExistRegister,
  isExistLogin,
  getAccessToken,
  setIgnoreExpirationTime,
  isValidAccessToken,
  isExistEmailRegister,
  isUsedGoogleEmail,
  isSameUsernameAndEmail,
  isValidVerificationCode,
} = require("./auth.middlewares");
const {
  loginHandler,
  googleLoginHandler,
  registerHandler,
  refreshHandler,
  verifyHandler,
  forgotPasswordHandler,
  sendVerificationCodeHandler,
  newPasswordHandler,
  changePasswordHandler,
  verifyEmailHandler,
} = require("./auth.controllers");

//origin: /auth

//route đăng ký
router.post(
  "/register",
  registerValidator,
  formValid,
  isExistRegister,
  isExistEmailRegister,
  registerHandler
);

//route đăng nhập
router.post("/login", loginValidator, formValid, isExistLogin, loginHandler);

//route đăng nhập cho google
router.post("/login-google", isUsedGoogleEmail, googleLoginHandler);

//route refresh
router.post("/refresh", getAccessToken, refreshHandler);

//route verify (dành cho người dùng quay trở lại app và lấy thông tin user từ access token lưu ở local của app)
router.get("/verify", getAccessToken, isValidAccessToken, verifyHandler);

//route forgot-password để thông qua username và email được gửi lên
//và tiến hành gửi một verification-code qua email
router.post(
  "/forgot-password",
  forgotPasswordValidator,
  formValid,
  isSameUsernameAndEmail,
  forgotPasswordHandler
);

//nhận mã verification-code
router.post(
  "/send-verification-code",
  verificationCodeValidator,
  formValid,
  isValidVerificationCode,
  sendVerificationCodeHandler
);

//đặt lại mật khẩu mới
router.post(
  "/new-password",
  newPasswordValidator,
  formValid,
  newPasswordHandler
);

//xác minh email
router.post("/verify-email",verifyEmailHandler)

module.exports = router;
