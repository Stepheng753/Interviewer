# Agent Skill: WebSocket Proxy Debugging

This guide outlines techniques for logging, intercepting, and debugging WebSocket communication frames flowing through the BFF WebSocket Proxy between the web client and Google's Gemini Live API.

---

## 1. Frame Logging in BFF Backend

To trace messaging errors, set up conditional logging inside [index.js](file:///home/stepheng753/Development/AIU/aiu-backend/index.js).

### Setup Environment Level Logs
By using a debugging flag in the environment (`DEBUG_WS=true`), we can log the types of frames moving upstream and downstream without bloating console output with raw audio payload buffers.

```javascript
const debugWS = process.env.DEBUG_WS === 'true';

function logFrame(direction, dataString) {
  if (!debugWS) return;
  try {
    const json = JSON.parse(dataString);
    
    // Log content meta but truncate raw base64 audio data
    if (json.realtimeInput?.mediaChunks) {
      console.log(`[WS Upstream] mediaChunks: ${json.realtimeInput.mediaChunks.length} item(s)`);
    } else if (json.serverContent?.modelTurn?.parts) {
      console.log(`[WS Downstream] response frame containing audio/text`);
    } else {
      console.log(`[WS ${direction}]`, JSON.stringify(json, null, 2));
    }
  } catch (err) {
    console.log(`[WS ${direction} Raw]`, dataString.substring(0, 100) + '...');
  }
}
```

---

## 2. Common Socket Issues & Resolutions

### Issue A: Handshake Aborted (HTTP 1008 / 403)
*   **Cause**: The authentication token appended to the connection search query is invalid or expired.
*   **Resolution**: Check the token's signature, expiration date, and secret parameters. Verify the authorization logic decodes the token correctly:
    ```javascript
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const decoded = jwt.verify(token, JWT_SECRET);
    ```

### Issue B: Silent Handshakes (Upstream Gemini Failure)
*   **Cause**: Gemini Live fails to connect, or closes the connection immediately.
*   **Resolution**:
    1. Verify that your `GEMINI_API_KEY` is loaded and active in the backend `.env`.
    2. Confirm that the configuration payload sent upstream matches the API schema (e.g. check the exact string representation of `models/gemini-3.1-flash-live-preview`).
    3. Listen to `close` and `error` events on the Gemini WS client to log specific close codes:
       ```javascript
       geminiWs.on('close', (code, reason) => {
         console.error(`Gemini Live WS closed connection with code: ${code}, reason: ${reason}`);
       });
       ```

---

## 3. Chrome DevTools Network Inspection

You can inspect the frames in your browser's DevTools:
1. Open the browser's developer console (F12) on `http://localhost:5173`.
2. Navigate to the **Network** tab -> filter by **WS** (WebSockets).
3. Select the connection (e.g., `ws://localhost:3000/?token=...`).
4. Select the **Messages** sub-tab to inspect all outgoing frames containing client mic chunks and incoming frames containing system greetings in real-time.
5. If frames stop flowing, check the timeline to identify if the last packet was sent upstream or received downstream.
