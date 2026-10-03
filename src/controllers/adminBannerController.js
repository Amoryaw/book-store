const Banner = require('../models/Banner');
const { toPublicPath, deleteFile, fail, handleError } = require('../utils/helpers');

const notFound = (res) =>
    res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Không tìm thấy banner.' });

// Link chỉ cho phép đường dẫn nội bộ (/...) hoặc http(s) để tránh link độc hại
const validLink = (link) => !link || /^(\/|https?:\/\/)/.test(link);

// ---------- Trang ----------
exports.list = async (req, res) => {
    const banners = await Banner.find().sort({ sortOrder: 1, createdAt: -1 });
    res.render('admin/banners', { layout: 'layouts/admin', title: 'Banner', active: 'banners', banners });
};

exports.form = async (req, res) => {
    let banner = null;
    if (req.params.id) {
        try {
            banner = await Banner.findById(req.params.id);
        } catch (e) {
            banner = null;
        }
        if (!banner) return notFound(res);
    }
    res.render('admin/banner-form', {
        layout: 'layouts/admin',
        title: banner ? 'Sửa banner' : 'Thêm banner',
        active: 'banners',
        banner,
    });
};

// ---------- API (multipart/form-data, ảnh nằm ở field "image") ----------
exports.create = async (req, res) => {
    try {
        const title = String(req.body.title || '').trim();
        const link = String(req.body.link || '').trim();
        if (!title) return fail(req, res, 400, 'Vui lòng nhập tiêu đề.');
        if (!req.file) return fail(req, res, 400, 'Vui lòng chọn ảnh banner.');
        if (!validLink(link)) return fail(req, res, 400, 'Link phải bắt đầu bằng / hoặc http(s)://');

        const banner = await Banner.create({
            title,
            image: toPublicPath(req.file, 'banners'),
            link: link || undefined,
            sortOrder: Number(req.body.sortOrder) || 0,
            isActive: req.body.isActive !== 'false',
        });
        res.status(201).json({ message: 'Đã thêm banner.', banner });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.update = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) return fail(req, res, 404, 'Không tìm thấy banner.');

        const title = String(req.body.title || '').trim();
        const link = String(req.body.link || '').trim();
        if (!title) return fail(req, res, 400, 'Vui lòng nhập tiêu đề.');
        if (!validLink(link)) return fail(req, res, 400, 'Link phải bắt đầu bằng / hoặc http(s)://');

        const oldImage = banner.image;
        banner.title = title;
        banner.link = link || undefined;
        banner.sortOrder = Number(req.body.sortOrder) || 0;
        banner.isActive = req.body.isActive !== 'false';
        if (req.file) banner.image = toPublicPath(req.file, 'banners');

        await banner.save();
        if (req.file) deleteFile(oldImage);   // đổi ảnh thành công thì xóa ảnh cũ
        res.json({ message: 'Đã cập nhật banner.', banner });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.remove = async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) return fail(req, res, 404, 'Không tìm thấy banner.');
        deleteFile(banner.image);
        res.json({ message: 'Đã xóa banner.' });
    } catch (err) {
        handleError(err, req, res);
    }
};