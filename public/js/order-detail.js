// Nút "Thanh toán ngay" của đơn Stripe chưa trả
const payBtn = document.getElementById('payNowBtn');
if (payBtn) {
    payBtn.addEventListener('click', async () => {
        const errorBox = document.getElementById('payError');
        errorBox.textContent = '';
        payBtn.disabled = true;
        try {
            const res = await axios.post(`/api/orders/${payBtn.dataset.code}/pay`);
            window.location.href = res.data.redirect;
        } catch (err) {
            if (redirectIfUnauthorized(err)) return;
            errorBox.textContent = apiMessage(err);
            payBtn.disabled = false;
        }
    });
}