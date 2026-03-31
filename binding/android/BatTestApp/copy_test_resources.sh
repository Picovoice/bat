if [ ! -d "./bat-test-app/src/androidTest/assets/test_resources/audio_samples" ]
then
    echo "Creating test audio samples directory..."
    mkdir -p ./bat-test-app/src/androidTest/assets/test_resources/audio_samples
fi

echo "Copying test audio samples..."
cp ../../../resources/audio_samples/* ./bat-test-app/src/androidTest/assets/test_resources/audio_samples/

if [ ! -d "./bat-test-app/src/androidTest/assets/test_resources/model_files" ]
then
    echo "Creating test model files directory..."
    mkdir -p ./bat-test-app/src/androidTest/assets/test_resources/model_files
fi

echo "Copying bat models..."
cp ../../../lib/common/* ./bat-test-app/src/androidTest/assets/test_resources/model_files

echo "Copying test data file..."
cp ../../../resources/.test/test_data.json ./bat-test-app/src/androidTest/assets/test_resources
