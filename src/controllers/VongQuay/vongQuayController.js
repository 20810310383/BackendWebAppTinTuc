const NguoiDung = require("../../model/NguoiDung");
const PhanThuong = require("../../model/PhanThuong");
const LuotQuay = require("../../model/LuotQuay");

/** =====================================
 * 📌 Helper: Random phần thưởng theo tỉ lệ
 ======================================*/
function randomTheoTiLe(phanThuongs) {
  // Tính tổng tỉ lệ của tất cả phần thưởng
  const tongTiLe = phanThuongs.reduce((sum, p) => sum + p.tiLeTrung, 0);

  // Random một số ngẫu nhiên trong khoảng tổng tỉ lệ
  let random = Math.random() * tongTiLe;

  // Duyệt qua từng phần thưởng
  for (const p of phanThuongs) {
    if (random < p.tiLeTrung) {
      return p; // Trúng phần thưởng này
    }
    random -= p.tiLeTrung; // giảm phần còn lại
  }

  // Nếu sai số floating point, trả về phần thưởng cuối
  return phanThuongs[phanThuongs.length - 1];
}


/** =====================================
 * 🧑‍💼 ADMIN API
 ======================================*/

// 🧩 Thêm phần thưởng mới
exports.taoPhanThuong = async (req, res) => {
  try {
    const phanThuong = await PhanThuong.create(req.body);
    res.status(201).json({ success: true, message: "Đã tạo phần thưởng", data: phanThuong });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Lấy tất cả phần thưởng (bao gồm inactive)
exports.adminLayTatCaPhanThuong = async (req, res) => {
  try {
    const list = await PhanThuong.find().sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Cập nhật phần thưởng (tỉ lệ, giá trị, loại,...)
exports.capNhatPhanThuong = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updated = await PhanThuong.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ success: false, message: "Không tìm thấy phần thưởng" });

    res.json({ success: true, message: "Đã cập nhật phần thưởng", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Xoá (vô hiệu hoá) phần thưởng
exports.xoaPhanThuong = async (req, res) => {
  try {
    const { id } = req.params;
    const phanThuong = await PhanThuong.findById(id);
    if (!phanThuong)
      return res.status(404).json({ success: false, message: "Không tìm thấy phần thưởng" });

    phanThuong.isActive = false;
    await phanThuong.save();

    res.json({ success: true, message: "Đã vô hiệu hóa phần thưởng" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** =====================================
 * 👤 USER API
 ======================================*/

// 🧩 Lấy danh sách phần thưởng đang active (để hiển thị vòng quay)
exports.layDanhSachPhanThuong = async (req, res) => {
  try {
    const list = await PhanThuong.find({ isActive: true });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// 🧩 Người dùng quay thưởng
exports.quayThuong = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const user = await NguoiDung.findOne({ deviceId });

    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    // Kiểm tra đủ điểm
    if (user.soDiem < 10)
      return res.status(400).json({
        success: false,
        message: "Không đủ điểm để quay (mỗi lượt cần 10 điểm)",
      });

    // Lấy danh sách phần thưởng đang hoạt động
    const phanThuongs = await PhanThuong.find({ isActive: true });
    if (phanThuongs.length === 0)
      return res.status(400).json({ success: false, message: "Chưa có phần thưởng nào!" });

    // 🌀 Random phần thưởng dựa theo tỉ lệ phần trăm
    const trung = randomTheoTiLe(phanThuongs);

    // Trừ 10 điểm cho lượt quay
    user.soDiem -= 10;

    let ketQuaText = "";

    switch (trung.loai) {
      case "diem":
        user.soDiem += trung.giaTri;
        ketQuaText = `Trúng ${trung.giaTri} điểm`;
        break;

      case "themLuot":
        const diemCongThem = trung.giaTri * 10;
        user.soDiem += diemCongThem;
        ketQuaText = `Nhận thêm ${trung.giaTri} lượt quay free (+${diemCongThem} điểm)`;
        break;

      case "khong":
      default:
        ketQuaText = "Chúc bạn may mắn lần sau!";
        break;
    }

    await user.save();

    // Lưu lịch sử quay
    const luot = await LuotQuay.create({
      user: user._id,
      phanThuong: trung._id,
      ketQua: ketQuaText,
      diemSauKhiQuay: user.soDiem,
    });

    res.json({
      success: true,
      message: "Quay thành công",
      ketQua: trung.tenPhanThuong,
      chiTiet: ketQuaText,
      diemHienTai: user.soDiem,
      vongQuay: luot,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// 🧩 Xem lịch sử quay của người dùng
exports.lichSuQuay = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const user = await NguoiDung.findOne({ deviceId });

    if (!user)
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });

    const history = await LuotQuay.find({ user: user._id })
      .populate("phanThuong", "tenPhanThuong loai giaTri")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
