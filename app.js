(() => {
  const servers = {iceServers: [{url: 'stun:stun.l.google.com:19302'}]};
  let localStream;
  let pc1;
  let pc2;
  const mediaStreamConstraints = { audio: false, video: true };
  const offerOptions = { offerToReceiveAudio: 1, offerToReceiveVideo: 1 };
  const localVideo = document.querySelector('.videos__local');
  const remoteVideo = document.querySelector('.videos__remote');

  const onIceCandidate = (pc, event) => {
    if (!event.candidate) return;
    pc.addIceCandidate(event.candidate).catch(err => console.log(err));
  };

  navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
    .then(mediaStream => {
      localVideo.srcObject = mediaStream;
      localStream = mediaStream;

      pc1 = new RTCPeerConnection(servers);
      pc2 = new RTCPeerConnection(servers);
      pc1.onicecandidate = e => onIceCandidate(pc2, e);
      pc2.onicecandidate = e => onIceCandidate(pc1, e);
      pc2.ontrack = e => {
        if (remoteVideo.srcObject !== e.streams[0]) {
          remoteVideo.srcObject = e.streams[0];
        }
      };
      localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
      pc1.createOffer(offerOptions)
        .then(
          desc => {
            pc1.setLocalDescription(desc);
            pc2.setRemoteDescription(desc);
            pc2.createAnswer()
              .then(
                desc => {
                  pc2.setLocalDescription(desc);
                  pc1.setRemoteDescription(desc);
                }
              );
          }
        );
    })
    .catch(error => console.log('navigator.getUserMedia error: ', error));
})();
