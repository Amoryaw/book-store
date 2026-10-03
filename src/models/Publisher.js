const mongoose = require('mongoose');

const publisherSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: String,
        logo: String,
        sortOrder: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Publisher', publisherSchema);