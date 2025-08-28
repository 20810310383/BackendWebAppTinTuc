const mongoose = require('mongoose');
const Review = require('../../model/Review');
const { Types} = require('mongoose');

require('dotenv').config();

module.exports = {

    createComment: async (req, res) => {
        try {
            let {boDe, rating, content, userId } = req.body

            if (!rating || !boDe || !content) {
                return res.status(400).json({ message: "Vui lòng chọn sao và nhập nội dung." });
            }

            const review = new Review({
                user: userId,
                boDe,
                rating,
                content
            });

            await review.save();

            const populatedReview = await Review.findById(review._id).populate('user boDe')

            if(review){
                return res.status(200).json({
                    message: "Bình luận thành công!",
                    errCode: 0,
                    data: populatedReview
                })
            } else {
                return res.status(500).json({
                    message: "Bình luận thành công thất bại!",                
                    errCode: -1,
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

    // getComment: async (req, res) => {
    //     try {

    //         const { page, limit, idSP } = req.query; 
    
    //         // Chuyển đổi thành số
    //         const pageNumber = parseInt(page, 10);
    //         const limitNumber = parseInt(limit, 10);
    
    //         // Tính toán số bản ghi bỏ qua
    //         const skip = (pageNumber - 1) * limitNumber;

    //         let findCommentLength = await Comments.find({ idSP: idSP })
    //         .populate("idKH idSP");

    //         let findComment = await Comments.find({ idSP: idSP })
    //         .skip(skip)
    //         .limit(limitNumber)
    //         .populate("idKH idSP");
    //         console.log("find: ", findComment);                        

    //         // Lọc ra các phần tử có 'soSaoDanhGia' = 1, 2, 3, 4, 5 và đếm số lượng
    //         let starCount = {
    //             1: findCommentLength.filter(item => item.soSaoDanhGia === "1").length,
    //             2: findCommentLength.filter(item => item.soSaoDanhGia === "2").length,
    //             3: findCommentLength.filter(item => item.soSaoDanhGia === "3").length,
    //             4: findCommentLength.filter(item => item.soSaoDanhGia === "4").length,
    //             5: findCommentLength.filter(item => item.soSaoDanhGia === "5").length,
    //         };

    //         // Tính tổng số bình luận
    //         let totalComments = await Comments.countDocuments({ idSP: idSP });
                   
    //         if(findComment){
    //             return res.status(200).json({
    //                 message: "Tìm Bình luận thành công!",
    //                 errCode: 0,
    //                 data: {
    //                     comments: findComment,
    //                     totalComments: totalComments,  // Tổng số bình luận cho sản phẩm này
    //                     totalPages: Math.ceil(totalComments / limitNumber),  // Tổng số trang
    //                     currentPage: pageNumber,  // Trang hiện tại
    //                     starCount: starCount // Trả về số lượng đánh giá theo sao
    //                 }
    //             })
    //         } else {
    //             return res.status(500).json({
    //                 message: "Tìm Bình luận thành công thất bại!",                
    //                 errCode: -1,
    //             })
    //         } 
    //     } catch (error) {
    //         console.error(error);
    //         return res.status(500).json({
    //             message: "Có lỗi xảy ra.",
    //             error: error.message,
    //         });
    //     }  
    // }, 

    deleteComment: async (req, res) => {
        try {
            let id = req.params.id
            console.log("id: ",id);
            
            let findComment = await Review.deleteOne({_id: id})
            console.log("find: ", findComment);
            
            if(findComment){
                return res.status(200).json({
                    message: "Xóa Bình luận thành công!",
                    errCode: 0,
                    data: findComment
                })
            } else {
                return res.status(500).json({
                    message: "Xóa Bình luận thành công thất bại!",                
                    errCode: -1,
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

    getAllCommentById: async (req, res) => {
        try {
            const { boDeId, pagee, limitt } = req.query;
            const page = parseInt(pagee) || 1; // Trang hiện tại
            const limit = parseInt(limitt) || 10; // Số comment mỗi trang

            if (!boDeId) {
               return res.status(400).json({ message: "Thiếu ID bộ đề." });
            }

            const skip = (page - 1) * limit;

            // Lấy danh sách comment theo trang
            const reviews = await Review.find({ boDe: boDeId })
            .populate('user boDe')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

            // Đếm tổng số comment
            const total = await Review.countDocuments({ boDe: boDeId });

            // Đếm số comment từng loại sao
            const counts = await Review.aggregate([
                { $match: { boDe: mongoose.Types.ObjectId(boDeId) } },
                {
                    $group: {
                    _id: "$rating",
                    count: { $sum: 1 }
                    }
                }
            ]);

            // Biến đổi counts thành object {1:...,2:...}
            const ratingCounts = { 1:0,2:0,3:0,4:0,5:0 };
            counts.forEach(c => {
                ratingCounts[c._id] = c.count;
            });

            res.json({
                reviews,
                total,
                ratingCounts,
                currentPage: page,
                totalPages: Math.ceil(total / limit)
            });

        } catch (error) {
            console.error("Lỗi lấy đánh giá:", error);
            res.status(500).json({ message: "Đã xảy ra lỗi khi lấy đánh giá." });
        }
    }
}