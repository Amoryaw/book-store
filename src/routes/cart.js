const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', ctrl.add);
router.patch('/:bookId', ctrl.update);
router.delete('/:bookId', ctrl.remove);

module.exports = router;