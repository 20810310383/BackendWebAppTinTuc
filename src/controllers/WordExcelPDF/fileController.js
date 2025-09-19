const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");

// Hàm convert chung
function convertWithLibre(inputPath, outputExt, res) {
  const outputPath = path.join(__dirname, "../../public/uploads", Date.now() + outputExt);
  const file = fs.readFileSync(inputPath);

  libre.convert(file, outputExt, undefined, (err, done) => {
    fs.unlinkSync(inputPath); // xoá file gốc sau khi convert

    if (err) {
      console.error("❌ Conversion error:", err);
      return res.status(500).json({ error: "Conversion failed" });
    }

    fs.writeFileSync(outputPath, done);
    res.download(outputPath, () => fs.unlinkSync(outputPath)); // tải xong xoá
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
