document.querySelectorAll('[data-delete-url]').forEach((btn) => {
    btn.addEventListener('click', async () => {
        if (!confirm(`Xóa "${btn.dataset.name}"?`)) return;
        btn.disabled = true;
        try {
            await axios.delete(btn.dataset.deleteUrl);
            location.reload();
        } catch (err) {
            alert((err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra.');
            btn.disabled = false;
        }
    });
});