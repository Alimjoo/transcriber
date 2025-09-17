
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