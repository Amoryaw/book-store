const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Request này có phải của API/Axios không? (để trả JSON thay vì chuyển trang)
const wantsJson = (req) =>
    req.originalUrl.startsWith('/api') ||
    req.xhr ||
    (req.headers.accept || '').includes('application/json');

const getToken = (req) => {
    if (req.cookies && req.cookies.token) return req.cookies.token;
    const h = req.headers.authorization;
    if (h && h.startsWith('Bearer ')) return h.split(' ')[1];
    return null;
};

// Chạy ở MỌI request: nếu có token hợp lệ thì gắn user vào req.user
// và res.locals.currentUser (để file EJS dùng được)
const setUser = async (req, res, next) => {
    res.locals.currentUser = null;
    const token = getToken(req);
    if (!token) return next();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.status === 'active') {
            req.user = user;
            res.locals.currentUser = user;
        }
    } catch (err) {
        // token sai hoặc hết hạn: coi như chưa đăng nhập
    }
    next();
};

// Bắt buộc đã đăng nhập
const protect = (req, res, next) => {
    if (req.user) return next();
    if (wantsJson(req)) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });
    res.redirect('/auth/login');
};

// Bắt buộc là admin (dùng SAU protect)
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    if (wantsJson(req)) return res.status(403).json({ message: 'Bạn không có quyền truy cập.' });
    res.status(403).send('403 - Bạn không có quyền truy cập.');
};

module.exports = { setUser, protect, isAdmin };