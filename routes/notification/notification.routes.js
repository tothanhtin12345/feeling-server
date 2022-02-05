//phần import của các gói bên ngoài
const router = require("express").Router();
//code của mình
const {getNotification} = require("./notification.middlewares");
const {readNotificationHandler, deleteNotificationHandler, fetchNotificationsHandler} = require("./notification.controllers");
const {formValid} = require("../../middlewares/form");
const {validFetchNotifications} = require("./notifications.validators");
//origin: /notification

//fetch notifications
router.get("/",validFetchNotifications,formValid,fetchNotificationsHandler);

//đọc một notification
router.put("/read",getNotification,readNotificationHandler)

//xóa một notification
router.delete("/",deleteNotificationHandler);






module.exports = router;