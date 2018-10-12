(() => {
  const mediaStreamConstraints = {
    audio: false,
    video: true,
  };
  const localVideo = document.querySelector('.videos__local');
  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(mediaStream => localVideo.srcObject = mediaStream)
    .catch(error => console.log('navigator.getUserMedia error: ', error))
})();
