const { removeTmpFiles } = require("../../utils/file.js");
const createError = require("http-errors");
//code của mình
const { multerMediaFileupload } = require("../../middlewares/multer-upload");

//xử lý file (hình ảnh hoặc video) sau khi đã được upload vào thư mục tạm
module.exports.multiMediaUploadChecking = (req, res, next) => {
  const uploadResult = multerMediaFileupload.array("files");
  uploadResult(req, res, (err) => {
    if (err) {
      return next(createError(400, err.message));
    }

    //duyệt lại độ lớn từng file - trong multer mỗi file không có hiển thị size
    //nếu độ lớn không hợp lệ thì trả về lỗi và xóa file trong thư mục tạm

    const files = req.files;

    for (let i = 0; i < files.length; i++) {
      let file = files[i];

      //nếu là hình mà lớn hơn 10mb thì trả về lỗi
      if (file.mimetype.startsWith("image/") && file.size > 10485760) {
        removeTmpFiles(files); //xóa hết file tạm

        return next(createError(400, "ERROR_FILE_IMAGE_LIMIT_10MBS"));
      }
      //nếu là video mà lớn hơn 50mb thì trả về lỗi
      else if (file.mimetype.startsWith("video/") && file.size > 52428800) {
        removeTmpFiles(files); //xóa hết file tạm
        return next(createError(400, "ERROR_FILE_VIDEO_LIMIT_50MBS"));
      }
    }

    return next();
  });
};
