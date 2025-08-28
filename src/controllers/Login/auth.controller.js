const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../model/User');

const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  ACCESS_TOKEN_EXPIRES = '15m',
  REFRESH_TOKEN_EXPIRES = '7d',
  COOKIE_DOMAIN,
  NODE_ENV
} = process.env;

const isProd = NODE_ENV === 'production';

function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}
function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: isProd,        // true khi chạy HTTPS/production
    sameSite: isProd ? 'None' : 'Lax',
    domain: COOKIE_DOMAIN || undefined,
    path: '/api/auth',     // chỉ gửi kèm khi gọi /api/auth/*
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refresh_token', {
    domain: COOKIE_DOMAIN || undefined,
    path: '/api/auth',
  });
}

module.exports = {
    // Đăng ký (sửa cho đúng schema: matKhau)
    dangKyTK: async (req, res) => {
        try {
        const { taiKhoan, password, hoTen, Image, vaiTro } = req.body;
        if (!taiKhoan || !password) {
            return res.status(400).json({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu!' });
        }
        const exist = await User.findOne({ taiKhoan });
        if (exist) {
            return res.status(400).json({ success: false, message: 'Tài khoản đã tồn tại!' });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({
            taiKhoan,
            matKhau: hashed,
            hoTen: hoTen || '',
            Image: Image || '',
            vaiTro: vaiTro || 'nguoibt',
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            data: { _id: user._id, taiKhoan: user.taiKhoan, hoTen: user.hoTen, vaiTro: user.vaiTro }
        });
        } catch (err) {
        return res.status(500).json({ success: false, message: err?.message || 'Server error' });
        }
    },

    // Đăng nhập
    login: async (req, res) => {
        try {
        const { taiKhoan, password } = req.body;
        if (!taiKhoan || !password) {
            return res.status(400).json({ success: false, message: 'Thiếu tài khoản hoặc mật khẩu!' });
        }

        const user = await User.findOne({ taiKhoan });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
        }
        const ok = await bcrypt.compare(password, user.matKhau || '');
        if (!ok) {
            return res.status(400).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu!' });
        }
        if (user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Tài khoản chưa kích hoạt!' });
        }

        // payload nên tối giản
        const payload = { uid: user._id.toString(), role: user.vaiTro, ver: user.tokenVersion || 0 };

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            data: {
                accessToken,
                user: {
                    _id: user._id,
                    taiKhoan: user.taiKhoan,
                    hoTen: user.hoTen,
                    vaiTro: user.vaiTro,
                    Image: user.Image
                }
            }
        });
        } catch (err) {
        return res.status(500).json({ success: false, message: err?.message || 'Server error' });
        }
    },

    // Refresh access token từ cookie refresh_token
    refresh: async (req, res) => {
        try {
        const token = req.cookies?.refresh_token;
        if (!token) return res.status(401).json({ success: false, message: 'Không có refresh token' });

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ success: false, message: 'Refresh token không hợp lệ/đã hết hạn' });
        }

        const user = await User.findById(decoded.uid);
        if (!user) return res.status(401).json({ success: false, message: 'Người dùng không tồn tại' });

        // Kiểm tra tokenVersion nếu dùng
        if ((user.tokenVersion || 0) !== (decoded.ver || 0)) {
            return res.status(401).json({ success: false, message: 'Refresh token đã bị thu hồi' });
        }

        const payload = { uid: user._id.toString(), role: user.vaiTro, ver: user.tokenVersion || 0 };
        const newAccessToken = signAccessToken(payload);
        const newRefreshToken = signRefreshToken(payload);
        setRefreshCookie(res, newRefreshToken);

        return res.status(200).json({ success: true, data: { accessToken: newAccessToken } });
        } catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Server error' });
        }
    },

    // Logout: xóa cookie (nếu muốn logout all, tăng tokenVersion)
    logout: async (req, res) => {
        try {
            clearRefreshCookie(res);
            return res.status(200).json({ success: true, message: 'Đã đăng xuất' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Server error' });
        }
    },

    // (Tuỳ chọn) Logout ALL devices: tăng tokenVersion => vô hiệu hóa mọi refresh cũ
    logoutAll: async (req, res) => {
        try {
            const userId = req.user?.uid; // cần middleware auth để gắn req.user
            if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

            await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
            clearRefreshCookie(res);

            return res.status(200).json({ success: true, message: 'Đã đăng xuất tất cả thiết bị' });
        } catch (err) {
            return res.status(500).json({ success: false, message: err?.message || 'Server error' });
        }
    },

    // Me: dùng access token
    me: async (req, res) => {
        try {
            const userId = req.user?.uid; // req.user gắn bởi middleware verifyAccessToken
            if (!userId) return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });

            const user = await User.findById(userId).select('_id taiKhoan hoTen vaiTro Image');

            if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
            return res.status(200).json({ success: true, data: user });
        } catch (err) {
        return res.status(500).json({ success: false, message: err?.message || 'Server error' });
        }
    }
};
