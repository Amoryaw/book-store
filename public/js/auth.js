const form = document.getElementById('authForm');
const alertBox = document.getElementById('alertBox');

const showAlert = (type, message) => {
    alertBox.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    try {
        const res = await axios.post(form.dataset.action, data);
        showAlert('success', res.data.message);
        if (res.data.redirect) {
            setTimeout(() => (window.location.href = res.data.redirect), 800);
        } else {
            form.reset();
        }
    } catch (err) {
        const msg = err.response?.data?.message || 'Không kết nối được tới server.';
        showAlert('danger', msg);
    }
});