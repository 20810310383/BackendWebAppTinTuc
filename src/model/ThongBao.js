const mongoose = require('mongoose');

const thongBaoSchema = new mongoose.Schema({
    tieuDe: String,
    noiDung: String,
    nguoiNhan: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    daDoc: { type: Boolean, default: false },
    ngayGui: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ThongBao', thongBaoSchema);