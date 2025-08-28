// models/CapHoc.js – Cấp học (THPT, Đại học, v.v.)
const mongoose = require('mongoose');

const thoiGianThiSchema = new mongoose.Schema({
    thoiGian: { type: Number, required: true }, // Thời gian thi tính bằng phút
});

module.exports = mongoose.model('ThoiGianThi', thoiGianThiSchema);
