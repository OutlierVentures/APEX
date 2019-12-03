#![no_std]
extern crate eng_wasm;
extern crate eng_wasm_derive;
extern crate serde;
extern crate cogset;
use eng_wasm::*;
use eng_wasm_derive::pub_interface;
use serde::{Serialize, Deserialize};
use cogset::{Euclid, Kmeans};

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

    fn get_locations() -> Vec<Location> {
        read_state!(LOCATIONS).unwrap_or_default()
    }

    // Input latitude and longitude X1M (multiplied in EnigmaJS) as Enimga can't store floats
    pub fn add_location(latitude: i32, longitude: i32) {
        let mut locations = Self::get_locations();
        locations.push(Location{latitude, longitude});
        write_state!(LOCATIONS => locations);
    }

    pub fn cluster(num_clusters: i32) -> String {
        let locations = Self::get_locations();
        let mut eucvec: Vec<Euclid<_>> = Vec::new();
        for point in &locations {
            eucvec.push(Euclid([point.latitude as f64, point.longitude as f64]));
        }
        let kmeans = Kmeans::new(&eucvec, num_clusters as usize);
        let clusters = kmeans.clusters();
        let mut clustvec: Vec<(f64, f64)> = Vec::new();
        for result in &clusters {
            // Divide by 1M as input is multiplied by 1M - can only store ints
            clustvec.push(((result.0).0[0] / 1000000.0, (result.0).0[1] / 1000000.0));
        } 
        eformat!("{:?}", clustvec)
    }
}





