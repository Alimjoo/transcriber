let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Supported audio MIME types
const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/x-wav', 'audio/mp4', 'audio/webm;codecs=opus'];

const mimeTypes_and_extentions = [
    { mime: 'audio/mp4', extension: 'm4a' },
    { mime: 'audio/webm;codecs=opus', extension: 'webm' },
    { mime: 'audio/webm', extension: 'webm' },
    { mime: 'audio/mpeg', extension: 'mp3' },
];

function updateAudioPlayer(audioBlob) {
    const audioPlayer = document.getElementById('audioPlayer');
    const url = URL.createObjectURL(audioBlob);
    audioPlayer.src = url;
    audioPlayer.controls = true; // Ensure controls are enabled
    audioPlayer.playsinline = true; // Prevent full-screen playback on iOS
    // Optional: Clean up previous Blob URLs to avoid memory leaks
    audioPlayer.addEventListener('ended', () => URL.revokeObjectURL(url));
}

document.getElementById('audio').addEventListener('change', (event) => {
    const audioFile = event.target.files[0];
    if (audioFile && ALLOWED_MIME_TYPES.includes(audioFile.type)) {
        updateAudioPlayer(audioFile);
    }
});


document.getElementById('recordButton').addEventListener('click', async () => {
    const recordButton = document.getElementById('recordButton');
    const recordStatus = document.getElementById('recordStatus');
    const audioInput = document.getElementById('audio');

    // Find supported MIME type
    let selectedMimeType = null;
    let fileExtension = null;
    for (const { mime, extension } of mimeTypes_and_extentions) {
        if (MediaRecorder.isTypeSupported(mime)) {
            selectedMimeType = mime;
            fileExtension = extension;
            break;
        }
    }

    if (!isRecording) {
        try {
            // Check if MIME type is supported
            if (!selectedMimeType || !MediaRecorder.isTypeSupported(selectedMimeType)) {
                recordStatus.textContent = 'خاتالىق: ھېچقانداق ئاۋاز فورماتى قوللىمايدۇ';
                recordStatus.classList.add('error');
                console.error('No supported audio MIME types found.');
                return false;
            }
            console.log('selected mimeType: ', selectedMimeType);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { selectedMimeType });

            recordedChunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(recordedChunks, { type: selectedMimeType });
                const audioFile = new File([audioBlob], `ئۈنگە ئېلىنغان ئاۋاز.${fileExtension}`, { type: selectedMimeType });
                // Update the file input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(audioFile);
                const parent = audioInput.parentNode;
                const newInput = audioInput.cloneNode();
                newInput.files = dataTransfer.files;
                parent.replaceChild(newInput, audioInput);

                // Manually update the file name display
                const fileName = newInput.files.length > 0 ? newInput.files[0].name : 'No file selected';
                document.getElementById('fileName').textContent = fileName;
                // Optionally, reattach the change event listener if needed
                newInput.addEventListener('change', function () {
                    const fileName = this.files.length > 0 ? this.files[0].name : 'No file selected';
                    document.getElementById('fileName').textContent = fileName;
                });

                const audioBlob4play = new Blob(recordedChunks, { type: selectedMimeType });
                updateAudioPlayer(audioBlob4play);

                console.log('Audio file created:', {
                    name: audioFile.name,
                    type: audioFile.type,
                    size: audioFile.size,
                    lastModified: audioFile.lastModified,
                });

                // Stop all tracks to free the microphone
                stream.getTracks().forEach(track => track.stop());

                recordButton.classList.remove('recording');
                recordStatus.textContent = 'خاتىرە قىلىش تاماملاندى';
                recordButton.textContent = 'مىكروفوندىن خاتىرە قىلىش';
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

    const submitButton = document.querySelector('#transcribeForm button[type="submit"]');
    const resultDiv = document.getElementById('result');

    // Disable the button and apply gray style
    submitButton.disabled = true;
    submitButton.classList.add('disabled');

    resultDiv.textContent = 'يېزىلىۋاتىدۇ...';
    resultDiv.classList.remove('error');

    const debuggerP = document.getElementById('debugger');

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

        if (audioInput.size > 4.5 * 1024 * 1024) {
            resultDiv.textContent = 'خاتالىق: ھۆججەت چوڭلۇقى 4.5MB دىن ئېشىپ كەتتى';
            resultDiv.classList.add('error');
            return;
        }


        console.log('Submitting file:', {
            name: audioInput.name,
            type: audioInput.type,
            size: audioInput.size,
            modelId: modelId,
        });

        debuggerP.textContent = `Submitting file: 
            name: ${audioInput.name}
            type: ${audioInput.type}
            size: ${audioInput.size}
            modelId: ${modelId}
            `;

        formData.append('audio', audioInput);
        formData.append('model_id', modelId);

        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData,
        });

        debuggerP.textContent = `Response: 
           status: ${response.status} 
           statusText: ${response.statusText} 
           heaer: ${[...response.headers.entries()]}
            `;


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
    } finally {
        // Re-enable the button and restore original style
        submitButton.disabled = false;
        submitButton.classList.remove('disabled');
    }
});



document.getElementById('audio').addEventListener('change', function () {
    const fileName = this.files.length > 0 ? this.files[0].name : 'No file selected';
    document.getElementById('fileName').textContent = fileName;
});
