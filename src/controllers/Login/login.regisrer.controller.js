const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
// Secret key cho JWT
const JWT_SECRET = process.env.JWT_SECRET; 
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../model/User');
const { log } = require('console');

// Tạo transporter để gửi email
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateRandomPassword = () => {
  return Math.random().toString(36).slice(-6); // Ví dụ: 'x9b2k1'
};

module.exports = {
    registerUser: async (req, res) => {
        const { email, matKhau, hoTen, Image } = req.body;

        console.log("Đăng ký với:", email, matKhau, hoTen, Image);

        try {
            let user = await User.findOne({ email });

            if (user) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã tồn tại, bạn không thể đăng ký lại!'
                });
            }

            const hashedPassword = await bcrypt.hash(matKhau, 10);
            const otp = crypto.randomInt(100000, 999999);          

            user = new User({
                email,
                matKhau: hashedPassword,
                hoTen,
                Image,
                otp,
                otpExpires: Date.now() + 5 * 60 * 1000 // hiệu lực 5 phút
            });

            await user.save();

            const mailOptions = {
                from: 'Hệ thống đăng ký',
                to: email,
                subject: 'Xác thực đăng ký - Mã OTP',
                text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Lỗi gửi email OTP:", error);
                    return res.status(500).json({ success: false, message: "Không thể gửi OTP!" });
                }

                return res.status(200).json({
                    success: true,
                    message: "Mã OTP đã được gửi đến email. Vui lòng xác nhận để hoàn tất đăng ký."
                });
            });

        } catch (error) {
            console.error("Lỗi đăng ký:", error);
            return res.status(500).json({ success: false, message: "Lỗi máy chủ." });
        }
    },

    verifyOtp: async (req, res) => {
        const { email, otp } = req.body;

        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ success: false, message: "Tài khoản không tồn tại!" });
            }

            if (!user.otp || user.otp != otp) {
                return res.status(400).json({ success: false, message: "Mã OTP không chính xác!" });
            }

            if (Date.now() > user.otpExpires) {
                return res.status(400).json({ success: false, message: "Mã OTP đã hết hạn!" });
            }

            user.otp = null;
            user.otpExpires = null;
            user.isActive = true; // ✅ Kích hoạt tài khoản sau khi xác thực OTP thành công
            await user.save();

            return res.status(200).json({ success: true, message: "Xác thực thành công. Bạn có thể đăng nhập!" });

        } catch (error) {
            console.error("Lỗi xác thực OTP:", error);
            return res.status(500).json({ success: false, message: "Lỗi máy chủ." });
        }
    },

    resendOtpCode: async (req, res) => {
        const { email } = req.body;

        try {
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(400).json({ success: false, message: "Tài khoản không tồn tại!" });
            }

            // Nếu người dùng đã xác thực rồi (không còn trường OTP)
            if (!user.otp && !user.otpExpires) {
                return res.status(400).json({ success: false, message: "Tài khoản đã được xác thực, không thể gửi lại OTP." });
            }

            // Tạo mã OTP mới
            const otp = crypto.randomInt(100000, 999999);

            user.otp = otp;
            user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 phút
            await user.save();

            const mailOptions = {
                from: 'Hệ thống đăng ký',
                to: email,
                subject: 'Gửi lại mã OTP đăng ký',
                text: `Mã OTP mới của bạn là: ${otp}. Mã có hiệu lực trong 5 phút.`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error("Lỗi gửi lại OTP:", error);
                    return res.status(500).json({ success: false, message: "Không thể gửi lại mã OTP!" });
                }

                return res.status(200).json({
                    success: true,
                    message: "Mã OTP mới đã được gửi đến email của bạn."
                });
            });

        } catch (error) {
            console.error("Lỗi trong resendOtpCode:", error);
            return res.status(500).json({ success: false, message: "Lỗi máy chủ." });
        }
    },

    loginUser: async (req, res) => {
        const { email, matKhau } = req.body;

        try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
            success: false,
            message: 'Tài khoản không tồn tại!'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
            success: false,
            message: 'Tài khoản chưa được xác thực OTP!'
            });
        }

        const isMatch = await bcrypt.compare(matKhau, user.matKhau);
        if (!isMatch) {
            return res.status(401).json({
            success: false,
            message: 'Mật khẩu không đúng!'
            });
        }

        const access_token = jwt.sign(
            { userId: user._id, email: user.email, vaiTro: user.vaiTro },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công!',
            data: {
                access_token,
                user: {
                    _id: user._id,
                    email: user.email,
                    hoTen: user.hoTen,
                    Image: user.Image,
                    vaiTro: user.vaiTro
                }
            }
        });

        } catch (err) {
        console.error("Lỗi khi đăng nhập:", err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ!'
        });
        }
    },

    verifyToken: async (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1]; // Lấy token từ header

        if (!token) {
            console.log("Không có token!");
            
            return res.status(401).json({ success: false, message: 'Không có token!' });
        }
        console.log(">>> token: ", token);
        

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET); // Giải mã token
            const user = await User.findById(decoded.userId).select('-matKhau'); // Lấy user

            if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Tài khoản không hợp lệ!' });
            }

            req.user = user; // Gán user vào request
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ!' });
        }
    },

    logoutUser: async (req, res) => {
        try {
            // Nếu bạn dùng cookie lưu token:
            res.clearCookie('access_token');

            // Nếu không dùng cookie (token lưu ở localStorage phía client)
            return res.status(200).json({
                success: true,
                message: 'Đăng xuất thành công!'
            });
        } catch (error) {
            console.error("Lỗi khi đăng xuất:", error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi máy chủ!'
            });
        }
    },

    resetPassword: async (req, res) => {
        const { email } = req.body;

        try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
            success: false,
            message: 'Email không tồn tại trong hệ thống!',
            });
        }

        const newPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.matKhau = hashedPassword;
        await user.save();

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Mật khẩu mới từ hệ thống',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 24px; border-radius: 12px; background-color: #f9f9f9;">
                    <h2 style="text-align: center; color: #2e6eff;">HỆ THỐNG THI TRẮC NGHIỆM</h2>
                    <hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;">
                    
                    <p>Xin chào,</p>

                    <p>Chúng tôi đã tiếp nhận yêu cầu lấy lại mật khẩu của bạn trên hệ thống <strong>thi trắc nghiệm</strong>.</p>

                    <p>Mật khẩu mới của bạn là:</p>

                    <div style="background-color: #eef5ff; padding: 12px 24px; border-radius: 8px; font-size: 22px; text-align: center; font-weight: bold; letter-spacing: 1px; color: #2e6eff; border: 1px dashed #2e6eff;">
                    ${newPassword}
                    </div>

                    <p style="margin-top: 24px;">
                    👉 Vui lòng <strong>đăng nhập lại</strong> và đổi mật khẩu sau khi đăng nhập để bảo mật tài khoản của bạn.
                    </p>

                    <p>Trân trọng,<br/>Ban quản trị hệ thống</p>

                    <hr style="border: none; border-top: 1px solid #ccc; margin: 24px 0 8px;">
                    <p style="font-size: 12px; color: #999; text-align: center;">
                    Đây là email tự động từ hệ thống <strong>thitracnghiem</strong>, vui lòng không phản hồi.
                    </p>
                </div>
                `,

        });

        return res.status(200).json({
            success: true,
            message: 'Mật khẩu mới đã được gửi đến email của bạn!',
        });
        } catch (error) {
        console.error('Lỗi đặt lại mật khẩu:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi máy chủ!',
        });
        }
    },


}