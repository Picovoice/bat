let bat = null;

const frameLengthSeconds = 0.75
var pcmBuffer = new Int16Array();

const pcmBufferEngine = {
  onmessage: function(e) {
    switch (e.data.command) {
        case 'process':
            var tempPcmBuffer = new Int16Array(pcmBuffer.length + e.data.inputFrame.length);
            tempPcmBuffer.set(pcmBuffer);
            tempPcmBuffer.set(e.data.inputFrame, pcmBuffer.length);
            pcmBuffer = tempPcmBuffer

            if (pcmBuffer.length >= bat.frameLength) {
              bat.process(pcmBuffer.slice(0, bat.frameLength));
              pcmBuffer = pcmBuffer.slice(bat.frameLength)
            }
            break;
    }
  }
}

function writeMessage(message) {
  console.log(message);
  document.getElementById("status").innerHTML = message;
}

function batErrorCallback(error) {
  writeMessage(error);
}

function batScoresCallback(scores) {
  const resultsElement = document.getElementById("result");
  resultsElement.innerHTML = "";

  Object.keys(BatWeb.BatLanguages).filter(key => isNaN(Number(key))).forEach(language => {
    const score = scores !== null ? scores[BatWeb.batLanguageFromString(`${language}`)] : 0.0;
    resultsElement.innerHTML += `<p><progress max="1" value="${score}"></progress>: ${language}</p>`;
  });

  if (scores === null) {
    resultsElement.innerHTML += "<p>(no voice detected)</p>";
  }
}

async function startBat(accessKey) {
  writeMessage("Bat is loading. Please wait...");
  batScoresCallback(null);
  try {
    bat = await BatWeb.BatWorker.create(
      accessKey,
      batScoresCallback,
      batModel
    );

    writeMessage("Bat worker ready!");

    writeMessage(
      "WebVoiceProcessor initializing. Microphone permissions requested ...",
    );
    window.WebVoiceProcessor.WebVoiceProcessor.setOptions({frameLength: Math.floor(frameLengthSeconds * bat.sampleRate)})
    await window.WebVoiceProcessor.WebVoiceProcessor.subscribe(pcmBufferEngine);
    writeMessage("WebVoiceProcessor ready and listening!");
  } catch (err) {
    batErrorCallback(err);
  }
}
