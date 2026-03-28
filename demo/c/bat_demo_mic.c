/*
    Copyright 2026 Picovoice Inc.

    You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
    file accompanying this source.

    Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
    an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
    specific language governing permissions and limitations under the License.
*/

#if !(defined(_WIN32) || defined(_WIN64))

#include <dlfcn.h>
#include <unistd.h>

#endif

#include <getopt.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#endif

#include "pv_bat.h"
#include "pv_recorder.h"

static volatile bool is_interrupted = false;

const char *(*pv_bat_language_to_string_func)(pv_bat_language_t) = NULL;

void interrupt_handler(int _) {
    (void) _;
    is_interrupted = true;
}

static void *open_dl(const char *dl_path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(dl_path);

#else

    return dlopen(dl_path, RTLD_NOW);

#endif
}

static void *load_symbol(void *handle, const char *symbol) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) handle, symbol);

#else

    return dlsym(handle, symbol);

#endif
}

static void close_dl(void *handle) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE) handle);

#else

    dlclose(handle);

#endif
}

static void print_dl_error(const char *message) {

#if defined(_WIN32) || defined(_WIN64)

    fprintf(stderr, "%s with code '%lu'.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with `%s`.\n", message, dlerror());

#endif
}

void print_error_message(char **message_stack, int32_t message_stack_depth) {
    for (int32_t i = 0; i < message_stack_depth; i++) {
        fprintf(stderr, "  [%d] %s\n", i, message_stack[i]);
    }
}

void print_usage(const char *program_name) {
    fprintf(stderr,
            "Usage : %s -a ACCESS_KEY -l LIBRARY_PATH -m MODEL_PATH [-y DEVICE] [-d AUDIO_DEVICE_INDEX] [-v VOICE_THRESHOLD] [-u UPDATE_DURATION] \n"
            "        %s [-i SHOW_INFERENCE_DEVICES]\n"
            "        %s [-s SHOW_AUDIO_DEVICES]\n",
            program_name,
            program_name,
            program_name);
}

static void show_audio_devices(void) {
    char **devices = NULL;
    int32_t count = 0;

    pv_recorder_status_t status = pv_recorder_get_available_devices(&count, &devices);
    if (status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "failed to get audio devices with `%s`.\n", pv_recorder_status_to_string(status));
        exit(1);
    }

    for (int32_t i = 0; i < count; i++) {
        fprintf(stdout, "[%d] %s\n", i, devices[i]);
    }

    pv_recorder_free_available_devices(count, devices);
}

void print_inference_devices(const char *library_path) {
    void *dl_handle = open_dl(library_path);
    if (!dl_handle) {
        fprintf(stderr, "Failed to open library at '%s'.\n", library_path);
        exit(EXIT_FAILURE);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = load_symbol(dl_handle, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("Failed to load 'pv_status_to_string'");
        exit(EXIT_FAILURE);
    }

    pv_status_t (*pv_bat_list_hardware_devices_func)(char ***, int32_t *) =
    load_symbol(dl_handle, "pv_bat_list_hardware_devices");
    if (!pv_bat_list_hardware_devices_func) {
        print_dl_error("failed to load `pv_bat_list_hardware_devices`");
        exit(EXIT_FAILURE);
    }

    pv_status_t (*pv_bat_free_hardware_devices_func)(char **, int32_t) =
        load_symbol(dl_handle, "pv_bat_free_hardware_devices");
    if (!pv_bat_free_hardware_devices_func) {
        print_dl_error("failed to load `pv_bat_free_hardware_devices`");
        exit(EXIT_FAILURE);
    }

    pv_status_t (*pv_get_error_stack_func)(char ***, int32_t *) =
        load_symbol(dl_handle, "pv_get_error_stack");
    if (!pv_get_error_stack_func) {
        print_dl_error("failed to load 'pv_get_error_stack_func'");
        exit(EXIT_FAILURE);
    }

    void (*pv_free_error_stack_func)(char **) =
        load_symbol(dl_handle, "pv_free_error_stack");
    if (!pv_free_error_stack_func) {
        print_dl_error("failed to load 'pv_free_error_stack_func'");
        exit(EXIT_FAILURE);
    }

    char **message_stack = NULL;
    int32_t message_stack_depth = 0;
    pv_status_t error_status = PV_STATUS_RUNTIME_ERROR;

    char **hardware_devices = NULL;
    int32_t num_hardware_devices = 0;
    pv_status_t status = pv_bat_list_hardware_devices_func(&hardware_devices, &num_hardware_devices);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(
                stderr,
                "Failed to list hardware devices with `%s`.\n",
                pv_status_to_string_func(status));
        error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(
                    stderr,
                    ".\nUnable to get bat error state with '%s'.\n",
                    pv_status_to_string_func(error_status));
            exit(EXIT_FAILURE);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
            pv_free_error_stack_func(message_stack);
        }
        exit(EXIT_FAILURE);
    }

    for (int32_t i = 0; i < num_hardware_devices; i++) {
        fprintf(stdout, "%s\n", hardware_devices[i]);
    }
    pv_bat_free_hardware_devices_func(hardware_devices, num_hardware_devices);
    close_dl(dl_handle);
}

static void print_scores_bar(pv_bat_language_t language, float score) {
    const float percentage = score * 100;
    const int32_t bar_length = (percentage / 10) * 3;
    const int32_t empty_length = 30 - bar_length;

    char bar[32 * 3];
    char empty[32];
    memset(bar, 0, 32 * 3);
    memset(empty, 0, 32);

    for (int32_t i = 0; i < (bar_length * 3); i+=3) {
        memcpy(bar + i, "█", 3 * sizeof(char));
    }
    for (int32_t i = 0; i < empty_length; i++) {
        empty[i] = ' ';
    }

    fprintf(stdout, "%-8s: [%.2f]|%s%s|\n", pv_bat_language_to_string_func(language), score, bar, empty);
}

static void print_scores(float *scores) {
    static bool first_print = true;
    if (!first_print) {
        const int32_t num_lines = PV_BAT_LANGAUGE_NUM_LANGUAGES + 2;
        for (int32_t i = 0; i < num_lines; i++) {
            fprintf(stdout, "\x1b[1A\x1b[2K");
        }
    }

    for (int32_t i = 0; i < PV_BAT_LANGAUGE_NUM_LANGUAGES; i++) {
        print_scores_bar(i, (scores != NULL) ? scores[i] : 0.0);
    }
    if (scores != NULL) {
        fprintf(stdout, "\n");
    } else {
        fprintf(stdout, "(no voice detected)\n");
    }
    fflush(stdout);

    first_print = false;
}

static void print_loading_bar(float progress) {
    const float percentage = progress * 100.0;
    const int32_t bar_length = (percentage / 10.0f) * 4.6f;
    const int32_t empty_length = 46 - bar_length;

    char bar[64];
    char empty[64];
    memset(bar, 0, 64);
    memset(empty, 0, 64);

    for (int32_t i = 0; i < bar_length; i++) {
        bar[i] = '.';
    }
    for (int32_t i = 0; i < empty_length; i++) {
        empty[i] = ' ';
    }

    fprintf(stdout, "\r[%s%s]", bar, empty);
    fflush(stdout);
}

int picovoice_main(int argc, char *argv[]) {
    signal(SIGINT, interrupt_handler);

    const char *access_key = NULL;
    const char *model_path = NULL;
    const char *library_path = NULL;
    const char *device = "best";
    float voice_threshold = 0.4f;
    float update_duration = 0.75f;
    int32_t device_index = -1;
    bool show_inference_devices = false;

    int opt;
    while ((opt = getopt(argc, argv, "a:m:l:e:y:v:u:d:si")) != -1) {
        switch (opt) {
            case 'a':
                access_key = optarg;
                break;
            case 'm':
                model_path = optarg;
                break;
            case 'l':
                library_path = optarg;
                break;
            case 'y':
                device = optarg;
                break;
            case 'v':
                voice_threshold = atof(optarg);
                break;
            case 'u':
                update_duration = atof(optarg);
                break;
            case 'd':
                device_index = (int32_t) strtol(optarg, NULL, 10);
                if (device_index < -1) {
                    fprintf(stderr, "device index should be either `-1` (default) or a non-negative valid index\n");
                    exit(1);
                }
                break;
            case 's':
                show_audio_devices();
                exit(0);
            case 'i':
                show_inference_devices = true;
                break;
            default:
                break;
        }
    }

    if (show_inference_devices) {
        if (!library_path) {
            fprintf(stderr, "`library_path` is required to view available inference devices.\n");
            exit(1);
        }

        print_inference_devices(library_path);
        return 0;
    }

    if (!(access_key && library_path && model_path)) {
        print_usage(argv[0]);
        exit(1);
    }

    if (update_duration < 0.5 || update_duration > 2.0) {
        fprintf(stderr, "`update_duration` should be between 0.5 and 2.0 seconds.\n");
        exit(1);
    }

    void *dl_handle = open_dl(library_path);
    if (!dl_handle) {
        fprintf(stderr, "failed to load dynamic library at `%s`.\n", library_path);
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = load_symbol(dl_handle, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load `pv_status_to_string`");
        exit(1);
    }

    int32_t (*pv_sample_rate_func)() = load_symbol(dl_handle, "pv_sample_rate");
    if (!pv_sample_rate_func) {
        print_dl_error("failed to load `pv_sample_rate`");
        exit(1);
    }

    pv_status_t (*pv_bat_init_func)(
        const char *,
        const char *,
        const char *,
        float,
        pv_bat_t **) =
            load_symbol(dl_handle, "pv_bat_init");
    if (!pv_bat_init_func) {
        print_dl_error("failed to load `pv_bat_init`");
        exit(1);
    }

    void (*pv_bat_delete_func)(pv_bat_t *) = load_symbol(dl_handle, "pv_bat_delete");
    if (!pv_bat_delete_func) {
        print_dl_error("failed to load `pv_bat_delete`");
        exit(1);
    }

    pv_status_t (*pv_bat_process_func)(pv_bat_t *, const int16_t *, float **) =
            load_symbol(dl_handle, "pv_bat_process");
    if (!pv_bat_process_func) {
        print_dl_error("failed to load `pv_bat_process`");
        exit(1);
    }

    pv_status_t (*pv_bat_scores_delete_func)(float *) = load_symbol(dl_handle, "pv_bat_scores_delete");
    if (!pv_bat_scores_delete_func) {
        print_dl_error("failed to load `pv_bat_scores_delete`");
        exit(1);
    }

    int32_t (*pv_bat_frame_length_func)() = load_symbol(dl_handle, "pv_bat_frame_length");
    if (!pv_bat_frame_length_func) {
        print_dl_error("failed to load `pv_bat_frame_length`");
        exit(1);
    }

    const char *(*pv_bat_version_func)() = load_symbol(dl_handle, "pv_bat_version");
    if (!pv_bat_version_func) {
        print_dl_error("failed to load `pv_bat_version_func`");
        exit(1);
    }

    pv_bat_language_to_string_func = load_symbol(dl_handle, "pv_bat_language_to_string");
    if (!pv_bat_version_func) {
        print_dl_error("failed to load `pv_bat_language_to_string_func`");
        exit(1);
    }

    pv_status_t (*pv_get_error_stack_func)(char ***, int32_t *) = load_symbol(dl_handle, "pv_get_error_stack");
    if (!pv_get_error_stack_func) {
        print_dl_error("failed to load 'pv_get_error_stack_func'");
        exit(1);
    }

    void (*pv_free_error_stack_func)(char **) = load_symbol(dl_handle, "pv_free_error_stack");
    if (!pv_free_error_stack_func) {
        print_dl_error("failed to load 'pv_free_error_stack_func'");
        exit(1);
    }

    char **message_stack = NULL;
    int32_t message_stack_depth = 0;
    pv_status_t error_status = PV_STATUS_RUNTIME_ERROR;

    pv_bat_t *bat = NULL;
    pv_status_t status = pv_bat_init_func(
        access_key,
        model_path,
        device,
        voice_threshold,
        &bat);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(
            stderr,
            "Failed to init with `%s`",
            pv_status_to_string_func(status));
        error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(
                    stderr,
                    ".\nUnable to get Bat error state with '%s'.\n",
                    pv_status_to_string_func(error_status));
            exit(1);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
        } else {
            fprintf(stderr, ".\n");
        }

        pv_free_error_stack_func(message_stack);
        exit(1);
    }

    fprintf(stdout, "Bat V%s\n", pv_bat_version_func());

    const int32_t update_duration_samples = update_duration * pv_sample_rate_func();

    const int32_t bat_frame_length = pv_bat_frame_length_func();
    const int32_t recorder_frame_length = 512;
    const int32_t num_recorder_frames = bat_frame_length / recorder_frame_length;
    if (bat_frame_length % recorder_frame_length != 0) {
        fprintf(
            stderr,
            "bat_frame_length `%d` is not a multiple of recorder_frame_length `%d`\n",
            bat_frame_length,
            recorder_frame_length);
        exit(1);
    }

    pv_recorder_t *recorder = NULL;
    pv_recorder_status_t recorder_status = pv_recorder_init(recorder_frame_length, device_index, 1000, &recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to initialize audio device with `%s`.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    int32_t num_pcm_samples = 0;
    int16_t *pcm = malloc((bat_frame_length + recorder_frame_length) * sizeof(int16_t));
    if (!pcm) {
        fprintf(stderr, "Failed to allocate pcm memory.\n");
        exit(1);
    }

    const char *selected_device = pv_recorder_get_selected_device(recorder);
    fprintf(stdout, "selected device: %s.\n", selected_device);

    fprintf(stdout, "start recording...\n");
    print_scores(NULL);
    recorder_status = pv_recorder_start(recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to start device with %s.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    while (!is_interrupted) {
        recorder_status = pv_recorder_read(recorder, pcm + num_pcm_samples);
        if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
            fprintf(stderr, "Failed to read with `%s`.\n", pv_recorder_status_to_string(recorder_status));
            exit(1);
        }
        num_pcm_samples += recorder_frame_length;
        print_loading_bar((float) num_pcm_samples / (float) bat_frame_length);

        if (num_pcm_samples >= bat_frame_length) {
            fprintf(stdout, "\n");

            float *scores = NULL;
            status = pv_bat_process_func(bat, pcm, &scores);
            if (status != PV_STATUS_SUCCESS) {
                fprintf(
                    stderr,
                    "Failed to process with `%s`",
                    pv_status_to_string_func(status));
                error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
                if (error_status != PV_STATUS_SUCCESS) {
                    fprintf(
                            stderr,
                            ".\nUnable to get Bat error state with '%s'.\n",
                            pv_status_to_string_func(error_status));
                    exit(1);
                }

                if (message_stack_depth > 0) {
                    fprintf(stderr, ":\n");
                    print_error_message(message_stack, message_stack_depth);
                } else {
                    fprintf(stderr, ".\n");
                }

                pv_free_error_stack_func(message_stack);
                exit(1);
            }

            print_scores(scores);
            memmove(pcm, pcm + update_duration_samples, (num_pcm_samples - update_duration_samples) * sizeof(int16_t));
            num_pcm_samples -= update_duration_samples;
        }
    }

    recorder_status = pv_recorder_stop(recorder);
    if (recorder_status != PV_RECORDER_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to stop device with `%s`.\n", pv_recorder_status_to_string(recorder_status));
        exit(1);
    }

    free(pcm);
    pv_recorder_delete(recorder);
    pv_bat_delete_func(bat);
    close_dl(dl_handle);

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED       (-1)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(1);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte: https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num = WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "failed to to allocate memory for converting args");
        }
        WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, utf8_argv[i], arg_chars_num, NULL, NULL);
    }

    LocalFree(wargv);
    argv = utf8_argv;

#endif

    int result = picovoice_main(argc, argv);

#if defined(_WIN32) || defined(_WIN64)

    for (int i = 0; i < argc; ++i) {
        free(utf8_argv[i]);
    }

#endif

    return result;
}
