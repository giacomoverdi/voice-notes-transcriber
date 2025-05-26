export const audioFormats = {
    'audio/mpeg': { ext: '.mp3', name: 'MP3' },
    'audio/mp3': { ext: '.mp3', name: 'MP3' },
    'audio/wav': { ext: '.wav', name: 'WAV' },
    'audio/x-wav': { ext: '.wav', name: 'WAV' },
    'audio/mp4': { ext: '.m4a', name: 'M4A' },
    'audio/x-m4a': { ext: '.m4a', name: 'M4A' },
    'audio/ogg': { ext: '.ogg', name: 'OGG' },
    'audio/webm': { ext: '.webm', name: 'WebM' },
    'audio/flac': { ext: '.flac', name: 'FLAC' }
  };
  
  export const isAudioFile = (mimeType) => {
    return Object.keys(audioFormats).includes(mimeType?.toLowerCase());
  };
  
  export const getAudioFormat = (mimeType) => {
    return audioFormats[mimeType?.toLowerCase()] || { ext: '', name: 'Unknown' };
  };
  
  export const createAudioContext = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    return new AudioContext();
  };
  
  export const loadAudioBuffer = async (url, audioContext) => {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
  };
  
  export const getAudioDuration = (audioBuffer) => {
    return audioBuffer.duration;
  };
  
  export const downloadAudio = (url, filename) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  export default {
    audioFormats,
    isAudioFile,
    getAudioFormat,
    createAudioContext,
    loadAudioBuffer,
    getAudioDuration,
    downloadAudio
  };