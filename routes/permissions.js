const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const router = express.Router();

const db = mysql.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',  // Your oafpass
    database: 'oaf'
});

router.get('/', (req, res) => {
    db.query('SELECT u.username, u.user_type, p.profile_access, p.marketplace_vendor, p.gallery_access FROM users u LEFT JOIN permissions p ON u.id = p.user_id', (err, results) => {
        if (err) throw err;
        const permsList = results.map(row => `
            <tr>
                <td>${row.username} (${row.user_type})</td>
                <td>
                    <form action="/permissions/update" method="POST">
                        <input type="hidden" name="username" value="${row.username}">
                        <input type="checkbox" name="profile_access" ${row.profile_access === 'yes' ? 'checked' : ''} onchange="this.form.submit()"> Profile
                        <input type="checkbox" name="marketplace_vendor" ${row.marketplace_vendor === 'yes' ? 'checked' : ''} onchange="this.form.submit()"> Vendor
                        <input type="checkbox" name="gallery_access" ${row.gallery_access === 'yes' ? 'checked' : ''} onchange="this.form.submit()"> Gallery
                    </form>
                </td>
            </tr>
        `).join('');
        const html = `
            ${fs.readFileSync('/var/www/main/header.html')}
            <main>
                <h2>Permissions Management</h2>
                <table>
                    <tr><th>User</th><th>Permissions</th></tr>
                    ${permsList}
                </table>
            </main>
            ${fs.readFileSync('/var/www/main/footer.html')}
            <style>
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #f4f4f4; }
            </style>
        `;
        res.send(html);
    });
});

router.post('/update', (req, res) => {
    const { username, profile_access, marketplace_vendor, gallery_access } = req.body;
    const sql = 'INSERT INTO permissions (user_id, profile_access, marketplace_vendor, gallery_access) VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?) ON DUPLICATE KEY UPDATE profile_access = ?, marketplace_vendor = ?, gallery_access = ?';
    const values = [
        username,
        profile_access ? 'yes' : 'no',
        marketplace_vendor ? 'yes' : 'no',
        gallery_access ? 'yes' : 'no',
        profile_access ? 'yes' : 'no',
        marketplace_vendor ? 'yes' : 'no',
        gallery_access ? 'yes' : 'no'
    ];
    db.query(sql, values, (err) => {
        if (err) throw err;
        res.redirect('/permissions');
    });
});

module.exports = router;
