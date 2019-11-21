import { combineReducers } from 'redux';
import { reducer as formReducer } from 'redux-form';

// Responds to initializeEnigma action to save enigma-js client library object
const initializeEnigmaReducer = (enigma = null, action) => {
    if (action.type === 'ENIGMA_INITIALIZED') {
        return action.payload;
    }

    return enigma;
};

// Responds to initializeAccounts action to save web3 accounts
const initializeAccountsReducer = (accounts = [], action) => {
    if (action.type === 'ACCOUNTS_INITIALIZED') {
        return action.payload;
    }

    return accounts;
};

// Responds to deployLocationContract action to save deployed location secret contract address
const deployedLocationContractReducer = (deployedLocationContract = null, action) => {
    if (action.type === 'LOCATION_CONTRACT_DEPLOYED') {
        return action.payload;
    }

    return deployedLocationContract;
};

// Responds to computeClusters action to save northernmost location
const computeClustersReducer = (clusters = null, action) => {
    if (action.type === 'NORTHERNMOST_LOCATION_COMPUTED') {
        return action.payload;
    }

    return clusters;
};

// Responds to notifyMessage action to save snackbar open status and any contained message
const notifyMessageReducer = (notification = { open: false, message: '' }, action) => {
    if (action.type === 'MESSAGE_NOTIFIED') {
        return action.payload;
    }

    return notification;
};

// Combine reducers to state variables named by the keys here; includes a redux-form reducer
export default combineReducers({
    enigma: initializeEnigmaReducer,
    accounts: initializeAccountsReducer,
    deployedLocationContract: deployedLocationContractReducer,
    clusters: computeClustersReducer,
    notification: notifyMessageReducer,
    form: formReducer
});