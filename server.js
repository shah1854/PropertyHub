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
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

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
                res.status(201).json({ message: 'Property added successfully' });
            }
        });
    });
});


app.get('/properties', async (req, res) => {
    const { search } = req.query;
    try {
        const coordinates = await getCoordinates(search);
        if (coordinates) {
            const { latitude, longitude } = coordinates;
            console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
            
            // Call stored procedure to fetch properties within 10-mile radius
            db.query('CALL GetPropertiesWithinDistance(?, ?, ?)', [latitude, longitude, 10], async (err, results) => {
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

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
