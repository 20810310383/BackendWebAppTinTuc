const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");

// Hàm convert chung
function convertWithLibre(req, res, inputPath, outputExt) {
  const outputFileName = Date.now() + outputExt;
  const outputPath = path.resolve(__dirname, "../../public/uploads", outputFileName);

  const file = fs.readFileSync(inputPath);

  libre.convert(file, outputExt, undefined, (err, done) => {
    // Xóa file gốc
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

    // Sinh URL động theo host khi gọi API
    const fileUrl = `https://backend.dantri24h.com/uploads/${outputFileName}`;

    res.json({
      success: true,
      url: fileUrl,
      name: outputFileName,
    });
  });
}

// Route đa năng: /api/convert?to=pdf|docx|xlsx|pptx...
exports.convertFile = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const targetExt = req.query.to ? "." + req.query.to : ".pdf";
  convertWithLibre(req, res, req.file.path, targetExt);
};

// Word -> PDF
exports.wordToPdf = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  convertWithLibre(req, res, req.file.path, ".pdf");
};

// PDF -> Word (workaround: PDF -> ODT -> DOCX)
exports.pdfToWord = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  console.log("📥 PDF input:", req.file.path);

  const inputPath = req.file.path;
  const odtPath = inputPath.replace(/\.pdf$/, ".odt");
  const outputFileName = Date.now() + ".docx";
  const outputPath = path.resolve(__dirname, "../../public/uploads", outputFileName);

  const pdfBuffer = fs.readFileSync(inputPath);

  // Step 1: PDF -> ODT
  libre.convert(pdfBuffer, ".odt", undefined, (err, odtBuffer) => {
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); // xoá file gốc
    if (err) {
      console.error("❌ PDF -> ODT error:", err);
      return res.status(500).json({ error: "PDF to ODT failed" });
    }

    fs.writeFileSync(odtPath, odtBuffer);

    // Step 2: ODT -> DOCX
    const odtFile = fs.readFileSync(odtPath);
    libre.convert(odtFile, ".docx", undefined, (err2, docxBuffer) => {
      try {
        if (fs.existsSync(odtPath)) fs.unlinkSync(odtPath); // xoá file trung gian
      } catch (e) {
        console.warn("⚠️ Cannot remove ODT file:", e.message);
      }

      if (err2) {
        console.error("❌ ODT -> DOCX error:", err2);
        return res.status(500).json({ error: "ODT to DOCX failed" });
      }

      fs.writeFileSync(outputPath, docxBuffer);

      // Trả URL cho client
      const fileUrl = `https://backend.dantri24h.com/uploads/${outputFileName}`;
      res.json({
        success: true,
        url: fileUrl,
        name: outputFileName,
      });
    });
  });
};
