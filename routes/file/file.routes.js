const router = require("express").Router();

//code của mình
const {multiMediaUploadChecking} = require("./file.middlewares");
const {mediaUploadHandler, removeFileHandler} = require("./file.controllers");

//origin: /file

//media là có thể gồm cả video và image
router.post("/media-upload",multiMediaUploadChecking,mediaUploadHandler)

//xóa file dựa theo path
router.delete("/remove-file",removeFileHandler)


module.exports = router;