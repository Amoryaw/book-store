const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categoryController');
const { protect, isAdmin } = require('../middleware/auth');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', protect, isAdmin, ctrl.create);
router.put('/:id', protect, isAdmin, ctrl.update);
router.delete('/:id', protect, isAdmin, ctrl.remove);

module.exports = router;