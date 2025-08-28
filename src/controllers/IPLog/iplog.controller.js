const BoDe = require("../../model/BoDe");
const IPLog = require("../../model/IPLog");
const User = require("../../model/User");

// Hàm phụ: lấy IP
const getClientIP = (req) => {
  let ip = req.headers['x-forwarded-for']?.split(',')[0]
         || req.socket?.remoteAddress
         || req.connection?.remoteAddress;

  // Nếu là "::ffff:192.168.1.1" thì chuẩn hóa lại
  if (ip && ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }

  return ip;
};



module.exports = {
    handleSauKhiThiXong: async (req, res) => {
        try {
            const { userId, boDeId, diemSo, soCoin, soCauYeuCau, soLuotThiGioiHan } = req.body;
            const ip = getClientIP(req);

            // 0. Kiểm tra số lần user đã nhận coin hôm nay (bất kể IP)
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const todayLogs = await IPLog.find({
                userId,
                createdAt: { $gte: startOfDay, $lte: endOfDay },
            });

            if (todayLogs.length >= soLuotThiGioiHan) {
                return res.status(429).json({
                    statusCode: 429,
                    message: `🎯 Bạn đã đạt giới hạn tích điểm ${soLuotThiGioiHan} lần trong ngày hôm nay. Hãy quay lại vào ngày mai để tiếp tục nhận thưởng nhé!`,
                });
            }


            // 1. Lấy bộ đề và kiểm tra số câu hỏi
            const boDe = await BoDe.findById(boDeId);
            console.log("boDe.cauHoi.length: ",boDe.cauHoi.length);
            
            if (!boDe || boDe.cauHoi.length < soCauYeuCau) {
                return res.status(400).json({
                    statusCode: 400,
                    message: `Bộ đề cần có ít nhất ${soCauYeuCau} câu hỏi để đủ điều kiện tích điểm. Vui lòng chọn bộ đề khác phù hợp hơn nhé!`
                });

            }

            // // 2. Điểm dưới 8.5 thì không được tính
            // if (diemSo < 8.5) {
            // return res.status(200).json({ message: 'Rất tiếc! Điểm số hiện tại chưa đủ điều kiện để nhận coin. Bạn có thể thử lại để đạt kết quả tốt hơn.' });
            // }

            // 3. Kiểm tra nếu IP đã từng ghi nhận cho user khác
            // const ipUsedByOthers = await IPLog.findOne({ ip, userId: { $ne: userId } });
            // if (ipUsedByOthers) {
            // return res.status(400).json({ message: 'IP này đã được sử dụng để nhận thưởng ở tài khoản khác.' });
            // }

            // // 4. Kiểm tra nếu user đã từng nhận thưởng ở IP này rồi
            // const alreadyClaimed = await IPLog.findOne({ ip, userId });
            // if (alreadyClaimed) {
            // return res.status(200).json({ message: 'Bạn đã được tích điểm trước đó với IP này.' });
            // }

            // 3. Kiểm tra nếu IP đã từng ghi nhận cho tài khoản khác
            const ipUsedByOthers = await IPLog.findOne({ ip, userId: { $ne: userId } });
            if (ipUsedByOthers) {
                return res.status(400).json({
                    statusCode: 400,
                    message: 'IP này đã được sử dụng để nhận thưởng ở tài khoản khác. Vui lòng sử dụng IP khác để tiếp tục nhận thưởng.'
                });
            }

            // 5. Cộng coin cho người dùng
            const coinAmount = soCoin || 0; // tùy chỉnh
            await User.findByIdAndUpdate(userId, { $inc: { coin: coinAmount } });

            // 6. Lưu IP đã được ghi nhận
            await IPLog.create({ userId, ip });

            res.status(200).json({ message: `👏 Tuyệt vời! Hệ thống đã cộng ${coinAmount} điểm vào tài khoản của bạn.`, coin: coinAmount, statusCode: 200, });

        } catch (error) {
            console.error('Lỗi xử lý tích điểm:', error);
            res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    }
}