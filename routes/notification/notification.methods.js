//code của mình
const NotificationModel = require("../../models/notification.models");

//tạo một notification cho dữ liệu liên quan đến User (thường cho khi gửi lời mời kết bạn, chấp nhận bạn,...)
module.exports.createNotificationForUser = async ({
  user,
  contactUser,
  content,
  type,
  url,
}) => {
  //tạo ra một notification
  const notification = new NotificationModel({
    owner: contactUser._id,
    content,
    type,
    url,
    read: false,
    fromUser: user._id,
  });
  await notification.save();

  //thêm một số dữ liệu cho avatar để hiển thị lên cho người dùng
  notification._doc.avatar = user.avatar ? { files: user.avatar.files } : null;
  return notification;
};

//tạo một notification cho dữ liệu liên quan đến group
module.exports.createNotificationForGroup = async ({
  //id người nhận thông báo
  userId,
  groupDetails,
  type,
  url,
  content,
}) => {
  //tạo ra một notification
  const notification = new NotificationModel({
    owner: userId,
    content,
    type,
    url,
    read: false,
    fromGroup: groupDetails._id,
  });
  //thêm thông tin ảnh bìa của nhóm làm avatar cho thông báo
  notification._doc.avatar = groupDetails.cover
    ? { files: groupDetails.cover.files }
    : null;
  await notification.save();
  return notification;
};

//tạo một notification cho dữ liệu liên quan đến post (thường khi like, comment hoặc share)
//ở dạng này, ta sẽ tìm một thông báo liên quan đến bài post (dựa theo post (không populate thì là id của bài post) và forPurpose)
// để tìm ra bài thông báo có liên quan, sau đó tiến hành cập nhật
//còn nếu chưa có thì tạo mới
module.exports.createNotificationForPost = async ({
  user,
  contactUser,
  content,
  type,
  url,
  postId,
  forPurpose,
}) => {
  let notification = await NotificationModel.findOne({
    "forPost.post": postId,
    "forPost.forPurpose": forPurpose,
  });

  //nếu không có thì tiến hành tạo mới
  if (!notification) {
    notification = new NotificationModel({
      owner: contactUser._id,
      type,
      forPost: { post: postId, forPurpose },
    });
  }

  //cập nhật một số thông tin
  notification.content = content;
  notification.url = url;
  notification.read = false;
  notification.fromUser = user._id;

  //lưu lại
  await notification.save();

  //thêm một số dữ liệu cho avatar để hiển thị lên cho người dùng
  notification._doc.avatar = user.avatar ? { files: user.avatar.files } : null;
  return notification;
};

//fetch notifications
module.exports.fetchNotifications = async ({ filter, skip, limit, sort }) => {
  const notifications = await NotificationModel.find(filter)
    .populate({
      path: "fromUser",
      populate: {
        path: "avatar",
        populate: "files",
        select: "files",
      },
      select: "_id avatar",
    })
    //tiếp tục populate group
    .populate({
      path: "fromGroup",
      populate: {
        path: "cover",
        populate: "files",
        select: "files",
      },
      select: "informations cover _id",
    })
    .skip(Number.parseInt(skip))
    .limit(Number.parseInt(limit))
    .sort(sort);

  const notificationsData = [];

  //thực hiện chỉnh lại thông tin để trả về cho người dùng
  notifications.map((item) => {
    let noti = {
      ...item._doc,
    };
    //nếu một thông báo có thông tin User thì laysas thông tin avatar của user
    if (noti.fromUser) {
      noti = {
        ...noti,
        avatar: item.fromUser.avatar
          ? { files: item.fromUser.avatar.files }
          : null,
      };
    }
    //nếu một thông báo có thông tin Group thì lấy thông tin ảnh bài của group làm avatar cho thông báo
    else if (noti.fromGroup) {
      noti = {
        ...noti,
        avatar: item.fromGroup.cover
          ? { files: item.fromGroup.cover.files }
          : null,
      };
    }
    notificationsData.push(noti);
  });

  return notificationsData;
};
