import 'dotenv/config';
import axios from 'axios';

async function testElevenLabs() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log("Testing API Key:", apiKey ? "Present" : "Missing");

    if (!apiKey) {
        console.error("No API key found in environment variables.");
        return;
    }

    try {
        console.log("Sending request to ElevenLabs API...");
        const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
            headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json"
            }
        });

        console.log("Success! Status:", response.status);
        console.log("Voices found:", response.data.voices?.length);
        if (response.data.voices?.length > 0) {
            console.log("First voice name:", response.data.voices[0].name);
        }
    } catch (error) {
        console.error("Error connecting to ElevenLabs:");
        if (axios.isAxiosError(error)) {
            console.error("Status:", error.response?.status);
            console.error("Data:", JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error(error);
        }
    }
}

testElevenLabs();
