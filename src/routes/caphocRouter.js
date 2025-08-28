const express = require("express");
const { getCapHoc, createCapHoc, updateCapHoc, deleteCapHoc } = require("../controllers/TrinhDo/trinhdo.controller");
const router = express.Router();

router.get("/get-cap-hoc", getCapHoc);
router.post("/create-cap-hoc", createCapHoc);
router.put("/update-cap-hoc", updateCapHoc);
router.delete("/delete-cap-hoc/:id", deleteCapHoc);

module.exports = router;