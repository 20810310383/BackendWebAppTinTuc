const mongoose = require("mongoose");

const phanThuongSchema = new mongoose.Schema({
  tenPhanThuong: { type: String, required: true, trim: true },
  loai: {
    type: String,
    enum: ["diem", "themLuot", "khong"], // "diem" = cộng điểm, "themLuot" = thêm lượt quay, "khong" = không trúng gì
    required: true,
  },
  giaTri: { type: Number, default: 0 }, // ví dụ: cộng 20 điểm, hoặc +2 lượt
  tiLeTrung: { type: Number, required: true, default: 10 }, // % tỉ lệ trúng (0–100)
  mauSac: { type: String, default: "#facc15" }, // để hiển thị trên vòng quay
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model("PhanThuong", phanThuongSchema);
