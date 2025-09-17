const startRecordingButton = document.getElementById('startRecording');
const stopRecordingButton = document.getElementById('stopRecording');
const recordingStatus = document.getElementById('recordingStatus');
const transcribeForm = document.getElementById('transcribeForm');
const audioInput = document.getElementById('audio');
const resultDiv = document.getElementById('result');

let recorder = null;
let audioContext = null;

startRecordingButton.addEventListener('click', async () => {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize AudioContext and Recorder
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        recorder = new Recorder(audioContext.createMediaStreamSource(stream));
        
        // Start recording
        recorder.record();
        recordingStatus.textContent = 'خاتىرە قىلىنىۋاتىدۇ...';
        startRecordingButton.disabled = true;
        stopRecordingButton.disabled = false;
    } catch (error) {
        console.error('مىكروفونغا ئېرىشىشتە خاتالىق كۆرۈلدى:', error);
        recordingStatus.textContent = 'مىكروفونغا ئېرىشىش مەغلۇپ بولدى.';
    }
});

stopRecordingButton.addEventListener('click', () => {
    if (recorder) {
        recorder.stop();
        recorder.exportWAV((blob) => {
            // Create a file for the form input
            const audioFile = new File([blob], 'recording.wav', { type: 'audio/wav' });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(audioFile);
            audioInput.files = dataTransfer.files;

            // Update UI
            recordingStatus.textContent = 'خاتىرە توختىدى.';
            startRecordingButton.disabled = false;
            stopRecordingButton.disabled = true;

            // Clean up
            audioContext.close();
        });
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