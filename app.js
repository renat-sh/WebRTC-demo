(() => {
  const servers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      {
        "urls": [
          "turn:64.233.161.127:19305?transport=udp",
          "turn:[2a00:1450:4010:c01::7f]:19305?transport=udp",
          "turn:64.233.161.127:19305?transport=tcp",
          "turn:[2a00:1450:4010:c01::7f]:19305?transport=tcp"
        ],
        "username": "CIvklt4FEgaszwDBVE8Yzc/s6OMTIICjBQ",
        "credential": "rusm3Cy1+ujYSILxsB3I4jIxUYw=",
        "maxRateKbps": "8000"
      }
    ]
  };

  const urlParams = new URLSearchParams(window.location.search);
  let pcg;
  let localStream;
  let signalServer;

  const createRTCPeerConnection = servers => {
    const remoteVideo = document.querySelector(".videos__remote");
    const pcl = new RTCPeerConnection(servers);
    pcl.onicecandidate = e => {
      console.log("onIceCandidate", e.candidate);
      if (!e.candidate) return;
      signalServer.send(
        JSON.stringify({
          type: "WEBRTC_SIGNAL",
          data: {
            receiverUsername: urlParams.get("receiverUsername"),
            signal: {type: "icecandidate", candidate: e.candidate}
          }
        })
      );
    };
    pcl.ontrack = e => {
      console.log("ontrack");
      if (remoteVideo.srcObject !== e.streams[0]) {
        remoteVideo.srcObject = e.streams[0];
      }
    };
    return pcl;
  };

  const createOffer = (signalServer, mediaStream) => {
    const offerOptions = { offerToReceiveAudio: 1, offerToReceiveVideo: 1 };
    pcg = createRTCPeerConnection(servers);
    mediaStream.getTracks().forEach(track => pcg.addTrack(track, mediaStream));
    let signal;
    pcg.createOffer(offerOptions).then(offer => {
      console.log("createOffer", offer);
      signal = offer;
      return pcg.setLocalDescription(offer);
    }).then(() => {
      signalServer.send(
        JSON.stringify({
          type: "WEBRTC_SIGNAL",
          data: {
            receiverUsername: urlParams.get("receiverUsername"),
            signal: signal
          }
        })
      );
    })
    .catch(err => console.log(err));
  };

  const createAnswer = (signalServer, webrtcSignal) => {
    pcg = createRTCPeerConnection(servers);
    localStream.getTracks().forEach(track => pcg.addTrack(track, localStream));
    let signal;
    pcg.setRemoteDescription(new RTCSessionDescription(webrtcSignal)).then(() => {
      return pcg.createAnswer();
    })
    .then(answer => {
      console.log("createAnswer", answer);
      signal = answer;
      pcg.setLocalDescription(answer);
    })
    .then(() => {
      signalServer.send(
        JSON.stringify({
          type: "WEBRTC_SIGNAL",
          data: {
            receiverUsername: urlParams.get("receiverUsername"),
            signal: signal
          }
        })
      );
    })
  };

  const onMessage = e => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const response = JSON.parse(reader.result);
      const { receiverUsername, signal } = response.data;
      if (receiverUsername === urlParams.get("receiverUsername")) return;
      console.log("onMessage", response);
      if (signal.type === "offer") {
        createAnswer(e.target, signal);
      } else if (signal.type === "answer") {
        pcg.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === "icecandidate") {
        pcg.addIceCandidate(new RTCIceCandidate(signal.candidate));
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
