const fs = require("fs");
const path = require("path");
const axios = require("axios");
const sharp = require("sharp");

// ⚡ Xoá nền (dùng remove.bg API)
const removeBg = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const apiKey = process.env.REMOVE_BG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing remove.bg API key" });

    // Gọi API remove.bg
    const response = await axios({
      method: "post",
      url: "https://api.remove.bg/v1.0/removebg",
      data: {
        image_file: fs.createReadStream(req.file.path),
        size: "auto",
      },
      headers: { "X-Api-Key": apiKey },
      responseType: "arraybuffer",
    });

    // Lưu file kết quả vào public/uploads
    const outputPath = path.join("public/uploads", `no-bg-${Date.now()}.png`);
    fs.writeFileSync(outputPath, response.data);

    // Xoá file gốc sau khi xử lý
    fs.unlinkSync(req.file.path);

    return res.json({
      url: `/uploads/${path.basename(outputPath)}`, // chỉ trả path tương đối
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to remove background" });
  }
};

// ⚡ Resize ảnh bằng Sharp
const resizeImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const width = parseInt(req.body.width) || 800;
    const height = parseInt(req.body.height) || null;

    const outputPath = path.join("public/uploads", `resized-${Date.now()}.jpg`);

    await sharp(req.file.path)
      .resize(width, height)
      .jpeg({ quality: 80 })
      .toFile(outputPath);

    // Xoá file gốc
    fs.unlinkSync(req.file.path);

    return res.json({
      url: `/uploads/${path.basename(outputPath)}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Resize failed" });
  }
};

module.exports = { removeBg, resizeImage };
