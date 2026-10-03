const Order = require('../models/Order');
const Book = require('../models/Book');
const User = require('../models/User');
const { cancelUnpaidOrder } = require('../utils/payment');

const PAGE_SIZE = 10;
const ORDER_STATUSES = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

const TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['shipping', 'cancelled'],
    shipping: ['completed'],
    completed: [],
    cancelled: [],
};

// Các trạng thái admin được chuyển tới từ trạng thái hiện tại của đơn
const nextStatuses = (order) => {
    let list = TRANSITIONS[order.status] || [];
    if (order.paymentMethod === 'stripe') {
        if (order.paymentStatus !== 'paid') return [];            // chờ khách trả / tự hủy khi hết hạn
        list = list.filter((s) => s !== 'cancelled');             // chưa hỗ trợ hoàn tiền
    }
    return list;
};

// GET /admin
exports.dashboard = async (req, res) => {
    const [statusAgg, revenueAgg, bookCount, userCount] = await Promise.all([
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Order.aggregate([
            { $match: { paymentStatus: 'paid', status: { $ne: 'cancelled' } } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Book.countDocuments(),
        User.countDocuments({ role: { $ne: 'admin' } }),
    ]);

    const byStatus = {};
    ORDER_STATUSES.forEach((s) => (byStatus[s] = 0));
    statusAgg.forEach((r) => (byStatus[r._id] = r.count));

    res.render('admin/dashboard', {
        layout: 'layouts/admin',
        title: 'Tổng quan',
        active: 'dashboard',
        byStatus,
        totalOrders: Object.values(byStatus).reduce((a, b) => a + b, 0),
        revenue: revenueAgg.length ? revenueAgg[0].total : 0,
        bookCount,
        userCount,
    });
};

// GET /admin/orders?status=&q=&page=
exports.orders = async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : '';
    const q = (req.query.q || '').trim();

    const filter = {};
    if (status) filter.status = status;
    if (q) {
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { orderCode: { $regex: safe, $options: 'i' } },
            { receiverName: { $regex: safe, $options: 'i' } },
            { receiverPhone: { $regex: safe } },
        ];
    }

    const [total, orders] = await Promise.all([
        Order.countDocuments(filter),
        Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    ]);

    res.render('admin/orders', {
        layout: 'layouts/admin',
        title: 'Quản lý đơn hàng',
        active: 'orders',
        orders,
        status,
        q,
        page,
        totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
        total,
    });
};

// GET /admin/orders/:code
exports.orderDetail = async (req, res) => {
    const order = await Order.findOne({ orderCode: req.params.code }).populate('user', 'fullName email');
    if (!order) {
        return res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Không tìm thấy đơn hàng.' });
    }
    res.render('admin/order-detail', {
        layout: 'layouts/admin',
        title: `Đơn ${order.orderCode}`,
        active: 'orders',
        order,
        actions: nextStatuses(order),
    });
};

// PATCH /api/admin/orders/:code/status   { status }
exports.updateOrderStatus = async (req, res) => {
    const { status } = req.body;
    const order = await Order.findOne({ orderCode: req.params.code });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });

    if (!nextStatuses(order).includes(status)) {
        return res.status(400).json({ message: 'Không thể chuyển đơn sang trạng thái này.' });
    }

    // Hủy: hoàn lại tồn kho và lượt dùng mã giảm giá
    if (status === 'cancelled') {
        const ok = await cancelUnpaidOrder(order._id);
        if (!ok) return res.status(409).json({ message: 'Đơn vừa thay đổi, vui lòng tải lại trang.' });
        return res.json({ message: 'Đã hủy đơn và hoàn lại tồn kho.' });
    }

    const set = { status };
    // COD: giao thành công nghĩa là đã thu tiền
    if (status === 'completed' && order.paymentStatus === 'unpaid') {
        set.paymentStatus = 'paid';
        set.paidAt = new Date();
    }

    // Điều kiện status: order.status tránh hai admin bấm cùng lúc
    const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: set }, { new: true });
    if (!updated) return res.status(409).json({ message: 'Đơn vừa thay đổi, vui lòng tải lại trang.' });

    res.json({ message: 'Đã cập nhật trạng thái đơn.' });
};