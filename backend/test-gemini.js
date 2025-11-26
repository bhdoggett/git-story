const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log("Testing Gemini API with gemini-2.5-flash...");
  console.log("API Key present:", !!apiKey);

  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    process.exit(1);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    console.log("\nSending test request...");
    const result = await model.generateContent("Say hello in one word");
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini API is working!");
    console.log("Response:", text);
    console.log("\n✅ Your backend should now work correctly!");
  } catch (error) {
    console.error("\n❌ Test failed");
    console.error("Error:", error.message);
    process.exit(1);
  }
}

testGemini();
