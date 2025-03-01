const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const app = express();

// Import routers
const usersRouter = require('./routes/users');
const shopRouter = require('./routes/shop');
const permissionsRouter = require('./routes/permissions');
const mailRouter = require('./routes/mail');
const registrationRouter = require('./routes/registration');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/media', express.static('/var/www/main/media'));
app.use(session({
    secret: 'oaf_secret_key',
    store: new MySQLStore({
        host: '10.128.0.31',
        user: 'oafuser',
        password: 'oafpass',
        database: 'oaf'
    }),
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set to true with HTTPS
        maxAge: 3600000
    }
}));

// Database connection
const db = mysql.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',
    database: 'oaf'
});
db.connect(err => {
    if (err) throw err;
    console.log('Connected to db-vm');
});

// Routes
app.use('/users', usersRouter);
app.use('/shop', shopRouter); // Delegates to product.js, catalog.js, cart.js
app.use('/permissions', permissionsRouter);
app.use('/mail', mailRouter);
app.use('/users/register', registrationRouter);

// Use the registration router for both register and verify paths
app.use('/users/register', registrationRouter);
app.use('/users/verify', registrationRouter); // Add this to handle verification routes

// Root route (temporary until moved to catalog.js)
app.get('/', (req, res) => {
    db.query('SELECT * FROM users', (err, users) => {
        if (err) throw err;
        db.query('SELECT * FROM products', (err, products) => {
            if (err) throw err;
            const userList = users.map(row => `<li>${row.username} (${row.user_type}) - Password: ${row.password}</li>`).join('');
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
                    <h2>Users:</h2>
                    <ul>${userList}</ul>
                    <h2>Products:</h2>
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
});

// My Account route
app.get('/myaccount/:section?', (req, res) => {
    const section = req.params.section || 'account';
    let content;
    switch (section) {
        case 'account': content = '<h2>Account</h2><p>Account placeholder</p>'; break;
        case 'profile': content = '<h2>Profile</h2><p>Profile placeholder</p>'; break;
        case 'orders': content = '<h2>Orders</h2><p>Orders placeholder</p>'; break;
        default: content = '<h2>404</h2><p>Section not found</p>';
    }
    const html = `
        ${fs.readFileSync('/var/www/main/header.html')}
        <div style="display: flex;">
            ${fs.readFileSync('/var/www/main/myaccount/menu.html')}
            <div style="width: 80%; padding: 20px;">${content}</div>
        </div>
        ${fs.readFileSync('/var/www/main/footer.html')}
    `;
    res.send(html);
});// Cart routes (temporary until fully moved to cart.js)
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    const cartItems = cart.map(item => `
        <li>${item.name} - $${item.price} x ${item.qty}</li>
    `).join('');
    const html = `
        ${fs.readFileSync('/var/www/main/header.html')}
        <main>
            <h2>Your Cart</h2>
            <ul>${cartItems || 'Cart is empty'}</ul>
            <form action="/cart/confirm" method="POST">
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

app.post('/cart/confirm', (req, res) => {
    if (!req.session.cart || req.session.cart.length === 0) {
        res.send('Cart is empty');
    } else {
        req.session.cart = [];
        const html = `
            ${fs.readFileSync('/var/www/main/header.html')}
            <main>
                <h2>Order Submitted</h2>
                <p>Your order has been confirmed! (No payment processed yet)</p>
                <a href="/shop">Back to Shop</a>
            </main>
            ${fs.readFileSync('/var/www/main/footer.html')}
        `;
        res.send(html);
    }
});

app.listen(3000, () => console.log('Main VM on 3000'));
