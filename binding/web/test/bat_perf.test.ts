import { Bat, BatWorker } from "../";

const ACCESS_KEY = Cypress.env('ACCESS_KEY');
const NUM_TEST_ITERATIONS = Number(Cypress.env('NUM_TEST_ITERATIONS'));
const INIT_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('INIT_PERFORMANCE_THRESHOLD_SEC'));
const PROC_PERFORMANCE_THRESHOLD_SEC = Number(Cypress.env('PROC_PERFORMANCE_THRESHOLD_SEC'));

async function testPerformance(
  instance: typeof Bat | typeof BatWorker,
  inputPcm: Int16Array
) {
  const initPerfResults: number[] = [];
  const procPerfResults: number[] = [];

  for (let j = 0; j < NUM_TEST_ITERATIONS; j++) {
    let start = Date.now();

    let finished = false;

    const bat = await instance.create(
      ACCESS_KEY,
      batScores => {
        if (batScores !== null) {
          finished = true;
        }
      },
      { publicPath: '/test/bat_params.pv', forceWrite: true }
    );

    let end = Date.now();
    initPerfResults.push((end - start) / 1000);

    const waitUntil = (): Promise<void> =>
      new Promise(resolve => {
        setInterval(() => {
          if (finished) {
            resolve();
          }
        }, 100);
      });

    start = Date.now();
    for (
      let i = 0;
      i < inputPcm.length - bat.frameLength + 1;
      i += bat.frameLength
    ) {
      await bat.process(inputPcm.slice(i, i + bat.frameLength));
    }
    await waitUntil();
    end = Date.now();
    procPerfResults.push((end - start) / 1000);

    if (bat instanceof BatWorker) {
      bat.terminate();
    } else {
      await bat.release();
    }
  }

  const initAvgPerf = initPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;
  const procAvgPerf = procPerfResults.reduce((a, b) => a + b) / NUM_TEST_ITERATIONS;

  // eslint-disable-next-line no-console
  console.log(`Average init performance: ${initAvgPerf} seconds`);
  // eslint-disable-next-line no-console
  console.log(`Average proc performance: ${procAvgPerf} seconds`);

  expect(initAvgPerf).to.be.lessThan(INIT_PERFORMANCE_THRESHOLD_SEC);
  expect(procAvgPerf).to.be.lessThan(PROC_PERFORMANCE_THRESHOLD_SEC);
}

describe('Bat binding performance test', () => {
  Cypress.config('defaultCommandTimeout', 120000);

  for (const instance of [Bat, BatWorker]) {
    const instanceString = (instance === BatWorker) ? 'worker' : 'main';

    it(`should be lower than performance threshold (${instanceString})`, () => {
      cy.getFramesFromFile('audio_samples/test_en.wav').then( async inputPcm => {
        await testPerformance(instance, inputPcm);
      });
    });
  }
});
