const BoDe = require('../../model/BoDe');
const MonHoc = require('../../model/MonHoc');

require('dotenv').config();

module.exports = {

    getMonHoc: async (req, res) => {
        try {
            const MonHocList = await MonHoc.find({}); 
            res.status(200).json({data: MonHocList, message: "Lấy danh sách MonHoc thành công", errCode: 0});
        } catch (error) {
            console.error('Lỗi khi lấy danh sách MonHoc:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    createMonHoc: async (req, res) => {
        try {
            const newMonHoc = new MonHoc(req.body); 
            const savedMonHoc = await newMonHoc.save(); 
            
            return res.status(201).json({
                message: "Bạn đã thêm MonHoc thành công!",
                errCode: 0,
                data: savedMonHoc
            });

        } catch (error) {
            console.error('Lỗi khi tạo MonHoc:', error);
            return res.status(500).json({ 
                message: 'Lỗi server khi tạo MonHoc', 
                errCode: -1 
            });
        }
    },


    updateMonHoc: async (req, res) => {
        try {
            let {_id, ten, Image} = req.body

            let updateTL = await MonHoc.updateOne({_id: _id},{ten, Image})

            if(updateTL) {
                return res.status(200).json({
                    data: updateTL,
                    message: "Chỉnh sửa MonHoc thành công"
                })
            } else {
                return res.status(404).json({                
                    message: "Chỉnh sửa MonHoc thất bại"
                })
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Có lỗi xảy ra.",
                error: error.message,
            });
        }
    },

    deleteMonHoc: async (req, res) => {
        try {
            const _id = req.params.id
            let xoaTL = await MonHoc.deleteOne({_id: _id})

            if(xoaTL) {
                return res.status(200).json({
                    data: xoaTL,
                    message: "Bạn đã xoá MonHoc thành công!"
                })
            } else {
                return res.status(500).json({
                    message: "Bạn đã xoá MonHoc thất bại!"
                })
            }

        } catch (error) {
            console.error(error);
            return res.status(500).json({
                message: "Có lỗi xảy ra.",
                error: error.message,
            });
        }
    },

    getMonHocStats: async (req, res) => {
        try {
            // 1. Lấy all môn học
            const monHocList = await MonHoc.find();

            // 2. Aggregate BoDe: group theo monHoc + capHoc
            const stats = await BoDe.aggregate([
                {
                    $group: {
                        _id: { monHoc: "$monHoc", capHoc: "$capHoc" },
                        totalDeThi: { $sum: 1 },
                        totalLuotThi: { $sum: "$luotThi" }
                    }
                },
                {
                    $lookup: {
                        from: "caphocs", // collection name phải là dạng số nhiều (caphocs)
                        localField: "_id.capHoc",
                        foreignField: "_id",
                        as: "capHocInfo"
                    }
                },
                {
                    $unwind: {
                        path: "$capHocInfo",
                        preserveNullAndEmptyArrays: true
                    }
                }
            ]);

            // console.log("Stats:", stats);

            // 3. Map vào từng MonHoc
            const result = monHocList.map(monHoc => {
                // Lấy tất cả stats của môn này
                const monHocStats = stats.filter(stat => stat._id.monHoc && stat._id.monHoc.toString() === monHoc._id.toString());

                // Tính tổng cho môn này
                const tongBoDe = monHocStats.reduce((sum, item) => sum + item.totalDeThi, 0);
                const tongLuotThi = monHocStats.reduce((sum, item) => sum + item.totalLuotThi, 0);

                // Lấy các capHoc liên quan
                const capHocList = monHocStats.map(item => ({
                    _id: item._id.capHoc,
                    ten: item.capHocInfo?.ten || '',
                    Image: item.capHocInfo?.Image || '',
                    moTa: item.capHocInfo?.moTa || '',
                    soBoDe: item.totalDeThi,
                    soLuotThi: item.totalLuotThi
                }));

                return {
                    _id: monHoc._id,
                    ten: monHoc.ten,
                    Image: monHoc.Image,
                    tongBoDe,
                    tongLuotThi,
                    capHocList
                };
            });

            res.status(200).json({
                data: result,
                message: "Lấy thống kê môn học thành công",
                errCode: 0
            });
        } catch (error) {
            console.error('Lỗi khi lấy thống kê môn học:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    }

}