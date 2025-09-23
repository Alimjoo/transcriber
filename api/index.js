import express from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Get Hugging Face token from environment variables
const HF_TOKEN = process.env.HF_TOKEN;
if (!HF_TOKEN) {
  console.error('Hugging Face token (HF_TOKEN) is not set in .env file');
  process.exit(1);
}

// Supported audio MIME types
const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/x-wav', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/x-m4a'];

// Configure multer to store files in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.log('Rejected file type:', file.mimetype);
            cb(new Error(`Invalid file type. Only ${ALLOWED_MIME_TYPES.join(', ')} are allowed.`));
        }
    },
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '../public')));

// Function to send request to Hugging Face API with retry
async function sendToHuggingFace(form, retries = 1) {
    try {
        const response = await axios.post(
            'https://piyazon-ug-asr-api.hf.space/transcribe',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Accept': 'application/json',
                },
                timeout: 120000, // 60-second timeout
            }
        );
        return response;
    } catch (error) {
        if (retries > 0 && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
            console.log(`Retrying Hugging Face API request (${retries} retries left)...`);
            return sendToHuggingFace(form, retries - 1);
        }
        throw error;
    }
}

// Endpoint to handle audio transcription
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    try {
        // Check if audio file is provided
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        // Validate model_id
        const modelId = req.body.model_id || 'piyazon/ASR-cv-corpus-ug-11';

        // Log file details for debugging
        console.log('Received audio file:', {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            modelId: modelId,
        });

        // Validate buffer
        if (!req.file.buffer || req.file.buffer.length === 0) {
            return res.status(400).json({ error: 'Audio file is empty or corrupted' });
        }

        // Create FormData for Hugging Face API
        const form = new FormData();
        const filename = req.file.originalname || (req.file.mimetype === 'audio/mpeg' ? 'audio.mp3' : 'audio.webm');
        form.append('audio', req.file.buffer, {
            filename: filename,
            contentType: req.file.mimetype,
        });
        form.append('model_id', modelId);
        form.append('hf_token', HF_TOKEN);

        // Send request to Hugging Face API
        const response = await sendToHuggingFace(form);

        // Log successful response
        console.log('Hugging Face API response:', {
            status: response.status,
            transcription: response.data.transcription,
        });

        // Return the transcription
        res.json({ transcription: response.data.transcription });
    } catch (error) {
        console.error('Transcription error:', {
            message: error.message,
            stack: error.stack,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data,
            } : null,
        });

        // Handle different error types
        if (error.response) {
            const errorMessage = error.response.data.detail || error.response.data.error || 'Hugging Face API error';
            res.status(error.response.status).json({ error: errorMessage });
        } else if (error.code === 'ECONNABORTED') {
            res.status(504).json({ error: 'Request to Hugging Face API timed out' });
        } else if (error.message.includes('Invalid file type')) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: `Internal server error: ${error.message}` });
        }
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

