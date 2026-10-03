const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const { createToken, hashToken } = require('../utils/token');

const signToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

const cookieOptions = {
    httpOnly: true,                                   // JavaScript trên trình duyệt không đọc được cookie
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',    // production dùng HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000,                  // 7 ngày
};

// --- Hiển thị trang ---
exports.showRegister = (req, res) => {
    if (req.user) return res.redirect('/');
    res.render('auth/register', { title: 'Đăng ký' });
};

exports.showLogin = (req, res) => {
    if (req.user) return res.redirect('/');
    res.render('auth/login', { title: 'Đăng nhập' });
};

// --- Xử lý đăng ký ---
exports.register = async (req, res) => {
    try {
        const { fullName, email, password, confirmPassword } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ message: 'Email không hợp lệ.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Mật khẩu nhập lại không khớp.' });
        }

        const { raw, hashed } = createToken();
        const verifyTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 giờ

        let user = await User.findOne({ email: email.toLowerCase() });

        // Email đã đăng ký VÀ đã xác thực: không cho đăng ký lại
        if (user && user.isVerified) {
            return res.status(400).json({ message: 'Email này đã được đăng ký.' });
        }

        if (user) {
            // Email đã đăng ký nhưng CHƯA xác thực: ghi đè thông tin, tạo token mới, gửi lại mail
            user.fullName = fullName;
            user.password = password;   // hook trong model sẽ tự mã hóa lại
            user.verifyToken = hashed;
            user.verifyTokenExpires = verifyTokenExpires;
            await user.save();
        } else {
            user = await User.create({
                fullName, email, password,
                verifyToken: hashed,
                verifyTokenExpires,
            });
        }

        const link = `${process.env.BASE_URL}/auth/verify-email/${raw}`;
        try {
            await sendEmail({
                to: user.email,
                subject: 'Book Store - Xác thực địa chỉ email của bạn',
                text: `Chào ${user.fullName},\n\n` +
                    `Bạn vừa đăng ký tài khoản tại Book Store bằng địa chỉ email này.\n` +
                    `Mở liên kết sau để xác thực email (có hiệu lực 24 giờ):\n${link}\n\n` +
                    `Nếu bạn không đăng ký, hãy bỏ qua email này.`,
                html: `<p>Chào ${user.fullName},</p>
                <p>Bạn vừa đăng ký tài khoản tại <b>Book Store</b> bằng địa chỉ email này.</p>
                <p>Nhấn vào liên kết bên dưới để xác thực email (có hiệu lực 24 giờ):</p>
                <p><a href="${link}">Xác thực email của tôi</a></p>
                <p style="color:#666;font-size:13px">Nếu bạn không đăng ký, hãy bỏ qua email này.</p>`,
            });
        } catch (mailErr) {
            console.error(mailErr);
            await User.deleteOne({ _id: user._id });  // gửi mail thất bại thì hủy tài khoản vừa tạo
            return res.status(500).json({ message: 'Không gửi được email xác thực. Vui lòng thử lại.' });
        }

        res.status(201).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
};

// --- Xử lý đăng nhập ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
        }

        // password có select:false nên phải gọi +password mới lấy ra để so sánh
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
        }
        if (user.status === 'blocked') {
            return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
        }
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Vui lòng xác thực email trước khi đăng nhập.' });
        }

        await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

        res.cookie('token', signToken(user), cookieOptions);
        res.json({
            message: 'Đăng nhập thành công!',
            redirect: user.role === 'admin' ? '/admin' : '/',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
};

// --- Đăng xuất ---
exports.logout = (req, res) => {
    res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: cookieOptions.secure });
    res.json({ message: 'Đã đăng xuất.', redirect: '/' });
};

// --- Xác thực email (người dùng bấm link trong mail) ---
exports.verifyEmail = async (req, res) => {
    try {
        const user = await User.findOne({
            verifyToken: hashToken(req.params.token),
            verifyTokenExpires: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).render('auth/message', {
                title: 'Xác thực email', type: 'danger',
                message: 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.',
            });
        }
        user.isVerified = true;
        user.verifyToken = undefined;
        user.verifyTokenExpires = undefined;
        await user.save();

        res.render('auth/message', {
            title: 'Xác thực email', type: 'success',
            message: 'Xác thực thành công! Bây giờ bạn có thể đăng nhập.',
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('auth/message', {
            title: 'Lỗi', type: 'danger', message: 'An unexpected error occurred. Please try again later.',
        });
    }
};

// --- Quên mật khẩu ---
exports.showForgotPassword = (req, res) => {
    res.render('auth/forgot-password', { title: 'Quên mật khẩu' });
};

exports.forgotPassword = async (req, res) => {
    const genericMsg = 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu.';
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.json({ message: genericMsg });  // không tiết lộ email có tồn tại hay không

        const { raw, hashed } = createToken();
        user.resetPasswordToken = hashed;
        user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 giờ
        await user.save();

        const link = `${process.env.BASE_URL}/auth/reset-password/${raw}`;
        try {
            await sendEmail({
                to: user.email,
                subject: 'Đặt lại mật khẩu Book Store',
                html: `<p>Chào ${user.fullName},</p>
               <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu (có hiệu lực 1 giờ):</p>
               <p><a href="${link}">Đặt lại mật khẩu</a></p>
               <p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>`,
            });
        } catch (mailErr) {
            console.error(mailErr);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Không gửi được email. Vui lòng thử lại.' });
        }

        res.json({ message: genericMsg });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
};

// --- Đặt lại mật khẩu (bấm link trong mail) ---
const findUserByResetToken = (rawToken) =>
    User.findOne({
        resetPasswordToken: hashToken(rawToken),
        resetPasswordExpires: { $gt: Date.now() },
    });

exports.showResetPassword = async (req, res) => {
    try {
        const user = await findUserByResetToken(req.params.token);
        if (!user) {
            return res.status(400).render('auth/message', {
                title: 'Đặt lại mật khẩu', type: 'danger',
                message: 'Liên kết không hợp lệ hoặc đã hết hạn.',
            });
        }
        res.render('auth/reset-password', { title: 'Đặt lại mật khẩu', token: req.params.token });
    } catch (err) {
        console.error(err);
        res.status(500).send('An unexpected error occurred.');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự.' });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Mật khẩu nhập lại không khớp.' });
        }

        const user = await findUserByResetToken(req.params.token);
        if (!user) {
            return res.status(400).json({ message: 'Liên kết không hợp lệ hoặc đã hết hạn.' });
        }

        user.password = password;   // hook pre('save') trong model sẽ tự mã hóa
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Đặt lại mật khẩu thành công!', redirect: '/auth/login' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
};

// --- Đổi mật khẩu (đã đăng nhập) ---
exports.showChangePassword = (req, res) => {
    res.render('auth/change-password', { title: 'Đổi mật khẩu' });
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Mật khẩu nhập lại không khớp.' });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!(await user.comparePassword(currentPassword))) {
            return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Đổi mật khẩu thành công!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
};