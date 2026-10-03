// Trang giỏ hàng: đổi số lượng, xóa sản phẩm (không tải lại trang)
const table = document.getElementById('cartTable');

const updateSummary = (data) => {
    document.getElementById('subtotal').textContent = formatVnd(data.subtotal);
    document.getElementById('shipping').textContent = data.shippingFee ? formatVnd(data.shippingFee) : 'Miễn phí';
    document.getElementById('total').textContent = formatVnd(data.total);
    setCartCount(data.cartCount);
};

if (table) {
    table.querySelectorAll('tbody tr').forEach((row) => {
        const bookId = row.dataset.bookId;
        const max = parseInt(row.dataset.max) || 1;
        const input = row.querySelector('.js-qty');
        const msg = row.querySelector('.js-msg');
        let lastGood = parseInt(input.value);

        const save = async (value) => {
            let v = parseInt(value);
            if (isNaN(v) || v < 1) v = 1;
            if (v > max) {
                v = max;
                msg.textContent = `Chỉ còn ${max} sản phẩm trong kho.`;
            } else {
                msg.textContent = '';
            }
            input.value = v;
            if (v === lastGood) return;

            try {
                const res = await axios.patch(`/api/cart/${bookId}`, { quantity: v });
                lastGood = res.data.quantity;
                row.querySelector('.js-line').textContent = formatVnd(res.data.lineTotal);
                updateSummary(res.data);
            } catch (err) {
                input.value = lastGood;
                if (!redirectIfUnauthorized(err)) msg.textContent = apiMessage(err);
            }
        };

        row.querySelector('.js-minus').addEventListener('click', () => save((parseInt(input.value) || 1) - 1));
        row.querySelector('.js-plus').addEventListener('click', () => save((parseInt(input.value) || 1) + 1));
        input.addEventListener('change', () => save(input.value));

        row.querySelector('.js-remove').addEventListener('click', async () => {
            try {
                const res = await axios.delete(`/api/cart/${bookId}`);
                row.remove();
                if (!table.querySelector('tbody tr')) return window.location.reload();
                updateSummary(res.data);
            } catch (err) {
                if (!redirectIfUnauthorized(err)) msg.textContent = apiMessage(err);
            }
        });
    });
}