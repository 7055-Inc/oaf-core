const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const bcrypt = require('bcrypt');
const router = express.Router();

const db = mysql.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',  // Your oafpass
    database: 'oaf'
});

router.get('/newuser', (req, res) => {
    const html = `
        ${fs.readFileSync('/var/www/main/header.html')}
        <div class="form-container">
            <h2>Add New User</h2>
            <form action="/users/add" method="POST">
                <label>ID (10-digit):</label><br>
                <input type="number" name="id" min="1000000000" max="9999999999" required><br>
                <label>Username (Email):</label><br>
                <input type="email" name="username" required><br>
                <label>Password:</label><br>
                <input type="password" name="password" required><br>
                <label>User Type:</label><br>
                <select name="user_type" required>
                    <option value="artist">Artist</option>
                    <option value="promoter">Promoter</option>
                    <option value="community">Community</option>
                    <option value="admin">Admin</option>
                </select><br>
                <button type="submit">Submit</button>
            </form>
            <style>
                .form-container { padding: 20px; max-width: 400px; margin: 0 auto; }
                label { display: block; margin: 10px 0 5px; }
                input, select { width: 100%; padding: 8px; margin-bottom: 10px; }
                button { background: #007bff; color: white; padding: 10px; border: none; width: 100%; }
                button:hover { background: #0056b3; }
            </style>
        </div>
        ${fs.readFileSync('/var/www/main/footer.html')}
    `;
    res.send(html);
});

router.post('/add', async (req, res) => {
    const { id, username, password, user_type } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (id, username, password, user_type) VALUES (?, ?, ?, ?)';
    db.query(sql, [id, username, hashedPassword, user_type], (err) => {
        if (err) throw err;
        res.redirect('/'); 
    });
});

router.get('/login', (req, res) => {
    const html = `
        ${fs.readFileSync('/var/www/main/header.html')}
        <div class="form-container">
            <h2>Login</h2>
            <form action="/users/login" method="POST">
                <label>Username (Email):</label><br>
                <input type="email" name="username" required><br>
                <label>Password:</label><br>
                <input type="password" name="password" required><br>
                <button type="submit">Login</button>
            </form>
            <style>
                .form-container { padding: 20px; max-width: 400px; margin: 0 auto; }
                label { display: block; margin: 10px 0 5px; }
                input { width: 100%; padding: 8px; margin-bottom: 10px; }
                button { background: #007bff; color: white; padding: 10px; border: none; width: 100%; }
                button:hover { background: #0056b3; }
            </style>
        </div>
        ${fs.readFileSync('/var/www/main/footer.html')}
    `;
    res.send(html);
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], async (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            res.send('User not found');
        } else {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                req.session.user = user;
                res.redirect('/myaccount');
            } else {
                res.send('Incorrect password');
            }
        }
    });
});

router.get('/reset', (req, res) => {
    const html = `
        ${fs.readFileSync('/var/www/main/header.html')}
        <div class="form-container">
            <h2>Reset Password</h2>
            <form action="/users/reset" method="POST">
                <label>Username (Email):</label><br>
                <input type="email" name="username" required><br>
                <label>New Password:</label><br>
                <input type="password" name="password" required><br>
                <button type="submit">Reset</button>
            </form>
            <style>
                .form-container { padding: 20px; max-width: 400px; margin: 0 auto; }
                label { display: block; margin: 10px 0 5px; }
                input { width: 100%; padding: 8px; margin-bottom: 10px; }
                button { background: #007bff; color: white; padding: 10px; border: none; width: 100%; }
                button:hover { background: #0056b3; }
            </style>
        </div>
        ${fs.readFileSync('/var/www/main/footer.html')}
    `;
    res.send(html);
});

router.post('/reset', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'UPDATE users SET password = ? WHERE username = ?';
    db.query(sql, [hashedPassword, username], (err, result) => {
        if (err) throw err;
        if (result.affectedRows === 0) {
            res.send('User not found');
        } else {
            res.send('Password reset successful');
        }
    });
});

module.exports = router;
