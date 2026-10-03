const form = document.getElementById('bannerForm');
const errBox = document.getElementById('formError');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('d-none');

    const fd = new FormData(form);
    fd.set('isActive', form.isActive.checked ? 'true' : 'false');
    const id = form.dataset.id;

    try {
        if (id) await axios.put(`/api/admin/banners/${id}`, fd);
        else await axios.post('/api/admin/banners', fd);
        location.href = '/admin/banners';
    } catch (err) {
        errBox.textContent = (err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra.';
        errBox.classList.remove('d-none');
    }
});