const User = require('../models/User');
const Order = require('../models/Order');
const { escapeRegex, handleError } = require('../utils/helpers');

const PAGE_SIZE = 10;

// GET /admin/users?q=&status=&page=
exports.list = async (req, res) => {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const status = ['active', 'blocked'].includes(req.query.status) ? req.query.status : '';
    const q = (req.query.q || '').trim();

    // Chỉ liệt kê tài khoản đã xác thực email (tài khoản chưa xác thực sẽ tự bị xóa khi hết hạn)
    const filter = { isVerified: true };
    if (status) filter.status = status;
    if (q) {
        const safe = escapeRegex(q);
        filter.$or = [
            { fullName: { $regex: safe, $options: 'i' } },
            { email: { $regex: safe, $options: 'i' } },
            { phone: { $regex: safe } },
        ];
    }

    const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE),
    ]);

    // Số đơn (không tính đơn đã hủy) của các user đang hiển thị
    const counts = await Order.aggregate([
        { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } } },
        { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const orderCount = {};
    counts.forEach((c) => (orderCount[String(c._id)] = c.count));

    res.render('admin/users', {
        layout: 'layouts/admin',
        title: 'Quản lý người dùng',
        active: 'users',
        users,
        orderCount,
        status,
        q,
        page,
        totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
        total,
    });
};

// PATCH /api/admin/users/:id/status   { status: 'active' | 'blocked' }
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['active', 'blocked'].includes(status)) {
            return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

        if (String(user._id) === String(req.user._id)) {
            return res.status(400).json({ message: 'Bạn không thể tự khóa tài khoản của mình.' });
        }
        if (user.role === 'admin') {
            return res.status(400).json({ message: 'Không thể khóa tài khoản admin.' });
        }

        await User.updateOne({ _id: user._id }, { $set: { status } });
        res.json({ message: status === 'blocked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.' });
    } catch (err) {
        handleError(err, req, res);
    }
};