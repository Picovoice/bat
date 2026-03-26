/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#ifndef PV_BAT_H
#define PV_BAT_H

#include <stdint.h>

#include "picovoice.h"

#ifdef __cplusplus

extern "C" {

#endif

/**
 * Forward declaration for Bat Spoken Language Understanding engine.
 * Bat processes consecutive frames of incoming audio, outputting a detection score for each supported language per frame.
 */
typedef struct pv_bat pv_bat_t;

/**
 * Constructor.
 *
 * @param access_key AccessKey obtained from Picovoice Console (https://console.picovoice.ai/)
 * @param model_path Absolute path to the file containing model parameters.
 * @param device String representation of the device (e.g., CPU or GPU) to use for inference. If set to `best`, the most
 * suitable device is selected automatically. If set to `gpu`, the engine uses the first available GPU device.
 * To select a specific GPU device, set this argument to `gpu:${GPU_INDEX}`, where `${GPU_INDEX}` is the index of the
 * target GPU. If set to `cpu`, the engine will run on the CPU with the default number of threads. To specify the
 * number of threads, set this argument to `cpu:${NUM_THREADS}`, where `${NUM_THREADS}` is the desired number of threads.
 * @param voice_threshold Sensitivity threshold for detecting voice. The value should be a number within [0, 1].
 * A higher threshold increases detection confidence at the cost of potentially missing frames of voice.
 * @param[out] object Constructed instance of Bat.
 * @return Status code. Returns `PV_STATUS_OUT_OF_MEMORY`, `PV_STATUS_IO_ERROR`, `PV_STATUS_INVALID_ARGUMENT`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure.
 */
PV_API pv_status_t pv_bat_init(
        const char *access_key,
        const char *model_path,
        const char *device,
        float voice_threshold,
        pv_bat_t **object);

/**
 * Destructor.
 *
 * @param object Bat object.
 */
PV_API void pv_bat_delete(pv_bat_t *object);

/**
 * Processes a frame of the incoming audio.
 *
 * @param object Bat object.
 * @param pcm A frame of audio samples. The number of samples per frame can be attained by calling
 * `pv_bat_frame_length()`. The incoming audio needs to have a sample rate equal to `pv_sample_rate()` and be
 * 16-bit linearly-encoded. Bat operates on single-channel audio.
 * @param[out] scores Detection score for each supported language. The scores are in the range [0, 1]
 * with 1 being maximum confidence in a perfect match. The index of each scores corresponds to the `pv_bat_language_t` enum value,
 * and the length of the array is `PV_BAT_LANGAUGE_NUM_LANGUAGES` elements long.
 * If `NULL` is returned for `scores` and the return status `PV_STATUS_SUCCESS`, Bat did not detect usable voice
 * in the frame. `scores` must be freed using `pv_bat_scores_delete()`.
 * @return Status code. Returns `PV_STATUS_OUT_OF_MEMORY`, `PV_STATUS_INVALID_ARGUMENT`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure.
 */
PV_API pv_status_t pv_bat_process(
        pv_bat_t *object,
        const int16_t *pcm,
        float **scores);

/**
 * Deletes scores returned from `pv_bat_process()`.
 *
 * @param scores Scores array returned from `pv_bat_process()`.
 */
PV_API void pv_bat_scores_delete(float *scores);

/**
 * Getter for number of audio samples per frame.
 *
 * @return Frame length.
 */
PV_API int32_t pv_bat_frame_length(void);

/**
 * Getter for version.
 *
 * @return Version.
 */
PV_API const char *pv_bat_version(void);

/**
 * Languages.
 */
typedef enum {
    PV_BAT_LANGUAGE_UNKNOWN = 0,
    PV_BAT_LANGUAGE_DE = 1,
    PV_BAT_LANGUAGE_EN = 2,
    PV_BAT_LANGUAGE_ES = 3,
    PV_BAT_LANGUAGE_FR = 4,
    PV_BAT_LANGUAGE_IT = 5,
    PV_BAT_LANGUAGE_JA = 6,
    PV_BAT_LANGUAGE_KO = 7,
    PV_BAT_LANGUAGE_PT = 8,
} pv_bat_language_t;

#define PV_BAT_LANGAUGE_NUM_LANGUAGES (9)

/**
 * Get string representation given Bat language enum.
 *
 * @param language `pv_bat_language_t` enum value.
 * @return language string.
 */
PV_API const char *pv_bat_language_to_string(pv_bat_language_t language);

/**
 * Gets a list of hardware devices that can be specified when calling `pv_bat_init`.
 *
 * @param[out] hardware_devices Array of available hardware devices. Devices are NULL terminated strings.
 *                              The array must be freed using `pv_bat_free_hardware_devices`.
 * @param[out] num_hardware_devices The number of devices in the `hardware_devices` array.
 * @return Status code. Returns `PV_STATUS_OUT_OF_MEMORY`, `PV_STATUS_INVALID_ARGUMENT`, `PV_STATUS_INVALID_STATE`,
 * `PV_STATUS_RUNTIME_ERROR`, `PV_STATUS_ACTIVATION_ERROR`, `PV_STATUS_ACTIVATION_LIMIT_REACHED`,
 * `PV_STATUS_ACTIVATION_THROTTLED`, or `PV_STATUS_ACTIVATION_REFUSED` on failure.
 */
PV_API pv_status_t pv_bat_list_hardware_devices(
        char ***hardware_devices,
        int32_t *num_hardware_devices);

/**
 * Frees memory allocated by `pv_bat_list_hardware_devices`.
 *
 * @param[out] hardware_devices Array of available hardware devices allocated by `pv_bat_list_hardware_devices`.
 * @param[out] num_hardware_devices The number of devices in the `hardware_devices` array.
 */
PV_API void pv_bat_free_hardware_devices(
        char **hardware_devices,
        int32_t num_hardware_devices);
    
#ifdef __cplusplus

}

#endif

#endif // PV_BAT_H
