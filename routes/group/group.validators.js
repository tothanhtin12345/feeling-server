const { check, query } = require("express-validator");

module.exports.validNewGroup = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  
  check("groupName")
    .exists()
    .withMessage("ERROR_GROUP_NAME_EMPTY")
    .notEmpty()
    .withMessage("ERROR_GROUP_NAME_EMPTY")
    .isLength({ min: 6 })
    .withMessage("ERROR_GROUP_NAME_MIN")
    .isLength({max:30})
    .withMessage("ERROR_GROUP_NAME_MAX")
];




module.exports.validFetchGroups= [
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


module.exports.validFetchJoinRequestList= [
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


module.exports.validFetchMembers = [
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


