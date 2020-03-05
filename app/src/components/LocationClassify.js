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
import { classify } from "../actions";
// Imports - enigma-js client library utility packages
import { utils, eeConstants } from 'enigma-js';
import * as assert from 'assert';
const Point = ({ text }) => <div>{text}</div>;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class LocationClassify extends Component {
    constructor(props) {
        super(props);
        this.onAddLocationWithClass = this.onAddLocationWithClass.bind(this);
        this.onClassify = this.onClassify.bind(this);
    }

    // Redux form/material-ui render net worth text field component
    static renderLocationInput({label, input, meta: { touched, invalid, error }, ...custom }) {
        return (
            <TextField
                label={label}
                type="text"
                multiline
                rows="10"
                placeholder={label}
                 error={touched && invalid}
                helperText={touched && error}
                {...input}
                {...custom}
                fullWidth
            />
        )
    }

    // Redux form callback when add training data is submitted
    async onAddLocationWithClass({ locationwithclassstring } ) {
        // Sanitise input - check for valid JSON of latitudes / longitudes.
        try {
            var locations = JSON.parse(locationwithclassstring);
            assert(Array.isArray(locations));
            for (var i = 0; i < locations.length; i++) {
                var keys = Object.keys(locations[i]);
                assert(keys.length === 3);
                assert(keys[0] === "latitude");
                assert(keys[1] === "longitude");
                assert(keys[2] === "class");
                assert(typeof locations[i].latitude === "number" && Math.abs(locations[i].latitude) < 90.0);
                assert(typeof locations[i].longitude === "number" && Math.abs(locations[i].longitude) < 180.0);
                assert(typeof locations[i].class === "number" && Math.abs(locations[i].class) >= 0.0);
            }
        } catch {
            openSnackbar({ message: 'Invalid input: must be array of JSON latitude/longitude/class points' });
            return
        }
        // Create compute task metadata
        // computeTask(
        //      fn - the signature of the function we are calling (Solidity-types, no spaces)
        //      args - the args passed into our method w/ format [[arg_1, type_1], [arg_2, type_2], …, [arg_n, type_n]]
        //      gasLimit - ENG gas units to be used for the computation task
        //      gasPx - ENG gas price to be used for the computation task in grains format (10⁸)
        //      sender - Ethereum address deploying the contract
        //      scAddr - the secret contract address for which this computation task belongs to
        // )
        const taskFn = 'add_training_data(string)';
        // Multiply by 1M as contracts only take ints
        const taskArgs = [[locationwithclassstring, 'string']];
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
                        openSnackbar({ message: 'Failed to add training data'});
                    }
                    reject(error);
                });
        });
        openSnackbar({ message: 'Task pending: adding training data' });
        while (task.ethStatus === 1) {
            // Poll for task record status and finality on Ethereum after worker has finished computation
            task = await this.props.enigma.getTaskRecordStatus(task);
            await sleep(1000);
        }
        // ethStatus === 2 means task has successfully been computed and committed on Ethereum
        task.ethStatus === 2 ?
            openSnackbar({ message: 'Task succeeded: added training data' })
            :
            openSnackbar({ message: 'Task failed: did not add training data' })
        ;
        this.props.reset('addLocationWithClass');
    }

    // Callback when classify button is clicked
    async onClassify() {
        // Create compute task metadata
        const taskFn = 'classify()';
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
                        openSnackbar({ message: 'Failed to run classification'});
                    }
                    reject(error);
                });
        });
        openSnackbar({ message: 'Task pending: classification' });
        while (task.ethStatus === 1) {
            task = await this.props.enigma.getTaskRecordStatus(task);
            await sleep(1000);
        }
        if (task.ethStatus === 2) {
            openSnackbar({ message: 'Task succeeded: classification' });
            // Get task result by passing in existing task - obtains the encrypted, abi-encoded output
            task = await new Promise((resolve, reject) => {
                this.props.enigma.getTaskResult(task)
                    .on(eeConstants.GET_TASK_RESULT_RESULT, (result) => resolve(result))
                    .on(eeConstants.ERROR, (error) => reject(error));
            });
            // Decrypt the task result - obtains the decrypted, abi-encoded output
            task = await this.props.enigma.decryptTaskResult(task);
            // Abi-decode the output to its desired components
            const classesAddress = this.props.enigma.web3.eth.abi.decodeParameters([{
                type: 'string',
                name: 'classes',
            }], task.decryptedOutput).classes;
            this.props.classify(classesAddress);
        } else {
            console.log(task)
            openSnackbar({ message: 'Task failed: did not run classification' });
        }
    }

    render() {
        if (this.props.deployedLocationContract === null) {
            return (
                <div>
                    <Message color="red">Secret contract not yet deployed...</Message>
                </div>
            )
        }
        // Render each class frequency on a new line
        let classOutput = this.props.classes.split('. ').map((item, i) => {
            return <p key={i}>{item}</p>;
        });
        return (
            <div>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <div>
                            <Notifier />
                            <h4>Add Classifier Training Data</h4>
                            <form>
                                <div>
                                    <Field
                                        name="locationwithclassstring"
                                        component={LocationClassify.renderLocationInput}
                                        label="Location with class JSON array"
                                    />
                                </div>
                                <br />
                                <div>
                                    <Button
                                        onClick={this.props.handleSubmit(this.onAddLocationWithClass)}
                                        variant='outlined'
                                        color='primary'>
                                        Submit
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Grid>
                    </Grid>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <div>
                            <h4>Classify Telco Users</h4>
                            <div>
                                <form>
                                    <div>
                                        <Button
                                            onClick={this.props.handleSubmit(this.onClassify)}
                                            variant='outlined'
                                            color='primary'>
                                            Submit
                                        </Button>
                                        <br /><br />
                                        {classOutput}
                                    </div>
                                </form>
                            </div> 
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
        classes: state.classes !== null ? state.classes : ""
    }
};
export default connect(mapStateToProps, { classify })(reduxForm({
    form: 'addLocationWithClass',
})(LocationClassify));
