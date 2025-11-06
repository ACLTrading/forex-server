const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURATION ---
const SHARED_SECRET_KEY = "Armstrong_1980-()@"; // Must match MT4

// --- IN-MEMORY DATA STORE ---
// This is where we'll keep the latest signals.
// It's a simple variable, so it will reset if the server restarts.
// For a production app, you'd use a database (like Redis or Firestore).
let signalsData = {
    "EURUSD": { "score": 0, "price": 1.0850 },
    "GBPUSD": { "score": 0, "price": 1.2720 },
    "USDJPY": { "score": 0, "price": 154.80 },
    "AUDUSD": { "score": 0, "price": 0.6610 },
    "USDCAD": { "score": 0, "price": 1.3650 },
    "USDCHF": { "score": 0, "price": 0.9110 },
    "NZDUSD": { "score": 0, "price": 0.6130 },
    "EURJPY": { "score": 0, "price": 168.00 }
};

// --- MIDDLEWARE ---
app.use(cors()); // Allow browser requests from any origin
app.use(bodyParser.json()); // Parse JSON bodies

// --- AUTHENTICATION MIDDLEWARE ---
// Simple key-based auth for our MT4 EA
const checkApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey && apiKey === SHARED_SECRET_KEY) {
        next(); // Key is valid, proceed
    } else {
        console.warn("Unauthorized POST attempt received.");
        res.status(401).send({ error: 'Unauthorized' });
    }
};

// --- API ENDPOINTS ---

// [ENDPOINT 1: FOR MT4]
// MT4 will POST data to this endpoint.
app.post('/update_signals', checkApiKey, (req, res) => {
    console.log("Received data from MT4:", req.body);
    const incomingData = req.body;
    
    // Update our in-memory store
    for (const symbol in incomingData) {
        if (signalsData.hasOwnProperty(symbol)) {
            signalsData[symbol] = incomingData[symbol];
        }
    }
    
    res.status(200).send({ message: 'Data received successfully' });
});

// [ENDPOINT 2: FOR OUR WEBPAGE]
// Our dashboard will GET data from this endpoint.
app.get('/get_signals', (req, res) => {
    console.log("Serving data to webpage.");
    res.status(200).json(signalsData);
});

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Signal server listening on port ${port}`);
});

