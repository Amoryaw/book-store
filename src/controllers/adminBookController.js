const Book = require('../models/Book');
const Category = require('../models/Category');
const Publisher = require('../models/Publisher');
const { listBooks } = require('../utils/bookQuery');

const COLLATION = { locale: 'vi' };

const notFound = (res) =>
    res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Không tìm thấy sách.' });

// GET /admin/books?q=&category=&status=&language=&page=
// Thêm / sửa / xóa dùng lại API có sẵn: POST, PUT, DELETE /api/books
exports.list = async (req, res) => {
    const [result, categories] = await Promise.all([
        listBooks({ ...req.query, limit: 10 }, { admin: true }),   // admin: thấy cả sách nháp và sách ẩn
        Category.find().collation(COLLATION).sort({ name: 1 }),
    ]);

    res.render('admin/books', {
        layout: 'layouts/admin',
        title: 'Quản lý sách',
        active: 'books',
        books: result.data,
        pagination: result.pagination,
        categories,
        filters: {
            q: req.query.q || '',
            category: req.query.category || '',
            status: req.query.status || '',
            language: req.query.language || '',
        },
    });
};

// GET /admin/books/new  và  /admin/books/:id/edit
exports.form = async (req, res) => {
    let book = null;
    if (req.params.id) {
        try {
            book = await Book.findById(req.params.id);
        } catch (e) {
            book = null;
        }
        if (!book) return notFound(res);
    }

    const [categories, publishers] = await Promise.all([
        Category.find().collation(COLLATION).sort({ name: 1 }),
        Publisher.find().collation(COLLATION).sort({ name: 1 }),
    ]);

    res.render('admin/book-form', {
        layout: 'layouts/admin',
        title: book ? 'Sửa sách' : 'Thêm sách',
        active: 'books',
        book,
        categories,
        publishers,
    });
};