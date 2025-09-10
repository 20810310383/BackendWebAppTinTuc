const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { removeBg, resizeImage } = require("../controllers/ImageController/imageController");

// Lưu file tạm vào public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Routes
router.post("/remove-bg", upload.single("image"), removeBg);
router.post("/resize", upload.single("image"), resizeImage);

module.exports = router;
