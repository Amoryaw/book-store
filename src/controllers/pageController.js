const Banner = require('../models/Banner');
const Book = require('../models/Book');
const Category = require('../models/Category');
const { listBooks, categoriesWithBooks } = require('../utils/bookQuery');
const { isAdminReq } = require('../utils/helpers');

const LANG_TITLE = { vi: 'Sách Tiếng Việt', en: 'English Books' };

// Tạo link giữ nguyên các tham số hiện có (sort, page...) và đổi một vài tham số
const buildUrl = (req, overrides) => {
    const params = new URLSearchParams(req.query);
    Object.entries(overrides).forEach(([k, v]) => (v === null ? params.delete(k) : params.set(k, v)));
    const qs = params.toString();
    return req.path + (qs ? `?${qs}` : '');
};

const notFound = (res) =>
    res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Trang bạn tìm không tồn tại.' });

// Trang chủ: mọi mục đều lấy từ database
exports.home = async (req, res, next) => {
    try {
        const [featured, newest, bestseller, onSale, categories, banners] = await Promise.all([
            listBooks({ sort: 'featured', limit: 5 }),
            listBooks({ sort: 'newest', limit: 5 }),
            listBooks({ sort: 'bestseller', limit: 5 }),
            listBooks({ onSale: 'true', limit: 5 }),
            categoriesWithBooks(),
            Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 }),
        ]);
        res.render('home', {
            title: 'Trang chủ',
            featured: featured.data,
            newest: newest.data,
            bestseller: bestseller.data,
            onSale: onSale.data,
            categories,
            banners,
        });
    } catch (err) {
        next(err);
    }
};

// Danh sách theo ngôn ngữ (và danh mục nếu có)
exports.listByLanguage = (language) => async (req, res, next) => {
    try {
        let category = null;
        if (req.params.category) {
            category = await Category.findOne({ slug: req.params.category, isActive: true });
            if (!category) return notFound(res);
        }

        const result = await listBooks({
            ...req.query,
            language,
            category: category ? String(category._id) : undefined,
        });

        const catName = language === 'en' && category && category.nameEn ? category.nameEn : (category && category.name);
        const heading = category ? `${LANG_TITLE[language]} - ${catName}` : LANG_TITLE[language];
        res.render('books/list', {
            title: heading,
            heading,
            books: result.data,
            pagination: result.pagination,
            sort: req.query.sort || 'newest',
            q: req.query.q || '',
            buildUrl: (o) => buildUrl(req, o),
        });
    } catch (err) {
        next(err);
    }
};

// Tìm kiếm / xem tất cả (có thể kèm featured, onSale, category, language...)
exports.search = async (req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        const result = await listBooks({ ...req.query, q });

        let heading = 'Tất cả sách';
        if (q) heading = `Kết quả cho "${q}"`;
        else if (req.query.featured === 'true') heading = 'Sách nổi bật';
        else if (req.query.onSale === 'true') heading = 'Sách khuyến mãi';

        res.render('books/list', {
            title: heading,
            heading,
            books: result.data,
            pagination: result.pagination,
            sort: req.query.sort || 'newest',
            q,
            buildUrl: (o) => buildUrl(req, o),
        });
    } catch (err) {
        next(err);
    }
};

// Chi tiết sách
exports.detail = async (req, res, next) => {
    try {
        const filter = { slug: req.params.slug };
        if (!isAdminReq(req)) filter.status = 'published';

        // nhận diện người xem bằng cookie, không cần bắt đăng nhập
        //Cách thường dùng và đủ cho đồ án là mỗi người xem chỉ được tính 1 lượt cho mỗi sách trong một khoảng thời gian, ví dụ 24 giờ
        // không bị lệch khi nhiều người xem cùng lúc. timestamps:false để không đổi updatedAt
        //Xóa cookie hoặc mở tab ẩn danh thì vẫn tăng lại được. Muốn chặt hơn phải thêm giới hạn theo IP hoặc một collection ViewLog  
        const book = await Book.findOne(filter)
            .populate('category', 'name slug')
            .populate('publisher', 'name');
        if (!book) return notFound(res);
        const cookieName = `viewed_${book._id}`;
        // Chỉ tính view khi: không phải admin VÀ chưa xem sách này trong 24h qua
        if (!req.cookies[cookieName] && !isAdminReq(req)) {
            await Book.updateOne({ _id: book._id }, { $inc: { views: 1 } }, { timestamps: false });
            res.cookie(cookieName, '1', { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' });
            book.views += 1;
        }

        // Sản phẩm liên quan: cùng danh mục, cùng ngôn ngữ, bán chạy trước
        const related = book.category
            ? await Book.find({
                category: book.category._id,
                language: book.language,
                status: 'published',
                _id: { $ne: book._id },
            })
                .sort({ sold: -1, createdAt: -1 })
                .limit(4)
                .populate('category', 'name slug')
            : [];

        res.render('books/detail', { title: book.title, book, related });
    } catch (err) {
        next(err);
    }
};