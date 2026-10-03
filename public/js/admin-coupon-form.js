const form = document.getElementById('couponForm');
const errBox = document.getElementById('formError');

// Ô "giảm tối đa" chỉ có nghĩa khi giảm theo %
const toggleMax = () => {
    document.getElementById('maxWrap').style.display = form.discountType.value === 'percent' ? '' : 'none';
};
form.discountType.addEventListener('change', toggleMax);
toggleMax();

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('d-none');

    const data = Object.fromEntries(new FormData(form));
    data.isActive = form.isActive.checked;
    const id = form.dataset.id;

    try {
        if (id) await axios.put(`/api/admin/coupons/${id}`, data);
        else await axios.post('/api/admin/coupons', data);
        location.href = '/admin/coupons';
    } catch (err) {
        errBox.textContent = (err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra.';
        errBox.classList.remove('d-none');
    }
});