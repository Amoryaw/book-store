const crypto = require('crypto');

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

// raw: gửi cho người dùng qua email. hashed: lưu vào database.
const createToken = () => {
    const raw = crypto.randomBytes(32).toString('hex');
    return { raw, hashed: hashToken(raw) };
};

module.exports = { createToken, hashToken };