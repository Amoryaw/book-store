const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const bookSchema = new mongoose.Schema(
    {
        // --- Thuộc tính chung ---
        title: { type: String, required: true, trim: true },
        slug: { type: String, unique: true },
        price: { type: Number, required: true, min: 0 },
        oldPrice: { type: Number, min: 0 },              // giá cũ (để hiện khuyến mãi)
        stock: { type: Number, required: true, min: 0, default: 0 },
        sold: { type: Number, default: 0 },              // đã bán (sách bán chạy)
        views: { type: Number, default: 0 },             // lượt xem
        isFeatured: { type: Boolean, default: false },   // nổi bật
        status: { type: String, enum: ['hidden', 'draft', 'published'], default: 'draft' },
        coverImage: String,
        images: [String],
        shortDescription: { type: String, maxlength: 1000 },
        description: String,
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'Publisher' },
        ratingAvg: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        searchText: { type: String, select: false },     // tên + tác giả viết không dấu, để tìm kiếm

        // --- Thuộc tính đặc thù của sách ---
        author: { type: String, required: true, trim: true },
        publishYear: Number,
        isbn: { type: String, trim: true },
        pages: Number,
        language: { type: String, enum: ['vi', 'en'], default: 'vi' },   // vi: Tiếng Việt, en: Tiếng Anh
    },
    { timestamps: true }
);

bookSchema.pre('validate', async function () {
    // Cập nhật chuỗi tìm kiếm không dấu khi đổi tên hoặc tác giả
    if (this.isModified('title') || this.isModified('author')) {
        this.searchText = slugify(`${this.title} ${this.author}`);
    }

    if (!this.isModified('title')) return;
    const base = slugify(this.title);
    let slug = base;
    let i = 1;
    // Slug đã có sách khác dùng thì thêm số: dac-nhan-tam-2, dac-nhan-tam-3...
    while (await this.constructor.exists({ slug, _id: { $ne: this._id } })) {
        slug = `${base}-${++i}`;
    }
    this.slug = slug;
});

module.exports = mongoose.model('Book', bookSchema);