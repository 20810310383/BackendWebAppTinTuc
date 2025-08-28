const mongoose = require('mongoose');

const dapAnSchema = new mongoose.Schema({
  ma: { type: String, required: false },
  noiDung: { type: String, required: false },
  isDung: { type: Boolean, default: false },
});

// Schema lưu chi tiết từng câu hỏi đã làm trong bài thi
const chiTietCauHoiSchema = new mongoose.Schema({
  cauHoiId: { type: mongoose.Schema.Types.ObjectId,  },
  cauHoiNoiDung: {type: String},
  giaiThich: {type: String},
  ImageNoiDung: { type: String, },
  AudioNoiDung: { type: String, },
  dapAnChon: {
    ma: { type: String,  },
    noiDung: { type: String,  }
  },
  dapAnDung: {
    ma: { type: String,  },
    noiDung: { type: String,  }
  },
  cacDapAn: [dapAnSchema],
  isDung: { type: Boolean,  }
});


// Schema kết quả thi của học sinh
const ketQuaThiSchema = new mongoose.Schema({
  nguoiDung: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  boDe: { type: mongoose.Schema.Types.ObjectId, ref: 'BoDe' },

  soCauDung: { type: Number },
  soCauSai: { type: Number },
  diem: { type: Number },

  thoiGianLam: { type: String }, // thời gian làm bài (phút)
  ngayThi: { type: Date, default: Date.now },

  chiTiet: [chiTietCauHoiSchema] // Mảng chi tiết các câu hỏi đã làm
});

module.exports = mongoose.model('KetQuaThi', ketQuaThiSchema);
