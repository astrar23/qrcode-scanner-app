const qrCode = window.qrcode;

const video = document.createElement("video");
const canvasElement = document.getElementById("qr-canvas");
const canvas = canvasElement.getContext("2d");

const qrResult = document.getElementById("qr-result");
const outputData = document.getElementById("outputData");
const btnScanQR = document.getElementById("btn-scan-qr");

const qrFrame = document.getElementById("qr-frame");

const inputFocusRange = document.getElementById('focus-range-input');
const labelMinRange = document.getElementById('min-range-label');
const labelMaxRange = document.getElementById('max-range-label');
const optionFocus = document.getElementById('focus-option');
const optionSource = document.getElementById('source-option');

const btnFlip = document.getElementById("btn-flip");

const getSupportedConstraintsObj = document.getElementById("getSupportedConstraints-obj");
const getCapabilitiesObj = document.getElementById("getCapabilities-obj");
const getConstraintsObj = document.getElementById("getConstraints-obj");
const getSettingsObj = document.getElementById("getSettings-obj");

let audioSourcesSelect = document.getElementById("audio-source");
let videoSourcesSelect = document.getElementById("video-source");

let scanning = false;
let initCam = false;
let hasFocus = false;

// Create Helper to ask for permission and list devices
let MediaStreamHelper = {
    // Property of the object to store the current stream
    _stream: null,
    // This method will return the promise to list the real devices
    getDevices: function() {
        return navigator.mediaDevices.enumerateDevices();
    },
    // Request user permissions to access the camera and video
    requestStream: function() {
        if (this._stream) {
            this._stream.getTracks().forEach(track => {
                track.stop();
            });
        }

        const audioSource = audioSourcesSelect.value;
        const videoSource = videoSourcesSelect.value;
        const constraints = {
            audio: {
                deviceId: audioSource ? {exact: audioSource} : undefined
            },
            video: {
                deviceId: videoSource ? {exact: videoSource} : undefined
            }
        };
    
        return navigator.mediaDevices.getUserMedia(constraints);
    }
};

getSupportedConstraintsObj.innerHTML = JSON.stringify(navigator.mediaDevices.getSupportedConstraints(), null, 2);

qrCode.callback = res => {
  if (res) {
    outputData.innerText = res;
    scanning = false;

    video.srcObject.getTracks().forEach(track => {
      track.stop();
    });

    qrResult.hidden = false;
    btnScanQR.hidden = false;

    canvasElement.hidden = true;
    optionFocus.hidden = true;
    optionSource.hidden = true;
    btnFlip.hidden = true;
  }
};

videoSourcesSelect.onchange = function(){
  startCam();
};

audioSourcesSelect.onchange = function(){
  startCam();
};

btnScanQR.onclick = () => {
  startCam();
};

btnFlip.onclick = () => {
  var currentIndex = videoSourcesSelect.options.selectedIndex;
  if (videoSourcesSelect.options.selectedIndex + 1 >= videoSourcesSelect.length) {
    videoSourcesSelect.options.selectedIndex = 0;
  } else {
    videoSourcesSelect.options.selectedIndex++;
  }
  startCam();
};

function startCam() {
      scanning = true;

      // Request streams (audio and video), ask for permission and display streams in the video element
      MediaStreamHelper.requestStream().then(function(stream){
        console.log(stream);

        if (!initCam) {
          initCam = true;

          let track = stream.getVideoTracks()[0];
          let capabilities = track.getCapabilities();
          getCapabilitiesObj.innerHTML = JSON.stringify(capabilities, null, 2);
    
          // Check whether focus distance is supported or not.
          if (capabilities.focusDistance) {
            hasFocus = true;

            // Map focus distance to a slider element.
            inputFocusRange.min = capabilities.focusDistance.min;
            inputFocusRange.max = capabilities.focusDistance.max;
            inputFocusRange.step = capabilities.focusDistance.step;
            inputFocusRange.value = track.getSettings().focusDistance;
          
            inputFocusRange.oninput = function(event) {
              track.applyConstraints({
                advanced: [{
                  focusMode: "manual",
                  focusDistance: event.target.value
                }]
              });
            };
            labelMinRange.innerHTML = "Min: " + inputFocusRange.min;
            labelMaxRange.innerHTML = "Max: " + inputFocusRange.max;
          }
          let constraints = track.getConstraints();
          let settings = track.getSettings();
          getConstraintsObj.innerHTML = JSON.stringify(constraints, null, 2);
          getSettingsObj.innerHTML = JSON.stringify(settings, null, 2);
    
          // You can now list the devices using the Helper
          MediaStreamHelper.getDevices().then((devices) => {
            // Iterate over all the list of devices (InputDeviceInfo and MediaDeviceInfo)
            devices.forEach((device) => {
                let option = new Option();
                option.value = device.deviceId;

                // According to the type of media device
                switch(device.kind){
                    // Append device to list of Cameras
                    case "videoinput":
                        option.text = device.label || `Camera ${videoSourcesSelect.length + 1}`;
                        videoSourcesSelect.appendChild(option);
                        break;
                    // Append device to list of Microphone
                    case "audioinput":
                        option.text = device.label || `Microphone ${videoSourcesSelect.length + 1}`;
                        audioSourcesSelect.appendChild(option);
                        break;
                }

                console.log(device);
            });
          }).catch(function (e) {
              console.log(e.name + ": " + e.message);
          });
          }

        // Store Current Stream
        MediaStreamHelper._stream = stream;

        // Select the Current Streams in the list of devices
        audioSourcesSelect.selectedIndex = [...audioSourcesSelect.options].findIndex(option => option.text === stream.getAudioTracks()[0].label);
        videoSourcesSelect.selectedIndex = [...videoSourcesSelect.options].findIndex(option => option.text === stream.getVideoTracks()[0].label);

        // Play the current stream in the Video element
        video.setAttribute("playsinline", true); // required to tell iOS safari we don't want fullscreen
        video.srcObject = stream;
        video.play();
        qrResult.hidden = true;
        btnScanQR.hidden = true;

        canvasElement.hidden = false;
        optionFocus.hidden = (!hasFocus);
        optionSource.hidden = false;
        //btnFlip.hidden = (videoSourcesSelect.childElementCount <= 1);
        tick();
        scan();
  
      }).catch(function(err){
        console.error(err);
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
