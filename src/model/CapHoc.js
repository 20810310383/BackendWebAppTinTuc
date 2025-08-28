// models/CapHoc.js – Cấp học (THPT, Đại học, v.v.)
const mongoose = require('mongoose');

const capHocSchema = new mongoose.Schema({
    ten: { type: String, required: true, unique: true }, 
    moTa: { type: String,}, 
    Image: { type: String, required: false },   
});

module.exports = mongoose.model('CapHoc', capHocSchema);
