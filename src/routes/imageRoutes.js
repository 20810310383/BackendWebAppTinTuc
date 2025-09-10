const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { removeBg, resizeImage } = require("../controllers/ImageController/imageController");
const fs = require("fs");   // 👈 thêm dòng này

// Lưu file tạm vào public/uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../public/uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // tạo nếu chưa có
    }
    cb(null, uploadPath);
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
