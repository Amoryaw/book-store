const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/publisherController');
const { protect, isAdmin } = require('../middleware/auth');
const { uploadPublisher } = require('../middleware/upload');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', protect, isAdmin, uploadPublisher.single('logo'), ctrl.create);
router.put('/:id', protect, isAdmin, uploadPublisher.single('logo'), ctrl.update);
router.delete('/:id', protect, isAdmin, ctrl.remove);

module.exports = router;