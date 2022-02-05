const {validationResult} =  require('express-validator');
const createError = require("http-errors");

//check value từ body hoặc query
module.exports.formValid = (req,res,next) => {
    const validResult = validationResult(req);
    //nếu có lỗi
    if(validResult.errors.length){
        const errorMessage = validResult.errors[0].msg;
     
        return next(createError(400,errorMessage));
    }
    next();
}