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

import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.File;
import java.io.IOException;

import ai.picovoice.bat.Bat;
import ai.picovoice.bat.BatException;


@RunWith(AndroidJUnit4.class)
public class StandardTests extends BaseTest {

    @Test
    public void getVersion() throws BatException, IOException {
        Bat bat = new Bat.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .setDevice(device)
                .build(appContext);

        String version = bat.getVersion();
        bat.delete();

        assertTrue(version != null && !version.equals(""));
    }

    @Test
    public void getFrameLength() throws BatException, IOException {
        Bat bat = new Bat.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .setDevice(device)
                .build(appContext);

        int frameLength = bat.getFrameLength();
        bat.delete();

        assertTrue(frameLength > 0);
    }

    @Test
    public void getSampleRate() throws BatException, IOException {
        Bat bat = new Bat.Builder()
                .setAccessKey(accessKey)
                .setModelPath(defaultModelPath)
                .setDevice(device)
                .build(appContext);

        int sampleRate = bat.getSampleRate();
        bat.delete();

        assertTrue(sampleRate > 0);
    }

    @Test
    public void testInvalidDevice() throws BatException {
        boolean didFail = false;
        try {
            Bat bat = new Bat.Builder()
                    .setAccessKey(accessKey)
                    .setModelPath(defaultModelPath)
                    .setDevice("invalid_device")
                    .build(appContext);

        } catch (BatException e) {
            didFail = true;
        }
        assertTrue(didFail);
    }

    @Test
    public void testGetAvailableDevices() throws BatException {
        String[] availableDevices = Bat.getAvailableDevices();
        assertTrue(availableDevices.length > 0);
        for (String d : availableDevices) {
            assertTrue(d != null && d.length() > 0);
        }
    }

    @Test
    public void testErrorStack() throws IOException {
        String[] error = {};

        try {
            new Bat.Builder()
                    .setAccessKey("invalid")
                    .setModelPath(defaultModelPath)
                    .build(appContext);
        } catch (BatException e) {
            error = e.getMessageStack();
        }

        assertTrue(0 < error.length);
        assertTrue(error.length <= 8);

        try {
            new Bat.Builder()
                    .setAccessKey("invalid")
                    .setModelPath(defaultModelPath)
                    .build(appContext);
        } catch (BatException e) {
            for (int i = 0; i < error.length; i++) {
                assertEquals(e.getMessageStack()[i], error[i]);
            }
        }
    }
}
