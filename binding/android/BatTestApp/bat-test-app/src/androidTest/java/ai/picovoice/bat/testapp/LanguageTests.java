/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/

package ai.picovoice.bat.testapp;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import static java.lang.Math.abs;

import androidx.test.ext.junit.runners.AndroidJUnit4;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.Parameterized;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import ai.picovoice.bat.Bat;
import ai.picovoice.bat.BatException;
import ai.picovoice.bat.BatLanguages;


@RunWith(Parameterized.class)
public class LanguageTests extends BaseTest {
    @Parameterized.Parameter(value = 0)
    public String modelFile;

    @Parameterized.Parameter(value = 1)
    public String testAudioFile;

    @Parameterized.Parameter(value = 2)
    public float voiceThreshold;

    @Parameterized.Parameter(value = 3)
    public HashMap<String, Float> expectedScores;

    @Parameterized.Parameters(name = "{0}")
    public static Collection<Object[]> initParameters() throws IOException {
        String testDataJsonString = getTestDataString();

        JsonParser parser = new JsonParser();
        JsonObject testDataJson = parser.parse(testDataJsonString).getAsJsonObject();
        JsonArray languageTests = testDataJson
                .getAsJsonObject("tests")
                .getAsJsonArray("language_tests");

        List<Object[]> parameters = new ArrayList<>();
        for (int i = 0; i < languageTests.size(); i++) {
            JsonObject testData = languageTests.get(i).getAsJsonObject();

            String audioFile = testData.get("audio_file").getAsString();
            float voiceThreshold = testData.get("voice_threshold").getAsFloat();

            final JsonArray modelsJson = testData.getAsJsonArray("models");
            final String[] modelFiles = new String[modelsJson.size()];
            for (int j = 0; j < modelsJson.size(); j++) {
                modelFiles[j] = modelsJson.get(j).getAsString();
            }

            HashMap<String, Float> expectedScores = new HashMap<String, Float>();
            final Map<String, JsonElement> expectedScoresJson = testData.getAsJsonObject("expected_scores").asMap();
            for (Map.Entry<String, JsonElement> entry : expectedScoresJson.entrySet()) {
                String key = entry.getKey();
                JsonElement value = entry.getValue();
                expectedScores.put(key, value.getAsFloat());
            }

            for (String modelFile : modelFiles) {
                parameters.add(new Object[]{
                        modelFile,
                        audioFile,
                        voiceThreshold,
                        expectedScores
                });
            }
        }

        return parameters;
    }

    @Test
    public void testTranscribe() throws Exception {
        String modelPath = getModelFilepath(modelFile);
        Bat bat = new Bat.Builder()
                .setAccessKey(accessKey)
                .setModelPath(modelPath)
                .setDevice(device)
                .setVoiceThreshold(voiceThreshold)
                .build(appContext);

        File audioFile = new File(getAudioFilepath(testAudioFile));
        HashMap<BatLanguages, Float> scores = processTestAudio(bat, audioFile);
        bat.delete();

        for (Map.Entry<String, Float> entry : expectedScores.entrySet()) {
            String languageString = entry.getKey().toUpperCase();
            Float expectedScore = entry.getValue();

            assertTrue(abs(expectedScore - scores.get(BatLanguages.valueOf(languageString))) < 0.01);
        }
    }
}