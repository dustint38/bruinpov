//keep track of any currently playing audio so we can stop
let currentAudio = null;

// play audio from URL
export function playAudio(audioUrl) {
    //stop anything already playing
    stopAudio();

    currentAudio = new Audio(audioUrl);

    currentAudio.play()
        .then(() => {
            console.log('Playing audio');
        })
        .catch((err) => {
            console.error('Playback failed:', err);
        });

    //clean up when audio finishes naturally
    currentAudio.onended = function() {
        console.log('Playback finished');
        currentAudio = null;
    };

    return currentAudio;
}

//Stop whatever is currently playing
export function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
        console.log('Playback stopped');
    }
}

//Resume after pause
export function resumeAudio() {
    if (currentAudio && currentAudio.paused) {
        currentAudio.play();
        console.log('Playback resumed');
    }
}

//Check if something is currently playing
export function isPlaying() {
    return currentAudio !== null && !currentAudio.paused;
}

//Get current playback time in seconds
export function getCurrentTime() {
    return currentAudio ? currentAudio.currentTime : 0;
}

//Get total duration in seconds
export function getDuration() {
    return currentAudio ? currentAudio.duration : 0;
}

// import { playAudio, stopAudio, isPlaying } from './player.js';
// //play a memory
// playAudio(audioUrl);
// // Stop it
// stopAudio();