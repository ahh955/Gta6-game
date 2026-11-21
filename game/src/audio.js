// Procedural audio for Solmar City 3D: a WebAudio engine hum, a siren wail
// and a radio jingle — all synthesized, no audio files to ship.
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let started = false;

  function ensure() {
    if (context) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    context = new AudioContext();
    // Engine: two detuned sawtooths through a lowpass filter.
    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(context.destination);
    engineOsc.start();
    // Siren: a sine that sweeps between two tones.
    sirenOsc = context.createOscillator();
    sirenOsc.type = 'sine';
    sirenGain = context.createGain();
    sirenGain.gain.value = 0;
    sirenOsc.connect(sirenGain).connect(context.destination);
    sirenOsc.start();
    started = true;
  }

  return {
    unlock() { ensure(); if (context && context.state === 'suspended') context.resume(); },
    setEngine(speedMph, wanted) {
      if (!started) return;
      const rpm = 50 + (speedMph / 132) * 130;
      engineOsc.frequency.setTargetAtTime(rpm, context.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(speedMph > 2 ? 0.05 : 0, context.currentTime, 0.2);
      if (wanted >= 2) {
        const t = context.currentTime;
        sirenOsc.frequency.setTargetAtTime(750 + Math.sin(t * 4) * 250, t, 0.05);
        sirenGain.gain.setTargetAtTime(0.025, t, 0.3);
      } else {
        sirenGain.gain.setTargetAtTime(0, context.currentTime, 0.3);
      }
    },
    playJingle() {
      if (!started) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, context.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + i * 0.12 + 0.4);
        osc.connect(gain).connect(context.destination);
        osc.start(context.currentTime + i * 0.12);
        osc.stop(context.currentTime + i * 0.12 + 0.45);
      });
    },
  };
}
