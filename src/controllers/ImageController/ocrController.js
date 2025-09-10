// controllers/ImageController/ocrController.js
const fs = require("fs");
const path = require("path");
const Tesseract = require("tesseract.js");

// ⚡ OCR: convert ảnh ra text
const imageToText = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const imagePath = req.file.path;

    const { data } = await Tesseract.recognize(imagePath, "eng+vie", {
      logger: (m) => console.log(m), // log tiến trình OCR
    });

    // không xoá file gốc để user có thể xem lại
    return res.json({
      text: data.text,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "OCR failed" });
  }
};

module.exports = { imageToText };
