const express = require('express');
const router = express.Router();

const productRouter = require('./product');
const catalogRouter = require('./catalog');
const cartRouter = require('./cart');

router.use('/product', productRouter);
router.use('/catalog', catalogRouter);
router.use('/cart', cartRouter);

module.exports = router;
