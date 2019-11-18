const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const LocationContractContract = artifacts.require("LocationContract");
const { Enigma, utils, eeConstants } = require('enigma-js/node');

var EnigmaContract;
if (typeof process.env.SGX_MODE === 'undefined' || (process.env.SGX_MODE != 'SW' && process.env.SGX_MODE != 'HW')) {
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

contract("LocationContract", accounts => {
    let location1 = 10000000;
    let location2 = 20000000;
    let task;

    before(function() {
        enigma = new Enigma(
            web3,
            EnigmaContract.networks['4447'].address,
            EnigmaTokenContract.networks['4447'].address,
            'http://localhost:3333', {
                gas: 4712388,
                gasPrice: 100000000000,
                from: accounts[0],
            },
        );
        enigma.admin();
        enigma.setTaskKeyPair('cupcake');

        contractAddr = fs.readFileSync('test/location.txt', 'utf-8');
    })

    // Helper function to wait for final task completion
    async function finalTaskStatus() {
        do {
            await sleep(1000);
            task = await enigma.getTaskRecordStatus(task);
        } while (task.ethStatus != eeConstants.ETH_STATUS_VERIFIED && task.ethStatus != eeConstants.ETH_STATUS_FAILED);

        return task.ethStatus;
    }

    it('should add location #1', async() => {
        let taskFn = 'add_location(int32,int32)';
        let taskArgs = [
            [location1, 'int32'],
            [0, 'int32'],
        ];
        let taskGasLimit = 500000;
        let taskGasPx = utils.toGrains(1);
        task = await new Promise((resolve, reject) => {
            enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
                .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });
        expect(await finalTaskStatus()).to.equal(eeConstants.ETH_STATUS_VERIFIED);
    });

    it('should add location #2', async() => {
        let taskFn = 'add_location(int32,int32)';
        let taskArgs = [
            [location2, 'int32'],
            [30000000, 'int32'],
        ];
        let taskGasLimit = 500000;
        let taskGasPx = utils.toGrains(1);
        task = await new Promise((resolve, reject) => {
            enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
                .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });
        expect(await finalTaskStatus()).to.equal(eeConstants.ETH_STATUS_VERIFIED);
    });

    it('should execute task to compute northernmost location', async() => {
        let taskFn = 'compute_northernmost()';
        let taskArgs = [];
        let taskGasLimit = 500000;
        let taskGasPx = utils.toGrains(1);
        task = await new Promise((resolve, reject) => {
            enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, accounts[0], contractAddr)
                .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });
        expect(await finalTaskStatus()).to.equal(eeConstants.ETH_STATUS_VERIFIED);
    });

    it('should get the result and verify the computation of northernmost location is correct', async() => {
        // Get Enigma task result
        task = await new Promise((resolve, reject) => {
            enigma.getTaskResult(task)
                .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => reject(error));
        });
        expect(task.engStatus).to.equal('SUCCESS');

        // Decrypt Enigma task result
        task = await enigma.decryptTaskResult(task);
        let northernmostLocation = web3.eth.abi.decodeParameters([{
            type: 'int32',
            name: 'northernmostLocation',
        }], task.decryptedOutput).northernmostLocation;

        expect(northernmostLocation).to.equal(location2);
    });

});