const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../controllers/Auth/auth.middleware');
const { dangKyTK, login, refresh, logout, logoutAll, me } = require('../controllers/Auth/auth.controller');

router.post('/register', dangKyTK);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/logout-all', verifyAccessToken, logoutAll);
router.get('/me', verifyAccessToken, me);

module.exports = router;
