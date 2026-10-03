// Các trang yêu cầu đăng nhập: giỏ hàng, thanh toán, đơn hàng của tôi
const express = require('express');
const router = express.Router();
const cart = require('../controllers/cartController');
const order = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.get('/cart', protect, cart.page);
router.get('/checkout', protect, order.checkoutPage);
router.get('/orders', protect, order.myOrders);
router.get('/orders/:code', protect, order.orderDetail);
router.get('/payment/success', protect, order.paymentSuccess);

module.exports = router;