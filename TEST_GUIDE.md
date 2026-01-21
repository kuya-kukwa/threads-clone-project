# Quick Test Guide

## Test URLs
- Feed: http://localhost:3001/feed
- Register: http://localhost:3001/register
- Login: http://localhost:3001/login

## Mobile Testing (Network Access)

### Step 1: Find Your Local IP
```powershell
ipconfig | Select-String "IPv4"
```

### Step 2: Access from Mobile
Replace `localhost` with your IP address:
- http://YOUR_IP:3001/feed
- http://YOUR_IP:3001/register

Example: http://192.168.1.100:3001/feed

## Test Scenarios

### ✅ Scenario 1: Feed Loading
1. Open http://localhost:3001/feed
2. **Expected:** Feed loads without 500 error
3. **Check console:** No "Failed to load resource" errors

### ✅ Scenario 2: Text-Only Thread
1. Log in if needed
2. Type text in composer
3. Click Post
4. **Expected:** Thread appears in feed immediately
5. **Check:** No rate limiting errors

### ✅ Scenario 3: Thread with Image
1. Click image upload button
2. Select jpg/png/webp (under 5MB)
3. Type text content
4. Add alt text (optional)
5. Click Post
6. **Expected:** Image uploads without 400 error, thread created
7. **Check:** Image displays in feed

### ✅ Scenario 4: Mobile Registration
1. Access http://YOUR_IP:3001/register from mobile
2. Fill registration form
3. Submit
4. **Expected:** Auto-login and redirect to /feed
5. **Check:** No "failed to fetch" errors

### ✅ Scenario 5: Cross-Device Session
1. Register on mobile
2. Open laptop browser
3. Login with same credentials
4. **Expected:** Access to feed works on both devices

## Common Issues & Solutions

### Issue: 500 Error on Feed
- **Check:** Server logs for query errors
- **Fix:** Verify database collection exists with correct attributes

### Issue: 400 Error on Image Upload
- **Check:** File size (max 5MB) and type (jpg/png/webp/gif)
- **Fix:** Ensure storage bucket permissions allow user uploads

### Issue: "Failed to fetch" on Mobile
- **Check:** Firewall blocking port 3001
- **Check:** Mobile on same Wi-Fi network
- **Fix:** Add firewall rule or use mobile hotspot

### Issue: No Redirect After Registration
- **Check:** Browser console for errors
- **Check:** Network tab shows 200 response from /api/auth/login
- **Fix:** Clear cookies and try again

## Server Logs to Monitor

Watch terminal for these log messages:
- `✓ Compiled successfully` - Server ready
- `INFO: Fetching public feed` - Feed request received
- `INFO: Image uploaded successfully` - Image upload worked
- `INFO: Thread created successfully` - Thread creation worked
- `INFO: User logged in successfully` - Login worked

## Stopping the Server

Press `Ctrl+C` in terminal or run:
```powershell
Get-Process | Where-Object {$_.ProcessName -eq 'node'} | Stop-Process -Force
```
