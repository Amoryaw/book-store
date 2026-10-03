const mongoose = require('mongoose');
const Book = require('../models/Book');
const Category = require('../models/Category');
const Publisher = require('../models/Publisher');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Review = require('../models/Review');
const { listBooks } = require('../utils/bookQuery');
const { pick, isAdminReq, toPublicPath, deleteFile, fail, handleError } = require('../utils/helpers');

// Các trường admin được phép gửi lên. KHÔNG có sold, views, ratingAvg, ratingCount.
const BOOK_FIELDS = [
    'title', 'author', 'price', 'oldPrice', 'stock', 'status', 'isFeatured',
    'shortDescription', 'description', 'category', 'publisher',
    'publishYear', 'isbn', 'pages', 'language',
];

// Form gửi chuỗi rỗng "" cho ô để trống: đổi thành undefined để bỏ trống đúng nghĩa
const cleanBookData = (data) => {
    ['oldPrice', 'publisher', 'publishYear', 'pages', 'isbn'].forEach((k) => {
        if (data[k] === '') data[k] = undefined;
    });
    return data;
};

// Kiểm tra danh mục / NXB có tồn tại không
const checkRefs = async (data) => {
    if (data.category && !(await Category.exists({ _id: data.category }))) return 'Danh mục không tồn tại.';
    if (data.publisher && !(await Publisher.exists({ _id: data.publisher }))) return 'Nhà xuất bản không tồn tại.';
    return null;
};

// GET /api/books?q=&language=&category=&publisher=&sort=&page=&limit=&featured=&onSale=&minPrice=&maxPrice=
exports.getAll = async (req, res) => {
    try {
        res.json(await listBooks(req.query, { admin: isAdminReq(req) }));
    } catch (err) {
        handleError(err, req, res);
    }
};

// GET /api/books/:id   (id hoặc slug)
exports.getOne = async (req, res) => {
    try {
        const { id } = req.params;
        const query = mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
        const book = await Book.findOne(query)
            .populate('category', 'name slug')
            .populate('publisher', 'name');

        if (!book || (book.status !== 'published' && !isAdminReq(req))) {
            return res.status(404).json({ message: 'Không tìm thấy sách.' });
        }
        res.json({ data: book });
    } catch (err) {
        handleError(err, req, res);
    }
};

// POST /api/books   (form-data; file: coverImage (1 ảnh), images (tối đa 5 ảnh))
exports.create = async (req, res) => {
    try {
        const data = cleanBookData(pick(req.body, BOOK_FIELDS));
        const refError = await checkRefs(data);
        if (refError) return fail(req, res, 400, refError);

        if (req.files?.coverImage) data.coverImage = toPublicPath(req.files.coverImage[0], 'books');
        if (req.files?.images) data.images = req.files.images.map((f) => toPublicPath(f, 'books'));

        const book = await Book.create(data);
        res.status(201).json({ message: 'Thêm sách thành công.', data: book });
    } catch (err) {
        handleError(err, req, res);
    }
};

// PUT /api/books/:id
// - gửi coverImage mới: thay ảnh bìa (xóa ảnh cũ)
// - gửi images mới: thêm vào ảnh phụ
// - gửi removeImages: danh sách đường dẫn ảnh phụ cần xóa
exports.update = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return fail(req, res, 404, 'Không tìm thấy sách.');

        const data = cleanBookData(pick(req.body, BOOK_FIELDS));
        const refError = await checkRefs(data);
        if (refError) return fail(req, res, 400, refError);

        book.set(data);

        const toDelete = [];   // ảnh cũ sẽ xóa SAU KHI lưu thành công

        if (req.files?.coverImage) {
            toDelete.push(book.coverImage);
            book.coverImage = toPublicPath(req.files.coverImage[0], 'books');
        }

        let remove = (req.body || {}).removeImages || [];
        if (typeof remove === 'string') remove = [remove];     // gửi 1 phần tử thì là chuỗi
        remove = remove.filter((p) => book.images.includes(p));
        if (remove.length) {
            book.images = book.images.filter((p) => !remove.includes(p));
            toDelete.push(...remove);
        }

        if (req.files?.images) {
            book.images.push(...req.files.images.map((f) => toPublicPath(f, 'books')));
        }
        if (book.images.length > 10) return fail(req, res, 400, 'Tối đa 10 ảnh phụ cho mỗi sách.');

        await book.save();
        toDelete.forEach(deleteFile);
        res.json({ message: 'Cập nhật sách thành công.', data: book });
    } catch (err) {
        handleError(err, req, res);
    }
};

// DELETE /api/books/:id
exports.remove = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) return fail(req, res, 404, 'Không tìm thấy sách.');

        // Sách đã nằm trong đơn hàng thì giữ lại để không mất lịch sử mua hàng
        if (await Order.exists({ 'items.book': book._id })) {
            return fail(req, res, 400,
                'Sách đã có trong đơn hàng nên không thể xóa. Hãy đổi trạng thái sang "hidden" để ẩn khỏi cửa hàng.');
        }

        await book.deleteOne();
        [book.coverImage, ...book.images].forEach(deleteFile);
        await Cart.updateMany({}, { $pull: { items: { book: book._id } } });  // gỡ khỏi giỏ hàng
        await Review.deleteMany({ book: book._id });                          // xóa đánh giá của sách

        res.json({ message: 'Đã xóa sách.' });
    } catch (err) {
        handleError(err, req, res);
    }
};