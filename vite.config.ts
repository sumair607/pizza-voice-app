import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  // Support both API_KEY and GEMINI_API_KEY
  const apiKey = env.API_KEY || env.GEMINI_API_KEY;
  
  if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY' && apiKey !== 'PLACEHOLDER_GEMINI_API_KEY') {
    console.log("✅ [Config] Gemini API_KEY loaded successfully.");
  } else {
    console.error("❌ [Config] Valid Gemini API_KEY NOT found. Please set API_KEY or GEMINI_API_KEY in .env file.");
  }

  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})