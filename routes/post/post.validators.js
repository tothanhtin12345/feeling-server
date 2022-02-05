const { check, query } = require("express-validator");

//kiểm tra các giá trị query cho message (nếu có)
module.exports.validFetchPost = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
    .if((value, { req }) => req.query.skip)
    .isInt({ min: 0 })
    .withMessage("Skip value is invalid"),
  query("limit")
    .if((value, { req }) => req.query.limit)
    .isInt({ min: 0 })
    .withMessage("Limit value is invalid"),
];

module.exports.validFetchComments = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
    .if((value, { req }) => req.query.skip)
    .isInt({ min: 0 })
    .withMessage("Skip value is invalid"),
  query("limit")
    .if((value, { req }) => req.query.limit)
    .isInt({ min: 0 })
    .withMessage("Limit value is invalid"),
  check("postId")
    .exists()
    .withMessage("ERROR_POST_INFORMATION_EMPTY")
    .notEmpty()
    .withMessage("ERROR_POST_INFORMATION_EMPTY"),
];

module.exports.validPostReport = [
  check("content")
    .exists()
    .withMessage("ERROR_POST_REPORT_CONTENT_EMPTY")
    .notEmpty()
    .withMessage("ERROR_POST_REPORT_CONTENT_EMPTY")
    .isLength({ min: 12 })
    .withMessage("ERROR_POST_REPORT_MIN_LENGTH_12"),
  check("postId")
    .exists()
    .withMessage("ERROR_POST_ID_NOT_FOUND")
    .notEmpty()
    .withMessage("ERROR_POST_ID_NOT_FOUND")
    
];

module.exports.validFetchPostReportContent = [
 
  check("postId")
    .exists()
    .withMessage("ERROR_POST_ID_NOT_FOUND")
    .notEmpty()
    .withMessage("ERROR_POST_ID_NOT_FOUND")
    
];


module.exports.validDeletePostReport = [
  check("reportId")
    .exists()
    .withMessage("ERROR_POST_REPORT_ID_NOT_FOUND")
    .notEmpty()
    .withMessage("ERROR_POST_REPORT_ID_NOT_FOUND"),
  
  check("postId")
    .exists()
    .withMessage("ERROR_POST_ID_NOT_FOUND")
    .notEmpty()
    .withMessage("ERROR_POST_ID_NOT_FOUND")
    
];