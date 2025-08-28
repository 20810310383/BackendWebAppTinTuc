const CapHoc = require('../../model/CapHoc');
const MonHoc = require('../../model/MonHoc');

require('dotenv').config();

module.exports = {

    getCapHoc: async (req, res) => {
        try {
            const CapHocList = await CapHoc.find({}); 
            res.status(200).json({data: CapHocList, message: "Lấy danh sách CapHoc thành công", errCode: 0});
        } catch (error) {
            console.error('Lỗi khi lấy danh sách CapHoc:', error);
            res.status(500).json({ message: 'Lỗi server' });
        }
    },

    createCapHoc: async (req, res) => {
        try {
            const newCapHoc = new CapHoc(req.body); 
            const savedCapHoc = await newCapHoc.save(); 
            
            return res.status(201).json({
                message: "Bạn đã thêm CapHoc thành công!",
                errCode: 0,
                data: savedCapHoc
            });

        } catch (error) {
            console.error('Lỗi khi tạo CapHoc:', error);
            return res.status(500).json({ 
                message: 'Lỗi server khi tạo CapHoc', 
                errCode: -1 
            });
        }
    },


    updateCapHoc: async (req, res) => {
        try {
            let {_id, ten, Image, moTa} = req.body

            let updateTL = await CapHoc.updateOne({_id: _id},{ten, Image, moTa})

            if(updateTL) {
                return res.status(200).json({
                    data: updateTL,
                    message: "Chỉnh sửa CapHoc thành công"
                })
            } else {
                return res.status(404).json({                
                    message: "Chỉnh sửa CapHoc thất bại"
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

    deleteCapHoc: async (req, res) => {
        try {
            const _id = req.params.id
            let xoaTL = await CapHoc.deleteOne({_id: _id})

            if(xoaTL) {
                return res.status(200).json({
                    data: xoaTL,
                    message: "Bạn đã xoá CapHoc thành công!"
                })
            } else {
                return res.status(500).json({
                    message: "Bạn đã xoá CapHoc thất bại!"
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
}