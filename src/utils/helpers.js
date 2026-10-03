const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '../../public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

// Chỉ lấy các trường được phép từ req.body
const pick = (obj, keys) => {
    const src = obj || {};
    const out = {};
    keys.forEach((k) => {
        if (src[k] !== undefined) out[k] = src[k];
    });
    return out;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isAdminReq = (req) => !!(req.user && req.user.role === 'admin');

// Đường dẫn lưu vào database, ví dụ /uploads/books/123.jpg
const toPublicPath = (file, folder) => `/uploads/${folder}/${file.filename}`;

// Xóa 1 file ảnh theo đường dẫn lưu trong database
const deleteFile = (publicPath) => {
    if (!publicPath || !publicPath.startsWith('/uploads/')) return;
    const full = path.join(PUBLIC_DIR, publicPath);
    if (!full.startsWith(UPLOAD_DIR + path.sep)) return; // chống xóa file ngoài thư mục uploads
    fs.unlink(full, () => { });                            // file không tồn tại thì bỏ qua
};

// Xóa các file vừa upload (dùng khi thao tác thất bại, tránh rác)
const cleanupUploads = (req) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) Object.values(req.files).flat().forEach((f) => files.push(f));
    files.forEach((f) => fs.unlink(f.path, () => { }));
};

// Trả lỗi và dọn file đã upload
const fail = (req, res, status, message) => {
    cleanupUploads(req);
    return res.status(status).json({ message });
};

// Chuyển lỗi của Mongoose thành thông báo dễ hiểu
const handleError = (err, req, res) => {
    cleanupUploads(req);
    if (err.name === 'ValidationError') {
        const msg = Object.values(err.errors).map((e) => e.message).join(' ');
        return res.status(400).json({ message: msg });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
    }
    if (err.code === 11000) {
        return res.status(400).json({ message: 'Dữ liệu bị trùng (tên hoặc giá trị đã tồn tại).' });
    }
    console.error(err);
    res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
};

module.exports = {
    pick, escapeRegex, isAdminReq, toPublicPath, deleteFile, cleanupUploads, fail, handleError,
};