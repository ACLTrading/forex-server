//+------------------------------------------------------------------+
//|                 QuantumConfluenceScanner.mq4                     |
//|               Sends strategy scores to a web server.             |
//+------------------------------------------------------------------+
#property copyright "Your Name"
#property link      "https://www.smart-trade-alerts.com"
#property version   "1.00"
#property strict

// --- User Settings ---
// IMPORTANT: Update this to your server's POST endpoint
string serverPostUrl = "https://www.smart-trade-alerts.com/update_signals"; 

// IMPORTANT: This MUST match the secret key on your server
string sharedSecretKey = "Armstrong_1980-()@"; 

// List of symbols to scan
string symbolsToScan[] = {"EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "USDCHF", "NZDUSD", "EURJPY"};
int totalSymbols = 8;

// --- Timer Setup ---
int timerIntervalSeconds = 900; // 900 seconds = 15 minutes

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
    // Set the timer to run every 15 minutes
    EventSetTimer(timerIntervalSeconds);
    
    // Run the first scan immediately on load
    OnTimer(); 
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    // Stop the timer
    EventKillTimer();
}

//+------------------------------------------------------------------+
//| Timer event function (this is our main loop)                     |
//+------------------------------------------------------------------+
void OnTimer()
{
    Print("QuantumConfluenceScanner: Running scan...");
    
    // 1. Build the JSON payload string
    string jsonPayload = "{";
    
    for(int i = 0; i < totalSymbols; i++)
    {
        string symbol = symbolsToScan[i];
        
        // MQL4/5 symbol names (e.g., EURUSD) don't have '/'.
        // Our dashboard expects "EUR/USD". We'll use the MQL4 name as the key.
        
        int score = calculateConfluenceScore(symbol);
        double price = SymbolInfoDouble(symbol, SYMBOL_BID);
        
        jsonPayload += "\"" + symbol + "\": {"; // e.g., "EURUSD": {
        jsonPayload += "\"score\": " + (string)score + ","; // "score": 3,
        jsonPayload += "\"price\": " + DoubleToString(price, 5) + ""; // "price": 1.08500
        jsonPayload += "}";
        
        if(i < totalSymbols - 1)
        {
            jsonPayload += ","; // Add comma for next entry
        }
    }
    
    jsonPayload += "}"; // Close the JSON
    
    Print("JSON Payload: ", jsonPayload);
    
    // 2. Send the data to the server
    sendDataToServer(jsonPayload);
}

//+------------------------------------------------------------------+
//| Calculates the Confluence Score for a symbol                     |
//+------------------------------------------------------------------+
int calculateConfluenceScore(string symbol)
{
    // Ensure market data is available
    RefreshRates();

    // --- 1. Macro Trend (H4) ---
    double priceH4 = iClose(symbol, PERIOD_H4, 1);
    double sma100_H4 = iMA(symbol, PERIOD_H4, 100, 0, MODE_SMA, PRICE_CLOSE, 1);
    int h4Trend = (priceH4 > sma100_H4) ? 1 : -1;

    // --- 2. Market Structure (H1) ---
    double priceH1 = iClose(symbol, PERIOD_H1, 1);
    double ema50_H1 = iMA(symbol, PERIOD_H1, 50, 0, MODE_EMA, PRICE_CLOSE, 1);
    int h1Momentum = (priceH1 > ema50_H1) ? 1 : -1;

    // --- 3. Entry Trigger (M15) ---
    // Get stochastic value from the *most recently closed* bar
    double stochMain = iStochastic(symbol, PERIOD_M15, 14, 3, 3, MODE_SMA, 0, MODE_MAIN, 1);
    int m15Stoch = 0; // Neutral default
    if (stochMain < 20) m15Stoch = 1;  // Oversold
    if (stochMain > 80) m15Stoch = -1; // Overbought

    // --- Calculate Final Score ---
    // Strong Buy
    if (h4Trend == 1 && h1Momentum == 1 && m15Stoch == 1)
    {
        return 3;
    }
    // Strong Sell
    if (h4Trend == -1 && h1Momentum == -1 && m15Stoch == -1)
    {
        return -3;
    }
    
    // Otherwise, return the simple sum
    return h4Trend + h1Momentum + m15Stoch;
}


//+------------------------------------------------------------------+
//| Sends the JSON data to the web server                            |
//+------------------------------------------------------------------+
void sendDataToServer(string jsonData)
{
    string headers = "Content-Type: application/json\r\n" +
                     "X-API-Key: " + sharedSecretKey + "\r\n"; // Our secret key header
                     
    char postData[];
    char result[];
    string resultHeaders; // <-- ADD THIS LINE to store response headers
    
    // Convert string to char array for WebRequest
    int dataSize = StringToCharArray(jsonData, postData);
    
    int timeout = 5000; // 5 seconds
    
    // Reset last error
    ResetLastError();
    
    int res = WebRequest("POST", serverPostUrl, headers, timeout, postData, result, resultHeaders);
    
    if(res == -1)
    {
        Print("WebRequest Error: ", GetLastError());
    }
    else
    {
        Print("Server Response: ", CharArrayToString(result));
    }
}