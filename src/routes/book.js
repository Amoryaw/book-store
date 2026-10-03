const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookController');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadBook } = require('../middleware/upload');

const bookFiles = uploadBook.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'images', maxCount: 5 },
]);

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', protect, isAdmin, bookFiles, ctrl.create);
router.put('/:id', protect, isAdmin, bookFiles, ctrl.update);
router.delete('/:id', protect, isAdmin, ctrl.remove);

module.exports = router;