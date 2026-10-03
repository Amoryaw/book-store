const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        const res = await axios.post('/auth/logout');
        window.location.href = res.data.redirect;
    });
}

// ===== Hàm dùng chung (giỏ hàng, thanh toán) =====
window.formatVnd = (n) => new Intl.NumberFormat('vi-VN').format(n || 0) + ' ₫';

window.setCartCount = (n) => {
    const el = document.getElementById('cartCount');
    if (el) el.textContent = n;
};

// Trả về true nếu đã xử lý lỗi 401 (chưa đăng nhập -> chuyển sang trang đăng nhập)
window.redirectIfUnauthorized = (err) => {
    if (err.response && err.response.status === 401) {
        window.location.href = '/auth/login';
        return true;
    }
    return false;
};

window.apiMessage = (err) =>
    (err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra, vui lòng thử lại.';