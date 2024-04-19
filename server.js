var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var path = require('path');
var connection = mysql.createConnection({
                host: '34.68.209.7',
                user: 'root',
                password: 'test1234',
                database: 'team061'
});

connection.connect;


var app = express();

// set up ejs view engine 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
 
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '../public'));

/* GET home page, respond by rendering index.ejs */
app.get('/', function(req, res) {
  res.render('index', { title: 'Mark Attendance' });
});

app.get('/success', function(req, res) {
      res.send({'message': 'Attendance marked successfully!'});
});
 
// this code is executed when a user makes an account
app.post('/mark', function(req, res) {
  var netid = req.body.netid;
   
  var sql = `INSERT INTO attendance (netid, present) VALUES ('${netid}',1)`;



console.log(sql);
  connection.query(sql, function(err, result) {
    if (err) {
      res.send(err)
      return;
    }
    res.redirect('/success');
  });
});

app.get('/api/attendance', function(req, res) {
  var sql = 'SELECT * FROM Properties';

  connection.query(sql, function(err, results) {
    if (err) {
      console.error('Error fetching attendance data:', err);
      res.status(500).send({ message: 'Error fetching attendance data', error: err });
      return;
    }
    res.json(results);
  });
});

app.post('/api/attendance/modify/:id', function(req, res) {
  var id = req.params.id;
  var present = req.body.present; // Assuming 'present' is sent in the request body

  var sql = 'UPDATE attendance SET present = ? WHERE netid = ?';

  connection.query(sql, [present, id], function(err, result) {
    if (err) {
      console.error('Error modifying attendance record:', err);
      res.status(500).send({ message: 'Error modifying attendance record', error: err });
      return;
    }
    if(result.affectedRows === 0) {
      // No rows were affected, meaning no record was found with that ID
      res.status(404).send({ message: 'Record not found' });
    } else {
      res.send({ message: 'Attendance record modified successfully' });
    }
  });
});

app.delete('/api/attendance/delete/:id', function(req, res) {
  var id = req.params.id;

  var sql = 'DELETE FROM attendance WHERE netid = ?';

  connection.query(sql, [id], function(err, result) {
    if (err) {
      console.error('Error deleting attendance record:', err);
      res.status(500).send({ message: 'Error deleting attendance record', error: err });
      return;
    }
    if(result.affectedRows === 0) {
      // No rows were affected, meaning no record was found with that ID
      res.status(404).send({ message: 'Record not found' });
    } else {
      res.send({ message: 'Attendance record deleted successfully' });
    }
  });
});


app.listen(80, function () {
    console.log('Node app is running on port 80');
});

//*****************PROPERTYHUB*****************
// Function to add a new user to the Users table
app.post('/api/users/create', function(req, res) {
  // Extract user information from the request body
  var { userName, password, favorites } = req.body;

  // Ensure all required fields are provided
  if (!userName || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Construct the SQL query to insert the new user
  var sql = `INSERT INTO Users (userName, password, favorites) VALUES (?, ?, ?)`;
  var values = [userName, password, favorites];

  // Execute the SQL query
  connection.query(sql, values, function(err, result) {
    if (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ message: 'Error creating user', error: err });
    }
    // Send a success response
    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  });
});
