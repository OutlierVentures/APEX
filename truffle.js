// See <http://truffleframework.com/docs/advanced/configuration>
// to customize your Truffle configuration!
module.exports = {
    networks: {
        development: {
            host: 'localhost',
            port: 9545,
            network_id: '4447' // Match ganache network id
        },
    },
    solc: {
        // Turns on the Solidity optimizer. For development the optimizer's
        // quite helpful, just remember to be careful, and potentially turn it
        // off, for live deployment and/or audit time. For more information,
        // see the Truffle 4.0.0 release notes.
        //
        // https://github.com/trufflesuite/truffle/releases/tag/v4.0.0
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
}
