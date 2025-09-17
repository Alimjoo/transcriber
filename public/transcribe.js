let mediaRecorder;
let audioChunks = [];
let audioInput = null;

const startRecordingButton = document.getElementById('startRecording');
const stopRecordingButton = document.getElementById('stopRecording');
const recordingStatus = document.getElementById('recordingStatus');
const audioInputElement = document.getElementById('audio');
const transcribeForm = document.getElementById('transcribeForm');
const resultDiv = document.getElementById('result');

startRecordingButton.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const dest = audioContext.createMediaStreamDestination();

        // Connect to ensure audio is processed
        source.connect(dest);
        const mimeType = MediaRecorder.isTypeSupported('audio/mp3') ? 'audio/mp3' : 'audio/wav';
        mediaRecorder = new MediaRecorder(dest.stream, { mimeType });
        audioChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            console.log('Recorded mimeType:', mimeType, 'Blob size:', audioBlob.size, 'bytes');

            // Debug: Download to verify
            const url = URL.createObjectURL(audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recorded_audio.${mimeType === 'audio/mp3' ? 'mp3' : 'wav'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            audioInput = new File([audioBlob], `recorded_audio.${mimeType === 'audio/mp3' ? 'mp3' : 'wav'}`, { type: mimeType });
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(audioInput);
            audioInputElement.files = dataTransfer.files;
            recordingStatus.textContent = 'خاتىرە تاماملاندى، يېزىشقا تەييار.';
        };

        mediaRecorder.start();
        startRecordingButton.disabled = true;
        stopRecordingButton.disabled = false;
        recordingStatus.textContent = 'خاتىرە قىلىۋاتىدۇ...';
    } catch (error) {
        recordingStatus.textContent = `مايكىرودىغا زىيارەت خاتالىقى: ${error.message}`;
        resultDiv.textContent = `خاتالىق: ${error.message}`;
        resultDiv.classList.add('error');
    }
});

stopRecordingButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;
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