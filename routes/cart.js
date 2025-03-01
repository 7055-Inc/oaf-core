const express = require('express');
const fs = require('fs');
const router = express.Router();

router.get('/', (req, res) => {
    const cart = req.session.cart || [];
    const cartItems = cart.map(item => `
        <li>${item.name} - $${item.price} x ${item.qty}</li>
    `).join('');
    const html = `
        ${fs.readFileSync('/var/www/main/header.html')}
        <main>
            <h2>Your Cart</h2>
            <ul>${cartItems || 'Cart is empty'}</ul>
            <form action="/shop/cart/confirm" method="POST">
                <button type="submit">Confirm Order</button>
            </form>
        </main>
        ${fs.readFileSync('/var/www/main/footer.html')}
        <style>
            ul { list-style: none; padding: 20px; }
            button { background: #007bff; color: white; padding: 10px; border: none; }
            button:hover { background: #0056b3; }
        </style>
    `;
    res.send(html);
});

router.post('/confirm', (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        res.send('Cart is empty');
    } else {
        req.session.cart = [];
        const html = `
            ${fs.readFileSync('/var/www/main/header.html')}
            <main>
                <h2>Order Submitted</h2>
                <p>Your order has been confirmed! (No payment processed yet)</p>
                <a href="/shop/catalog">Back to Shop</a>
            </main>
            ${fs.readFileSync('/var/www/main/footer.html')}
        `;
        res.send(html);
    }
});

module.exports = router;
