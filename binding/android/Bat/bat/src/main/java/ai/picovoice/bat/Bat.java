/*
    Copyright 2026 Picovoice Inc.
    You may not use this file except in compliance with the license. A copy of the license is
    located in the "LICENSE" file accompanying this source.
    Unless required by applicable law or agreed to in writing, software distributed under the
    License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
    express or implied. See the License for the specific language governing permissions and
    limitations under the License.
*/


package ai.picovoice.bat;

import android.content.Context;
import android.content.res.Resources;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;

/**
 * Android binding for Bat spoken language understanding engine.
 */
public class Bat {

    private static String defaultModelPath;
    private static String _sdk = "android";

    static {
        System.loadLibrary("pv_bat");
    }

    private long handle;

    public static void setSdk(String sdk) {
        Bat._sdk = sdk;
    }

    /**
     * Constructor.
     *
     * @param accessKey                  AccessKey obtained from Picovoice Console
     * @param modelPath                  Absolute path to the file containing Bat model parameters.
     * @param device                     String representation of the device (e.g., CPU or GPU) to use. If set to
     *                                   `best`, the most suitable device is selected automatically. If set to `gpu`,
     *                                   the engine uses the first available GPU device. To select a specific GPU
     *                                   device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the
     *                                   index of the target GPU. If set to `cpu`, the engine will run on the CPU with
     *                                   the default number of threads. To specify the number of threads, set this
     *                                   argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired
     *                                   number of threads.
     * @param voiceThreshold             Sensitivity threshold for detecting voice. The value should be a number
     *                                   within [0, 1]. A higher threshold increases detection confidence at the cost
     *                                   of potentially missing frames of voice.
     * @throws BatException if there is an error while initializing Bat.
     */
    private Bat(
            String accessKey,
            String modelPath,
            String device,
            float voiceThreshold) throws BatException {
        BatNative.setSdk(Bat._sdk);

        handle = BatNative.init(
                accessKey,
                modelPath,
                device,
                voiceThreshold);
    }

    private static void extractPackageResources(Context context) throws BatException {
        final Resources resources = context.getResources();

        try {
            defaultModelPath = extractResource(context,
                    resources.openRawResource(R.raw.bat_params),
                    resources.getResourceEntryName(R.raw.bat_params) + ".pv");
        } catch (IOException ex) {
            throw new BatIOException(ex);
        }
    }

    private static String extractResource(
            Context context,
            InputStream srcFileStream,
            String dstFilename
    ) throws IOException {
        InputStream is = new BufferedInputStream(srcFileStream, 256);
        OutputStream os = new BufferedOutputStream(context.openFileOutput(dstFilename, Context.MODE_PRIVATE), 256);
        int r;
        while ((r = is.read()) != -1) {
            os.write(r);
        }
        os.flush();

        is.close();
        os.close();
        return new File(context.getFilesDir(), dstFilename).getAbsolutePath();
    }

    /**
     * Releases resources acquired by Bat.
     */
    public void delete() {
        if (handle != 0) {
            BatNative.delete(handle);
            handle = 0;
        }
    }

    /**
     * Processes given audio data and returns its transcription.
     *
     * @param pcm A frame of audio samples. The number of samples per frame can be attained by
     *            calling {@link #getFrameLength()}. The incoming audio needs to have a sample rate
     *            equal to {@link #getSampleRate()} and be 16-bit linearly-encoded. Furthermore,
     *            Bat operates on single channel audio only.
     * @return Inferred transcription.
     * @throws BatException if there is an error while processing the audio frame.
     */
    public HashMap<BatLanguages, Float> process(short[] pcm) throws BatException {
        if (handle == 0) {
            throw new BatInvalidStateException("Attempted to call Bat process after delete.");
        }

        if (pcm == null) {
            throw new BatInvalidArgumentException("Passed null frame to Bat process.");
        }

        if (pcm.length != getFrameLength()) {
            throw new BatInvalidArgumentException(
                    String.format("Bat process requires frames of length %d. " +
                            "Received frame of size %d.", getFrameLength(), pcm.length));
        }


        float[] scores = BatNative.process(handle, pcm);
        if (scores != null) {
            HashMap<BatLanguages, Float> result = new HashMap<BatLanguages, Float>();
            for (int i = 0; i < BatLanguages.numLanguages; i++) {
                result.put(BatLanguages.fromValue(i), scores[i]);
            }
            return result;
        }
        return null;
    }

    /**
     * Getter for required number of audio samples per frame.
     *
     * @return Required number of audio samples per frame.
     */
    public int getFrameLength() {
        return BatNative.getFrameLength();
    }

    /**
     * Getter for required audio sample rate for PCM data.
     *
     * @return Required audio sample rate for PCM data.
     */
    public int getSampleRate() {
        return BatNative.getSampleRate();
    }

    /**
     * Getter for Bat version.
     *
     * @return Bat version.
     */
    public String getVersion() {
        return BatNative.getVersion();
    }

    /**
     * Lists all available devices that Bat can use for inference.
     * Each entry in the list can be used as the `device` argument when initializing Bat.
     *
     * @return Array of all available devices that Bat can be used for inference.
     * @throws BatException if getting available devices fails.
     */
    public static String[] getAvailableDevices() throws BatException {
        return BatNative.listHardwareDevices();
    }

    /**
     * Builder for creating an instance of Bat with a mixture of default arguments.
     */
    public static class Builder {

        private String accessKey = null;
        private String modelPath = null;
        private String device = "best";
        private float voiceThreshold = 0.4f;

        /**
         * Setter the AccessKey.
         *
         * @param accessKey AccessKey obtained from Picovoice Console
         */
        public Builder setAccessKey(String accessKey) {
            this.accessKey = accessKey;
            return this;
        }

        /**
         * Setter for the absolute path to the file containing Bat model parameters.
         *
         * @param modelPath Absolute path to the file containing Bat model parameters.
         */
        public Builder setModelPath(String modelPath) {
            this.modelPath = modelPath;
            return this;
        }

        /**
         * Setter for the device to use for inference.
         *
         * @param device String representation of the device (e.g., CPU or GPU) to use for inference.
         *               If set to `best`, the most suitable device is selected automatically. If set to `gpu`,
         *               the engine uses the first available GPU device. To select a specific GPU device, set this
         *               argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the target GPU. If
         *               set to `cpu`, the engine will run on the CPU with the default number of threads. To specify
         *               the number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}`
         *               is the desired number of threads.
         */
        public Builder setDevice(String device) {
            this.device = device;
            return this;
        }

        /**
         * Setter for the voice threshold.
         *
         * @param voiceThreshold Sensitivity threshold for detecting voice. The value should be a number
         *                       within [0, 1]. A higher threshold increases detection confidence at the cost
         *                       of potentially missing frames of voice.
         */
        public Builder setVoiceThreshold(float voiceThreshold) {
            this.voiceThreshold = voiceThreshold;
            return this;
        }

        /**
         * Validates properties and creates an instance of the Bat spoken language understanding engine.
         *
         * @return An instance of Bat Engine
         * @throws BatException if there is an error while initializing Bat.
         */
        public Bat build(Context context) throws BatException {
            if (accessKey == null || this.accessKey.equals("")) {
                throw new BatInvalidArgumentException("No AccessKey was provided to Bat");
            }

            if (modelPath == null) {
                if (defaultModelPath == null) {
                    extractPackageResources(context);
                }
                modelPath = defaultModelPath;
            } else {
                File modelFile = new File(modelPath);
                String modelFilename = modelFile.getName();
                if (!modelFile.exists() && !modelFilename.equals("")) {
                    try {
                        modelPath = extractResource(context,
                                context.getAssets().open(modelPath),
                                modelFilename);
                    } catch (IOException ex) {
                        throw new BatIOException(ex);
                    }
                }
            }

            if (voiceThreshold < 0f || voiceThreshold > 1f) {
                throw new BatInvalidArgumentException("voiceThreshold must be between 0.0 and 1.0");
            }

            return new Bat(
                    accessKey,
                    modelPath,
                    device,
                    voiceThreshold);
        }
    }
}
