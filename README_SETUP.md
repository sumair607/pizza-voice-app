# Pizza Voice App Setup Guide

## 🚨 IMPORTANT: Bot Not Working? Follow These Steps

### 1. Get Your Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the API key (starts with `AIza...`)

### 2. Configure Environment Variables
Replace the placeholder in your `.env.local` file:

```
API_KEY=your_actual_gemini_api_key_here
```

**⚠️ DO NOT use the Firebase API key for Gemini API calls!**

### 3. Install Dependencies & Run
```bash
npm install
npm run dev
```

### 4. Test the Bot
1. Click "Start Ordering"
2. If you see "Valid Gemini API Key is missing" - your API key is not set correctly
3. If the bot connects but doesn't respond - check browser console for errors

### Common Issues:
- **Bot doesn't respond**: Wrong API key or network issues
- **"API Key missing"**: Environment variable not loaded
- **Connection fails**: Check internet connection and API key validity

### Environment Files:
- `.env.local` - For local development (recommended)
- `.env` - Alternative location

Both files support `API_KEY` or `GEMINI_API_KEY` variable names.