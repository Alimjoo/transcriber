let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// Supported audio MIME types
const ALLOWED_MIME_TYPES = ['audio/wav', 'audio/mpeg', 'audio/webm', 'audio/x-wav', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/x-m4a'];

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
    // audioPlayer.addEventListener('ended', () => URL.revokeObjectURL(url));
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
                const fileName = newInput.files.length > 0 ? newInput.files[0].name : 'ھۆججەت تاللانمىدى';
                document.getElementById('fileName').textContent = fileName;
                // Optionally, reattach the change event listener if needed
                newInput.addEventListener('change', function () {
                    const fileName = this.files.length > 0 ? this.files[0].name : 'ھۆججەت تاللانمىدى';
                    document.getElementById('fileName').textContent = fileName;
                });
                document.getElementById('audio').addEventListener('change', (event) => {
                    const audioFile = event.target.files[0];
                    if (audioFile && ALLOWED_MIME_TYPES.includes(audioFile.type)) {
                        updateAudioPlayer(audioFile);
                    }
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
        console.log('input audio type: ', audioInput.type);
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
        // // Check audio duration
        // const audioDuration = await new Promise((resolve, reject) => {
        //     const audio = new Audio(URL.createObjectURL(audioInput));
        //     audio.addEventListener('loadedmetadata', () => {
        //         URL.revokeObjectURL(audio.src); // Clean up
        //         resolve(audio.duration);
        //     });
        //     audio.addEventListener('error', () => {
        //         URL.revokeObjectURL(audio.src); // Clean up
        //         reject(new Error('ئاۋاز ھۆججىتىنىڭ ئۇزۇنلۇقىنى تەكشۈرۈشتە خاتالىق كۆرۈلدى'));
        //     });
        // });

        const audioDuration = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const arrayBuffer = e.target.result;
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)(); // Web Audio API

                try {
                    // Decode audio data - this is more reliable on Android as it fully processes the buffer
                    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                    const duration = audioBuffer.duration;

                    if (isFinite(duration) && duration > 0) {
                        resolve(duration);
                    } else {
                        throw new Error('Invalid duration from decode');
                    }
                } catch (decodeErr) {
                    console.warn('Web Audio decode failed (common on Android for this format):', decodeErr);

                    // Fallback 1: Try music-metadata-browser for header parsing (handles MP3, OGG, WAV, AAC better)
                    // if (typeof parseBlob !== 'undefined') {
                    //     try {
                    //         const metadata = await parseBlob(audioInput);
                    //         resolve(metadata.format.duration || 0);
                    //     } catch (metaErr) {
                    //         reject(metaErr);
                    //     }
                    // } else {
                    // Fallback 2: Original <audio> method, but preload more aggressively
                    const audio = new Audio(URL.createObjectURL(audioInput));
                    audio.preload = 'metadata'; // Force metadata load
                    audio.volume = 0; // Silent
                    audio.play().then(() => audio.pause()).catch(() => { }); // Trigger load via play attempt

                    audio.addEventListener('loadedmetadata', () => {
                        URL.revokeObjectURL(audio.src);
                        resolve(audio.duration);
                    });
                    audio.addEventListener('error', (err) => {
                        URL.revokeObjectURL(audio.src);
                        reject(err);
                    });

                    // Timeout to avoid hanging
                    setTimeout(() => reject(new Error('Timeout loading metadata')), 10000);
                    // }
                } finally {
                    audioCtx.close();
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(audioInput); // Read full file for decoding
        });

        if (audioDuration > 60) { // 60 seconds = 1 minute
            resultDiv.textContent = 'خاتالىق: ئاۋاز ئۇزۇنلۇقى 1 مىنۇتتىن ئېشىپ كەتتى';
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

        // resultDiv.textContent = data.transcription || 'تېكىست يوق';
        // Check if word_details exists and is non-empty
        if (data.word_details && Array.isArray(data.word_details) && data.word_details.length > 0) {
            // Map each word to a <span> with color based on confidence
            const htmlContent = data.word_details
                .map(detail => {
                    const confidence = detail.confidence;
                    let color;
                    // More detailed color thresholds
                    if (confidence >= 0.95) {
                        color = '#006400'; // Dark Green for very high confidence
                    } else if (confidence >= 0.90) {
                        color = '#00FF00'; // Light Green for high confidence
                    } else if (confidence >= 0.80) {
                        color = '#FFA500'; // Orange for moderate confidence
                    } else if (confidence >= 0.60) {
                        color = '#FF4040'; // Light Red for low confidence
                    } else {
                        color = '#8B0000'; // Dark Red for very low confidence
                    }
                    // Return a span with the word and its color
                    return `<span style="color: ${color}; margin-right: 5px;">${detail.word}</span>`;
                })
                .join(' '); // Join words with spaces

            // Set innerHTML to render styled words
            resultDiv.innerHTML = htmlContent;
        } else {
            // Fallback if no word_details or empty
            resultDiv.textContent = 'تېكىست يوق';
        }

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
    const fileName = this.files.length > 0 ? this.files[0].name : 'ھۆججەت تاللانمىدى';
    document.getElementById('fileName').textContent = fileName;
});
