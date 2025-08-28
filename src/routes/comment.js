const express = require("express");
const { getAllCommentById, deleteComment, createComment } = require("../controllers/Comments/comment.controller");
const router = express.Router();

router.get("/get-comment-by-idBoDe", getAllCommentById);
router.post("/create-comment", createComment);
router.delete("/delete-comment/:id", deleteComment);

module.exports = router;