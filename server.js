const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read DB
const readDB = () => {
    if (!fs.existsSync(DB_FILE)) {
        return { users: [], tracks: [] };
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};
// Helper to write DB
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// Auth endpoints
app.post('/api/register', async (req, res) => {
    const { email, password, name } = req.body;
    const db = readDB();
    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now(), email, password: hashedPassword, name };
    db.users.push(newUser);
    writeDB(db);
    res.json({ message: 'Успешная регистрация', user: { email, name } });
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    res.json({ message: 'Успешный вход', user: { email, name: user.name } });
});

// Tracks endpoint
app.get('/api/tracks', (req, res) => {
    const db = readDB();
    res.json(db.tracks || []);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
});
