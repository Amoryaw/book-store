const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const couponCtrl = require('../controllers/adminCouponController');
const bannerCtrl = require('../controllers/adminBannerController');
const userCtrl = require('../controllers/adminUserController');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadBanner } = require('../middleware/upload');

router.use(protect, isAdmin);
router.patch('/orders/:code/status', ctrl.updateOrderStatus);

router.patch('/users/:id/status', userCtrl.updateStatus);

router.post('/coupons', couponCtrl.create);
router.put('/coupons/:id', couponCtrl.update);
router.delete('/coupons/:id', couponCtrl.remove);

router.post('/banners', uploadBanner.single('image'), bannerCtrl.create);
router.put('/banners/:id', uploadBanner.single('image'), bannerCtrl.update);
router.delete('/banners/:id', bannerCtrl.remove);

module.exports = router;