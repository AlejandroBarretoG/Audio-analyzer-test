/**
 * Extracts audio from a video file and converts it to a base64 PCM/WAV string
 * suitable for Gemini API consumption.
 */
export const extractAudioFromVideo = async (videoFile: File): Promise<string> => {
  // 1. Read file as ArrayBuffer
  const arrayBuffer = await videoFile.arrayBuffer();
  
  // 2. Decode audio data using OfflineAudioContext (faster than real-time)
  // We use a dummy rate first to decode, then we'll resample if needed.
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // 3. Process to Mono and Lower Sample Rate (16kHz is good for speech/AI) to save tokens
  const targetSampleRate = 16000;
  const offlineCtx = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
  
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start();
  
  const renderedBuffer = await offlineCtx.startRendering();

  // 4. Convert AudioBuffer to WAV Blob -> Base64
  const wavBlob = bufferToWav(renderedBuffer);
  return blobToBase64(wavBlob);
};

// Helper: Convert AudioBuffer to WAV format
function bufferToWav(abuffer: AudioBuffer) {
  const numOfChan = abuffer.numberOfChannels;
  const length = abuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  // write WAVE header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this writer)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // write interleaved data
  for (i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while (pos < abuffer.length) {
    for (i = 0; i < numOfChan; i++) {
      // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(44 + offset, sample, true); // write 16-bit sample
      offset += 2;
    }
    pos++;
  }

  return new Blob([buffer], { type: "audio/wav" });

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}

// Helper: Blob to Base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const content = base64data.split(',')[1];
      resolve(content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}