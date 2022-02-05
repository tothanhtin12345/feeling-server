const createError = require("http-errors");

//code của mình
const NotificationModel = require("../../models/notification.models");
const { fetchNotifications } = require("./notification.methods");

module.exports.fetchNotificationsHandler = async (req, res, next) => {
  try {
    const filter = {
      owner: req.user._id,
    };
    const { skip = 0, limit = 10 } = req.query;
    //lấy từ ngày cập nhật mới nhất
    const sort = { updatedAt: -1 };

    const notifications = await fetchNotifications({
      filter,
      skip,
      limit,
      sort,
    });

    //console.log(skip);

    return res.status(200).json({
      notifications: notifications,
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.readNotificationHandler = async (req, res, next) => {
  try {
    const { notification } = res.locals;
    notification.read = true;
    //đọc lại thông báo thôi nên không cần cập nhật timestamps
    await notification.save({timestamps:false});
    return res.status(200).json({
      message: "SUCCESS_NOTIFICATION_READ",
      code: "SUCCESS_NOTIFICATION_READ",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

module.exports.deleteNotificationHandler = async (req, res, next) => {
  try {
    //_id của notification
    const { _id } = req.query;
    const notification = await NotificationModel.findOneAndDelete({ _id });
   
    //nếu sau khi xóa mà không có kết quả => không tồn tại
    if (!notification) {
      return res.status(404).json({
        message: "ERROR_NOTIFICATION_NOT_FOUND",
        code: "ERROR_NOTIFICATION_NOT_FOUND",
      });
    }
    return res.status(200).json({
      message: "SUCCESS_NOTIFICATION_DELETE",
      code: "SUCCESS_NOTIFICATION_DELETE",
    });
  } catch (err) {
    console.log(err);
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
