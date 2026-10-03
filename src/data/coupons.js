// Mã giảm giá mẫu. Thêm mã mới: thêm một dòng rồi chạy `npm run seed`.
// discountType: 'percent' (giảm %) hoặc 'amount' (giảm số tiền cố định)
module.exports = [
    { code: 'WELCOME10', discountType: 'percent', discountValue: 10, maxDiscountAmount: 30000, minOrderAmount: 100000, usageLimitPerUser: 1 },
    { code: 'GIAM20K', discountType: 'amount', discountValue: 20000, minOrderAmount: 150000, usageLimitTotal: 100, usageLimitPerUser: 2 },
];