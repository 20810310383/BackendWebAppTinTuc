const mongoose = require("mongoose");
const KetQuaThi = require("../../model/KetQuaThi");

exports.getLeaderboard = async (req, res) => {
  const { mode } = req.query; // 'ngay', 'tuan', 'thang'
  let startDate = new Date();

//   if (mode === 'ngày') startDate.setDate(startDate.getDate() - 1);
//   else if (mode === 'tuần') startDate.setDate(startDate.getDate() - 7);
//   else if (mode === 'tháng') startDate.setMonth(startDate.getMonth() - 1);
//   else return res.status(400).json({ message: 'Invalid mode' });
let today = new Date();
today.setHours(0, 0, 0, 0); // đặt về 00:00:00 hôm nay

if (mode === 'ngày') {
  startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 1); // lấy từ 00:00 hôm qua
} else if (mode === 'tuần') {
  startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
} else if (mode === 'tháng') {
  startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 1);
} else {
  return res.status(400).json({ message: 'Invalid mode' });
}


  const results = await KetQuaThi.aggregate([
    { $match: { ngayThi: { $gte: startDate } } },
    {
      $group: {
        _id: "$nguoiDung",
        diemTB: { $avg: "$diem" },
        soBai: { $sum: 1 }
      }
    },
    { $sort: { diemTB: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $project: {
        userId: "$_id",
        name: "$user.hoTen",
        email: "$user.email",
        image: "$user.Image",
        diemTB: 1,
        soBai: 1
      }
    }
  ]);

  res.json({data: results});
};
