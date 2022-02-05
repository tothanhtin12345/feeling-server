const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/tmp");
  },
  filename: (req, file, cb) => {
    console.log(file);
    cb(null, +Date.now() + file.originalname);
  },
});

module.exports.multerUploadImage = multer({
  storage,
  //checkfile
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("File is not image"), false);
    } else {
      cb(null, true);
    }
  },
});

//chuyên dùng cho hình ảnh và video
module.exports.multerMediaFileupload = multer({
  storage,
  fileFilter: (req, file, cb) => {
   const fileSize = parseInt(req.headers['content-length']);

  //  console.log(fileSize)

    if (!file.mimetype.startsWith("image/") && !file.mimetype.startsWith("video/")) {
      cb(new Error("ERROR_FILE_INVALID"), false);
    }
    else {
      cb(null, true);
    }
  },
});
