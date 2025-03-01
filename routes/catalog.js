const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const router = express.Router();

const dbConfig = { host: '10.128.0.31', user: 'oafuser', password: 'oafpass', database: 'oaf' };
const db = mysql.createConnection(dbConfig);

router.get('/', (req, res) => {
    db.query('SELECT * FROM products', (err, products) => {
        if (err) throw err;
        const productGrid = products.map(row => `
            <div class="product">
                <h3>${row.name}</h3>
                <p>Price: $${row.price} | Qty: ${row.available_qty}</p>
                <form action="/shop/catalog/add" method="POST">
                    <input type="hidden" name="id" value="${row.id}">
                    <input type="number" name="qty" min="1" max="${row.available_qty}" value="1" style="width: 50px;">
                    <button type="submit">Add to Cart</button>
                </form>
            </div>
        `).join('');
        const html = `
            ${fs.readFileSync('/var/www/main/header.html')}
            <main>
                <h2>Product Catalog</h2>
                <div class="grid">${productGrid}</div>
                <p><a href="/shop/cart">View Cart</a></p>
            </main>
            ${fs.readFileSync('/var/www/main/footer.html')}
            <style>
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
                .product { border: 1px solid #ddd; padding: 10px; text-align: center; }
                button { background: #007bff; color: white; padding: 5px; border: none; }
                button:hover { background: #0056b3; }
            </style>
        `;
        res.send(html);
    });
});

router.post('/add', (req, res) => {
    const { id, qty } = req.body;
    db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.status(404).send('Product not found');

        const product = results[0];
        if (!req.session.cart) req.session.cart = [];
        
        const cartItem = req.session.cart.find(item => item.id === product.id);
        if (cartItem) {
            cartItem.qty += parseInt(qty);
        } else {
            req.session.cart.push({ id: product.id, name: product.name, price: product.price, qty: parseInt(qty) });
        }
        res.redirect('/shop/catalog');
    });
});

module.exports = router;
