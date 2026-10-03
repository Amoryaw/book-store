const { categoriesWithBooks } = require('../utils/bookQuery');

const loadMenu = async (req, res, next) => {
    res.locals.menu = { vi: [], en: [] };
    if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) return next();
    try {
        const [vi, en] = await Promise.all([categoriesWithBooks('vi'), categoriesWithBooks('en')]);
        res.locals.menu = { vi, en };
    } catch (err) {
        console.error(err);
    }
    next();
};

module.exports = { loadMenu };