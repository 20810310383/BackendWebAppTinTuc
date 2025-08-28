const express = require("express");
const { getMonHoc, createMonHoc, updateMonHoc, deleteMonHoc, getMonHocStats } = require("../controllers/MonHoc/monhoc.controller");
const router = express.Router();

router.get("/get-mon-hoc", getMonHoc);
router.get("/get-mon-hoc-status", getMonHocStats);
router.post("/create-mon-hoc", createMonHoc);
router.put("/update-mon-hoc", updateMonHoc);
router.delete("/delete-mon-hoc/:id", deleteMonHoc);

module.exports = router;