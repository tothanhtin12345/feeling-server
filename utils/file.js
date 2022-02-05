const fsExtra =  require("fs-extra");
const firebase = require("../services/firebase.js");
const uuidv4 = require("uuid-v4");
const saltedMd5 = require("salted-md5");
//xóa file tạm
module.exports.removeTmpFile = (path) => {
  try {
    //kiểm tra tồn tại trước khi xóa
    fsExtra.exists(path, (exist) => {
      if (exist) {
        fsExtra.removeSync(path);
      }
    });
  } catch (err) {
    console.log(err);
  }
};

//xóa nhiều file tạm thông qua mảng files
module.exports.removeTmpFiles = (files) => {
  try{
    files.forEach(file=>{
      this.removeTmpFile(file.path);
    })
  }
  catch(err){
    console.log(err);
  }
}

//di chuyển 1 file (local)
module.exports.moveSingleFile = (src, path) => {
  try {
    fsExtra.moveSync(src, path);
  } catch (err) {
    throw new Error("Error happened when moving file");
  }
  //xóa file tạm
  removeTmpFile(src);
};

//di chuyển 1 file lên nơi lưu trữ (firebase storage)
module.exports.moveFileToStorage = async (src, path) => {
  try {
    const uuid = uuidv4(); //tạo một token dành cho việc up file lên firebase storage
    const result = await firebase
      .storage()
      .bucket()
      .upload(
        //đường dẫn file ban đầu
        src,
        {
          destination: path,
          metadata: {
            //thêm dữ liệu này để tạo một access token cho phép xem file
            metadata: {
              firebaseStorageDownloadTokens: uuid,
            },
          },
        }
      );
    //lấy ra tên bucket name từ kết quả upload
    const bucketName = result[0].metadata.bucket;

    //lấy ra tên file name từ kết quả upload
    const fileName = result[0].name;

    //lấy ra đường dẫn để hiển thị file
    const url =
      "https://firebasestorage.googleapis.com/v0/b/" +
      bucketName +
      "/o/" +
      encodeURIComponent(fileName) +
      "?alt=media&token=" +
      uuid;
    //xóa file tạm
    this.removeTmpFile(src);
    //trả về đường dẫn để hiển thị
    return url;
  } catch (err) {
    throw err;
  }
};

//xóa 1 file trên nơi lưu trữ (storage firebase)
module.exports.removeFileFromStorage = async (path) => {
  try {
    const result = await firebase.storage().bucket().file(path).delete();
    return result;
  } catch (err) {
    throw err;
  }
};

//thực hiện mã hóa tên file
module.exports.saltFileName = (fileName) => {
  return saltedMd5(fileName, "SUPER-S@LT!") + "_" + fileName;
};

//lấy kiểu file (thông qua mimtype)
//ex:  image/jpeg => image
module.exports.getTypeOfFile = (mimetype) => {
  const splitVal = mimetype.split("/");
  return splitVal[0];
};
