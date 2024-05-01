const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 80;

const NodeGeocoder = require('node-geocoder');

const options = {
  provider: 'google', // or 'openstreetmap'
  
  // Optional, if you're using Google Maps Geocoding API
  apiKey: 'AIzaSyCQJ2E6OmMRyEFcGFpP2NLK68wyNN7EYfQ',

  // Optional, if you're using OpenStreetMap Nominatim
  formatter: null
};

const geocoder = NodeGeocoder(options);

async function getCoordinates(address) {
  try {
    const response = await geocoder.geocode(address);
    if (response.length > 0) {
      const { latitude, longitude } = response[0];
      return { latitude, longitude };
    } else {
      return null; // Address not found
    }
  } catch (err) {
    console.error(err);
    return null;
  }
}


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

// Serve static files (like index.ejs)
app.use(express.static(__dirname + '/public'));

// Route to serve index.ejs
app.get('/', (req, res) => {
    const username = req.query.username;
    const userid = req.query.userid; // Retrieve userId from query string if available
    res.render('index', { username, userid });

});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/user', (req, res) => {
    const username = req.query.username;
    const userid = req.query.userid; // Retrieve userId from query string if available
    res.render('user', { username, userid });
});
// existing database connection setup

// existing middleware and routes setup


app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const sql = 'SELECT * FROM Users WHERE userName = ?';

    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error('Error during user login:', err);
            res.status(500).send('Internal server error');
            return;
        }

        if (results.length > 0) {
            if (results[0].password === password) {
                // On successful login, redirect to the home page with username
                res.redirect(`/?username=${results[0].Name}&userid=${results[0].userId}`);
            } else {
                // On password mismatch, redirect back to the login page with an error message
                res.redirect('/login?error=PasswordIncorrect');
            }
        } else {
            // If no user found, redirect back to the login page with an error message
            res.redirect('/login?error=UserNotFound');
        }
    });
});


// Add this route handler after other routes
app.post('/user/favorites', (req, res) => {
    const { userId, propertyId } = req.body;

    // Insert the favorite property into the UserFavorites table
    const sql = 'INSERT INTO UserFavorites (userId, propertyId) VALUES (?, ?)';
    db.query(sql, [userId, propertyId], (err, result) => {
        if (err) {
            console.error('Error adding property to favorites:', err);
            res.status(500).json({ error: 'Error adding property to favorites' });
            return;
        }
        res.status(201).json({ message: 'Property added to favorites successfully' });
    });
});

app.post('/comparePropertyPriceToAverage', (req, res) => {
    const { centerLat, centerLng } = req.body;

    // Execute the stored procedure
    db.query('CALL ComparePropertyPriceToAverage(?, ?)', [centerLat, centerLng], (err, results) => {
        if (err) {
            console.error('Error executing stored procedure:', err);
            res.status(500).json({ error: 'Error executing stored procedure' });
            return;
        }
        
        // Extract the result from the stored procedure
        const properties = results[1]; // Assuming the properties result set is the second one
        console.log(results);
        res.json({ properties });
    });
});


app.post('/signup', (req, res) => {
    const { email, password, confirm_password, name } = req.body;

    // Check if passwords match
    if (password !== confirm_password) {
        res.send("Passwords do not match.");
        return;
    }

    // Insert the user directly into the database
    const sql = 'INSERT INTO Users (userName, password, name) VALUES (?, ?, ?)';
    db.query(sql, [email, password, name], (err, results) => {
        if (err) {
            console.error('Error during user registration:', err);
            res.status(500).send('Error registering user.');
            return;
        }
        // Redirect to home page after successful registration with username
        res.redirect(`/?username=${name}&userid=${results.insertId}`);
    });
});




// existing CRUD operations for Properties

// existing server start code

// CRUD operations for Properties
// Create a property
app.post('/properties', (req, res) => {
    const { price, squareFootage, numBedrooms, numBathrooms, propertyType, yearBuilt } = req.body;
    db.query('SELECT MAX(propertyId) AS maxId FROM Properties', (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        let nextPropertyId = result[0].maxId + 1;

        const sql = 'INSERT INTO Properties (propertyId, price, squareFootage, numBedrooms, numBathrooms, propertyType, yearBuilt) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [nextPropertyId, price, squareFootage, numBedrooms, numBathrooms, propertyType, yearBuilt], (err, result) => {
            if (err) {
                res.status(500).json({ error: err.message });
            } else {
                res.status(201).json({ propertyId: nextPropertyId }); // Send back the propertyId in the response
            }
        });
    });
});



app.get('/properties', async (req, res) => {
    const { search, distance, minPrice, maxPrice, bathrooms, bedrooms, propertyType, yearBuilt} = req.query;
    try {
        const coordinates = await getCoordinates(search);
        if (coordinates) {
            const { latitude, longitude } = coordinates;
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
            
            // Call stored procedure to fetch properties within 10-mile radius
            db.query('CALL GetPropertiesWithinDistance(?, ?, ?, ?, ?, ?, ?, ?, ?)', [latitude, longitude, distance || 10, minPrice || 0, maxPrice || 500000000, 
                    bathrooms || null, bedrooms || null, propertyType || null, 
                    yearBuilt || null], async (err, results) => {
                if (err) {
                    console.error(err);
                    res.status(500).json({ error: 'Error fetching properties within distance' });
                } else {
                    // For each property, perform reverse geocoding
                    for (let i = 0; i < results[0].length; i++) {
                        const property = results[0][i];
                        const reverseGeocodeResult = await geocoder.reverse({ lat: property.latitude, lon: property.longitude });
                        if (reverseGeocodeResult.length > 0) {
                            // Assuming the first result contains the street address
                            property.address = reverseGeocodeResult[0].formattedAddress;
                        } else {
                            property.address = 'Address not found';
                        }
                    }
                    res.json(results[0]); // Assuming the properties are returned as the first result set
                }
            });
        } else {
            console.log('Address not found');
            res.status(404).json({ error: 'Address not found' });
        }
    } catch (error) {
        console.error('Error getting coordinates:', error);
        res.status(500).json({ error: 'Error getting coordinates' });
    }
});




// Update a property
app.put('/properties/:propertyId', (req, res) => {
    const propertyId = req.params.propertyId;
    const { price, squareFootage, numBedrooms, numBathrooms, propertyType, yearBuilt } = req.body;
    const sql = 'UPDATE Properties SET price = ?, squareFootage = ?, numBedrooms = ?, numBathrooms = ?, propertyType = ?, yearBuilt = ? WHERE propertyId = ?';
    db.query(sql, [price, squareFootage, numBedrooms, numBathrooms, propertyType, yearBuilt, propertyId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Property not found' });
        } else {
            res.json({ message: 'Property updated successfully' });
        }
    });
});

// Delete a property
app.delete('/properties/:propertyId', (req, res) => {
    const propertyId = req.params.propertyId;
    db.query('DELETE FROM Properties WHERE propertyId = ?', propertyId, (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Property not found' });
        } else {
            res.json({ message: 'Property deleted successfully' });
        }
    });
});

app.post('/user/listings', (req, res) => {
    const { userId, propertyId } = req.body;

    // Insert the listing into UserListings table
    const sql = 'INSERT INTO UserListings (userId, propertyId) VALUES (?, ?)';
    db.query(sql, [userId, propertyId], (err, result) => {
        if (err) {
            console.error('Error adding listing to UserListings:', err);
            res.status(500).send('Error adding listing to UserListings');
            return;
        }
        res.status(201).json({ message: 'Listing added to UserListings successfully' });
    });
});

// Route to fetch user listings
app.get('/user/listings', (req, res) => {
    const userId = req.query.userid; // Retrieve userId from query string if available
    const sql = `SELECT Properties.* FROM UserListings 
                 JOIN Properties ON UserListings.propertyId = Properties.propertyId 
                 WHERE UserListings.userId = ?`;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching user listings:', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
        }

        res.json(results); // Send the combined data to the frontend
    });
});




app.post('/user/address', async (req, res) => {
    const { streetAddress, city, state, zipcode, propertyId} = req.body;
    const address = `${streetAddress}, ${city}, ${state} ${zipcode}`;
    try {
        const coordinates = await getCoordinates(address);
        if (coordinates) {
            const { latitude, longitude } = coordinates;
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
            const sql = 'INSERT INTO Address (latitude, longitude, city, state, zip, propertyId) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(sql, [latitude, longitude, city, state, zipcode, propertyId], (err, result) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    res.status(201).json({ propertyId: propertyId }); // Send back the propertyId in the response
                }
            });

        } else {
            console.log('Address not found');
            res.status(404).json({ error: 'Address not found' });
        }
    } catch (error) {
        console.error('Error getting coordinates:', error);
        res.status(500).json({ error: 'Error getting coordinates' });
    }
});



// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
