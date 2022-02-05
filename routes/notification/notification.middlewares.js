const createError = require("http-errors");
//code của mình
const NotificationModels = require("../../models/notification.models");

//kiểm tra xem có phải chủ nhân của
module.exports.getNotification = async (req, res, next) => {
  try {
    const { _id } = req.body;
    const notification = await NotificationModels.findOne({ _id });
    res.locals.notification = notification;
    return next();
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
