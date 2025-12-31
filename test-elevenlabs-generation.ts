import 'dotenv/config';
import axios from 'axios';

async function testElevenLabsGeneration() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    console.log("Testing API Key for Generation...");

    if (!apiKey) {
        console.error("No API key found.");
        return;
    }

    // First get a voice ID
    let voiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel (default)
    try {
        const voicesResponse = await axios.get("https://api.elevenlabs.io/v1/voices", {
            headers: { "xi-api-key": apiKey }
        });
        if (voicesResponse.data.voices && voicesResponse.data.voices.length > 0) {
            voiceId = voicesResponse.data.voices[0].voice_id;
            console.log(`Using voice: ${voicesResponse.data.voices[0].name} (${voiceId})`);
        }
    } catch (e) {
        console.log("Could not fetch voices, using default ID");
    }

    try {
        console.log("Sending TTS request...");
        const response = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                text: "This is a test of the emergency broadcast system.",
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            },
            {
                headers: {
                    "xi-api-key": apiKey,
                    "Content-Type": "application/json",
                    "Accept": "audio/mpeg"
                },
                responseType: "arraybuffer"
            }
        );

        console.log("Success! Audio generated, size:", response.data.length);
    } catch (error) {
        console.error("Error generating audio:");
        if (axios.isAxiosError(error)) {
            console.error("Status:", error.response?.status);
            // Try to parse arraybuffer response to JSON if possible
            if (error.response?.data) {
                try {
                    const text = Buffer.from(error.response.data).toString('utf8');
                    console.error("Data:", text);
                } catch (e) {
                    console.error("Data (raw):", error.response.data);
                }
            }
        } else {
            console.error(error);
        }
    }
}

testElevenLabsGeneration();
