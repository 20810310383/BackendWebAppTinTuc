const express = require("express");
const { handleSauKhiThiXong } = require("../controllers/IPLog/iplog.controller");
const router = express.Router();

router.post("/tich-diem", handleSauKhiThiXong);


module.exports = router;