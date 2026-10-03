const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        nameEn: { type: String, trim: true },   // tên tiếng Anh, dùng ở menu English Books
        slug: { type: String, unique: true },
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

categorySchema.pre('validate', function () {
    if (this.isModified('name')) this.slug = slugify(this.name);
});

module.exports = mongoose.model('Category', categorySchema);