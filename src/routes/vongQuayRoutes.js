const express = require("express");
const { taoPhanThuong, adminLayTatCaPhanThuong, capNhatPhanThuong, xoaPhanThuong, layDanhSachPhanThuong, quayThuong, lichSuQuay } = require("../controllers/VongQuay/vongQuayController");
const router = express.Router();

/**
 * =============================
 * 🧑‍💼 ADMIN ROUTES
 * =============================
 */

// ➕ Tạo phần thưởng mới
// Body mẫu:
// {
//   "tenPhanThuong": "Trúng 50 điểm",
//   "loai": "diem", // "diem" | "themLuot" | "khong"
//   "giaTri": 50,
//   "tiLeTrung": 10,
//   "mauSac": "#FF6B6B"
// }
router.post("/admin/phanthuong", taoPhanThuong);

// 📋 Lấy danh sách toàn bộ phần thưởng (bao gồm cả bị tắt)
router.get("/admin/phanthuong", adminLayTatCaPhanThuong);

// ✏️ Cập nhật phần thưởng hoặc tỉ lệ trúng
// Body mẫu: { "tiLeTrung": 25, "giaTri": 20, "isActive": true }
router.put("/admin/phanthuong/:id", capNhatPhanThuong);

// 🗑️ Xoá (vô hiệu hóa) phần thưởng
router.delete("/admin/phanthuong/:id", xoaPhanThuong);

/**
 * =============================
 * 👤 USER ROUTES
 * =============================
 */

// 📋 Lấy danh sách phần thưởng đang hoạt động (để hiển thị vòng quay)
router.get("/phanthuong", layDanhSachPhanThuong);

// 🎯 Quay thưởng (random theo tỉ lệ %)
// Body: { "deviceId": "abc123" }
router.post("/quay", quayThuong);

// 📜 Xem lịch sử quay của user
router.get("/lichsu/:deviceId", lichSuQuay);


module.exports = router;
