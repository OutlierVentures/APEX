const fs = require('fs');
const path = require('path');
const Web3 = require('web3');
const dotenv = require('dotenv');
const Sample = artifacts.require('Sample.sol');
const {Enigma, utils, eeConstants} = require('enigma-js/node');

dotenv.config({path:path.resolve(process.cwd(), '..', '.env')});

const migrationsFolder = process.cwd();   // save it because it changes later on...

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
const provider = new Web3.providers.HttpProvider('http://localhost:9545');
const web3 = new Web3(provider);
var enigma = null;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deploySecretContract(config){
  console.log(`Deploying Secret Contract "${config.filename}"...`);
  var scTask;
  var preCode;

  try {
    preCode = fs.readFileSync(path.resolve(migrationsFolder, '../build/secret_contracts', config.filename));
  } catch(e) {
    console.log('Error:', e.stack);
  }

  scTask = await new Promise((resolve, reject) => {
    enigma.deploySecretContract(config.fn, config.args, config.gasLimit, config.gasPrice, config.from, preCode)
      .on(eeConstants.DEPLOY_SECRET_CONTRACT_RESULT, (receipt) => resolve(receipt))
      .on(eeConstants.ERROR, (error) => reject(error));
  });

  // Wait for the confirmed deploy contract task
  do {
    await sleep(1000);
    scTask = await enigma.getTaskRecordStatus(scTask);
    process.stdout.write('Waiting. Current Task Status is '+scTask.ethStatus+'\r');
  } while (scTask.ethStatus != 2);
  process.stdout.write('Completed. Final Task Status is '+scTask.ethStatus+'\n');

  // Verify deployed contract
  var result = await enigma.admin.isDeployed(scTask.scAddr);
  if(result) {

    fs.writeFile(path.resolve(migrationsFolder, '../test/', config.filename.replace(/\.wasm$/, '.txt')), scTask.scAddr, 'utf8', function(err) {
      if(err) {
        return console.log(err);
      }
    });

    return scTask.scAddr;
  } else {
    console.log('Something went wrong deploying Secret Contract "${contract}", aborting');
    process.exit();
  }
}

module.exports = async function(deployer, network, accounts) {

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

  // Deploy your Smart and Secret contracts below this point:

  deployer.deploy(Sample).then(function(){
    console.log(`Smart Contract "Sample.Sol" has been deployed at ETH address: ${Sample.address}`);
    return;
  });

  const config = {
    filename: 'simple_addition.wasm',
    fn: 'construct()',
    args: '',
    gasLimit: 100000,
    gasPrice: utils.toGrains(1),
    from: accounts[0]
  };
  const address = await deploySecretContract(config);
  console.log(`Secret Contract "${config.filename}" deployed at Enigma address: ${address}`);
};