//phần import của các gói bên ngoài
const router = require("express").Router();
//code của mình
const {validFetchMessages} = require("./message.validators");
const {formValid} = require("../../middlewares/form");
const {fetchMessagesHandler, deleteMessageHandler} = require("./message.controllers");
const {checkMessage} = require("./message.middlewares");


router.get("/",validFetchMessages,formValid,fetchMessagesHandler);


router.put("/delete",checkMessage,deleteMessageHandler);


module.exports = router;