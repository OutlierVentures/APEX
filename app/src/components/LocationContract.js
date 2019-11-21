// Imports - React
import React, { Component } from 'react';
// Imports - Redux
import { connect } from 'react-redux';
import { Field, reduxForm } from 'redux-form';
// Imports - Frameworks (Semantic-UI and Material-UI)
import { Message } from "semantic-ui-react";
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import FormControl from "@material-ui/core/FormControl/FormControl";
import InputLabel from "@material-ui/core/InputLabel/InputLabel";
import Select from "@material-ui/core/Select/Select";
import TextField from "@material-ui/core/TextField/TextField";
// Imports - Components
import Notifier, {openSnackbar} from "./Notifier";
// Imports - Reducers (Redux)
import { computeClusters } from "../actions";
// Imports - enigma-js client library utility packages
import { utils, eeConstants } from 'enigma-js';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class LocationContract extends Component {
    constructor(props) {
        super(props);
        this.onAddLocation = this.onAddLocation.bind(this);
        this.oncomputeClusters = this.oncomputeClusters.bind(this);
    }

    // Redux form/material-ui render net worth text field component
    static renderLocationInput({label, input, meta: { touched, invalid, error }, ...custom }) {
        return (
            <TextField
                label={label}
                type="number"
                placeholder={label}
                 error={touched && invalid}
                helperText={touched && error}
                {...input}
                {...custom}
                fullWidth
            />
        )
    }

    // Redux form callback when add location info is submitted
    async onAddLocation({ latitude, longitude } ) {
        // Create compute task metadata
        // computeTask(
        //      fn - the signature of the function we are calling (Solidity-types, no spaces)
        //      args - the args passed into our method w/ format [[arg_1, type_1], [arg_2, type_2], …, [arg_n, type_n]]
        //      gasLimit - ENG gas units to be used for the computation task
        //      gasPx - ENG gas price to be used for the computation task in grains format (10⁸)
        //      sender - Ethereum address deploying the contract
        //      scAddr - the secret contract address for which this computation task belongs to
        // )
        const taskFn = 'add_location(int32,int32)';
        // Multiply by 1M as contracts only take ints
        const taskArgs = [
            [latitude * 1000000, 'int32'],
            [longitude * 1000000, 'int32'],
        ];
        const taskGasLimit = 10000000;
        const taskGasPx = utils.toGrains(1e-7);
        let task = await new Promise((resolve, reject) => {
            this.props.enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, this.props.accounts[0],
                this.props.deployedLocationContract)
                .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => {
                    if (error.hasOwnProperty('message')){
                        openSnackbar({ message: error.message});
                    } else {
                        openSnackbar({ message: 'Failed to add location'});
                    }
                    reject(error);
                });
        });
        openSnackbar({ message: 'Task pending: adding location' });
        while (task.ethStatus === 1) {
            // Poll for task record status and finality on Ethereum after worker has finished computation
            task = await this.props.enigma.getTaskRecordStatus(task);
            await sleep(1000);
        }
        // ethStatus === 2 means task has successfully been computed and committed on Ethereum
        task.ethStatus === 2 ?
            openSnackbar({ message: 'Task succeeded: added location' })
            :
            openSnackbar({ message: 'Task failed: did not add location' })
        ;
        this.props.reset('addLocation');
    }

    // Callback when compute northernmost button is clicked
    async oncomputeClusters() {
        // Create compute task metadata
        const taskFn = 'cluster()';
        const taskArgs = [];
        const taskGasLimit = 10000000;
        const taskGasPx = utils.toGrains(1e-7);
        let task = await new Promise((resolve, reject) => {
            this.props.enigma.computeTask(taskFn, taskArgs, taskGasLimit, taskGasPx, this.props.accounts[0],
                this.props.deployedLocationContract)
                .on(eeConstants.SEND_TASK_INPUT_RESULT, (result) => resolve(result))
                .on(eeConstants.ERROR, (error) => {
                    if (error.hasOwnProperty('message')){
                        openSnackbar({ message: error.message});
                    } else {
                        openSnackbar({ message: 'Failed to compute northernmost'});
                    }
                    reject(error);
                });
        });
        openSnackbar({ message: 'Task pending: computing northernmost location' });
        while (task.ethStatus === 1) {
            task = await this.props.enigma.getTaskRecordStatus(task);
            await sleep(1000);
        }
        if (task.ethStatus === 2) {
            openSnackbar({ message: 'Task succeeded: computed northernmost location' });
            // Get task result by passing in existing task - obtains the encrypted, abi-encoded output
            task = await new Promise((resolve, reject) => {
                this.props.enigma.getTaskResult(task)
                    .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
                    .on(eeConstants.ERROR, (error) => reject(error));
            });
            // Decrypt the task result - obtains the decrypted, abi-encoded output
            task = await this.props.enigma.decryptTaskResult(task);
            // Abi-decode the output to its desired components
            const northernmostLocationAddress = this.props.enigma.web3.eth.abi.decodeParameters([{
                type: 'string',
                name: 'northernmostLocation',
            }], task.decryptedOutput).northernmostLocation;
            this.props.computeClusters(northernmostLocationAddress);
        } else {
            openSnackbar({ message: 'Task failed: did not compute northernmost location' });
        }
    }

    render() {
        if (this.props.deployedLocationContract === null) {
            return (
                <div>
                    <Message color="red">Location secret contract not yet deployed...</Message>
                </div>
            )
        }
        return (
            <div>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <h3>Location Secret Contract Address: {this.props.deployedLocationContract}</h3>
                    </Grid>
                    <Grid item xs={6}>
                        <div>
                            <Notifier />
                            <h4>Enter Customer Location</h4>
                            <form>
                                <div>
                                    <Field
                                        name="latitude"
                                        component={LocationContract.renderLocationInput}
                                        label="Latitude"
                                    />
                                </div>
                                <br />
                                <div>
                                    <Field
                                        name="longitude"
                                        component={LocationContract.renderLocationInput}
                                        label="Longitude"
                                    />
                                </div>
                                <br />
                                <div>
                                    <Button
                                        onClick={this.props.handleSubmit(this.onAddLocation)}
                                        variant='outlined'
                                        color='secondary'>
                                        Submit
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Grid>
                    <Grid item xs={6}>
                        <div>
                            <h4>Northernmost Telco User</h4>
                            <p>
                                {
                                    this.props.northernmostLocation !== null ?
                                        this.props.northernmostLocation // Divide result by 1M again to get latitude
                                        :
                                        "Not yet computed"
                                }
                            </p>
                            <Button
                                onClick={this.oncomputeClusters}
                                variant='contained'
                                color='primary'>
                                Compute Northernmost
                            </Button>
                        </div>
                    </Grid>
                </Grid>
            </div>
        )
    }
}
const mapStateToProps = (state) => {
    return {
        enigma: state.enigma,
        accounts: state.accounts,
        deployedLocationContract: state.deployedLocationContract,
        northernmostLocation: state.northernmostLocation
    }
};
export default connect(mapStateToProps, { computeClusters })(reduxForm({
    form: 'addLocation',
})(LocationContract));
