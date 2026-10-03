require('dotenv').config();
const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');
const { setUser, protect, isAdmin } = require('./src/middleware/auth');
const { loadMenu } = require('./src/middleware/menu');
const { loadCartCount } = require('./src/middleware/cartCount');
const { startPaymentSweeper } = require('./src/utils/payment');

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(setUser);
app.use(loadMenu);
app.use(loadCartCount);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Biến dùng chung trong mọi file EJS
app.locals.vnd = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' ₫';
app.locals.langLabel = { vi: 'Tiếng Việt', en: 'Tiếng Anh' };
app.locals.orderStatusLabel = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', shipping: 'Đang giao', completed: 'Hoàn thành', cancelled: 'Đã hủy' };
app.locals.orderStatusColor = { pending: 'warning text-dark', confirmed: 'success', shipping: 'info text-dark', completed: 'primary', cancelled: 'danger' };
app.locals.paymentMethodLabel = { cod: 'Thanh toán khi nhận hàng', stripe: 'Thẻ (Stripe)' };
app.locals.paymentStatusLabel = { unpaid: 'Chưa thanh toán', paid: 'Đã thanh toán', failed: 'Thanh toán lỗi' };

// Routes
app.use('/', require('./src/routes/pages'));
app.use('/', require('./src/routes/shop'));
app.use('/auth', require('./src/routes/auth'));
app.use('/api/categories', require('./src/routes/category'));
app.use('/api/publishers', require('./src/routes/publisher'));
app.use('/api/books', require('./src/routes/book'));
app.use('/api/cart', require('./src/routes/cart'));
app.use('/api/orders', require('./src/routes/order'));

app.use('/admin', require('./src/routes/admin'));
app.use('/api/admin', require('./src/routes/adminApi'));

// 404
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({ message: 'Not found' });
  }
  res.status(404).render('error', { title: 'Không tìm thấy', status: 404, message: 'Trang bạn tìm không tồn tại.' });
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'Ảnh quá lớn (tối đa 2MB mỗi ảnh).'
      : `Lỗi upload: ${err.message}`;
    return res.status(400).json({ message: msg });
  }
  if (err.status) return res.status(err.status).json({ message: err.message });

  console.error(err);
  const wantsJson =
    req.originalUrl.startsWith('/api') || req.xhr || (req.headers.accept || '').includes('application/json');
  if (wantsJson) {
    return res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
  }
  res.status(500).render('error', {
    title: 'Lỗi', status: 500, message: 'Đã có lỗi xảy ra. Vui lòng thử lại sau.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
  startPaymentSweeper();
});