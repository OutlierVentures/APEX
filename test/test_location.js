const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const {Enigma, utils, eeConstants} = require('enigma-js/node');

var EnigmaContract;
if(typeof process.env.SGX_MODE === 'undefined' || (process.env.SGX_MODE != 'SW' && process.env.SGX_MODE != 'HW' )) {
    console.log(`Error reading ".env" file, aborting....`);
    process.exit();
} else if (process.env.SGX_MODE == 'SW') {
  EnigmaContract = require('../build/enigma_contracts/EnigmaSimulation.json');
} else {
  EnigmaContract = require('../build/enigma_contracts/Enigma.json');
}
const EnigmaTokenContract = require('../build/enigma_contracts/EnigmaToken.json');


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let enigma = null;
let contractAddr;

contract("Location", accounts => {
  before(function() {
    enigma = new Enigma(
      web3,
      EnigmaContract.networks['4447'].address,
      EnigmaTokenContract.networks['4447'].address,
      'http://localhost:3333',
      {
        gas: 4712388,
        gasPrice: 100000000000,
        from: accounts[0],
      },
    );
    enigma.admin();
    enigma.setTaskKeyPair('cupcake');
    contractAddr = fs.readFileSync('test/location.txt', 'utf-8');
  });

  let task;

  // Add first location
  it('should add the first location', async () => {
    let taskFn = 'add_location(int32,int32)';
    let taskArgs = [
      [40000000],
      [-8000000],
    ];
    let taskGasLimit = 500000;
    let taskGasPx = utils.toGrains(1);
    task = await new Promise((resolve, reject) => {
      enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
          .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
          .on(eeConstants.ERROR, (error) => reject(error));
    });
  });

  it('should get the pending task', async () => {
    task = await enigma.getTaskRecordStatus(task);
    expect(task.ethStatus).to.equal(1);
  });

  it('should get the confirmed task', async () => {
    do {
      await sleep(1000);
      task = await enigma.getTaskRecordStatus(task);
      process.stdout.write('Waiting. Current Task Status is '+task.ethStatus+'\r');
    } while (task.ethStatus !== 2);
    expect(task.ethStatus).to.equal(2);
    process.stdout.write('Completed. Final Task Status is '+task.ethStatus+'\n');
  }, 10000);

  // Add second location
  it('should add the second location', async () => {
      let taskFn = 'add_location(in32,int32)';
      let taskArgs = [
          [30000000, 'int32'],
          [50000000, 'int32'],
      ];
      let taskGasLimit = 500000;
      let taskGasPx = utils.toGrains(1);
      task = await new Promise((resolve, reject) => {
        enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
            .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
            .on(eeConstants.ERROR, (error) => reject(error));
      });
  });

  it('should get the pending task', async () => {
      task = await enigma.getTaskRecordStatus(task);
      expect(task.ethStatus).to.equal(1);
  });

  it('should get the confirmed task', async () => {
      do {
          await sleep(1000);
          task = await enigma.getTaskRecordStatus(task);
          process.stdout.write('Waiting. Current Task Status is '+task.ethStatus+'\r');
      } while (task.ethStatus !== 2);
      expect(task.ethStatus).to.equal(2);
      process.stdout.write('Completed. Final Task Status is '+task.ethStatus+'\n');
  }, 10000);

  // Compute northernmost location
  it('should compute the northernmost location', async () => {
      let taskFn = 'compute_northernmost()';
      let taskArgs = [];
      let taskGasLimit = 500000;
      let taskGasPx = utils.toGrains(1);
      task = await new Promise((resolve, reject) => {
          enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
              .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
              .on(eeConstants.ERROR, (error) => reject(error));
      });
  });

  it('should get the pending task', async () => {
      task = await enigma.getTaskRecordStatus(task);
      expect(task.ethStatus).to.equal(1);
  });

  it('should get the confirmed task', async () => {
      do {
          await sleep(1000);
          task = await enigma.getTaskRecordStatus(task);
          process.stdout.write('Waiting. Current Task Status is '+task.ethStatus+'\r');
      } while (task.ethStatus !== 2);
      expect(task.ethStatus).to.equal(2);
      process.stdout.write('Completed. Final Task Status is '+task.ethStatus+'\n');
  }, 10000);

  it('should get the result and verify the computation is correct', async () => {
    task = await new Promise((resolve, reject) => {
      enigma.getTaskResult(task)
        .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
        .on(eeConstants.ERROR, (error) => reject(error));
    });
    expect(task.engStatus).to.equal('SUCCESS');
    task = await enigma.decryptTaskResult(task);
    expect(web3.eth.abi.decodeParameters([{
        type: 'int32',
        name: 'northernmost',
    }], task.decryptedOutput).northernmost).to.equal(40000000);
  });
});