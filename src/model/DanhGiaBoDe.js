const mongoose = require('mongoose');

const danhGiaSchema = new mongoose.Schema({
    boDe: { type: mongoose.Schema.Types.ObjectId, ref: 'BoDe', required: true },
    nguoiDung: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sao: { type: Number, min: 1, max: 5 },
    binhLuan: String,
    ngayDanhGia: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DanhGiaBoDe', danhGiaSchema);