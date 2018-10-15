(() => {
  const servers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: "turn:test.medgreat.ru:3478",
        username: "username1",
        credential: "password1"
      }
    ]
  };
  const urlParams = new URLSearchParams(window.location.search);
  let pc;
  let localStream;
  let signalServer;

  const createRTCPeerConnection = servers => {
    const remoteVideo = document.querySelector(".videos__remote");
    const pc = new RTCPeerConnection(servers);
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      console.log("onIceCandidate", e.candidate);
      signalServer.send(
        JSON.stringify({
          type: "WEBRTC_SIGNAL",
          data: {type: "icecandidate", candidate: e.candidate},
          receiverUsername: urlParams.get("receiverUsername")
        })
      );
    };
    pc.ontrack = e => {
      console.log("ontrack");
      if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
      }
    };
    return pc;
  };

  const createOffer = (signalServer, mediaStream) => {
    const offerOptions = { offerToReceiveAudio: 1, offerToReceiveVideo: 1 };
    pc = createRTCPeerConnection(servers);
    mediaStream.getTracks().forEach(track => pc.addTrack(track, mediaStream));
    pc.createOffer(offerOptions).then(desc => {
      console.log("createOffer", desc);
      pc.setLocalDescription(desc);
      signalServer.send(
        JSON.stringify({
          type: "WEBRTC_SIGNAL",
          data: desc,
          receiverUsername: urlParams.get("receiverUsername")
        })
      );
    });
  };

  const createAnswer = (signalServer, webrtcSignal) => {
    pc = createRTCPeerConnection(servers);
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    pc.setRemoteDescription(webrtcSignal).then(() =>
      pc.createAnswer().then(desc => {
        console.log("createAnswer", desc);
        signalServer.send(
          JSON.stringify({
            type: "WEBRTC_SIGNAL",
            data: desc,
            receiverUsername: urlParams.get("receiverUsername")
          })
        );
      })
    );
  };

  const onMessage = e => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const response = JSON.parse(reader.result);
      const { receiverUsername, webrtcSignal } = response.data;
      if (receiverUsername === urlParams.get("receiverUsername")) return;
      console.log("onMessage", response);
      if (webrtcSignal.type === "offer") {
        createAnswer(e.target, webrtcSignal);
      } else if (webrtcSignal.type === "answer") {
        pc.setRemoteDescription(webrtcSignal);
      } else if (webrtcSignal.type === "icecandidate") {
        pc.addIceCandidate(new RTCIceCandidate(webrtcSignal.candidate));
      }
    };
    reader.readAsText(e.data);
  };

  Promise.all([
    new Promise(resolve => {
      const socket = new WebSocket(
        `wss://local.medgreat.ru/mapi/1/events/consultation?x-auth-token=${urlParams.get(
          "token"
        )}`
      );
      socket.onopen = () => resolve(socket);
    }),
    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
  ]).then(result => {
    const [socket, mediaStream] = result;
    signalServer = socket;
    localStream = mediaStream;
    document.querySelector(".videos__local").srcObject = mediaStream;
    socket.addEventListener("message", onMessage);
    document
      .querySelector(".start")
      .addEventListener("click", () => createOffer(socket, mediaStream));
  });
})();
