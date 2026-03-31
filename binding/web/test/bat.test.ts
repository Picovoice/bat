import {
  Bat,
  BatWorker,
  BatLanguages,
  batLanguageToString,
  batLanguageFromString
} from "../";
import { BatError } from "../dist/types/bat_errors";
import testData from './test_data.json';

// @ts-ignore
import batParams from "./bat_params";
import { PvModel } from '@picovoice/web-utils';

const ACCESS_KEY: string = Cypress.env('ACCESS_KEY');

function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const runInitTest = async (
  instance: typeof Bat | typeof BatWorker,
  params: {
    accessKey?: string,
    model?: PvModel,
    expectFailure?: boolean,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/bat_params.pv', forceWrite: true },
    expectFailure = false,
  } = params;

  let isFailed = false;

  try {
    const bat = await instance.create(
      accessKey,
      () => {},
      model);

    expect(bat.sampleRate).to.be.eq(16000);
    expect(typeof bat.version).to.eq('string');
    expect(bat.version.length).to.be.greaterThan(0);

    if (bat instanceof BatWorker) {
      bat.terminate();
    } else {
      await bat.release();
    }
  } catch (e) {
    if (expectFailure) {
      isFailed = true;
    } else {
      expect(e).to.be.undefined;
    }
  }

  if (expectFailure) {
    expect(isFailed).to.be.true;
  }
};

const runProcTest = async (
  instance: typeof Bat | typeof BatWorker,
  inputPcm: Int16Array,
  voiceThreshold: number,
  expectedScores: Record<string, number>,
  params: {
    accessKey?: string,
    model?: PvModel,
  } = {}
) => {
  const {
    accessKey = ACCESS_KEY,
    model = { publicPath: '/test/bat_params.pv', forceWrite: true },
  } = params;

  var scores = null;

  const runProcess = () =>
    new Promise<void>(async (resolve, reject) => {
      const bat = await instance.create(
        accessKey,
        batScores => {
          scores = batScores;
          resolve();
        },
        model,
        {
          voiceThreshold: voiceThreshold,
          processErrorCallback: (error: BatError) => {
            reject(error);
          }
        }
      );

      let numFrames = Math.floor(inputPcm.length / bat.frameLength);
      for (let i = 0; i < numFrames; i += 1) {
        await bat.process(inputPcm.slice(i * bat.frameLength, (i + 1) * bat.frameLength));
      }

      while (scores === null) {
        await new Promise(r => setTimeout(r, 250));
      }

      if (bat instanceof BatWorker) {
        bat.terminate();
      } else {
        await bat.release();
      }
    });

  try {
    await runProcess();
    expect(scores).to.not.be.null;
    Object.keys(expectedScores).forEach(k => {
      let expectedScore = expectedScores[k];
      let score = scores[batLanguageFromString(k)];
      expect(score).to.be.closeTo(expectedScore, 0.01);
    });
  } catch (e) {
    expect(e).to.be.undefined;
  }
};

describe("Bat Binding", function () {
  it(`should return process and flush error message stack`, async () => {
    let errors: BatError[] = [];

    const runProcess = () => new Promise<void>(async resolve => {
      const bat = await Bat.create(
        ACCESS_KEY,
        () => { },
        { publicPath: '/test/bat_params.pv', forceWrite: true },
        {
          processErrorCallback: (e: BatError) => {
            errors.push(e);
            resolve();
          }
        }
      );
      const testPcm = new Int16Array(bat.frameLength);
      // @ts-ignore
      const objectAddress = bat._objectAddress;

      // @ts-ignore
      bat._objectAddress = 0;
      await bat.process(testPcm);
      await bat.flush();

      await delay(1000);

      // @ts-ignore
      bat._objectAddress = objectAddress;
      await bat.release();
    });

    await runProcess();
    expect(errors.length).to.be.gte(0);

    for (let i = 0; i < errors.length; i++) {
      expect((errors[i] as BatError).messageStack.length).to.be.gt(0);
      expect((errors[i] as BatError).messageStack.length).to.be.lte(8);
    }
  });

  for (const instance of [Bat, BatWorker]) {
    const instanceString = (instance === BatWorker) ? 'worker' : 'main';

    it(`should return correct error message stack (${instanceString})`, async () => {
      let messageStack = [];
      try {
        const bat = await instance.create(
          "invalidAccessKey",
          () => { },
          { publicPath: '/test/bat_params.pv', forceWrite: true }
        );
        expect(bat).to.be.undefined;
      } catch (e: any) {
        messageStack = e.messageStack;
      }

      expect(messageStack.length).to.be.gt(0);
      expect(messageStack.length).to.be.lte(8);

      try {
        const bat = await instance.create(
          "invalidAccessKey",
          () => { },
          { publicPath: '/test/bat_params.pv', forceWrite: true }
        );
        expect(bat).to.be.undefined;
      } catch (e: any) {
        expect(messageStack.length).to.be.eq(e.messageStack.length);
      }
    });

    it(`should be able to init with public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance);
      });
    });

    it(`should be able to init with base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: batParams, forceWrite: true }
        });
      });
    });

    it(`should be able to handle UTF-8 public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: '/test/bat_params.pv', forceWrite: true, customWritePath: '테스트' }
        });
      });
    });

    it(`should be able to handle invalid public path (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { publicPath: 'invalid', forceWrite: true },
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid base64 (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          model: { base64: 'invalid', forceWrite: true },
          expectFailure: true
        });
      });
    });

    it(`should be able to handle invalid access key (${instanceString})`, () => {
      cy.wrap(null).then(async () => {
        await runInitTest(instance, {
          accessKey: 'invalid',
          expectFailure: true
        });
      });
    });

    for (const testParam of testData.tests.language_tests) {
      for (const modelFile of testParam.models) {
        it(`should be able to process (${testParam.audio_file}) (${instanceString})`, () => cy.getFramesFromFile(
          `audio_samples/${testParam.audio_file}`).then(
          (pcm: Int16Array) => runProcTest(
              instance,
              pcm,
              testParam.voice_threshold,
              testParam.expected_scores,
              {
                model: {
                  publicPath: `/test/${modelFile}`,
                  forceWrite: true,
                },
              }
          )
        ));
      }
    }
  }
});
