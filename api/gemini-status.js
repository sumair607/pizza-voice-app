// Simple serverless endpoint to check whether a server-side Gemini key is configured
module.exports = (req, res) => {
  const present = !!process.env.GEMINI_API_KEY;
  res.status(200).json({ present });
};
