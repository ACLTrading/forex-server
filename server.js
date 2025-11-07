const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 10000; // Render.com uses port 10000

// --- CONFIGURATION ---
const SHARED_SECRET_KEY = "Armstrong_1980-()@"; // Must match MT4

// --- IN-MEMORY DATA STORE ---
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
// Accept raw text, not JSON, because MT4 sends "junk" data
app.use(bodyParser.text({ type: '*/*', limit: '5mb' })); // Increased limit just in case


// --- AUTHENTICATION MIDDLEWARE ---
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
app.post('/update_signals', checkApiKey, (req, res) => {
    let incomingData;
    let rawBody = req.body;
    
    try {
        // ** THIS IS THE REAL FIX **
        // MT4 sends the 4096-byte array, including 3500+ null chars ('\0').
        // We find the *first* null char and take everything *before* it.
        // This gives us the clean, pure JSON string.
        const cleanedBody = rawBody.split('\0')[0];
        
        // Now, parse the *clean* string.
        incomingData = JSON.parse(cleanedBody); 
        console.log("Received data from MT4:", incomingData);

    } catch (error) {
        console.error("Failed to parse JSON from MT4:", error);
        console.error("Raw data received (first 1000 chars):", rawBody.substring(0, 1000));
        return res.status(400).send({ error: 'Bad JSON format' });
    }
    
    // Update our in-memory store
    for (const symbol in incomingData) {
        if (signalsData.hasOwnProperty(symbol)) {
            signalsData[symbol] = incomingData[symbol];
        }
    }
    
    res.status(200).send({ message: 'Data received successfully' });
});

// [ENDPOINT 2: FOR OUR WEBPAGE]
app.get('/get_signals', (req, res) => {
    console.log("Serving data to webpage.");
    res.status(200).json(signalsData);
});

// --- START THE SERVER ---
app.listen(port, () => {
    console.log(`Signal server listening on port ${port}`);
});
