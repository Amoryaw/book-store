// Cách dùng:
//   npm run seed          -> chỉ thêm dữ liệu còn thiếu, KHÔNG xóa gì (chạy lại bao nhiêu lần cũng được)
//   npm run seed:reset    -> XÓA SẠCH User, Category, Publisher, Book, Coupon, Cart, Order rồi tạo lại (chỉ dùng khi dev ở máy mình)
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Publisher = require('../models/Publisher');
const Book = require('../models/Book');
const Coupon = require('../models/Coupon');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const books = require('../data/books');
const coupons = require('../data/coupons');
const categories = require('../data/categories');

const RESET = process.argv.includes('--reset');

// Tìm theo tên, chưa có thì tạo
const findOrCreate = async (Model, name) =>
    (await Model.findOne({ name })) || Model.create({ name });

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        if (RESET) {
            await Promise.all([
                User.deleteMany(), Category.deleteMany(), Publisher.deleteMany(), Book.deleteMany(),
                Coupon.deleteMany(), Cart.deleteMany(), Order.deleteMany(),
            ]);
            console.log('Đã xóa dữ liệu cũ');
        }

        // Tài khoản admin (chỉ tạo nếu chưa có)
        if (!(await User.exists({ email: 'admin@bookstore.vn' }))) {
            await User.create({
                fullName: 'Admin', email: 'admin@bookstore.vn', password: '123456',
                role: 'admin', isVerified: true,
            });
            console.log('Đã tạo tài khoản admin');
        }

        // Sách: dùng Book.create (không dùng upsert) để hook tạo slug và searchText trong Book.js được chạy
        let added = 0;
        // Danh mục: tạo nếu chưa có, nếu có rồi thì chỉ bổ sung tên tiếng Anh
        for (const c of categories) {
            const cat = await Category.findOne({ name: c.name });
            if (!cat) {
                await Category.create(c);
            } else if (cat.nameEn !== c.nameEn) {
                cat.nameEn = c.nameEn;
                await cat.save();   // dùng save() (không dùng updateOne) để các hook của model vẫn chạy
            }
        }

        for (const { category, publisher, ...data } of books) {
            if (await Book.exists({ title: data.title, author: data.author })) continue;

            await Book.create({
                status: 'published',
                description: `Mô tả mẫu của "${data.title}".\nDòng thứ hai để thử hiển thị xuống dòng.`,
                ...data,   // đặt sau để dữ liệu trong books.js ghi đè giá trị mặc định ở trên
                category: (await findOrCreate(Category, category))._id,
                publisher: publisher ? (await findOrCreate(Publisher, publisher))._id : undefined,
            });
            added++;
        }

        // Mã giảm giá (chỉ thêm mã chưa có)
        for (const c of coupons) {
            if (!(await Coupon.exists({ code: c.code }))) await Coupon.create(c);
        }

        console.log(`Seed xong: thêm ${added} sách mới, bỏ qua ${books.length - added} sách đã có`);
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();

