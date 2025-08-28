const mongoose = require('mongoose');

const cauTraLoiSchema = new mongoose.Schema({
    cauHoiId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BoDe', 
        required: true
    },
    dapAnDaChon: { type: String, required: true }, // "A", "B", ...
    isDung: { type: Boolean, required: true }
});

const lichSuLamBaiSchema = new mongoose.Schema({
    nguoiDung: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ketQuaThi: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'KetQuaThi', 
        required: true 
    },
    cauTraLoi: [cauTraLoiSchema],

    thoiGianBatDau: { type: Date },
    thoiGianKetThuc: { type: Date }
});

module.exports = mongoose.model('LichSuLamBai', lichSuLamBaiSchema);
