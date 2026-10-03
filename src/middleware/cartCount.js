const Cart = require('../models/Cart');

// Gắn số lượng sản phẩm trong giỏ vào res.locals.cartCount để hiện trên thanh menu
const loadCartCount = async (req, res, next) => {
    res.locals.cartCount = 0;
    if (!req.user || req.method !== 'GET' || req.originalUrl.startsWith('/api')) return next();
    try {
        const cart = await Cart.findOne({ user: req.user._id }).select('items');
        if (cart) res.locals.cartCount = cart.items.reduce((s, i) => s + i.quantity, 0);
    } catch (err) {
        console.error(err);
    }
    next();
};

module.exports = { loadCartCount };