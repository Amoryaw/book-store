const Book = require('../models/Book');
const Category = require('../models/Category');
const slugify = require('./slugify');
const { escapeRegex } = require('./helpers');

const SORTS = {
    newest: { createdAt: -1 },
    name_asc: { title: 1 },
    name_desc: { title: -1 },
    price_asc: { price: 1 },
    price_desc: { price: -1 },
    bestseller: { sold: -1 },
    views: { views: -1 },
    featured: { isFeatured: -1, ratingAvg: -1, ratingCount: -1, views: -1 },
};

const COLLATION = { locale: 'vi' };   // sắp xếp tiếng Việt đúng thứ tự dấu

const isObjectIdString = (s) => /^[a-f0-9]{24}$/i.test(String(s));

// q: page, limit, q, language, category (id hoặc slug), publisher, featured, onSale, minPrice, maxPrice, sort, status (admin)
const listBooks = async (q = {}, { admin = false } = {}) => {
    const page = Math.max(parseInt(q.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(q.limit) || 12, 1), 50);
    const empty = { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    const filter = {};
    if (admin) {
        if (q.status) filter.status = String(q.status);
    } else {
        filter.status = 'published';   // khách chỉ thấy sách đã đăng bán
    }

    if (q.q) {
        const key = slugify(String(q.q));
        if (!key) return empty;
        filter.searchText = new RegExp(escapeRegex(key), 'i');
    }
    if (q.language) filter.language = String(q.language);
    if (q.publisher) filter.publisher = String(q.publisher);
    if (q.category) {
        const query = isObjectIdString(q.category) ? { _id: q.category } : { slug: String(q.category) };
        const cat = await Category.findOne(query).select('_id');
        if (!cat) return empty;
        filter.category = cat._id;
    }
    if (q.featured === 'true') filter.isFeatured = true;
    if (q.onSale === 'true') filter.$expr = { $gt: ['$oldPrice', '$price'] };
    if (q.minPrice || q.maxPrice) {
        filter.price = {};
        if (q.minPrice) filter.price.$gte = Number(q.minPrice);
        if (q.maxPrice) filter.price.$lte = Number(q.maxPrice);
    }

    const sort = { ...(SORTS[q.sort] || SORTS.newest), _id: 1 };   // _id để phân trang ổn định khi trùng giá trị

    const [data, total] = await Promise.all([
        Book.find(filter)
            .collation(COLLATION)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('category', 'name slug')
            .populate('publisher', 'name'),
        Book.countDocuments(filter),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// Danh mục có ít nhất 1 sách đã đăng bán (lọc theo ngôn ngữ nếu có)
const categoriesWithBooks = async (language) => {
    const match = { status: 'published' };
    if (language) match.language = language;
    const ids = await Book.distinct('category', match);
    return Category.find({ _id: { $in: ids }, isActive: true })
        .collation(COLLATION)
        .sort({ sortOrder: 1, name: 1 });
};

module.exports = { listBooks, categoriesWithBooks };