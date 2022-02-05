const {check, query} = require("express-validator");
module.exports.validFetchMessages = [
    //giá trị skip và limit là dành cho việc lấy số lượng tin nhắn đầu tiên khi lấy dữ liệu chi tiết một conversation
    query("skip")
    .if((value,{req})=>req.query.skip)
    .isInt({min:0}).withMessage("Skip value is invalid"),
    query("limit")
    .if((value,{req})=>req.query.limit)
    .isInt({min:0}).withMessage("Limit value is invalid"),
    check("conversationId")
    .exists()
    .withMessage("ERROR_CONVERSATION_EMPTY")
    .notEmpty()
    .withMessage("ERROR_CONVERSATION_EMPTY")
  ]