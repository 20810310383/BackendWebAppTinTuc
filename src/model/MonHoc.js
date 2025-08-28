// models/MonHoc.js
const mongoose = require('mongoose');

const monHocSchema = new mongoose.Schema({
    ten: { type: String, required: true },              // VD: "Toán", "Lý", "Hóa"
    Image: { type: String, required: false },       
});

module.exports = mongoose.model('MonHoc', monHocSchema);
