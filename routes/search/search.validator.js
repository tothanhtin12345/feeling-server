const { query, check, body } = require("express-validator");

module.exports.searchValidator = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
    .if((value, { req }) => req.query.skip)
    .isInt({ min: 0 })
    .withMessage("Skip value is invalid"),
  query("limit")
    .if((value, { req }) => req.query.limit)
    .isInt({ min: 0 })
    .withMessage("Limit value is invalid"),
  query("type")
    .if((value, { req }) => req.query.type)
    .custom((value, { req }) => {
      const types = ["both", "users", "groups"];
      return types.includes(value);
    })
    .withMessage("ERROR_TYPE_IS_NOT_VALID"),
];

