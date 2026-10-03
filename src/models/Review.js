const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
  },
  { timestamps: true }
);

// Mỗi user chỉ đánh giá 1 sách 1 lần (đánh giá lại thì cập nhật)
reviewSchema.index({ book: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);