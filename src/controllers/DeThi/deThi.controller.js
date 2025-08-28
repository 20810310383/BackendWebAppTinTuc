const BoDe = require('../../model/BoDe');
const CapHoc = require('../../model/CapHoc');
const MonHoc = require('../../model/MonHoc');
const { parseExcel, parseDocx, parsePdf } = require('../../utils/parser.utils');
const path = require('path');

require('dotenv').config();

module.exports = {

    getDeThi: async (req, res) => {
        try {
            let filter = {};
            
            if (req.query.nguoiTao) {
                if (Array.isArray(req.query.nguoiTao)) {
                    filter.nguoiTao = { $in: req.query.nguoiTao };
                } else if (typeof req.query.nguoiTao === 'string' && req.query.nguoiTao.includes(',')) {
                    const arrnguoiTao = req.query.nguoiTao.split(',').map(item => item.trim());
                    filter.nguoiTao = { $in: arrnguoiTao };
                } else {
                    filter.nguoiTao = req.query.nguoiTao;
                }
            }

            if (req.query.ten) {
                filter.ten = { $regex: (req.query.ten).trim(), $options: 'i' }; // không phân biệt hoa thường
            }

            // Lọc theo monHoc (ObjectId)
            if (req.query.monHoc) {
                if (Array.isArray(req.query.monHoc)) {
                    filter.monHoc = { $in: req.query.monHoc };
                } else if (typeof req.query.monHoc === 'string' && req.query.monHoc.includes(',')) {
                    const arrMonHoc = req.query.monHoc.split(',').map(item => item.trim());
                    filter.monHoc = { $in: arrMonHoc };
                } else {
                    filter.monHoc = req.query.monHoc;
                }
            }


            // Lọc theo capHoc (ObjectId)
            if (req.query.capHoc) {
                if (Array.isArray(req.query.capHoc)) {
                    // Nếu client truyền dưới dạng mảng (ví dụ Axios GET với params kiểu: ?capHoc=1&capHoc=2)
                    filter.capHoc = { $in: req.query.capHoc };
                } else if (typeof req.query.capHoc === 'string' && req.query.capHoc.includes(',')) {
                    // Nếu client truyền ?capHoc=1,2,3 (chuỗi có dấu phẩy)
                    const arrCapHoc = req.query.capHoc.split(',').map(item => item.trim());
                    filter.capHoc = { $in: arrCapHoc };
                } else {
                    // Nếu chỉ 1 giá trị
                    filter.capHoc = req.query.capHoc;
                }
            }

            if( req.query.phamViShare) {
                if (req.query.phamViShare === 'congkhai') {
                    filter.phamViShare = true; // Chỉ lấy đề thi công khai
                } else if (req.query.phamViShare === 'riengtu') {
                    filter.phamViShare = false; // Chỉ lấy đề thi riêng tư
                }
            }
      

            const deThiList = await BoDe.find(filter).populate('monHoc capHoc thoiGianThi nguoiTao');
            console.log("deThiList: ", deThiList);
            

            res.status(200).json({ data: deThiList, message: "Lấy danh sách đề thi thành công", errCode: 0 });
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đề thi:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    getDetailDeThi: async (req,res) => {
        try {
            const {id} = req.query

            let sp = await BoDe.findById(id).populate("monHoc capHoc thoiGianThi nguoiTao")
            if(sp) {
                return res.status(200).json({
                    data: sp,
                    message: "Đã có thông tin chi tiết!"
                })
            } else {
                return res.status(500).json({
                    message: "Thông tin chi tiết thất bại!"
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


    getOneDeThi: async (req, res) => {
        try {
            const deThiList = await BoDe.findOne({_id: req.query._id}).populate('monHoc capHoc thoiGianThi nguoiTao')
            if (!deThiList) {
                return res.status(404).json({ message: 'Không tìm thấy đề thi' });
            }
            res.status(200).json({data: deThiList, message: "Lấy danh sách đề thi thành công", errCode: 0});
        } catch (error) {
            console.error('Lỗi khi lấy danh sách đề thi:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    createDeThi: async (req, res) => {
        try {
            const newDeThi = new BoDe(req.body); 
            const savedDeThi = await newDeThi.save(); 
            
            return res.status(201).json({
                message: "Bạn đã thêm đề thi thành công!",
                errCode: 0,
                data: savedDeThi
            });

        } catch (error) {
            console.error('Lỗi khi tạo đề thi:', error);
            return res.status(500).json({ 
                message: 'Lỗi server khi tạo đề thi', 
                errCode: -1 
            });
        }
    },

    // POST /api/bode/add-multiple-cau-hoi
    addMultipleCauHoi: async (req, res) => {
        const { boDeId, cauHoi } = req.body;

        if (!boDeId || !cauHoi || !Array.isArray(cauHoi)) {
            return res.status(400).json({ success: false, message: "Thiếu dữ liệu." });
        }

        try {
            const boDe = await BoDe.findById(boDeId);
            if (!boDe) return res.status(404).json({ success: false, message: "Không tìm thấy bộ đề." });

            boDe.cauHoi.push(...cauHoi);
            await boDe.save();

            res.status(200).json({ success: true, message: "Đã thêm câu hỏi hàng loạt." });
        } catch (err) {
            console.error("Lỗi thêm nhanh:", err);
            res.status(500).json({ success: false, message: "Lỗi server." });
        }
    },



    updateProduct: async (req, res) => {
        try {
            let {_id, ten, matKhau, Image, monHoc, capHoc, moTa, thoiGianThi, cauHoi, nguoiTao, phamViShare} = req.body

            let updateTL = await BoDe.updateOne({_id: _id},{ten, matKhau, Image, monHoc, capHoc, moTa, thoiGianThi, cauHoi, nguoiTao, phamViShare})

            if(updateTL) {
                return res.status(200).json({
                    data: updateTL,
                    message: "Chỉnh sửa đề thi thành công"
                })
            } else {
                return res.status(404).json({                
                    message: "Chỉnh sửa đề thi thất bại"
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

    updateMultipleCauHoi: async (req, res) => {
    try {
        const { boDeId, cauHoi } = req.body;

        if (!boDeId || !Array.isArray(cauHoi)) {
        return res.status(400).json({
            message: "Thiếu boDeId hoặc danh sách câu hỏi không hợp lệ",
            success: false,
        });
        }

        const updated = await BoDe.updateOne(
        { _id: boDeId },
        { $set: { cauHoi: cauHoi } }
        );

        if (updated.modifiedCount > 0) {
        return res.status(200).json({
            message: "Cập nhật câu hỏi thành công",
            success: true,
        });
        } else {
        return res.status(404).json({
            message: "Không tìm thấy hoặc không có thay đổi",
            success: false,
        });
        }
    } catch (error) {
        console.error("Lỗi updateMultipleCauHoi:", error);
        return res.status(500).json({
        message: "Lỗi server khi cập nhật câu hỏi",
        error: error.message,
        success: false,
        });
    }
    },


    deleteBode: async (req, res) => {
        try {
            const _id = req.params.id
            let xoaTL = await BoDe.deleteOne({_id: _id})

            if(xoaTL) {
                return res.status(200).json({
                    data: xoaTL,
                    message: "Bạn đã xoá bộ đề thành công!"
                })
            } else {
                return res.status(500).json({
                    message: "Bạn đã xoá bộ đề thất bại!"
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

    countBoDeByMonHoc: async (req, res) => {
        try {
            // Lấy tất cả các môn học
            const monHocs = await MonHoc.find();

            // Duyệt từng môn học → đếm số bộ đề liên kết
            const result = await Promise.all(
                monHocs.map(async (monHoc) => {
                    const count = await BoDe.countDocuments({ monHoc: monHoc._id });
                    return {
                        _id: monHoc._id,
                        ten: monHoc.ten,
                        Image: monHoc.Image,
                        soBoDe: count
                    };
                })
            );

            res.status(200).json({
                message: 'Thống kê số bộ đề theo môn học',
                data: result
            });
        } catch (error) {
            console.error('Lỗi khi đếm bộ đề theo môn học:', error);
            res.status(500).json({
                message: 'Lỗi server khi đếm bộ đề',
                errCode: -1
            });
        }
    },

    importBoDe: async (req, res) => {
        const idBoDe = req.body.idBoDe;
        const file = req.file;

        if (!file) return res.status(400).json({ message: 'Không có file được tải lên' });

        const ext = path.extname(file.originalname).toLowerCase();
        let cauHoiList = [];

        try {
            if (ext === '.xlsx') {
            cauHoiList = await parseExcel(file.path);
            } else if (ext === '.docx') {
            cauHoiList = await parseDocx(file.path);
            } else if (ext === '.pdf') {
            cauHoiList = await parsePdf(file.path);
            } else {
            return res.status(400).json({ message: 'Định dạng file không hỗ trợ' });
            }

            const boDe = await BoDe.findById(idBoDe);
            if (!boDe) return res.status(404).json({ message: 'Không tìm thấy bộ đề' });

            boDe.cauHoi.push(...cauHoiList);
            await boDe.save();

            res.json({ message: 'Import thành công', soCauHoi: cauHoiList.length });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Lỗi xử lý file' });
        }
    },

    deleteCauHoi: async (req, res) => {
        const { idBoDe, idCauHoi } = req.params;

        try {
            const boDe = await BoDe.findById(idBoDe);
            if (!boDe) return res.status(404).json({ success: false, message: "Bộ đề không tồn tại" });

            const index = boDe.cauHoi.findIndex(q => q._id.toString() === idCauHoi);
            if (index === -1) return res.status(404).json({ success: false, message: "Câu hỏi không tồn tại trong bộ đề" });

            boDe.cauHoi.splice(index, 1);
            await boDe.save();

            return res.status(200).json({ success: true, message: "Xoá câu hỏi thành công" });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Lỗi server" });
        }
    }
}