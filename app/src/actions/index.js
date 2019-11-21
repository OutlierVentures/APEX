// Redux action for when enigma-js client library has been initialized
export const initializeEnigma = (enigma) => {
    return {
        type: 'ENIGMA_INITIALIZED',
        payload: enigma
    };
};

// Redux action for when web3 accounts have been initialized
export const initializeAccounts = (accounts) => {
    // TODO: change this back to using all accounts after issue is fixed
    return {
        type: 'ACCOUNTS_INITIALIZED',
        //payload: accounts
        // the 10th account is reserved for the enigma_km - @enigmampc/discovery-cli 0.1.3
        payload: accounts.slice(0, 9)
    };
};

// Redux action for when the contract has been deployed to a particular address
export const deployLocationContract = (deployedLocationContract) => {
    return {
        type: 'LOCATION_CONTRACT_DEPLOYED',
        payload: deployedLocationContract
    };
};

// Redux action for when clusters has been computed
export const computeClusters = (clusters) => {
    return {
        type: 'CLUSTERS_COMPUTED',
        payload: clusters
    };
};

// Redux action for notification message has been sent for snackbar display
export const notifyMessage = (notification) => {
    return {
        type: 'MESSAGE_NOTIFIED',
        payload: notification
    };
};