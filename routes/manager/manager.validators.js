const { query, check, body } = require("express-validator");



module.exports.fetchGraphValidator = [
  query("graphYear").isInt().withMessage("ERROR_YEAR_IS_NOT_VALID"),
  query("type")
    .exists()
    .withMessage("ERROR_TYPE_EMPTY")
    .notEmpty()
    .withMessage("ERROR_TYPE_EMPTY")
    .custom((value, { req }) => {
      const types = ["posts", "users", "groups"];
      return types.includes(value);
    }),
];
