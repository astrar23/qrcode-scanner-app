const qrCode = window.qrcode;

const video = document.createElement("video");
const canvasElement = document.getElementById("qr-canvas");
const canvas = canvasElement.getContext("2d");

const qrResult = document.getElementById("qr-result");
const outputData = document.getElementById("outputData");
const btnScanQR = document.getElementById("btn-scan-qr");

const btnFlip = document.getElementById("btn-flip");
const qrFrame = document.getElementById("qr-frame");
const input = document.querySelector('input[type="range"]');
const errMsg = document.getElementById("error-msg");

let scanning = false;
let facingMode = "environment";

errMsg.innerHTML = JSON.stringify(navigator.mediaDevices.getSupportedConstraints(), null, 2);

qrCode.callback = res => {
  if (res) {
    outputData.innerText = res;
    scanning = false;

    video.srcObject.getTracks().forEach(track => {
      track.stop();
    });

    qrResult.hidden = false;
    canvasElement.hidden = true;
    btnScanQR.hidden = false;
    btnFlip.hidden = true;
    input.hidden = true;
  }
};

btnScanQR.onclick = () => {
  startCam();
};

btnFlip.onclick = () => {
  facingMode = (facingMode == "user")? "environment" : "user";
  startCam();
};

function startCam() {
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: facingMode } })
    .then(function(stream) {
      scanning = true;

      let track = stream.getVideoTracks()[0];
      let capabilities = track.getCapabilities();
      errMsg.innerHTML = JSON.stringify(capabilities, null, 2);

      // Check whether focus distance is supported or not.
      if (capabilities.focusDistance) {
        // Map focus distance to a slider element.
        input.min = capabilities.focusDistance.min;
        input.max = capabilities.focusDistance.max;
        input.step = capabilities.focusDistance.step;
        input.value = track.getSettings().focusDistance;
      
        input.oninput = function(event) {
          track.applyConstraints({
            advanced: [{
              focusMode: "manual",
              focusDistance: event.target.value
            }]
          });
        };
        input.hidden = false;
      }
        
      qrResult.hidden = true;
      btnScanQR.hidden = true;
      canvasElement.hidden = false;
      btnFlip.hidden = false;
      video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
      video.srcObject = stream;
      video.play();
      tick();
      scan();
    });
}

function tick() {
  canvasElement.height = video.videoHeight;
  canvasElement.width = video.videoWidth;
  canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

  var aspectDiff = canvasElement.width - canvasElement.height;
  var offset = Math.abs(aspectDiff/2);
  if (aspectDiff > 0) {
    canvas.drawImage(qrFrame, offset, 0, canvasElement.height, canvasElement.height);
  } else {
    canvas.drawImage(qrFrame, 0, offset, canvasElement.width, canvasElement.width);
  }

  scanning && requestAnimationFrame(tick);
}

function scan() {
  try {
    qrCode.decode();
  } catch (e) {
    setTimeout(scan, 300);
  }
}
