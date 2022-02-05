const { query, check, body } = require("express-validator");
//kiểm tra các giá trị query cho search users (nếu có)
module.exports.validUsersQueryOptions = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
    .if((value, { req }) => req.query.skip)
    .isInt({ min: 0 })
    .withMessage("Skip value is invalid"),
  query("limit")
    .if((value, { req }) => req.query.limit)
    .isInt({ min: 0 })
    .withMessage("limit value is invalid"),
  query("username")
    .if((value, { req }) => req.query.username)
    .exists()
    .withMessage("Username value is empty"),
];

module.exports.validInformationForm = [
  check("displayName")
    .exists()
    .withMessage("ERROR_USER_INFORMATION_DISPLAYNAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USER_INFORMATION_DISPLAYNAME_EMPTY")
    .isLength({ min: 3 })
    .withMessage("ERROR_USER_INFORMATION_DISPLAYNAME_LENGTH_3"),
  check("gender")
    .exists()
    .withMessage("ERROR_USER_INFORMATION_GENDER_EMPTY")
    .notEmpty()
    .withMessage("ERROR_USER_INFORMATION_GENDER_EMPTY")
    .custom((value) => {
      console.log(value);
      if (value !== "male" && value !== "female") {
        return false;
      }
      return true;
    })
    .withMessage("ERROR_USER_INFORMATION_GENDER_INVALID"),
];

module.exports.changePasswordValidator = [
  check("currentPassword")
    .exists()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .notEmpty()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_PASSWORD_MINIMUM_6")
    .isLength({ max: 18 })
    .withMessage("ERROR_PASSWORD_MAXIMUM_18"),
  check("newPassword")
    .exists()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .notEmpty()
    .withMessage("ERROR_PASSWORD_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_PASSWORD_MINIMUM_6")
    .isLength({ max: 18 })
    .withMessage("ERROR_PASSWORD_MAXIMUM_18"),
];

module.exports.validUpdateUserConfigValidator = [
  body("showFollowerCount")
    .if((value, { req }) => req.body.showFollowerCount)
    .isBoolean()
    .withMessage("ERROR_WALL_USER_SYSTEM_FOLLOWER_COUNT_INVALID"),

  body("showBirthday")
    .if((value, { req }) => req.body.showBirthday)
    .isBoolean()
    .withMessage("ERROR_WALL_USER_SYSTEM_BIRTHDAY_INVALID"),

  body("showNumberphone")
    .if((value, { req }) => req.body.showNumberphone)
    .isBoolean()
    .withMessage("ERROR_WALL_USER_SYSTEM_NUMBERPHONE_INVALID"),

  body("showWorkAddress")
    .if((value, { req }) => req.body.showWorkAddress)
    .isBoolean()
    .withMessage("ERROR_WALL_USER_SYSTEM_WORK_ADDRESS_INVALID"),
  body("showHomeAddress")
    .if((value, { req }) => req.body.showHomeAddress)
    .isBoolean()
    .withMessage("ERROR_WALL_USER_SYSTEM_HOME_ADDRESS_INVALID"),
];


module.exports.validFetchFriends = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
  .if((value,{req})=>req.query.skip)
  .isInt({min:0}).withMessage("Skip value is invalid"),
  query("limit")
  .if((value,{req})=>req.query.limit)
  .isInt({min:0}).withMessage("Limit value is invalid"),
  
  
  
]

module.exports.validFetchPhotos = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
  .if((value,{req})=>req.query.skip)
  .isInt({min:0}).withMessage("Skip value is invalid"),
  query("limit")
  .if((value,{req})=>req.query.limit)
  .isInt({min:0}).withMessage("Limit value is invalid"),
  
  
  
]