const router = require("express").Router();



//code của mình
const {searchValidator} = require("./search.validator");
const { formValid } = require("../../middlewares/form");
const {searchHandler} = require("./search.controllers");
//orgin: search

router.get("/",searchValidator,formValid,searchHandler);





module.exports = router;