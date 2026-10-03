document.querySelectorAll('[data-status-btn]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const { code, status } = btn.dataset;
        if (status === 'cancelled' && !confirm('Hủy đơn này? Tồn kho sẽ được hoàn lại.')) return;

        btn.disabled = true;
        try {
            await axios.patch(`/api/admin/orders/${code}/status`, { status });
            location.reload();
        } catch (err) {
            alert((err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra.');
            btn.disabled = false;
        }
    });
});