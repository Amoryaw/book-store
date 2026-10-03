// Trang thanh toán: áp mã giảm giá và đặt hàng. Server luôn tính lại tiền, số hiển thị ở đây chỉ để xem trước.
const subtotalEl = document.getElementById('subtotal');
const couponInput = document.getElementById('couponCode');
const couponMsg = document.getElementById('couponMsg');
const placeBtn = document.getElementById('placeOrderBtn');
let appliedCode = '';

const renderTotals = (shippingFee, discount, total) => {
    document.getElementById('shipping').textContent = shippingFee ? formatVnd(shippingFee) : 'Miễn phí';
    document.getElementById('discount').textContent = '- ' + formatVnd(discount);
    document.getElementById('total').textContent = formatVnd(total);
};

const resetCoupon = () => {
    appliedCode = '';
    const subtotal = parseInt(subtotalEl.dataset.value);
    const shipping = parseInt(document.getElementById('shipping').dataset.value);
    renderTotals(shipping, 0, subtotal + shipping);
};

// Phương thức thanh toán đang chọn: 'cod' hoặc 'stripe'
const getPaymentMethod = () => {
    const stripeRadio = document.getElementById('payStripe');
    return stripeRadio && stripeRadio.checked ? 'stripe' : 'cod';
};

// Đổi chữ trên nút theo phương thức thanh toán
document.querySelectorAll('input[name="payment"]').forEach((radio) => {
    radio.addEventListener('change', () => {
        placeBtn.textContent = getPaymentMethod() === 'stripe' ? 'Thanh toán bằng thẻ' : 'Đặt hàng';
    });
});

// Gõ lại mã thì bỏ mã đang áp dụng
couponInput.addEventListener('input', () => {
    if (appliedCode) {
        resetCoupon();
        couponMsg.textContent = '';
    }
});

document.getElementById('applyCouponBtn').addEventListener('click', async () => {
    const code = couponInput.value.trim();
    if (!code) {
        couponMsg.className = 'small mb-2 text-danger';
        couponMsg.textContent = 'Vui lòng nhập mã giảm giá.';
        return;
    }
    try {
        const res = await axios.post('/api/orders/validate-coupon', { code });
        appliedCode = res.data.code;
        renderTotals(res.data.shippingFee, res.data.discount, res.data.total);
        couponMsg.className = 'small mb-2 text-success';
        couponMsg.textContent = res.data.message;
    } catch (err) {
        if (redirectIfUnauthorized(err)) return;
        resetCoupon();
        couponMsg.className = 'small mb-2 text-danger';
        couponMsg.textContent = apiMessage(err);
    }
});

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById('orderError');
    const method = getPaymentMethod();
    errorBox.textContent = '';
    placeBtn.disabled = true;
    try {
        const res = await axios.post('/api/orders', {
            receiverName: document.getElementById('receiverName').value,
            receiverPhone: document.getElementById('receiverPhone').value,
            receiverAddress: document.getElementById('receiverAddress').value,
            couponCode: appliedCode,
            paymentMethod: method,
        });
        if (method === 'stripe') placeBtn.textContent = 'Đang chuyển tới Stripe...';
        // COD: sang trang đơn hàng. Stripe: sang trang thanh toán của Stripe.
        window.location.href = res.data.redirect;
    } catch (err) {
        if (redirectIfUnauthorized(err)) return;
        errorBox.textContent = apiMessage(err);
        // Giỏ hàng thay đổi / hết hàng: đưa người dùng về giỏ sau khi đọc thông báo
        const redirect = err.response && err.response.data && err.response.data.redirect;
        if (redirect) setTimeout(() => (window.location.href = redirect), 2500);
        placeBtn.disabled = false;
    }
});