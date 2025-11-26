require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;

console.log("Current API Key Info:");
console.log("- Present:", !!apiKey);
console.log(
  "- First 10 chars:",
  apiKey ? apiKey.substring(0, 10) + "..." : "N/A"
);
console.log(
  "- Last 4 chars:",
  apiKey ? "..." + apiKey.substring(apiKey.length - 4) : "N/A"
);
console.log("- Length:", apiKey ? apiKey.length : 0);
