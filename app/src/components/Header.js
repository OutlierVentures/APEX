// Imports - React
import React, { Component } from "react";
import PropTypes from "prop-types";
// Imports - Frameworks (Semantic-UI and Material-UI)
import { withStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
    root: {
        flexGrow: 1
    }
});


class Header extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        const { classes } = this.props;
        return (
            <div className={classes.root}>
                <AppBar position="static">
                    <Toolbar>
                        <img id="ovlogo" src="https://outlierventures.io/wp-content/themes/ov/assets/images/outlierventureslogo.svg" />
                        <Typography
                            variant="subtitle1"
                            color="inherit"
                        >
                            Telco Industry-wide Analytics
                        </Typography>
                    </Toolbar>
                </AppBar>
            </div>
        );
    }
}

Header.propTypes = {
    classes: PropTypes.object.isRequired
};

export default withStyles(styles)(Header);
