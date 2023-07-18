const express = require('express');

const server = express()
  .use((req, res) => res.sendFile('/home.html', { root: __dirname }))
  .listen(8080, () => console.log(`Listening on ${8080}`));

const { Server } = require('ws');

const ws_server = new Server({ server });

//Include Azure Speech service 
const sdk = require('microsoft-cognitiveservices-speech-sdk')
const subscriptionKey = 'e80f77176d1349709e6d237bbe3d476d'
const serviceRegion = 'uksouth'

// Hard code the variables 
//const variables = require("./config/variables")
const language = "en-GB"

const azurePusher = sdk.AudioInputStream.createPushStream(sdk.AudioStreamFormat.getWaveFormatPCM(8000, 16, 1))
const audioConfig = sdk.AudioConfig.fromStreamInput(azurePusher);
const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

speechConfig.speechRecognitionLanguage = language;
speechConfig.enableDictation();
const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

recognizer.recognizing = (s, e) => {
  console.log(`RECOGNIZING: Text=${e.result.text}`);
};

recognizer.recognized = (s, e) => {
  if (e.result.reason == sdk.ResultReason.RecognizedSpeech) {
      console.log(`RECOGNIZED: Text=${e.result.text}`);
  }
  else if (e.result.reason == sdk.ResultReason.NoMatch) {
      console.log("NOMATCH: Speech could not be recognized.");
  }
};

recognizer.canceled = (s, e) => {
  console.log(`CANCELED: Reason=${e.reason}`);

  if (e.reason == sdk.CancellationReason.Error) {
      console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
      console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
      console.log("CANCELED: Did you update the key and location/region info?");
  }

  recognizer.stopContinuousRecognitionAsync();
};

recognizer.sessionStopped = (s, e) => {
  console.log("\nSession stopped event.");
  recognizer.stopContinuousRecognitionAsync();
};

recognizer.startContinuousRecognitionAsync(() => {
  console.log("Continuous Reco Started");
},
  err => {
      console.trace("err - " + err);
      recognizer.close();
      recognizer = undefined;
  });

ws_server.on('connection', (ws) => {
  console.log('New client connected!');
   ws.on('message', function incoming(message) {
    const msg = JSON.parse(message);
    switch (msg.event) {
      case 'connected':
        break;
      case 'start':
        console.log(`Starting Media Stream ${msg.streamSid}`);
        
        break;
      case 'media':
        var streampayload = base64.decode(msg.media.payload)
        var data = Buffer.from(streampayload)
        var pcmdata = Buffer.from(alawmulaw.mulaw.decode(data))
        //console.log(msg.mediaFormat.encoding)

        // process.stdout.write(msg.media.payload + " " + " bytes\033[0G");
        // streampayload = base64.decode(msg.media.payload, 'base64');
        // let data = Buffer.from(streampayload);
        azurePusher.write(pcmdata)
        break;
      case 'stop':
        console.log(`Call Has Ended`);
        azurePusher.close()
        recognizer.stopContinuousRecognitionAsync()
        break;
    }
  ws.on('close', () => console.log('Client has disconnected!'));
});


setInterval(() => {
  ws_server.clients.forEach((client) => {
    client.send(new Date().toTimeString());
  });
}, 1000);


