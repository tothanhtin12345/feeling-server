const createError = require("http-errors");
//code của mình
const { fetchMessages } = require("./message.methods");

module.exports.fetchMessagesHandler = async (req, res, next) => {
  try {
    const { skip, limit, conversationId } = req.query;
    console.log(req.query);
    const { _id: userId } = req.user;
    const messages = await fetchMessages({
      filter: {
        conversation: conversationId,
        //trường hợp mà mình đã xóa (hay nói cách khác là ẩn) tin nhắn thì sẽ không lấy lại tin nhắn này
        unDisplay: { $nin: [userId] },
      },
      skip,
      limit,
    });
    return res.status(200).json({
        messages,
    })
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.deleteMessageHandler = async (req,res,next) => {
  try{
    const {message} = res.locals;
    const {_id: userId} = req.user;
    if(!message.unDisplay.includes(userId)){
      message.unDisplay.push(userId);
      await message.save();
    }

    return res.status(200).json({
      message:"SUCCESS_DELETE_MESSAGE",
      code:"SUCCESS_DELETE_MESSAGE",
    })
    
  }
  catch(err){
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
}