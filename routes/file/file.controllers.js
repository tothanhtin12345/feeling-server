const createError = require("http-errors");

//code của mình
const { uploadFile, removeFile, removeFileFromDB } = require("./file.methods");
const FileModel = require("../../models/file.models");

//upload media file (image and video)
module.exports.mediaUploadHandler = async (req, res, next) => {
  try {
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
      const uploadResult = await uploadFile(pathRefix, _id, file);
      //các thông tin nhận được sau khi up lên cộng thêm với uid mới được thêm vào
      // const { fileUrl, fileType, path, originalname, uid } = uploadResult;

      //thêm vào mảng kết quả cuối cùng
      uploadResults.push(uploadResult);
    }

    const uploadReturns = [];

    //lưu vào csdl
    for(let i=0; i<uploadResults.length;i++){
      const item = uploadResults[i];
      //public: false - vì file thông qua hàm này được up lên không phải là của 1 bài post => cần bảo mật
      const itemSave = new FileModel({...item, public: false});
      await itemSave.save();
      //bỏ kết quả lưu vào trong mảng để trả về cho client
      uploadReturns.push(itemSave._doc);
    }
    // console.log(uploadReturns);

    //trả về các thông tin ở csdl cho người dùng
    return res.status(200).json({
      files: [...uploadReturns],
    });
  } catch (err) {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};

//xóa 1 file dựa theo path
module.exports.removeFileHandler = async (req, res, next) => {
  try {
    //path để xóa file trên server
    const { path, _id } = req.query;

    //gọi hàm xóa file ở storage
    removeFile(path);
    //gọi hàm xóa file ở csdl
    const filter = {_id};
    const removeResult = await removeFileFromDB({filter});
    
   
    //trả về cái path và _id của file đã xóa
    return res.status(200).json({
      message: "Delete file is success",
      path,
      _id,
    });
  } catch {
    return next(createError(500, err.message || "ERROR_UNDEFINED"));
  }
};
