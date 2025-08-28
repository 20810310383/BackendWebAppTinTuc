const mongoose = require('mongoose');

const cauHoiGopYSchema = new mongoose.Schema({
    cauHoiId: { type: mongoose.Schema.Types.ObjectId, ref: 'BoDe', required: true },
    nguoiDung: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    noiDungGopY: String,
    ngayGui: { type: Date, default: Date.now },
    daXem: { type: Boolean, default: false }
});

module.exports = mongoose.model('CauHoiGopY', cauHoiGopYSchema);