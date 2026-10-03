const mongoose = require('mongoose');
const Publisher = require('../models/Publisher');
const Book = require('../models/Book');
const { pick, isAdminReq, toPublicPath, deleteFile, fail, handleError } = require('../utils/helpers');

const FIELDS = ['name', 'description', 'sortOrder', 'isActive'];

exports.getAll = async (req, res) => {
    try {
        const filter = isAdminReq(req) ? {} : { isActive: true };
        const data = await Publisher.find(filter).sort({ sortOrder: 1, name: 1 });
        res.json({ data });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.getOne = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Không tìm thấy nhà xuất bản.' });
        }
        const publisher = await Publisher.findById(req.params.id);
        if (!publisher || (!publisher.isActive && !isAdminReq(req))) {
            return res.status(404).json({ message: 'Không tìm thấy nhà xuất bản.' });
        }
        res.json({ data: publisher });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.create = async (req, res) => {
    try {
        const data = pick(req.body, FIELDS);
        if (req.file) data.logo = toPublicPath(req.file, 'publishers');
        const publisher = await Publisher.create(data);
        res.status(201).json({ message: 'Thêm nhà xuất bản thành công.', data: publisher });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.update = async (req, res) => {
    try {
        const publisher = await Publisher.findById(req.params.id);
        if (!publisher) return fail(req, res, 404, 'Không tìm thấy nhà xuất bản.');

        publisher.set(pick(req.body, FIELDS));
        const oldLogo = publisher.logo;
        if (req.file) publisher.logo = toPublicPath(req.file, 'publishers');

        await publisher.save();
        if (req.file) deleteFile(oldLogo);
        res.json({ message: 'Cập nhật nhà xuất bản thành công.', data: publisher });
    } catch (err) {
        handleError(err, req, res);
    }
};

exports.remove = async (req, res) => {
    try {
        const publisher = await Publisher.findById(req.params.id);
        if (!publisher) return fail(req, res, 404, 'Không tìm thấy nhà xuất bản.');

        const count = await Book.countDocuments({ publisher: publisher._id });
        if (count > 0) {
            return fail(req, res, 400, `Không thể xóa: còn ${count} sách của nhà xuất bản này.`);
        }

        await publisher.deleteOne();
        deleteFile(publisher.logo);
        res.json({ message: 'Đã xóa nhà xuất bản.' });
    } catch (err) {
        handleError(err, req, res);
    }
};