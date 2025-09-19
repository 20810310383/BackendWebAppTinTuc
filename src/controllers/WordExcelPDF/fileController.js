// src/controllers/convertFile.js
const fs = require("fs");
const path = require("path");
const libre = require("libreoffice-convert");
const { exec } = require("child_process");

// 📌 Hàm dùng libreoffice-convert (Word -> PDF, Excel -> PDF...)
function convertWithLibre(req, res, inputPath, outputExt) {
  const outputFileName = Date.now() + outputExt;
  const outputPath = path.resolve(__dirname, "../../public/uploads", outputFileName);

  const file = fs.readFileSync(inputPath);

  libre.convert(file, outputExt, undefined, (err, done) => {
    // Xoá file gốc
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

    // URL cho client
    const fileUrl = `https://backend.dantri24h.com/uploads/${outputFileName}`;
    res.json({
      success: true,
      url: fileUrl,
      name: outputFileName,
    });
  });
}

// 📌 Hàm dùng soffice trực tiếp (PDF -> Word)
function convertPdfToDocx(req, res, inputPath) {
  const outputFileName = Date.now() + ".docx";
  const outputDir = path.resolve(__dirname, "../../public/uploads");
  const outputPath = path.join(outputDir, outputFileName);

  console.log("📥 PDF input:", inputPath);

  const command = `soffice --headless --infilter="writer_pdf_import" --convert-to docx:"MS Word 2007 XML" "${inputPath}" --outdir "${outputDir}"`;

  exec(command, (err, stdout, stderr) => {
    // Xoá file gốc
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch (e) {
      console.warn("⚠️ Cannot remove input file:", e.message);
    }

    if (err) {
      console.error("❌ PDF -> DOCX error:", stderr || err.message);
      return res.status(500).json({ error: "PDF to DOCX failed" });
    }

    console.log("✅ LibreOffice output:", stdout);

    const fileUrl = `https://backend.dantri24h.com/uploads/${outputFileName}`;
    res.json({
      success: true,
      url: fileUrl,
      name: outputFileName,
    });
  });
}

// 📌 Route đa năng: /api/convert?to=pdf|docx|xlsx|pptx...
exports.convertFile = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const targetExt = req.query.to ? "." + req.query.to : ".pdf";

  if (targetExt === ".docx" && req.file.originalname.endsWith(".pdf")) {
    // Nếu là PDF -> DOCX
    return convertPdfToDocx(req, res, req.file.path);
  }

  // Các trường hợp khác
  convertWithLibre(req, res, req.file.path, targetExt);
};

// 📌 Word -> PDF
exports.wordToPdf = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  convertWithLibre(req, res, req.file.path, ".pdf");
};

// 📌 PDF -> Word
exports.pdfToWord = (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  convertPdfToDocx(req, res, req.file.path);
};
