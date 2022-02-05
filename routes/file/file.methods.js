const FileModel = require("../../models/file.models");

//hàm sử dụng service để upload file lên storage và xử lý các thông tin về file
const {
  moveFileToStorage,
  saltFileName,
  getTypeOfFile,
  removeFileFromStorage,
} = require("../../utils/file.js");

//pathPrefix: dùng để kết hợp với _id đặt tên đầu tiên cho đường dẫn path
module.exports.uploadFile = async (pathPrefix, _id, file) => {
  //mã hóa tên file (mã hóa lần nữa để giảm thiểu tối đa tỉ lệ trùng tên)
  const fileName = saltFileName(file.filename);
  //đường dẫn file tạm thời
  const src = file.path;
  //path để up lên storage
  const path = pathPrefix + _id.toString() + "/" + fileName;
  //đường dẫn để hiển thị
  const fileUrl = await moveFileToStorage(src, path);
  //kiểu file - được xác định thông qua mimetype
  const fileType = getTypeOfFile(file.mimetype);
  //tên file ban đầu
  const originalname = file.originalname;
  //trả về các thông tin trên
  return {
    fileUrl,
    fileType,
    path,
    originalname,
  };
};

//một hàm dùng để upload file lên storage và csdl
//sau đó sễ trả về các thông tin được thêm vào csdl
module.exports.mediaUpload = async (req) => {
  const files = req.files;
  const uploadResults = [];

  //duyệt và up từng file lên firebase
  for (i = 0; i < files.length; i++) {
    let file = files[i];
    //tiến hành chuyển từng file lên firebase

    //lấy ra _id của người dùng (dùng để đặt path cho file)
    const { _id } = req.user;
    const pathRefix = "media/";

    //tiến hành up lên firebase
    let uploadResult = await this.uploadFile(pathRefix, _id, file);
    uploadResult={
      ...uploadResult,
      //chủ nhân của hình
      owner: _id,
    }
    //các thông tin nhận được sau khi up lên cộng thêm với uid mới được thêm vào
    // const { fileUrl, fileType, path, originalname, uid } = uploadResult;

    //thêm vào mảng kết quả cuối cùng
    uploadResults.push(uploadResult);
  }

  const uploadReturns = [];

  //lưu vào csdl
  for (let i = 0; i < uploadResults.length; i++) {
    const item = uploadResults[i];
    const itemSave = new FileModel(item);
    await itemSave.save();
    //bỏ kết quả lưu csdl vào trong mảng
    uploadReturns.push(itemSave._doc);
  }

  return uploadReturns;
};

module.exports.removeFileFromDB = async ({ filter }) => {
  //xóa ở trong csdl
  const deleteResult = await FileModel.findOneAndDelete(filter);
  return deleteResult;
};

module.exports.removeFile = async (path) => {
  try {
    //hàm này là async - nhưng ta không cần chờ nó
    removeFileFromStorage(path);
  } catch (err) {
    throw err;
  }
};

//lấy ra 1 file
module.exports.getFile = async ({ filter, select }) => {
  const file = await FileModel.findOne(filter).select(select);
  return file;
};

//chỉnh sửa 1 file
 module.exports.updateFile = async ({filter, updateData}) => {
  await FileModel.updateOne(filter,updateData);
 }