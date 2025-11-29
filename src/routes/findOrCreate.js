const express = require('express');
const mongoose = require('mongoose');
const NguoiDung = require('../model/NguoiDung');

const router = express.Router();

router.post('/findOrCreate', async (req, res) => {
  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({ message: 'deviceId is required' });
  }

  try {
    let user = await NguoiDung.findOne({ deviceId });

    if (user) {
      // Nếu user đã tồn tại, cập nhật lastSeen
      user.lastSeen = Date.now();
      await user.save();
      console.log('User found and updated:', user.deviceId);
      res.status(200).json(user);
    } else {
      // Nếu user chưa tồn tại, tạo mới
      user = new NguoiDung({ deviceId });
      await user.save();
      console.log('New user created:', user.deviceId);
      res.status(201).json(user); // Status 201 Created
    }
  } catch (error) {
    console.error('Error in /findOrCreate:', error);
    if (error.code === 11000) { // Lỗi duplicate key nếu có race condition
      // Thử tìm lại user một lần nữa
      try {
          const existingUser = await NguoiDung.findOne({ deviceId });
          if(existingUser) {
              existingUser.lastSeen = Date.now();
              await existingUser.save();
              return res.status(200).json(existingUser);
          } else {
             // Đây là trường hợp hiếm gặp, nhưng nên xử lý
             return res.status(500).json({ message: 'Internal server error during retry' });
        }
      } catch(retryError) {
           return res.status(500).json({ message: 'Internal server error during retry' });
      }
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 🟢 Thêm Route PUT /:deviceId để cập nhật người dùng
router.put('/:deviceId', async (req, res) => {
  const { deviceId } = req.params;
  const updateData = req.body; // Dữ liệu gửi từ FE (hoTen, soDienThoai, image, thongTinNganHang)

  if (!deviceId) {
    return res.status(400).json({ message: 'deviceId is required in URL parameter' });
  }

  try {
    const user = await NguoiDung.findOne({ deviceId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Cập nhật các trường được phép
    if (updateData.hoTen !== undefined) user.hoTen = updateData.hoTen;
    if (updateData.soDienThoai !== undefined) user.soDienThoai = updateData.soDienThoai;
    if (updateData.image !== undefined) user.image = updateData.image; // Lưu URL ảnh mới

    // Cập nhật thông tin ngân hàng (nếu có)
    if (updateData.thongTinNganHang) {
      if (updateData.thongTinNganHang.tenNganHang !== undefined) {
        user.thongTinNganHang.tenNganHang = updateData.thongTinNganHang.tenNganHang;
      }
      if (updateData.thongTinNganHang.soTaiKhoan !== undefined) {
        user.thongTinNganHang.soTaiKhoan = updateData.thongTinNganHang.soTaiKhoan;
      }
      if (updateData.thongTinNganHang.tenChuTaiKhoan !== undefined) {
        user.thongTinNganHang.tenChuTaiKhoan = updateData.thongTinNganHang.tenChuTaiKhoan;
      }
       // Bạn có thể thêm chiNhanh nếu cần
    }

    await user.save();
    console.log('User updated:', user.deviceId);
    res.status(200).json(user); // Trả về thông tin user đã cập nhật

  } catch (error) {
    console.error(`Error updating user ${deviceId}:`, error);
    res.status(500).json({ message: 'Internal server error during update' });
  }
});

/**
 * 🔍 GET /api/users
 * Lấy toàn bộ người dùng
 */
router.get('/get-nguoi-dung', async (req, res) => {
  try {
    const users = await NguoiDung.find().sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 🔍 GET /api/users/:deviceId
 * Lấy thông tin 1 người dùng
 */
router.get('/get-mot-nguoi-dung/:deviceId', async (req, res) => {
  try {
    const user = await NguoiDung.findOne({ deviceId: req.params.deviceId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 🗑️ DELETE /api/users/:deviceId
 * Xóa người dùng
 */
router.delete('/:deviceId', async (req, res) => {
  try {
    const user = await NguoiDung.findOneAndDelete({ deviceId: req.params.deviceId });
    if (!user) return res.status(404).json({ message: 'User not found' });
    console.log('🗑️ Deleted user:', user.deviceId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * 💎 put /api/users/:deviceId/points
 * Tăng hoặc giảm số điểm của người dùng
 * body: { type: "increase"|"decrease", amount: Number }
 */
router.put('/:deviceId/points', async (req, res) => {
  const { deviceId } = req.params;
  const { type, amount } = req.body;

  if (!['increase', 'decrease'].includes(type) || !amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid type or amount' });
  }

  try {
    const user = await NguoiDung.findOne({ deviceId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (type === 'increase') {
      user.soDiem += amount;
    } else if (type === 'decrease') {
      if (user.soDiem < amount) {
        return res.status(400).json({ message: 'Not enough points' });
      }
      user.soDiem -= amount;
    }

    await user.save();
    console.log(`💰 ${type === 'increase' ? 'Added' : 'Removed'} ${amount} points for`, deviceId);
    res.status(200).json({ message: 'Points updated', soDiem: user.soDiem });
  } catch (error) {
    console.error('❌ Error updating points:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
