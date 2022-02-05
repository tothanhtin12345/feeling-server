
const createError = require("http-errors");
//code của mình

module.exports.checkIsAdmin = (req,res,next) => {
    try{
       
        const {user} = req;
        if(user.role === "admin"){
            return next();
        }
        return next(createError(401, "ERROR_AUTHORIZED"));
    }
    catch(err){
        console.log(err);
        return next(createError(500, err.message || "ERROR_UNDEFINED"));
    }
}

