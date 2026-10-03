// Dữ liệu sách mẫu. Muốn thêm sách: thêm một dòng vào mảng, rồi chạy `npm run seed`.
// Trường bắt buộc: title, author, price, stock, category (tên danh mục).
// Trường tùy chọn: publisher (tên NXB), oldPrice, sold, views, isFeatured, language ('vi' | 'en'),
//                  publishYear, pages, status, description.
// Nếu không ghi: status = 'published', language = 'vi', description = mô tả mẫu (xem seed.js).
module.exports = [
    // ===== Sách tiếng Việt =====
    { title: 'Đắc Nhân Tâm', author: 'Dale Carnegie', price: 86000, oldPrice: 110000, stock: 50, isFeatured: true, language: 'vi', category: 'Kỹ năng sống', publisher: 'NXB Trẻ', publishYear: 2020, pages: 320 },
    { title: 'Dế Mèn Phiêu Lưu Ký', author: 'Tô Hoài', price: 65000, stock: 30, language: 'vi', category: 'Văn học', publisher: 'NXB Kim Đồng', publishYear: 2019, pages: 200 },
    { title: 'Nhà Giả Kim', author: 'Paulo Coelho', price: 79000, stock: 10, isFeatured: true, language: 'vi', category: 'Văn học', publisher: 'NXB Trẻ', publishYear: 2018, pages: 228 },
    { title: 'Nghĩ Giàu Làm Giàu', author: 'Napoleon Hill', price: 98000, oldPrice: 120000, stock: 40, sold: 120, views: 55, isFeatured: true, language: 'vi', category: 'Kinh tế' },
    { title: 'Cha Giàu Cha Nghèo', author: 'Robert Kiyosaki', price: 89000, stock: 25, sold: 300, views: 90, language: 'vi', category: 'Kinh tế' },
    { title: 'Mắt Biếc', author: 'Nguyễn Nhật Ánh', price: 110000, stock: 60, sold: 80, isFeatured: true, language: 'vi', category: 'Văn học' },
    { title: 'Số Đỏ', author: 'Vũ Trọng Phụng', price: 70000, stock: 0, sold: 40, language: 'vi', category: 'Văn học' },   // hết hàng
    { title: 'Đừng Lựa Chọn An Nhàn Khi Còn Trẻ', author: 'Cảnh Thiên', price: 78000, oldPrice: 98000, stock: 10, language: 'vi', category: 'Kỹ năng sống' },   // tồn kho 10 để thử giới hạn
    { title: 'Hoàng Tử Bé', author: 'Antoine de Saint-Exupéry', price: 60000, stock: 35, sold: 150, language: 'vi', category: 'Thiếu nhi' },
    { title: 'Sapiens Lược Sử Loài Người', author: 'Yuval Noah Harari', price: 189000, stock: 20, sold: 95, language: 'vi', category: 'Lịch sử' },

    // ===== Sách tiếng Anh =====
    { title: 'The Alchemist', author: 'Paulo Coelho', price: 220000, stock: 15, sold: 90, isFeatured: true, language: 'en', category: 'Văn học' },
    { title: 'Rich Dad Poor Dad', author: 'Robert Kiyosaki', price: 260000, oldPrice: 300000, stock: 12, language: 'en', category: 'Kinh tế' },
    { title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', price: 180000, stock: 18, language: 'en', category: 'Thiếu nhi' },
    { title: 'Deep Work', author: 'Cal Newport', price: 240000, stock: 8, sold: 30, language: 'en', category: 'Kỹ năng sống' },
    { title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', price: 310000, stock: 10, isFeatured: true, language: 'en', category: 'Lịch sử' },
];