const mongoose = require('mongoose');
const Book = require('../models/Book');
const Cart = require('../models/Cart');
const { calcShipping, FREE_SHIP_FROM } = require('../utils/shipping');
const { handleError } = require('../utils/helpers');

const countItems = (cart) => cart.items.reduce((s, i) => s + i.quantity, 0);

// Lấy giỏ của user. Tự dọn: bỏ sách đã ngừng bán / hết hàng, hạ số lượng nếu vượt tồn kho.
// adjusted = true nghĩa là giỏ vừa bị thay đổi (để báo cho người dùng biết).
const loadCart = async (userId) => {
    const cart = (await Cart.findOne({ user: userId }).populate('items.book')) || new Cart({ user: userId, items: [] });

    let adjusted = false;
    cart.items = cart.items.filter((it) => {
        const b = it.book;
        if (!b || b.status !== 'published' || b.stock < 1) { adjusted = true; return false; }
        if (it.quantity > b.stock) { it.quantity = b.stock; adjusted = true; }
        return true;
    });
    if (adjusted && !cart.isNew) await cart.save();

    const items = cart.items.map((it) => ({
        book: it.book,
        quantity: it.quantity,
        lineTotal: it.book.price * it.quantity,   // luôn lấy giá từ database, không tin client
    }));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    return { cart, items, subtotal, shippingFee: calcShipping(subtotal), adjusted };
};

// GET /cart  (trang giỏ hàng)
exports.page = async (req, res, next) => {
    try {
        const { items, subtotal, shippingFee, adjusted } = await loadCart(req.user._id);
        res.render('cart', { title: 'Giỏ hàng', items, subtotal, shippingFee, adjusted, freeShipFrom: FREE_SHIP_FROM });
    } catch (err) {
        next(err);
    }
};

// POST /api/cart   { bookId, quantity }
exports.add = async (req, res) => {
    try {
        const { bookId } = req.body;
        const qty = parseInt(req.body.quantity) || 1;
        if (!mongoose.isValidObjectId(bookId) || qty < 1) {
            return res.status(400).json({ message: 'Dữ liệu không hợp lệ.' });
        }

        const book = await Book.findOne({ _id: bookId, status: 'published' });
        if (!book) return res.status(404).json({ message: 'Không tìm thấy sách.' });
        if (book.stock < 1) return res.status(400).json({ message: 'Sách đã hết hàng.' });

        const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [] });
        const item = cart.items.find((i) => String(i.book) === String(book._id));
        const inCart = item ? item.quantity : 0;

        if (inCart + qty > book.stock) {
            const extra = inCart ? ` (trong giỏ bạn đã có ${inCart})` : '';
            return res.status(400).json({ message: `Chỉ còn ${book.stock} sản phẩm trong kho${extra}.` });
        }

        if (item) item.quantity += qty;
        else cart.items.push({ book: book._id, quantity: qty });
        await cart.save();

        res.json({ message: 'Đã thêm vào giỏ hàng.', cartCount: countItems(cart) });
    } catch (err) {
        handleError(err, req, res);
    }
};

// PATCH /api/cart/:bookId   { quantity }
exports.update = async (req, res) => {
    try {
        const { bookId } = req.params;
        const qty = parseInt(req.body.quantity);
        if (!mongoose.isValidObjectId(bookId) || !(qty >= 1)) {
            return res.status(400).json({ message: 'Số lượng không hợp lệ.' });
        }

        const cart = await Cart.findOne({ user: req.user._id });
        const item = cart && cart.items.find((i) => String(i.book) === bookId);
        if (!item) return res.status(404).json({ message: 'Sách không có trong giỏ.' });

        const book = await Book.findOne({ _id: bookId, status: 'published' });
        if (!book || book.stock < 1) return res.status(400).json({ message: 'Sách đã hết hàng.' });
        if (qty > book.stock) {
            return res.status(400).json({ message: `Chỉ còn ${book.stock} sản phẩm trong kho.`, max: book.stock });
        }

        item.quantity = qty;
        await cart.save();

        const { items, subtotal, shippingFee } = await loadCart(req.user._id);
        const line = items.find((i) => String(i.book._id) === bookId);
        res.json({
            quantity: qty,
            lineTotal: line ? line.lineTotal : 0,
            subtotal,
            shippingFee,
            total: subtotal + shippingFee,
            cartCount: countItems(cart),
        });
    } catch (err) {
        handleError(err, req, res);
    }
};

// DELETE /api/cart/:bookId
exports.remove = async (req, res) => {
    try {
        const { bookId } = req.params;
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.json({ subtotal: 0, shippingFee: 0, total: 0, cartCount: 0 });

        cart.items = cart.items.filter((i) => String(i.book) !== bookId);
        await cart.save();

        const { subtotal, shippingFee } = await loadCart(req.user._id);
        res.json({ subtotal, shippingFee, total: subtotal + shippingFee, cartCount: countItems(cart) });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.loadCart = loadCart;