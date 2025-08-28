const express = require("express");
const { createDeThi, getDeThi, updateProduct, deleteBode, getOneDeThi, countBoDeByMonHoc, getDetailDeThi, addMultipleCauHoi, updateMultipleCauHoi, importBoDe, deleteCauHoi } = require("../controllers/DeThi/deThi.controller");
const uploadMiddleware = require("../controllers/Upload/upload.middleware");
const router = express.Router();

router.get("/get-bo-de", getDeThi);
router.get("/get-detail-bo-de", getDetailDeThi);
router.get("/get-one-bo-de", getOneDeThi);
router.get('/count-bo-de-by-monhoc', countBoDeByMonHoc);

router.post("/create-bo-de", createDeThi);
router.post("/add-multiple-cau-hoi", addMultipleCauHoi);
router.put("/update-bo-de", updateProduct);
router.post("/update-multiple-cau-hoi", updateMultipleCauHoi);
router.delete("/delete-bo-de/:id", deleteBode);

router.post('/import-cauhoi', uploadMiddleware.single('file'), importBoDe);
router.delete('/delete-cau-hoi/:idBoDe/:idCauHoi', deleteCauHoi);


module.exports = router;