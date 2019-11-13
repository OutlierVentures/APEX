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

contract("MillionairesProblem", accounts => {
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
    contractAddr = fs.readFileSync('test/millionaires_problem.txt', 'utf-8');
  });

  let task;

  // ADDING FIRST MILLIONAIRE
  it('should execute compute task to add the first millionaire', async () => {
    let taskFn = 'add_millionaire(address,uint256)';
    let taskArgs = [
      [accounts[1], 'address'],
      [1000000, 'uint256'],
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

  // ADDING SECOND MILLIONAIRE
  it('should execute compute task to add the second millionaire', async () => {
      let taskFn = 'add_millionaire(address,uint256)';
      let taskArgs = [
          [accounts[2], 'address'],
          [2000000, 'uint256'],
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

  // COMPUTING RICHEST MILLIONAIRE
  it('should execute compute task to compute richest millionaire', async () => {
      let taskFn = 'compute_richest()';
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
        type: 'address',
        name: 'richestMillionaire',
    }], task.decryptedOutput).richestMillionaire).to.equal(accounts[2]);
  });
});