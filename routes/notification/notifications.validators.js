const {check, query} = require("express-validator");

//kiểm tra các giá trị query cho message (nếu có)
module.exports.validFetchNotifications = [
  //query và if dưới đây là để kiểm tra xem có giá trị không ròi mới tiếp tục valid
  query("skip")
  .if((value,{req})=>req.query.skip)
  .isInt({min:0}).withMessage("Skip value is invalid"),
  query("limit")
  .if((value,{req})=>req.query.limit)
  .isInt({min:0}).withMessage("Limit value is invalid"),
  
  
  
]