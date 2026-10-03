const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/validate-coupon', ctrl.validateCoupon);
router.post('/', ctrl.create);
router.post('/:code/pay', ctrl.payOrder);

module.exports = router;