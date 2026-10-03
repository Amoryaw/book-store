const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

class CouponError extends Error { }

const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

// Kiểm tra mã giảm giá và tính số tiền giảm. Lỗi thì ném CouponError (có message tiếng Việt).
const checkCoupon = async (code, userId, subtotal) => {
    const coupon = await Coupon.findOne({ code: String(code || '').trim().toUpperCase() });
    if (!coupon || !coupon.isActive) throw new CouponError('Mã giảm giá không hợp lệ.');

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) throw new CouponError('Mã giảm giá chưa đến thời gian áp dụng.');
    if (coupon.endsAt && now > coupon.endsAt) throw new CouponError('Mã giảm giá đã hết hạn.');
    if (subtotal < coupon.minOrderAmount) {
        throw new CouponError(`Đơn hàng tối thiểu ${vnd(coupon.minOrderAmount)} mới dùng được mã này.`);
    }
    if (coupon.usageLimitTotal != null && coupon.usedCount >= coupon.usageLimitTotal) {
        throw new CouponError('Mã giảm giá đã hết lượt sử dụng.');
    }
    if (coupon.usageLimitPerUser != null) {
        const used = await Order.countDocuments({ user: userId, coupon: coupon._id, status: { $ne: 'cancelled' } });
        if (used >= coupon.usageLimitPerUser) throw new CouponError('Bạn đã dùng hết lượt cho mã này.');
    }

    let discount = coupon.discountType === 'percent'
        ? Math.floor((subtotal * coupon.discountValue) / 100)
        : coupon.discountValue;
    if (coupon.discountType === 'percent' && coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
    }
    discount = Math.min(discount, subtotal);   // không giảm quá tiền hàng

    return { coupon, discount };
};

module.exports = { checkCoupon, CouponError };