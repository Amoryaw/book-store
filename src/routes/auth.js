const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.get('/register', authController.showRegister);
router.get('/login', authController.showLogin);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.get('/verify-email/:token', authController.verifyEmail);

router.get('/forgot-password', authController.showForgotPassword);
router.post('/forgot-password', authController.forgotPassword);

router.get('/reset-password/:token', authController.showResetPassword);
router.post('/reset-password/:token', authController.resetPassword);

router.get('/change-password', protect, authController.showChangePassword);
router.post('/change-password', protect, authController.changePassword);

module.exports = router;