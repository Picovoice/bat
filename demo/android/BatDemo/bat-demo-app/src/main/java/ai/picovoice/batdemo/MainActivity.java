/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.batdemo;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.text.method.ScrollingMovementMethod;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.ToggleButton;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import ai.picovoice.android.voiceprocessor.VoiceProcessor;
import ai.picovoice.android.voiceprocessor.VoiceProcessorException;
import ai.picovoice.bat.Bat;
import ai.picovoice.bat.BatActivationException;
import ai.picovoice.bat.BatActivationLimitException;
import ai.picovoice.bat.BatActivationRefusedException;
import ai.picovoice.bat.BatActivationThrottledException;
import ai.picovoice.bat.BatException;
import ai.picovoice.bat.BatInvalidArgumentException;
import ai.picovoice.bat.BatLanguages;

public class MainActivity extends AppCompatActivity {
    private static final String ACCESS_KEY = "${YOUR_ACCESS_KEY_HERE}";

    private final float voiceProcessorFrameLengthSecs = 0.75f;
    private final ArrayList<Short> pcmBuffer = new ArrayList<>();
    private final VoiceProcessor voiceProcessor = VoiceProcessor.getInstance();

    public Bat bat;

    LinearLayout scoresLayout;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.bat_demo);

        scoresLayout = findViewById(R.id.scoresLayout);

        try {
            Bat.Builder builder = new Bat.Builder()
                    .setAccessKey(ACCESS_KEY)
                    .setDevice("best");
            bat = builder.build(getApplicationContext());
        } catch (BatInvalidArgumentException e) {
            displayError(e.getMessage());
        } catch (BatActivationException e) {
            displayError("AccessKey activation error");
        } catch (BatActivationLimitException e) {
            displayError("AccessKey reached its device limit");
        } catch (BatActivationRefusedException e) {
            displayError("AccessKey refused");
        } catch (BatActivationThrottledException e) {
            displayError("AccessKey has been throttled");
        } catch (BatException e) {
            displayError("Failed to initialize Bat " + e.getMessage());
        }

        voiceProcessor.addFrameListener(frame -> {
            try {
                for(short pcm: frame) {
                    pcmBuffer.add(pcm);
                }
                if (pcmBuffer.size() >= bat.getFrameLength()) {
                    short[] pcmFrame = new short[bat.getFrameLength()];
                    for (int i = 0; i < bat.getFrameLength(); i++) {
                        pcmFrame[i] = pcmBuffer.remove(0);
                    }
                    final HashMap<BatLanguages, Float> scores = bat.process(pcmFrame);
                    updateScoresView(scores);
                }
            } catch (BatException e) {
                runOnUiThread(() -> displayError(e.toString()));
            }
        });

        voiceProcessor.addErrorListener(error -> {
            runOnUiThread(() -> displayError(error.toString()));
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        bat.delete();
    }

    private void displayError(String message) {
        TextView errorText = findViewById(R.id.errorTextView);
        errorText.setText(message);
        errorText.setVisibility(View.VISIBLE);

        ToggleButton recordButton = findViewById(R.id.recordButton);
        recordButton.setEnabled(false);
    }

    private void requestRecordPermission() {
        ActivityCompat.requestPermissions(
                this,
                new String[]{Manifest.permission.RECORD_AUDIO},
                0);
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (grantResults.length == 0 || grantResults[0] == PackageManager.PERMISSION_DENIED) {
            ToggleButton toggleButton = findViewById(R.id.recordButton);
            toggleButton.toggle();
        } else {
            TextView recordingTextView = findViewById(R.id.recordingTextView);
            recordingTextView.setText("Recording...");
            try {
                voiceProcessor.start(bat.getFrameLength(), bat.getSampleRate());
            } catch (VoiceProcessorException e) {
                displayError(e.toString());
            }
        }
    }

    @SuppressLint({"SetTextI18n", "DefaultLocale"})
    public void onRecordClick(View view) {
        ToggleButton recordButton = findViewById(R.id.recordButton);
        TextView recordingTextView = findViewById(R.id.recordingTextView);
        if (bat == null) {
            displayError("Bat is not initialized");
            recordButton.setChecked(false);
            return;
        }

        try {
            if (recordButton.isChecked()) {
                if (voiceProcessor.hasRecordAudioPermission(this)) {
                    recordingTextView.setText("Recording...");

                    final int voiceProcessorFrameLength = (int) (voiceProcessorFrameLengthSecs * bat.getSampleRate());
                    voiceProcessor.start(voiceProcessorFrameLength, bat.getSampleRate());
                } else {
                    requestRecordPermission();
                }
            } else {
                recordingTextView.setText("");
                voiceProcessor.stop();
            }
        } catch (VoiceProcessorException e) {
            displayError(e.toString());
        }
    }

    private void updateScoresView(HashMap<BatLanguages, Float> scores) {
        runOnUiThread(() -> {
            scoresLayout.removeAllViews();

            for (BatLanguages language: BatLanguages.values()) {
                TextView textView = new TextView(this);
                textView.setText(language.toString());

                Float score = 0.0f;
                if (scores != null) {
                    score = scores.get(language);
                }

                ProgressBar scoresBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
                scoresBar.setProgress((int) (score * 100));

                scoresLayout.addView(textView);
                scoresLayout.addView(scoresBar);
            }

            if (scores == null) {
                TextView textView = new TextView(this);
                textView.setText("(no voice detected)");
                scoresLayout.addView(textView);
            }

            scoresLayout.invalidate();
        });
    }
}
