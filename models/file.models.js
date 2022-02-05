const mongoose = require("mongoose");

const schema = mongoose.Schema;

const fileSchema = schema(
  {
    // đường dẫn hiển thị của file
    fileUrl: String,
    //kiểu file dựa vào mimtype (trong project này chỉ có image hoặc video)
    fileType: String,
    //path để tương tác với storage firebase
    path: String,
    //tên ban đầu của file
    originalname: String,
    //chủ nhân của hình
    owner:{
      type: schema.Types.ObjectId,
      ref: "User",
    },
    //có thể show một cách công khai hay không ? (Dùng trong chức năng quản lý hình ảnh ở tường nhà)
    public:{
      type: Boolean,
      default:true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("File", fileSchema);
