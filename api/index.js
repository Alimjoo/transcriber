// new version with google
import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import FormData from 'form-data';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));



// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Endpoint to handle POST request for audio transcription
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    // Check if audio file is provided
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Validate model_id
    const modelId = req.body.model_id || 'piyazon/ASR-cv-corpus-ug-11';
    const validModels = [
      'piyazon/ASR-cv-corpus-ug-11',
      'piyazon/ASR-cv-corpus-ug-10',
      'piyazon/ASR-cv-corpus-ug-9',
      'piyazon/ASR-cv-corpus-ug-8',
      'piyazon/ASR-cv-corpus-ug-7',
    ];
    if (!validModels.includes(modelId)) {
      return res.status(400).json({ error: `Invalid model_id. Choose from: ${validModels.join(', ')}` });
    }

    // Read the uploaded audio file
    const audioPath = req.file.path;
    const audioBuffer = await fs.readFile(audioPath);

    // Create FormData for the request to Hugging Face API
    const form = new FormData();
    form.append('audio', audioBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append('model_id', modelId);

    // Send request to Hugging Face API
    const response = await axios.post(
      'https://piyazon-ug-asr-api.hf.space/transcribe',
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );

    // Clean up the uploaded file
    await fs.unlink(audioPath);

    // Return the transcription
    res.json({ transcription: response.data.transcription });
  } catch (error) {
    console.error('Error:', error.message);
    // Clean up file in case of error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error cleaning up file:', unlinkError.message);
      }
    }
    // Handle different error types
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data.detail || 'Hugging Face API error' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});




// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});


