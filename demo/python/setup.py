import os
import shutil

import setuptools

os.system('git clean -dfx')

package_folder = os.path.join(os.path.dirname(__file__), 'pvbatdemo')
os.mkdir(package_folder)

shutil.copy(os.path.join(os.path.dirname(__file__), '../../LICENSE'), package_folder)

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'bat_demo_file.py'),
    os.path.join(package_folder, 'bat_demo_file.py'))

shutil.copy(
    os.path.join(os.path.dirname(__file__), 'bat_demo_mic.py'),
    os.path.join(package_folder, 'bat_demo_mic.py'))

with open(os.path.join(os.path.dirname(__file__), 'MANIFEST.in'), 'w') as f:
    f.write('include pvbatdemo/LICENSE\n')
    f.write('include pvbatdemo/bat_demo_file.py\n')
    f.write('include pvbatdemo/bat_demo_mic.py\n')

with open(os.path.join(os.path.dirname(__file__), 'README.md'), 'r') as f:
    long_description = f.read()

with open(os.path.join(os.path.dirname(__file__), "requirements.txt"), "r") as f:
    dependencies = f.read().strip().splitlines()

setuptools.setup(
    name="pvbatdemo",
    version="1.0.0",
    author="Picovoice",
    author_email="hello@picovoice.ai",
    description="Bat speech-to-text engine demos",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Picovoice/bat",
    packages=["pvbatdemo"],
    install_requires=dependencies,
    include_package_data=True,
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Topic :: Multimedia :: Sound/Audio :: Speech"
    ],
    entry_points=dict(
        console_scripts=[
            'bat_demo_file=pvbatdemo.bat_demo_file:main',
            'bat_demo_mic=pvbatdemo.bat_demo_mic:main',
        ],
    ),
    python_requires='>=3.9',
    keywords="Spoken Language Understanding, Language Detection, Speech Recognition, Voice Recognition",
)
