# Enigma Supply Chain

Shared industry analytics for supply chain enterprises. Enigma private compute allows all participants to share in industry-wide analytics without revealing any information regarding their own operations.

## Requirements

- Linux with Docker.

## Install

```sh
./scripts/install.sh
```

## Run

```sh
discovery start
discovery compile
disvovery migrate
discovery test
```

## Start the DApp

```sh
cd app
npm start
```

This uses the HTTP Web3 provider to connect to a local Ganache network configured in truffle.js. To use MetaMask, set the Web3 provider to do so and **change the address field from a dropdown to a text field.**

Test: `npm test`
Build: `npm run build`
For more details, see the [Enigma React template](https://github.com/enigmampc/discovery-template-dapp).


## Debugging

If you're unable to connect to Docker when running discovery start, add yourself to the docker group (below) then log out and log back in:

```sh
sudo usermod -aG docker $USER
```

If you're getting a file/directory does not exist error on `discovery compile`, it's likely you've run `discovery start` in a different directory. Just run `discovery start` in this directory.

If you're getting an `unable to resolve EnigmaSimulation.json` error, copy the contents of your `build` folder to the `app/src/build` folder.
