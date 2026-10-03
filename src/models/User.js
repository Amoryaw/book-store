const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, minlength: 6, select: false },
        phone: { type: String, trim: true },
        address: { type: String, trim: true },
        gender: { type: String, enum: ['male', 'female', 'other'] },
        role: { type: String, enum: ['user', 'admin'], default: 'user' },
        status: { type: String, enum: ['active', 'blocked'], default: 'active' },
        isVerified: { type: Boolean, default: false },
        verifyToken: String,
        verifyTokenExpires: Date,
        resetPasswordToken: String,
        resetPasswordExpires: Date,
        lastLoginAt: Date,
    },
    { timestamps: true }
);

// Tự mã hóa mật khẩu trước khi lưu
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (plain) {
    return bcrypt.compare(plain, this.password);
};

// Tài khoản chưa xác thực sẽ bị MongoDB tự xóa khi quá hạn verifyTokenExpires.
// Tài khoản đã xác thực không có trường này nên không bị ảnh hưởng.
userSchema.index({ verifyTokenExpires: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('User', userSchema);