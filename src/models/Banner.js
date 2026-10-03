const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        image: { type: String, required: true },
        link: String,
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);