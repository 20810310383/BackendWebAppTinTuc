const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");

// Hàm convert chung
function convertWithLibre(inputPath, outputExt, res) {
  const outputFileName = Date.now() + outputExt;
  const outputPath = path.resolve(__dirname, "../../public/uploads", outputFileName);

  const file = fs.readFileSync(inputPath);

  libre.convert(file, outputExt, undefined, (err, done) => {
    // Xóa file gốc an toàn
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (e) {
      console.warn("⚠️ Cannot remove input file:", e.message);
    }

    if (err) {
      console.error("❌ Conversion error:", err);
      return res.status(500).json({ error: "Conversion failed" });
    }

    // Lưu file kết quả
    fs.writeFileSync(outputPath, done);

    // Trả file cho client và xóa sau khi tải xong
    res.download(outputPath, outputFileName, (err) => {
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch (e) {
        console.warn("⚠️ Cannot remove output file:", e.message);
      }
      if (err) console.error("❌ Download error:", err);
    });
  });
}

// Route đa năng: /api/convert?to=pdf|docx|xlsx|pptx...
exports.convertFile = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const targetExt = req.query.to ? "." + req.query.to : ".pdf";
  convertWithLibre(req.file.path, targetExt, res);
};

// Word -> PDF
exports.wordToPdf = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  convertWithLibre(req.file.path, ".pdf", res);
};

// PDF -> Word
exports.pdfToWord = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  convertWithLibre(req.file.path, ".docx", res);
};
