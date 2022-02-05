const mongoose = require("mongoose");

const schema = mongoose.Schema;

const userSchema = schema(
  {
    username: {
      type: String,
    },
    password: {
      type: String,
    },

    //quyền (user, admin)
    role: {
      type:String,
      default:"user",
      enum:["admin","user"],
    },

    

    email: String,

    //các thông tin để kiểm tra một email
    verifyEmail:{
      //mã xác minh email
      token: String,
      //thời gian sẽ hết hạn
      expiredAt: Date,
      //đã xác minh chưa ?
      isVerify:{
        type: Boolean,
        default: false,
      }
    },

    avatar: {
      type: mongoose.Types.ObjectId,
      ref: "Post",
    },
    //ảnh bìa
    cover: {
      type: mongoose.Types.ObjectId,
      ref: "Post",
    },

    informations:{
      displayName: String,
      birthday: String,
      numberphone: String,
      homeAddress: String,
      workAddress: String,
      gender: {
        type: String,
        enum: ["male", "female"],
        default: "male",
      },
    },
    
    

    userConfig: {
      showFollowerCount: {
        type: Boolean,
        default: true,
      },
      showBirthday: {
        type: Boolean,
        default: true,
      },
      showNumberphone: {
        type: Boolean,
        default: true,
      },
      // showEmail: {
      //   type: Boolean,
      //   default: true,
      // },
      showWorkAddress: {
        type: Boolean,
        default: true,
      },
      showHomeAddress: {
        type: Boolean,
        default: true,
      },
    },

    //hình thức tài khoản được tạo ra - có thể là từ Google hoặc tự tạo (AtPage)
    method: String,

    refresh_token: {
      type: String,
    },

    //mã code để lấy lại tài khoản
    verification_code: {
      code: String,
      expirationTime: String,
    },

    //danh sách bạn bè
    friends: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendCount:{
      type: Number,
      default:0,
    },
    //danh sách những người mình đang theo dõi
    following: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followingCount:{
      type: Number,
      default: 0,
    },
    //danh sách người theo dõi mình
    followers: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    followerCount:{
      type: Number,
      default:0,
    },
    //yêu cầu kết bạn
    friend_requested: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendRequestCount:{
      type: Number,
      default:0,
    },
    //những lời mời kết bạn đã gửi
    friend_sent: [
      {
        type: schema.Types.ObjectId,
        ref: "User",
      },
    ],
    friendSentCount:{
      type: Number,
      default:0,
    },

    //số lượng thông báo chưa đọc
    unReadNotificationCount: {
      type: Number,
      default: 0,
    },

    
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
