const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        orderCode: { type: String, required: true, unique: true },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

        // Chi tiết đơn: lưu GIÁ và TÊN tại thời điểm mua
        items: [
            {
                book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
                title: String,
                image: String,
                price: { type: Number, required: true },
                quantity: { type: Number, required: true, min: 1 },
            },
        ],

        // Thông tin người nhận (lưu trực tiếp trong đơn)
        receiverName: { type: String, required: true },
        receiverPhone: { type: String, required: true },
        receiverAddress: { type: String, required: true },

        subtotal: { type: Number, required: true },
        shippingFee: { type: Number, default: 0 },
        coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
        couponCode: String,
        discountAmount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },

        status: {
            type: String,
            enum: ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'],
            default: 'pending',
        },
        paymentMethod: { type: String, enum: ['cod', 'stripe'], default: 'cod' },
        paymentStatus: { type: String, enum: ['unpaid', 'paid', 'failed'], default: 'unpaid' },
        paidAt: Date,
        transactionId: String,     // mã giao dịch Stripe (payment intent)
        stripeSessionId: String,   // phiên thanh toán Stripe của đơn này
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);