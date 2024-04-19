const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const db = mysql.createConnection({
    host: '34.68.209.7',
    user: 'root',
    password: 'test1234',
    database: 'team061'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
});

// Set up view engine
app.set('view engine', 'ejs');

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Route to fetch properties
app.get('/properties', (req, res) => {
    const sql = 'SELECT PropertyId, Price FROM Properties';
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.json(result);
    });
});

// Serve index page
app.get('/', (req, res) => {
    res.render('index');
});

// Start the server
app.listen(80, () => {
    console.log('Server is running on port 80');
});
