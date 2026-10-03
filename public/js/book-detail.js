// Đổi ảnh chính khi bấm ảnh nhỏ
const mainImage = document.getElementById('mainImage');
document.querySelectorAll('.thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
        mainImage.src = thumb.src;
        document.querySelectorAll('.thumb').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
    });
});

// Giới hạn số lượng theo tồn kho (chỉ ở giao diện; server sẽ kiểm tra lại ở Bước 7)
const qty = document.getElementById('qty');
if (qty) {
    const max = parseInt(qty.max) || 1;
    const hint = document.getElementById('qtyHint');

    const clamp = () => {
        let v = parseInt(qty.value);
        if (isNaN(v) || v < 1) v = 1;
        if (v > max) {
            v = max;
            hint.textContent = `Chỉ còn ${max} sản phẩm trong kho.`;
        } else {
            hint.textContent = '';
        }
        qty.value = v;
    };

    document.getElementById('qtyMinus').addEventListener('click', () => { qty.value = (parseInt(qty.value) || 1) - 1; clamp(); });
    document.getElementById('qtyPlus').addEventListener('click', () => { qty.value = (parseInt(qty.value) || 1) + 1; clamp(); });
    qty.addEventListener('change', clamp);
}

// ===== Thêm vào giỏ / Mua ngay (gọi API bằng Axios) =====
const addBtn = document.getElementById('addToCartBtn');
const buyBtn = document.getElementById('buyNowBtn');
const qtyHint = document.getElementById('qtyHint');

const showHint = (text, ok) => {
    qtyHint.textContent = text;
    qtyHint.className = (ok ? 'text-success' : 'text-danger') + ' small mb-3';
};

// Trả về true nếu thêm thành công
const addToCart = async (btn) => {
    const quantity = parseInt(document.getElementById('qty').value) || 1;
    btn.disabled = true;
    try {
        const res = await axios.post('/api/cart', { bookId: btn.dataset.bookId, quantity });
        setCartCount(res.data.cartCount);
        showHint(res.data.message, true);
        return true;
    } catch (err) {
        if (!redirectIfUnauthorized(err)) showHint(apiMessage(err), false);
        return false;
    } finally {
        btn.disabled = false;
    }
};

if (addBtn) addBtn.addEventListener('click', () => addToCart(addBtn));
if (buyBtn) {
    buyBtn.addEventListener('click', async () => {
        if (await addToCart(buyBtn)) window.location.href = '/checkout';
    });
}