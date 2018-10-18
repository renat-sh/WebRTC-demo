(() => {
  const servers = null;
  const localVideo = document.querySelector(".videos__local");
  const remoteVideo = document.querySelector(".videos__remote");

  navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then(stream => {
      localVideo.srcObject = stream;

      const pc1 = new RTCPeerConnection(servers);
      const pc2 = new RTCPeerConnection(servers);

      pc1.onicecandidate = e => {
        console.log('pc1', e.candidate);
        if (e.candidate) pc2.addIceCandidate(e.candidate);
      };
      pc2.onicecandidate = e => {
        console.log('pc2', e.candidate);
        if (e.candidate) pc1.addIceCandidate(e.candidate);
      };

      pc1.addStream(stream);
      pc2.onaddstream = e => {
        remoteVideo.srcObject = e.stream;
      };

      pc1
        .createOffer({ offerToReceiveAudio: 1, offerToReceiveVideo: 1 })
        .then(offer => {
          pc1.setLocalDescription(offer);
          pc2.setRemoteDescription(offer);
          pc2.createAnswer().then(offer => {
            pc2.setLocalDescription(offer);
            pc1.setRemoteDescription(offer);
          });
        });
    });
})();
