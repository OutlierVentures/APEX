#![no_std]
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


struct LocationContract;

#[pub_interface]

impl LocationContract {
        // private
        fn get_locations() -> Vec<Location> {
        read_state!(LOCATIONS).unwrap_or_default()
    }

        // public
        pub fn add_location(latitude: i32, longitude: i32) {
                let mut locations = Self::get_locations();
                locations.push(
                        Location {
                                latitude,
                                longitude,
                        }
                );

                write_state!(LOCATIONS => locations);
        }

        pub fn compute_northernmost() -> i32 {
                match Self::get_locations().iter().max_by_key(|m| m.latitude) {
                        Some(location) => {
                                location.latitude
                        },
                        None => 0 as i32,
                }
        }
}
