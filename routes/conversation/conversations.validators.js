const {check, query} = require("express-validator");

//kiểm tra các giá trị query cho việc fetch Conversations (nếu có)
module.exports.validFetchConversations = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
  .if((value,{req})=>req.query.skip)
  .isInt({min:0}).withMessage("Skip value is invalid"),
  query("limit")
  .if((value,{req})=>req.query.limit)
  .isInt({min:0}).withMessage("Limit value is invalid"),
]

module.exports.validGetConversationDetails = [
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

module.exports.validCreateGroup = [
  check("displayName")
  .exists()
  .withMessage("ERROR_DISPLAY_NAME_EMPTY")
  .notEmpty()
  .withMessage("ERROR_DISPLAY_NAME_EMPTY")
]