const mongoose = require("mongoose");
const BaiViet = require('../../model/BaiViet');
const TheLoai = require('../../model/TheLoai');
const User = require('../../model/User');

require('dotenv').config();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id));

module.exports = {
    createBaiViet: async (req,res) => {
        try {
            const {
                title, anhBia, moTaNgan, noiDungChinh, tags, theLoai, nguoiTao
            } = req.body

            const createBV = await BaiViet.create({title, anhBia, moTaNgan, noiDungChinh, tags, theLoai, nguoiTao})
            if(createBV) {
                return res.status(200).json({
                    data: createBV,
                    message: 'Tạo bài viết thành công!',
                    error: 0
                })
            } else {
                return res.status(500).json({
                    error: 1,
                    message: 'Tạo bài viết thất bại!',
                })
            }
        } catch (error) {
            console.log("lỗi: ", error);
        }
    },

    updateBaiViet: async (req,res) => {
        try {
            const {
                title, anhBia, moTaNgan, noiDungChinh, tags, _id, theLoai, nguoiTao
            } = req.body

            const createBV = await BaiViet.updateOne({_id: _id},{title, anhBia, moTaNgan, noiDungChinh, tags, theLoai, nguoiTao})
           if(createBV) {
                return res.status(200).json({
                    data: createBV,
                    message: 'Sửa bài viết thành công!',
                    error: 0
                })
            } else {
                return res.status(500).json({
                    error: 1,
                    message: 'Sửa bài viết thất bại!',
                })
            }
        } catch (error) {
            console.log("lỗi: ", error);
        }
    },

    deleteBaiViet: async (req,res) => {
        try {
            const id = req.params.id

            const createBV = await BaiViet.deleteOne({_id: id})
           if(createBV) {
                return res.status(200).json({
                    message: 'Xóa bài viết thành công!',
                    error: 0
                })
            } else {
                return res.status(500).json({
                    error: 1,
                    message: 'Xóa bài viết thất bại!',
                })
            }
        } catch (error) {
            console.log("lỗi: ", error);
        }
    },

    getBaiViet: async (req, res) => {
        try {
            let filter = {};
            const {
                status, search, valueTL, poster, // lọc
                page = 1, limit,
                sort = "newest"         
            } = req.query;

            // 👇 Map sort theo ngayDang
            let sortOption = { ngayDang: -1 };  // newest
            if (String(sort).toLowerCase() === "oldest") {
                sortOption = { ngayDang: 1 };
            }

            // ===== status =====
            if (typeof status !== "undefined") {
                const s = String(status).toLowerCase().trim();
                if (["true", "1"].includes(s)) filter.status = true;
                else if (["false", "0"].includes(s)) filter.status = false;
                else if (s === "" || s === "all") {
                    // không lọc
                } else {
                    return res.status(400).json({ errCode: 1, message: "status phải là true/false/1/0" });
                }
            }

            // ===== title search (không phân biệt hoa thường) =====
            // if (search && search.trim()) {
            // filter.title = { $regex: search.trim(), $options: "i" };
            // }
            // Nên escape regex để tránh ký tự đặc biệt bị hiểu sai
            const escapeReg = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            if (search && search.trim()) {
                const q = search.trim();
                const rx = new RegExp(escapeReg(q), "i"); // không phân biệt hoa thường

                const orConds = [
                    { title: rx },
                    { moTaNgan: rx },
                    // tags là mảng string → dùng $elemMatch + $regex
                    { tags: { $elemMatch: { $regex: rx } } },
                ];

                // Ghép với $or có sẵn (nếu có)
                filter.$or = filter.$or ? filter.$or.concat(orConds) : orConds;
            }


            // ===== theLoai (ObjectId) =====
            if (valueTL) {
            if (!isValidId(valueTL)) {
                return res.status(400).json({ errCode: 1, message: "valueTL không hợp lệ" });
            }
            filter.theLoai = new mongoose.Types.ObjectId(valueTL);
            }

            // ===== poster (nguoiTao) : cho phép truyền id hoặc từ khóa =====
            if (poster && poster.trim()) {
            const kw = poster.trim();

            if (isValidId(kw)) {
                filter.nguoiTao = new mongoose.Types.ObjectId(kw);
            } else {
                // tìm user theo các trường hay dùng (tùy schema của bạn)
                // ví dụ: taiKhoan, hoTen, email
                const users = await User.find({
                $or: [
                    { taiKhoan: { $regex: kw, $options: "i" } },
                    { hoTen: { $regex: kw, $options: "i" } },
                    { email: { $regex: kw, $options: "i" } },
                ],
                }).select("_id");

                const ids = users.map(u => u._id);
                // nếu không tìm thấy ai -> trả luôn rỗng cho nhanh
                if (!ids.length) {
                    return res.status(200).json({ data: [], total: 0, message: "OK", errCode: 0 });
                }
                filter.nguoiTao = { $in: ids };
            }
            }

            // ===== query + phân trang (tuỳ chọn) =====
            const pageNum = Math.max(parseInt(page) || 1, 1);
            let limitNum;

            if (limit) {
            // Nếu có truyền limit → parse và kẹp 1 - 100
            limitNum = Math.min(Math.max(parseInt(limit), 1), 100);
            } else {
            // Nếu không truyền → mặc định 99999
            limitNum = 99999;
            }

            const [items, total] = await Promise.all([
            BaiViet.find(filter)
                .populate("theLoai", "ten")
                .populate("nguoiTao", "taiKhoan hoTen email")
                // .sort({ ngayDang: -1 })
                .sort({ ...sortOption, _id: -1 })  // tie-breaker
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .lean(),
            BaiViet.countDocuments(filter),
            ]);

            return res.status(200).json({
                data: items,
                total,
                page: pageNum,
                limit: limitNum,
                message: "Lấy danh sách bài viết thành công",
                errCode: 0,
            });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách bài viết:", error);
            return res.status(500).json({ message: "Lỗi server" });
        }
    },
    
    getDetailBaiViet: async (req,res) => {
        try {
            const id = req.query.id

            let sp = await BaiViet.findById(id).populate("theLoai nguoiTao")
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

    toggleStatus: async (req, res) => {
        try {
            const { status, id} = req.body;
           
            if (typeof status !== "boolean") {
                return res.status(400).json({ errCode: 1, message: "status phải là boolean" });
            }

            // Nếu muốn ghi lại ngày đăng khi bật hiển thị, giữ lại dòng dưới
            const payload = { status, ...(status ? { ngayDang: new Date() } : {}) };

            const updated = await BaiViet.findByIdAndUpdate(id, payload, {
                new: true,
                runValidators: true,
            });

            if (!updated) {
                return res.status(404).json({ errCode: 1, message: "Không tìm thấy bài viết" });
            }

            return res.status(200).json({
                errCode: 0,
                message: status ? "Đã bật hiển thị" : "Đã ẩn bài viết",
                data: updated,
            });
        } catch (e) {
            console.error(e);
            return res.status(500).json({ errCode: 1, message: "Lỗi server" });
        }
    },

    getAllTheLoai: async (req, res) => {
        try {
            let getAll = await TheLoai.find({})
             if(getAll) {
                return res.status(200).json({
                    data: getAll,
                    message: "Đã có thông tin thể loại!"
                })
            } else {
                return res.status(500).json({
                    message: "Thông tin thể loại thất bại!"
                })
            }
        } catch (error) {
            
        }
    }
}