const form = document.getElementById('bookForm');
const errBox = document.getElementById('formError');
const saveBtn = document.getElementById('saveBtn');

const showError = (msg) => {
    errBox.textContent = msg;
    errBox.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('d-none');

    // Kiểm tra số lượng ảnh phụ trước khi gửi
    const imagesInput = form.elements.images;
    const newCount = imagesInput.files.length;
    const existing = Number(imagesInput.dataset.existing) || 0;
    const removing = form.querySelectorAll('input[name="removeImages"]:checked').length;
    if (newCount > 5) return showError('Mỗi lần chỉ được chọn tối đa 5 ảnh phụ.');
    if (existing - removing + newCount > 10) return showError('Tối đa 10 ảnh phụ cho mỗi sách.');

    const fd = new FormData(form);
    // Checkbox không tick sẽ không được gửi, nên phải gửi rõ true/false
    fd.set('isFeatured', form.elements.isFeatured.checked ? 'true' : 'false');

    const id = form.dataset.id;
    saveBtn.disabled = true;
    try {
        if (id) await axios.put(`/api/books/${id}`, fd);
        else await axios.post('/api/books', fd);
        location.href = '/admin/books';
    } catch (err) {
        showError((err.response && err.response.data && err.response.data.message) || 'Có lỗi xảy ra.');
        saveBtn.disabled = false;
    }
});