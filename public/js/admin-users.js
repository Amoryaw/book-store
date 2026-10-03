document.querySelectorAll('[data-user-status]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const { id, status, name } = btn.dataset;
        const msg = status === 'blocked'
            ? `Khóa tài khoản "${name}"? Người này sẽ bị đăng xuất và không đăng nhập lại được.`
            : `Mở khóa tài khoản "${name}"?`;
        if (!confirm(msg)) return;

        btn.disabled = true;
        try {
            await axios.patch(`/api/admin/users/${id}/status`, { status });
            location.reload();
        } catch (err) {
            alert((err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra.');
            btn.disabled = false;
        }
    });
});