// Plays a short two-tone "ding" using the Web Audio API — no external audio
// file to bundle/host. Wrapped in try/catch since audio can fail silently
// (autoplay restrictions, unsupported browser); the toast + badge still show
// the notification visually either way.
export function playNotificationSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioContext()
    const now = ctx.currentTime

    const playTone = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.15, now + start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration)
    }

    playTone(880, 0, 0.12)
    playTone(1175, 0.1, 0.15)
  } catch {
    // Non-critical — the toast/badge already notify visually.
  }
}
