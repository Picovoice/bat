let bat = null;

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
    window.WebVoiceProcessor.WebVoiceProcessor.setOptions({frameLength: bat.frameLength})
    await window.WebVoiceProcessor.WebVoiceProcessor.subscribe(bat);
    writeMessage("WebVoiceProcessor ready and listening!");
  } catch (err) {
    batErrorCallback(err);
  }
}
