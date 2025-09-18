let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Supported audio MIME types
const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/x-wav'];

function updateAudioPlayer(audioBlob) {
    const audioPlayer = document.getElementById('audioPlayer');
    const playButton = document.getElementById('playButton');
    const url = URL.createObjectURL(audioBlob);
    audioPlayer.src = url;
    playButton.disabled = false;
}

document.getElementById('audio').addEventListener('change', (event) => {
    const audioFile = event.target.files[0];
    if (audioFile && ALLOWED_MIME_TYPES.includes(audioFile.type)) {
        updateAudioPlayer(audioFile);
    }
});

document.getElementById('playButton').addEventListener('click', () => {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.play();
});

document.getElementById('recordButton').addEventListener('click', async () => {
    const recordButton = document.getElementById('recordButton');
    const recordStatus = document.getElementById('recordStatus');
    const audioInput = document.getElementById('audio');

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const supportedMimeType = ALLOWED_MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/mpeg';
            mediaRecorder = new MediaRecorder(stream, { mimeType: supportedMimeType });
            // mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            recordedChunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                // updateAudioPlayer(audioBlob);
                const audioFile = new File([audioBlob], 'ئاۋاز.webm', { type: 'audio/webm' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(audioFile);
                audioInput.files = dataTransfer.files;

                console.log('Audio file created:', {
                    name: audioFile.name,
                    type: audioFile.type,
                    size: audioFile.size,
                    lastModified: audioFile.lastModified,
                });

                // Temporary download link for debugging
                const url = URL.createObjectURL(audioBlob);
                console.log('Download recording for inspection:', url);
                recordButton.classList.remove('recording');
                recordStatus.textContent = 'خاتىرە قىلىش تاماملاندى';
                recordButton.textContent = 'مايكىرودىن خاتىرە قىلىش';
                isRecording = false;
            };

            mediaRecorder.start();
            recordButton.classList.add('recording');
            recordStatus.textContent = 'خاتىرىلەۋاتىدۇ...';
            recordButton.textContent = 'خاتىرە قىلىشنى توختىتىش';
            isRecording = true;
        } catch (error) {
            recordButton.classList.remove('recording');
            recordStatus.textContent = `خاتالىق: ${error.message}`;
            recordStatus.classList.add('error');
        }
    } else {
        mediaRecorder.stop();
        recordButton.classList.remove('recording');
        recordStatus.textContent = 'خاتىرە توختىتىلدى';
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

        // Validate audio file
        if (!audioInput) {
            resultDiv.textContent = 'ئاۋاز ھۆججىتى تاللانمىدى ياكى خاتىرە قىلىنمىدى';
            resultDiv.classList.add('error');
            return;
        }

        if (!ALLOWED_MIME_TYPES.includes(audioInput.type)) {
            resultDiv.textContent = `خاتالىق: يول قويۇلغان ھۆججەت تىپلىرى: ${ALLOWED_MIME_TYPES.join(', ')}`;
            resultDiv.classList.add('error');
            return;
        }

        if (audioInput.size > 10 * 1024 * 1024) {
            resultDiv.textContent = 'خاتالىق: ھۆججەت چوڭلۇقى 10MB دىن ئېشىپ كەتتى';
            resultDiv.classList.add('error');
            return;
        }


        console.log('Submitting file:', {
            name: audioInput.name,
            type: audioInput.type,
            size: audioInput.size,
            modelId: modelId,
        });

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

        console.log('Transcription response:', data);

        resultDiv.textContent = data.transcription || 'تېكىست يوق';
    } catch (error) {
        console.error('Transcription error:', {
            message: error.message,
            stack: error.stack,
        });
        resultDiv.textContent = `خاتالىق: ${error.message}`;
        resultDiv.classList.add('error');
    }
});

