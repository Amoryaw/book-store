const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pageController');

router.get('/', ctrl.home);
router.get('/sach-tieng-viet', ctrl.listByLanguage('vi'));
router.get('/sach-tieng-viet/:category', ctrl.listByLanguage('vi'));
router.get('/english-books', ctrl.listByLanguage('en'));
router.get('/english-books/:category', ctrl.listByLanguage('en'));
router.get('/tim-kiem', ctrl.search);
router.get('/sach/:slug', ctrl.detail);

module.exports = router;