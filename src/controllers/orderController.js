const crypto = require('crypto');
const Book = require('../models/Book');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const { loadCart } = require('./cartController');
const { checkCoupon, CouponError } = require('../utils/coupon');
const { handleError } = require('../utils/helpers');
const {
    stripeEnabled,
    MIN_STRIPE_AMOUNT,
    MAX_STRIPE_AMOUNT,
    createCheckoutSession,
    getOrderCheckoutUrl,
    syncOrderPayment,
} = require('../utils/payment');

const PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

const newOrderCode = () => 'BS' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();

const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';

// GET /checkout
exports.checkoutPage = async (req, res, next) => {
    try {
        const { items, subtotal, shippingFee } = await loadCart(req.user._id);
        if (!items.length) return res.redirect('/cart');
        res.render('checkout', {
            title: 'Thanh toán',
            items,
            subtotal,
            shippingFee,
            stripeEnabled,
            minStripe: MIN_STRIPE_AMOUNT,
            maxStripe: MAX_STRIPE_AMOUNT,
        });
    } catch (err) {
        next(err);
    }
};

// POST /api/orders/validate-coupon   { code }
// Tiền hàng được tính từ giỏ trong database, không lấy từ client.
exports.validateCoupon = async (req, res) => {
    try {
        const { subtotal, shippingFee } = await loadCart(req.user._id);
        const { coupon, discount } = await checkCoupon(req.body.code, req.user._id, subtotal);
        res.json({
            code: coupon.code,
            discount,
            shippingFee,
            total: subtotal + shippingFee - discount,
            message: `Áp dụng mã ${coupon.code} thành công.`,
        });
    } catch (err) {
        if (err instanceof CouponError) return res.status(400).json({ message: err.message });
        handleError(err, req, res);
    }
};

// POST /api/orders   { receiverName, receiverPhone, receiverAddress, couponCode?, paymentMethod? ('cod' | 'stripe') }
exports.create = async (req, res) => {
    const reserved = [];        // sách đã trừ tồn kho (để hoàn lại nếu có lỗi)
    let couponUsed = null;      // mã giảm giá đã cộng lượt dùng (để hoàn lại nếu có lỗi)

    const rollback = async () => {
        await Promise.all(reserved.map((r) => Book.updateOne({ _id: r.book }, { $inc: { stock: r.quantity, sold: -r.quantity } })));
        if (couponUsed) await Coupon.updateOne({ _id: couponUsed }, { $inc: { usedCount: -1 } });
    };

    try {
        const receiverName = String(req.body.receiverName || '').trim();
        const receiverPhone = String(req.body.receiverPhone || '').trim();
        const receiverAddress = String(req.body.receiverAddress || '').trim();
        if (!receiverName || !receiverAddress) {
            return res.status(400).json({ message: 'Vui lòng nhập họ tên và địa chỉ nhận hàng.' });
        }
        if (!PHONE_REGEX.test(receiverPhone)) {
            return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
        }

        // Phương thức thanh toán (chỉ nhận 'cod' hoặc 'stripe')
        const paymentMethod = req.body.paymentMethod === 'stripe' ? 'stripe' : 'cod';
        if (paymentMethod === 'stripe' && !stripeEnabled) {
            return res.status(400).json({ message: 'Thanh toán bằng thẻ hiện chưa được bật.' });
        }

        // 1. Giỏ hàng (đã tự dọn theo tồn kho hiện tại)
        const { items, subtotal, shippingFee, adjusted } = await loadCart(req.user._id);
        if (!items.length) return res.status(400).json({ message: 'Giỏ hàng đang trống.', redirect: '/cart' });
        if (adjusted) {
            return res.status(409).json({ message: 'Giỏ hàng đã thay đổi do tồn kho. Vui lòng kiểm tra lại.', redirect: '/cart' });
        }

        // 2. Mã giảm giá
        let coupon = null;
        let discount = 0;
        if (req.body.couponCode && String(req.body.couponCode).trim()) {
            ({ coupon, discount } = await checkCoupon(req.body.couponCode, req.user._id, subtotal));
        }

        const total = Math.max(subtotal + shippingFee - discount, 0);
        if (paymentMethod === 'stripe' && (total < MIN_STRIPE_AMOUNT || total > MAX_STRIPE_AMOUNT)) {
            return res.status(400).json({
                message: `Thanh toán bằng thẻ chỉ áp dụng cho đơn từ ${vnd(MIN_STRIPE_AMOUNT)} đến ${vnd(MAX_STRIPE_AMOUNT)}. Vui lòng chọn thanh toán khi nhận hàng.`,
            });
        }

        // 3. Trừ tồn kho. Điều kiện stock >= quantity nằm trong chính câu lệnh cập nhật,
        //    nên hai người mua cùng lúc cuốn cuối cùng thì chỉ một người thành công.
        for (const it of items) {
            const ok = await Book.findOneAndUpdate(
                { _id: it.book._id, status: 'published', stock: { $gte: it.quantity } },
                { $inc: { stock: -it.quantity, sold: it.quantity } },
                { timestamps: false }
            );
            if (!ok) {
                await rollback();
                return res.status(409).json({ message: `"${it.book.title}" không đủ hàng. Vui lòng kiểm tra lại giỏ.`, redirect: '/cart' });
            }
            reserved.push({ book: it.book._id, quantity: it.quantity });
        }

        // 4. Cộng lượt dùng mã (kiểm tra lại giới hạn tổng ngay trong câu lệnh để tránh vượt khi nhiều người dùng cùng lúc)
        if (coupon) {
            const ok = await Coupon.findOneAndUpdate(
                {
                    _id: coupon._id,
                    $expr: { $or: [{ $eq: [{ $ifNull: ['$usageLimitTotal', null] }, null] }, { $lt: ['$usedCount', '$usageLimitTotal'] }] },
                },
                { $inc: { usedCount: 1 } }
            );
            if (!ok) {
                await rollback();
                return res.status(400).json({ message: 'Mã giảm giá đã hết lượt sử dụng.' });
            }
            couponUsed = coupon._id;
        }

        // 5. Tạo đơn (lưu tên, giá, ảnh tại thời điểm mua)
        const order = await Order.create({
            orderCode: newOrderCode(),
            user: req.user._id,
            items: items.map((it) => ({
                book: it.book._id,
                title: it.book.title,
                image: it.book.coverImage,
                price: it.book.price,
                quantity: it.quantity,
            })),
            receiverName,
            receiverPhone,
            receiverAddress,
            subtotal,
            shippingFee,
            coupon: coupon ? coupon._id : undefined,
            couponCode: coupon ? coupon.code : undefined,
            discountAmount: discount,
            totalAmount: total,
            paymentMethod,
        });

        // 6a. Thanh toán thẻ: tạo phiên Stripe, xóa giỏ rồi chuyển khách sang trang thanh toán của Stripe
        if (paymentMethod === 'stripe') {
            try {
                const session = await createCheckoutSession(order, req.user.email);
                order.stripeSessionId = session.id;
                await order.save();
                await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
                return res.status(201).json({ message: 'Đang chuyển tới trang thanh toán...', redirect: session.url });
            } catch (stripeErr) {
                console.error('Stripe lỗi:', stripeErr.message);
                // Không tạo được phiên thanh toán: xóa đơn vừa tạo, hoàn lại kho và mã giảm giá, giữ nguyên giỏ hàng
                await Order.deleteOne({ _id: order._id });
                await rollback().catch(console.error);
                reserved.length = 0;
                couponUsed = null;
                return res.status(502).json({
                    message: 'Không kết nối được cổng thanh toán. Vui lòng thử lại hoặc chọn thanh toán khi nhận hàng.',
                });
            }
        }

        // 6b. COD: xóa giỏ
        await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });

        res.status(201).json({ message: 'Đặt hàng thành công.', redirect: `/orders/${order.orderCode}?new=1` });
    } catch (err) {
        await rollback().catch(console.error);
        if (err instanceof CouponError) return res.status(400).json({ message: err.message });
        handleError(err, req, res);
    }
};

// POST /api/orders/:code/pay   (thanh toán lại đơn Stripe chưa trả)
exports.payOrder = async (req, res) => {
    try {
        let order = await Order.findOne({ orderCode: req.params.code, user: req.user._id });
        if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

        order = await syncOrderPayment(order);   // có thể đơn vừa được trả hoặc vừa hết hạn

        if (order.paymentMethod !== 'stripe' || order.paymentStatus === 'paid') {
            return res.status(400).json({ message: 'Đơn hàng này không cần thanh toán thêm.' });
        }
        if (order.status !== 'pending') {
            return res.status(400).json({ message: 'Đơn hàng không còn ở trạng thái chờ thanh toán.' });
        }

        const url = await getOrderCheckoutUrl(order, req.user.email);
        res.json({ redirect: url });
    } catch (err) {
        handleError(err, req, res);
    }
};

// GET /payment/success?session_id=...   (Stripe chuyển khách về đây sau khi trả tiền)
exports.paymentSuccess = async (req, res, next) => {
    try {
        const sessionId = String(req.query.session_id || '');
        if (!sessionId) return res.redirect('/orders');

        // Tìm theo cả phiên lẫn người dùng nên không ai xem được đơn của người khác
        const order = await Order.findOne({ stripeSessionId: sessionId, user: req.user._id });
        if (!order) return res.redirect('/orders');

        const updated = await syncOrderPayment(order);
        res.redirect(`/orders/${updated.orderCode}?paid=1`);
    } catch (err) {
        next(err);
    }
};

// GET /orders
exports.myOrders = async (req, res, next) => {
    try {
        let orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

        // Đơn Stripe đang chờ trả: hỏi lại Stripe để trạng thái hiển thị luôn mới
        const waiting = orders.filter((o) => o.paymentMethod === 'stripe' && o.paymentStatus === 'unpaid' && o.status === 'pending');
        if (waiting.length) {
            await Promise.all(waiting.map(syncOrderPayment));
            orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
        }

        res.render('orders/list', { title: 'Đơn hàng của tôi', orders });
    } catch (err) {
        next(err);
    }
};

// GET /orders/:code
exports.orderDetail = async (req, res, next) => {
    try {
        let order = await Order.findOne({ orderCode: req.params.code, user: req.user._id });
        if (!order) {
            return res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Không tìm thấy đơn hàng.' });
        }
        order = await syncOrderPayment(order);
        res.render('orders/detail', {
            title: `Đơn ${order.orderCode}`,
            order,
            justOrdered: req.query.new === '1',
            paidFlag: req.query.paid === '1',
            canceledFlag: req.query.canceled === '1',
        });
    } catch (err) {
        next(err);
    }
};