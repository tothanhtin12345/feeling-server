const mongoose = require("mongoose");


const {GROUP_TYPE, INDIVIDUAL_TYPE} = require("../contants/room");

const schema = mongoose.Schema;

const roomSchema = schema({
  //danh sách người tham gia phòng chat
  users:[
    {type:schema.Types.ObjectId, ref:"User"}
  ],
  //kiểu phòng là phòng chat cá nhân (INDIVIDUAL) hay nhiều người (GROUP)
  type:{
    type:String,
    //giới hạn
    enum:[GROUP_TYPE, INDIVIDUAL_TYPE],
    default:INDIVIDUAL_TYPE,
  },
  //những người nào đã đọc tin nhắn của phòng ?
  read:[
    {type:schema.Types.ObjectId, ref:"User"},
  ],
  //các tin nhắn
  messages:[
    {type:schema.Types.ObjectId, ref:"Message"},
  ],
  //số lượng tin nhắn - thêm field này sẽ giúp truy vấn nhanh hơn
  // trong trường ta query dữ liệu theo số lượng tin nhắn
  messagesCount:{
    type:Number,
    default:0,
  }
},{timestamps: true});

module.exports = mongoose.model("Room",roomSchema);