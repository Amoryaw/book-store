const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')                 // tách dấu khỏi chữ
    .replace(/[\u0300-\u036f]/g, '')  // xóa dấu
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

module.exports = slugify;