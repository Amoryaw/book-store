const mongoose = require('mongoose');
const Category = require('../models/Category');
const Book = require('../models/Book');
const { pick, isAdminReq, fail, handleError } = require('../utils/helpers');

const FIELDS = ['name', 'nameEn', 'group', 'sortOrder', 'isActive'];

// GET /api/categories?group=vi|foreign
exports.getAll = async (req, res) => {
  try {
    const filter = isAdminReq(req) ? {} : { isActive: true };
    if (req.query.group) filter.group = String(req.query.group);
    const data = await Category.find(filter).sort({ sortOrder: 1, name: 1 });
    res.json({ data });
  } catch (err) {
    handleError(err, req, res);
  }
};

// GET /api/categories/:id   (id hoặc slug)
exports.getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.isValidObjectId(id) ? { _id: id } : { slug: id };
    const category = await Category.findOne(query);
    if (!category || (!category.isActive && !isAdminReq(req))) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục.' });
    }
    res.json({ data: category });
  } catch (err) {
    handleError(err, req, res);
  }
};

// POST /api/categories   (JSON: name, group, sortOrder, isActive)
exports.create = async (req, res) => {
  try {
    const category = await Category.create(pick(req.body, FIELDS));
    res.status(201).json({ message: 'Thêm danh mục thành công.', data: category });
  } catch (err) {
    handleError(err, req, res);
  }
};

// PUT /api/categories/:id
exports.update = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return fail(req, res, 404, 'Không tìm thấy danh mục.');

    category.set(pick(req.body, FIELDS));
    await category.save();   // save() để hook tạo lại slug chạy
    res.json({ message: 'Cập nhật danh mục thành công.', data: category });
  } catch (err) {
    handleError(err, req, res);
  }
};

// DELETE /api/categories/:id
exports.remove = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return fail(req, res, 404, 'Không tìm thấy danh mục.');

    const count = await Book.countDocuments({ category: category._id });
    if (count > 0) {
      return fail(req, res, 400, `Không thể xóa: còn ${count} sách thuộc danh mục này.`);
    }

    await category.deleteOne();
    res.json({ message: 'Đã xóa danh mục.' });
  } catch (err) {
    handleError(err, req, res);
  }
};