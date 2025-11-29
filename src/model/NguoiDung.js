const mongoose = require('mongoose');

// Schema con cho thông tin ngân hàng
const bankInfoSchema = new mongoose.Schema({
  tenNganHang: { type: String, trim: true },
  chiNhanh: { type: String, trim: true },
  soTaiKhoan: { type: String, trim: true },
  tenChuTaiKhoan: { type: String, trim: true }
}, { _id: false });

// Schema chính cho người dùng
const userSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  hoTen: { type: String, trim: true, default: '' },
  soDienThoai: { type: String, trim: true, default: '' },
  image: { type: String, trim: true, default: '' },
  thongTinNganHang: { type: bankInfoSchema, default: {} },
  soDiem: { type: Number, required: true, default: 0, min: 0 },
  soTienYeuCauRut: { type: Number, default: 0, min: 0 },
  soTienDaRut: { type: Number, default: 0, min: 0 },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true }); // Tự động thêm createdAt và updatedAt

// Đăng ký model với mongoose
module.exports = mongoose.model('NguoiDung', userSchema);
