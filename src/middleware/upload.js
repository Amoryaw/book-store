const path = require('path');
const fs = require('fs');
const multer = require('multer');

const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const createUpload = (folder) => {
    const dir = path.join(__dirname, '../../public/uploads', folder);
    fs.mkdirSync(dir, { recursive: true });   // tự tạo thư mục nếu chưa có

    const storage = multer.diskStorage({
        destination: (req, file, cb) => cb(null, dir),
        filename: (req, file, cb) => {
            // Tự đặt tên mới, không dùng tên file do người dùng gửi
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
        },
    });

    const fileFilter = (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.mimetype.startsWith('image/') && ALLOWED_EXT.includes(ext)) return cb(null, true);
        cb(Object.assign(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp, gif).'), { status: 400 }));
    };

    return multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } }); // tối đa 2MB/ảnh
};

module.exports = {
    uploadBook: createUpload('books'),
    uploadPublisher: createUpload('publishers'),
    uploadBanner: createUpload('banners'),
};