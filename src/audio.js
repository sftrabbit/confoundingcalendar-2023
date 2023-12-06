class Audio {
  constructor (audioContext, audio) {
    this.audioContext = audioContext
    this.audio = audio

    this.gainNode = audioContext.createGain()
    this.gainNode.gain.setValueAtTime(1, audioContext.currentTime)
    this.gainNode.connect(audioContext.destination)
  }

  resume () {
    this.audioContext.resume()
  }

  playSound (audioName) {
    console.log('playing', audioName)
    const source = this.audioContext.createBufferSource()
    source.buffer = this.audio[audioName]
    source.connect(this.gainNode)
    source.start()
  }
}

export async function initAudio () {
  const audioContext = new AudioContext();

  const [jumpAudio, pushAudio, blockFallAudio, growAudio, emergeAudio, playerFallAudio, squishAudio, enterAudio, endAudio, ohnoAudio, wrongroomAudio] = await Promise.all([
    loadAudio(audioContext, 'jump.wav'),
    loadAudio(audioContext, 'push.wav'),
    loadAudio(audioContext, 'blockfall.wav'),
    loadAudio(audioContext, 'grow.wav'),
    loadAudio(audioContext, 'emerge.wav'),
    loadAudio(audioContext, 'playerFall.wav'),
    loadAudio(audioContext, 'squish.wav'),
    loadAudio(audioContext, 'enter.wav'),
    loadAudio(audioContext, 'end.wav'),
    loadAudio(audioContext, 'ohno.wav'),
    loadAudio(audioContext, 'wrongroom.wav')
  ])

  return new Audio(audioContext, {
    'jump': jumpAudio,
    'push': pushAudio,
    'blockFall': blockFallAudio,
    'grow': growAudio,
    'emerge': emergeAudio,
    'playerFall': playerFallAudio,
    'squish': squishAudio,
    'enter': enterAudio,
    'end': endAudio,
    'ohno': ohnoAudio,
    'wrongroom': wrongroomAudio
  })
}

async function loadAudio(audioContext, url) {
  const response = await fetch(url)
  const buffer = await audioContext.decodeAudioData(await response.arrayBuffer())
  return buffer
}