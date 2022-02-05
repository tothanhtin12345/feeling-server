const { check } = require("express-validator");

//valid register form
module.exports.registerValidator = [
  check("displayName")
    .exists()
    .withMessage("ERROR_DISPLAY_NAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_DISPLAY_NAME_EMPTY")
    .isLength({ min: 3 })
    .withMessage("ERROR_DISPLAY_NAME_MINIUM_3"),

  check("username")
    .exists()
    .withMessage("ERROR_USERNAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USERNAME_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_USERNAME_MINIMUM_5")
    .isLength({ max: 26 })
    .withMessage("ERROR_USERNAME_MAXIMUM_26"),

  check("password")
    .exists()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .notEmpty()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_PASSWORD_MINIMUM_6")
    .isLength({ max: 18 })
    .withMessage("ERROR_PASSWORD_MAXIMUM_18"),

  check("email")
    .exists()
    .withMessage("ERROR_EMAIL_EMPTY")
    .notEmpty()
    .withMessage("ERROR_EMAIL_EMPTY")
    .isEmail()
    .withMessage("ERROR_EMAIL_INVALID"),
];
//valid login form
module.exports.loginValidator = [
  check("username")
    .exists()
    .withMessage("ERROR_USERNAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USERNAME_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_USERNAME_MINIMUM_5")
    .isLength({ max: 26 })
    .withMessage("ERROR_USERNAME_MAXIMUM_26"),

  check("password")
    .exists()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .notEmpty()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_PASSWORD_MINIMUM_6")
    .isLength({ max: 18 })
    .withMessage("ERROR_PASSWORD_MAXIMUM_18"),
];
//valid forgot password form
module.exports.forgotPasswordValidator = [
  check("username")
    .exists()
    .withMessage("ERROR_USERNAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USERNAME_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_USERNAME_MINIMUM_5")
    .isLength({ max: 26 })
    .withMessage("ERROR_USERNAME_MAXIMUM_26"),
  check("email")
    .exists()
    .withMessage("ERROR_EMAIL_EMPTY")
    .notEmpty()
    .withMessage("ERROR_EMAIL_EMPTY")
    .isEmail()
    .withMessage("ERROR_EMAIL_INVALID"),
];

//valid verification code form
module.exports.verificationCodeValidator = [
  check("username")
    .exists()
    .withMessage("ERROR_USERNAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USERNAME_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_USERNAME_MINIMUM_5")
    .isLength({ max: 26 })
    .withMessage("ERROR_USERNAME_MAXIMUM_26"),
  check("email")
    .exists()
    .withMessage("ERROR_EMAIL_EMPTY")
    .notEmpty()
    .withMessage("ERROR_EMAIL_EMPTY")
    .isEmail()
    .withMessage("ERROR_EMAIL_INVALID"),
  check("verificationCode")
    .exists()
    .withMessage("ERROR_VERIFICATION_CODE_EMPTY")
    .notEmpty()
    .withMessage("ERROR_VERIFICATION_CODE_EMPTY"),
];

module.exports.newPasswordValidator = [
  check("username")
    .exists()
    .withMessage("ERROR_USERNAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USERNAME_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_USERNAME_MINIMUM_5")
    .isLength({ max: 26 })
    .withMessage("ERROR_USERNAME_MAXIMUM_26"),
  check("email")
    .exists()
    .withMessage("ERROR_EMAIL_EMPTY")
    .notEmpty()
    .withMessage("ERROR_EMAIL_EMPTY")
    .isEmail()
    .withMessage("ERROR_EMAIL_INVALID"),
  check("newPassword")
    .exists()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .notEmpty()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_PASSWORD_MINIMUM_6")
    .isLength({ max: 18 })
    .withMessage("ERROR_PASSWORD_MAXIMUM_18"),
  check("verificationCode")
    .exists()
    .withMessage("ERROR_VERIFICATION_CODE_EMPTY")
    .notEmpty()
    .withMessage("ERROR_VERIFICATION_CODE_EMPTY"),
];

