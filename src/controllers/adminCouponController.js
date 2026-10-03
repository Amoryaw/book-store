const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const { fail, handleError } = require('../utils/helpers');

const notFound = (res) =>
    res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Không tìm thấy mã giảm giá.' });

const num = (v) => (v === '' || v == null ? null : Number(v));

// Kiểm tra dữ liệu form, trả về { set, unset } hoặc { error }
const parseBody = (b) => {
    const code = String(b.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) return { error: 'Mã gồm 3-20 ký tự: chữ, số, gạch ngang hoặc gạch dưới.' };
    if (!['percent', 'amount'].includes(b.discountType)) return { error: 'Loại giảm giá không hợp lệ.' };

    const discountValue = num(b.discountValue);
    if (!(discountValue > 0)) return { error: 'Giá trị giảm phải lớn hơn 0.' };
    if (b.discountType === 'percent' && discountValue > 100) return { error: 'Giảm theo % không được quá 100.' };

    const minOrderAmount = num(b.minOrderAmount) ?? 0;
    const maxDiscountAmount = b.discountType === 'percent' ? num(b.maxDiscountAmount) : null;
    const usageLimitTotal = num(b.usageLimitTotal);
    const usageLimitPerUser = num(b.usageLimitPerUser) ?? 1;
    const numbers = [minOrderAmount, maxDiscountAmount, usageLimitTotal, usageLimitPerUser];
    if (numbers.some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
        return { error: 'Các số liệu phải là số không âm.' };
    }
    if (usageLimitPerUser < 1) return { error: 'Số lượt dùng mỗi người tối thiểu là 1.' };

    const startsAt = b.startsAt ? new Date(`${b.startsAt}T00:00:00`) : null;
    const endsAt = b.endsAt ? new Date(`${b.endsAt}T23:59:59`) : null;
    if ((startsAt && isNaN(startsAt)) || (endsAt && isNaN(endsAt))) return { error: 'Ngày không hợp lệ.' };
    if (startsAt && endsAt && startsAt > endsAt) return { error: 'Ngày bắt đầu phải trước ngày kết thúc.' };

    const set = {
        code,
        discountType: b.discountType,
        discountValue,
        minOrderAmount,
        usageLimitPerUser,
        isActive: b.isActive === true || b.isActive === 'true',
    };
    const unset = {};
    // Trường tùy chọn: để trống thì xóa khỏi database
    Object.entries({ maxDiscountAmount, usageLimitTotal, startsAt, endsAt }).forEach(([k, v]) => {
        if (v === null) unset[k] = '';
        else set[k] = v;
    });
    return { set, unset };
};

// ---------- Trang ----------
exports.list = async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.render('admin/coupons', { layout: 'layouts/admin', title: 'Mã giảm giá', active: 'coupons', coupons });
};

exports.form = async (req, res) => {
    let coupon = null;
    if (req.params.id) {
        try {
            coupon = await Coupon.findById(req.params.id);
        } catch (e) {
            coupon = null;
        }
        if (!coupon) return notFound(res);
    }
    res.render('admin/coupon-form', {
        layout: 'layouts/admin',
        title: coupon ? `Sửa mã ${coupon.code}` : 'Thêm mã giảm giá',
        active: 'coupons',
        coupon,
    });
};

// ---------- API ----------
exports.create = async (req, res) => {
    try {
        const { set, error } = parseBody(req.body);
        if (error) return fail(req, res, 400, error);
        const coupon = await Coupon.create(set);
        res.status(201).json({ message: 'Đã tạo mã giảm giá.', coupon });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Mã giảm giá này đã tồn tại.' });
        handleError(err, req, res);
    }
};

exports.update = async (req, res) => {
    try {
        const { set, unset, error } = parseBody(req.body);
        if (error) return fail(req, res, 400, error);

        const update = { $set: set };
        if (Object.keys(unset).length) update.$unset = unset;
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!coupon) return fail(req, res, 404, 'Không tìm thấy mã giảm giá.');
        res.json({ message: 'Đã cập nhật mã giảm giá.', coupon });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ message: 'Mã giảm giá này đã tồn tại.' });
        handleError(err, req, res);
    }
};

exports.remove = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return fail(req, res, 404, 'Không tìm thấy mã giảm giá.');

        // Mã đã gắn vào đơn hàng thì giữ lại để không mất lịch sử đơn
        if (await Order.exists({ coupon: coupon._id })) {
            return fail(req, res, 400, 'Mã này đã được dùng trong đơn hàng. Hãy tắt kích hoạt thay vì xóa.');
        }
        await coupon.deleteOne();
        res.json({ message: 'Đã xóa mã giảm giá.' });
    } catch (err) {
        handleError(err, req, res);
    }
};