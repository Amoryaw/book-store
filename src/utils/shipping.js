// Quy tắc phí ship (tự đặt, sửa số ở đây nếu muốn)
const SHIPPING_FEE = 30000;        // phí ship mặc định
const FREE_SHIP_FROM = 300000;     // đơn từ mức này trở lên được miễn phí ship

const calcShipping = (subtotal) => (subtotal <= 0 || subtotal >= FREE_SHIP_FROM ? 0 : SHIPPING_FEE);

module.exports = { SHIPPING_FEE, FREE_SHIP_FROM, calcShipping };