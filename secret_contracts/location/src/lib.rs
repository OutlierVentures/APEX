// Built-In Attributes
#![no_std]

// Imports
extern crate eng_wasm;
extern crate eng_wasm_derive;
extern crate serde;

use eng_wasm::*;
use eng_wasm_derive::pub_interface;
use serde::{Serialize, Deserialize};

// Encrypted state keys
static LOCATIONS: &str = "locations";

// Structs
#[derive(Serialize, Deserialize)]
pub struct Location {
    // Multiply by 1M - contracts only support integers
    latitude: i32,
    longitude: i32,
}

// Public struct Contract which will consist of private and public-facing secret contract functions
pub struct Contract;

// Private functions accessible only by the secret contract
impl Contract {
    fn get_locations() -> Vec<Location> {
        read_state!(LOCATIONS).unwrap_or_default()
    }
}

// Public trait defining public-facing secret contract functions
#[pub_interface]
pub trait ContractInterface{
    fn add_location(latitude: i32, longitude: i32);
    fn compute_northernmost() -> i32;
}

// Implementation of the public-facing secret contract functions defined in the ContractInterface
// trait implementation for the Contract struct above
impl ContractInterface for Contract {
    #[no_mangle]
    fn add_location(latitude: i32, longitude: i32) {
        let mut locations = Self::get_locations();
        locations.push(Location {
            latitude,
            longitude,
        });
        write_state!(LOCATIONS => locations);
    }

    #[no_mangle]
    fn compute_northernmost() -> i32 {
        match Self::get_locations().iter().max_by_key(|m| m.latitude) {
            Some(location) => {
                location.latitude
            },
            None => i32::zero(),
        }
    }
}