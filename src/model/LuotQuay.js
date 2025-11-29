const mongoose = require("mongoose");

const luotQuaySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "NguoiDung", required: true },
    phanThuong: { type: mongoose.Schema.Types.ObjectId, ref: "PhanThuong" },
    ketQua: { type: String, required: true }, // ví dụ: "Trúng 20 điểm", "Không trúng", "+2 lượt quay"
    diemSauKhiQuay: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LuotQuay", luotQuaySchema);
