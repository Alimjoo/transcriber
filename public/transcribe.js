// Select DOM elements
const startRecordingButton = document.getElementById('startRecording');
const stopRecordingButton = document.getElementById('stopRecording');
const recordingStatus = document.getElementById('recordingStatus');
const transcribeForm = document.getElementById('transcribeForm');
const audioInput = document.getElementById('audio');
const resultDiv = document.getElementById('result');

let mediaRecorder = null;
let audioChunks = [];

// Function to handle microphone access and recording
startRecordingButton.addEventListener('click', async () => {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        // Start recording
        mediaRecorder.start();
        recordingStatus.textContent = 'خاتىرە قىلىنىۋاتىدۇ...';

        // Enable/disable buttons
        startRecordingButton.disabled = true;
        stopRecordingButton.disabled = false;

        // Collect audio data
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        // When recording stops
        mediaRecorder.onstop = () => {
            // Create a Blob from the audio chunks
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            
            // Create a file for the form input
            const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
            
            // Update the file input with the recorded audio
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(audioFile);
            audioInput.files = dataTransfer.files;

            // Update UI
            recordingStatus.textContent = 'خاتىرە توختىدى.';
            startRecordingButton.disabled = false;
            stopRecordingButton.disabled = true;
        };
    } catch (error) {
        console.error('مىكروفونغا ئېرىشىشتە خاتالىق كۆرۈلدى:', error);
        recordingStatus.textContent = 'مىكروفونغا ئېرىشىش مەغلۇپ بولدى.';
    }
});

// Stop recording
stopRecordingButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
});

document.getElementById('transcribeForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const resultDiv = document.getElementById('result');
    resultDiv.textContent = 'يېزىلىۋاتىدۇ...';
    resultDiv.classList.remove('error');

    try {
        const formData = new FormData();
        const audioInput = document.getElementById('audio').files[0];
        const modelId = document.getElementById('model_id').value;

        if (!audioInput) {
            resultDiv.textContent = 'ئاۋاز ھۆججىتى تاللانمىدى';
            resultDiv.classList.add('error');
            return;
        }

        formData.append('audio', audioInput);
        formData.append('model_id', modelId);

        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'يېزىش خاتالىقى يۈز بەردى');
        }

        resultDiv.textContent = data.transcription || 'تېكىست يوق';
    } catch (error) {
        resultDiv.textContent = `خاتالىق: ${error.message}`;
        resultDiv.classList.add('error');
    }
});