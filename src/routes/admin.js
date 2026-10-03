const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const couponCtrl = require('../controllers/adminCouponController');
const bannerCtrl = require('../controllers/adminBannerController');
const userCtrl = require('../controllers/adminUserController');
const { protect, isAdmin } = require('../middleware/auth');
const bookCtrl = require('../controllers/adminBookController');

router.use(protect, isAdmin);
router.get('/', ctrl.dashboard);
router.get('/orders', ctrl.orders);
router.get('/orders/:code', ctrl.orderDetail);

router.get('/books', bookCtrl.list);
router.get('/books/new', bookCtrl.form);
router.get('/books/:id/edit', bookCtrl.form);

router.get('/coupons', couponCtrl.list);
router.get('/coupons/new', couponCtrl.form);
router.get('/coupons/:id/edit', couponCtrl.form);

router.get('/users', userCtrl.list);

router.get('/banners', bannerCtrl.list);
router.get('/banners/new', bannerCtrl.form);
router.get('/banners/:id/edit', bannerCtrl.form);

module.exports = router;