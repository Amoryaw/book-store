const Stripe = require('stripe');
const Book = require('../models/Book');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const stripeEnabled = !!stripe;

// Giới hạn số tiền thanh toán thẻ (VND không có phần lẻ nên đây là số đồng).
// Tối thiểu: Stripe yêu cầu khoảng 0,50 USD, đặt 20.000 ₫ để an toàn.
// Tối đa: Stripe giới hạn số chữ số của số tiền (quy tắc chung là 8 chữ số), đặt 99.999.999 ₫ để an toàn.
const MIN_STRIPE_AMOUNT = 20000;
const MAX_STRIPE_AMOUNT = 99999999;

const SESSION_MINUTES = 30;   // phiên thanh toán sống 30 phút (Stripe không cho ngắn hơn)

// Tạo phiên thanh toán cho một đơn. Số tiền luôn lấy từ đơn trong database.
const createCheckoutSession = (order, email) => {
    const count = order.items.reduce((s, i) => s + i.quantity, 0);
    return stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email,
        client_reference_id: order.orderCode,
        metadata: { orderCode: order.orderCode },
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'vnd',
                    unit_amount: order.totalAmount,
                    product_data: {
                        name: `Đơn hàng ${order.orderCode} - Book Store`,
                        description: `${count} sản phẩm`,
                    },
                },
            },
        ],
        // +60 giây để dư so với mức tối thiểu 30 phút của Stripe
        expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60 + 60,
        success_url: `${process.env.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/orders/${order.orderCode}?canceled=1`,
    });
};

// Đơn chuyển sang "đã hủy" (chỉ khi còn chờ và chưa thanh toán): hoàn lại tồn kho và lượt dùng mã.
// Chuyển trạng thái bằng một câu lệnh nguyên tử nên chạy nhiều lần cũng không hoàn kho hai lần.
const cancelUnpaidOrder = async (orderId) => {
    const order = await Order.findOneAndUpdate(
        { _id: orderId, status: { $in: ['pending', 'confirmed'] }, paymentStatus: 'unpaid' },
        { $set: { status: 'cancelled' } },
        { new: true }
    );
    if (!order) return false;

    await Promise.all(
        order.items.map((it) =>
            Book.updateOne({ _id: it.book }, { $inc: { stock: it.quantity, sold: -it.quantity } }, { timestamps: false })
        )
    );
    if (order.coupon) await Coupon.updateOne({ _id: order.coupon }, { $inc: { usedCount: -1 } });
    return true;
};

// Hỏi Stripe xem đơn đã được trả chưa và cập nhật đơn cho khớp. Trả về đơn mới nhất.
const syncOrderPayment = async (order) => {
    if (
        !stripe ||
        order.paymentMethod !== 'stripe' ||
        order.paymentStatus !== 'unpaid' ||
        order.status !== 'pending' ||
        !order.stripeSessionId
    ) {
        return order;
    }
    try {
        const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);

        if (session.payment_status === 'paid') {
            const paymentIntent =
                typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent && session.payment_intent.id;
            const updated = await Order.findOneAndUpdate(
                { _id: order._id, paymentStatus: 'unpaid' },
                { $set: { paymentStatus: 'paid', status: 'confirmed', paidAt: new Date(), transactionId: paymentIntent } },
                { new: true }
            );
            return updated || (await Order.findById(order._id)) || order;
        }

        if (session.status === 'expired') {
            await cancelUnpaidOrder(order._id);
            return (await Order.findById(order._id)) || order;
        }
    } catch (err) {
        console.error('Đồng bộ thanh toán lỗi:', err.message);
    }
    return order;
};

// Link thanh toán để khách trả tiếp: dùng lại phiên đang mở, nếu không thì tạo phiên mới
const getOrderCheckoutUrl = async (order, email) => {
    if (order.stripeSessionId) {
        const old = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
        if (old.status === 'open' && old.url) return old.url;
        if (old.status === 'open') await stripe.checkout.sessions.expire(old.id);   // tránh có hai phiên cùng mở
    }
    const session = await createCheckoutSession(order, email);
    await Order.updateOne({ _id: order._id }, { stripeSessionId: session.id });
    return session.url;
};

// Quét nền mỗi 2 phút: đơn đã trả thì đánh dấu đã thanh toán, phiên hết hạn thì hủy đơn và hoàn kho
const startPaymentSweeper = () => {
    if (!stripe) return;
    const run = async () => {
        try {
            const orders = await Order.find({
                paymentMethod: 'stripe',
                paymentStatus: 'unpaid',
                status: 'pending',
                stripeSessionId: { $exists: true },
            }).limit(50);
            for (const o of orders) await syncOrderPayment(o);
        } catch (err) {
            console.error('Quét thanh toán lỗi:', err.message);
        }
    };
    setInterval(run, 2 * 60 * 1000);
    run();
};

module.exports = {
    stripeEnabled,
    MIN_STRIPE_AMOUNT,
    MAX_STRIPE_AMOUNT,
    createCheckoutSession,
    getOrderCheckoutUrl,
    syncOrderPayment,
    cancelUnpaidOrder,
    startPaymentSweeper,
};