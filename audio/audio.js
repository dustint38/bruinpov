let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let currentStream = null;

// Start recording from user's microphone
export async function startRecording() {
    if (isRecording) return;

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ audio: true});
        audioChunks = [];
        mediaRecorder = new MediaRecorder(currentStream);
        isRecording = true
        
        mediaRecorder.ondataavailable = function(e) {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };

        mediaRecorder.start();
        console.log('Recording started');
    } catch (err) {
        console.error('Microphone access denied:', err);
        alert('Please allow microphone access to record a memory');
    }
}

// Stop recording and return audio blob + local URL
export function stopRecording() {
    return new Promise((resolve) => {
        if(!isRecording || !mediaRecorder) {
            resolve(null);
            return;
        }

        mediaRecorder.onstop = function() {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm'});
            const audioUrl = URL.createObjectURL(audioBlob);
            isRecording = false;
            audioChunks = [];

            // Stop mic light from staying on
            currentStream.getTracks().forEach(t => t.stop());

            console.log('Recording stopped');
            resolve({ audioBlob, audioUrl });
        };

        mediaRecorder.stop();
    });
}

//Check if currently recording
export function isCurrentlyRecording() {
    return isRecording;
}

//
// import { startRecording, stopRecording } from './audio.js';
// await startRecording();
// const { audioBlob, audioUrl } = await stopRecording();
//