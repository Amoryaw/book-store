const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        discountType: { type: String, enum: ['percent', 'amount'], required: true },
        discountValue: { type: Number, required: true, min: 0 },
        maxDiscountAmount: Number,              // giảm tối đa (với loại percent)
        minOrderAmount: { type: Number, default: 0 },
        usageLimitTotal: Number,                // tổng lượt dùng
        usageLimitPerUser: { type: Number, default: 1 },
        usedCount: { type: Number, default: 0 },
        startsAt: Date,
        endsAt: Date,
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Coupon', couponSchema);