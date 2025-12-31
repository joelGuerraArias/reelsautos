import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';
import path from 'path';

const API_URL = 'http://localhost:5000/api/background-music';

async function testMusic() {
    console.log("Testing Music Endpoints...");

    // 1. List Music (Initial)
    try {
        const listRes = await axios.get(API_URL);
        console.log("Initial music count:", listRes.data.length);
    } catch (e) {
        console.error("Failed to list music:", e.message);
    }

    // 2. Upload Dummy Music
    const dummyFilePath = 'dummy_music.mp3';
    fs.writeFileSync(dummyFilePath, 'dummy audio content');

    const formData = new FormData();
    formData.append('music', fs.createReadStream(dummyFilePath), {
        contentType: 'audio/mpeg',
        filename: 'dummy_music.mp3'
    });

    let uploadedId = null;
    try {
        console.log("Uploading music...");
        const uploadRes = await axios.post(API_URL, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
        console.log("Upload success:", uploadRes.status);
        uploadedId = uploadRes.data.id;
        console.log("Uploaded ID:", uploadedId);
    } catch (e) {
        console.error("Failed to upload music:", e.message);
        if (e.response) console.error(e.response.data);
    }

    // 3. List Music (After Upload)
    try {
        const listRes = await axios.get(API_URL);
        console.log("Music count after upload:", listRes.data.length);
    } catch (e) {
        console.error("Failed to list music:", e.message);
    }

    // 4. Delete Music
    if (uploadedId) {
        try {
            console.log(`Deleting music ${uploadedId}...`);
            const deleteRes = await axios.delete(`${API_URL}/${uploadedId}`);
            console.log("Delete success:", deleteRes.status);
        } catch (e) {
            console.error("Failed to delete music:", e.message);
        }
    }

    // Cleanup
    if (fs.existsSync(dummyFilePath)) {
        fs.unlinkSync(dummyFilePath);
    }
}

testMusic();
