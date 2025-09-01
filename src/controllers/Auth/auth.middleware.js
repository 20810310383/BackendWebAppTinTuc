const jwt = require('jsonwebtoken');
const User = require('../../model/User');
const { JWT_ACCESS_SECRET } = process.env;

exports.verifyAccessToken = async (req, res, next) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        
        if (!token) return res.status(401).json({ success:false, message:'Thiếu access token' });

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        } catch {
            return res.status(401).json({ success:false, message:'Access token không hợp lệ/đã hết hạn' });
        }

        // optional: kiểm tra user tồn tại
        const user = await User.findById(decoded.uid).select('_id vaiTro tokenVersion');
        if (!user) return res.status(401).json({ success:false, message:'Người dùng không tồn tại' });

        // nếu dùng tokenVersion để revoke
        if ((user.tokenVersion || 0) !== (decoded.ver || 0)) {
            return res.status(401).json({ success:false, message:'Access token đã bị thu hồi' });
        }

        req.user = { uid: user._id.toString(), role: user.vaiTro };
        next();
    } catch (err) {
        return res.status(500).json({ success:false, message: err?.message || 'Server error' });
    }
};
