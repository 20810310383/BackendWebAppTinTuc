const express = require("express");
const { luuKetQuaThi, layKetQuaTheoBoDe, layKetQuaTheoUser } = require("../controllers/KetQuaThi/ketqua.controller");
const { getLeaderboard } = require("../controllers/LeaderBoard/leaderboardController");
const router = express.Router();

router.post('/luu-ketqua', luuKetQuaThi);
router.get('/get-ketqua', layKetQuaTheoBoDe);
router.get('/get-ketqua-by-user', layKetQuaTheoUser);
router.get('/leaderboard', getLeaderboard);


module.exports = router;