// This is a version of the location contract with an ML model featuring collaborative training

#![no_std]
extern crate eng_wasm;
extern crate eng_wasm_derive;
extern crate serde;
extern crate serde_json;
extern crate cogset;
extern crate rusty_machine;
use eng_wasm::*;
use eng_wasm_derive::pub_interface;
use serde::{Serialize, Deserialize};
use cogset::{Euclid, Kmeans};
use rusty_machine::learning::naive_bayes::{NaiveBayes, Gaussian};
use rusty_machine::linalg::Matrix;
use rusty_machine::learning::SupModel; // Used by model.train()
use rusty_machine::prelude::BaseMatrix; // Used by outputs.sum_rows()

// Encrypted state keys
static LOCATIONS: &str = "locations";
static TRAININGDATA: &str = "trainingdata";

// Structs
#[derive(Serialize, Deserialize, Clone)]
pub struct Location {
    // Multiply by 1M - contracts only support integers
    latitude: i32,
    longitude: i32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LocationInput {
    // Multiply by 1M - contracts only support integers
    latitude: f64,
    longitude: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LocationWithClass {
    latitude: i32,
    longitude: i32,
    class: i32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LocationWithClassInput {
    latitude: f64,
    longitude: f64,
    class: f64, // Float as EnigmaJS only sanitises to number type - cast to int in contract
}


struct LocationContract;

#[pub_interface]

impl LocationContract {

    // GET LOCATION DATA FROM CONTRACT STATE
    fn get_locations() -> Vec<Location> {
        read_state!(LOCATIONS).unwrap_or_default()
    }

    // GET TRAINING DATA FROM CONTRACT STATE
    fn get_training_data() -> Vec<LocationWithClass> {
        read_state!(TRAININGDATA).unwrap_or_default()
    }

    // ADD LAT/LONG LOCATION DATA TO CONTRACT STATE
    // Input latitude and longitude X1M as Enigma can't store floats
    pub fn add_location(lat_long_json: String) {
        // Input sanitised in EngimaJS to number type - but we must cast to int
        let array: Vec<LocationInput> = serde_json::from_str(&lat_long_json).unwrap();
        let mut tostore: Vec<Location> = Vec::new();
        for elem in array.iter() {
            tostore.push(
                Location {
                    latitude: (elem.latitude * 1000000.0) as i32,
                    longitude: (elem.longitude * 1000000.0) as i32
                }
            );
        }
        let mut locations = Self::get_locations();
        for elem in tostore.iter().cloned() {
            locations.push(elem);
        }
        write_state!(LOCATIONS => locations);
    }

    // ADD LAT/LONG/CLASS TRAINING DATA TO CONTRACT STATE
    // Input latitude and longitude X1M as Enigma can't store floats
    pub fn add_training_data(lat_long_class_json: String) {
        // Input sanitised in EngimaJS to number type - but we must cast to int
        let array: Vec<LocationWithClassInput> = serde_json::from_str(&lat_long_class_json).unwrap();
        let mut tostore: Vec<LocationWithClass> = Vec::new();
        for elem in array.iter() {
            tostore.push(
                LocationWithClass {
                    latitude: (elem.latitude * 1000000.0) as i32,
                    longitude: (elem.longitude * 1000000.0) as i32,
                    class: elem.class as i32
                }
            );
        }
        let mut training_data = Self::get_training_data();
        for elem in tostore.iter().cloned() {
            training_data.push(elem);
        }
        write_state!(TRAININGDATA => training_data);
    }

    // CLUSTER LOCATIONS IN CONTRACT STATE
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

    // TRAIN CLASSIFIER ON TRAINING DATA AND RUN ON LOCATION DATA, BOTH FROM CONTRACT STATE
    pub fn classify() -> String {
        let array = Self::get_training_data();
        // Write data to matrices
        let mut locations: Vec<f64> = Vec::new();
        let mut classes: Vec<i32> = Vec::new();
        for elem in array.iter() {
            locations.push(elem.latitude as f64);
            locations.push(elem.longitude as f64);
            classes.push(elem.class as i32);
        }
        let num_points = classes.len();
        let inputs = Matrix::new(num_points, 2, locations);
        // Create classes matrix - note classes start at 0
        let num_classes = (classes.iter().cloned().max().unwrap() + 1) as usize; // FIXME Will panic on empty list
        let mut class_matrix: Vec<f64> = Vec::new();
        for elem in &classes {
            let mut row = Vec::new();
            row.resize(num_classes, 0f64);
            let index = *elem as usize;
            row[index] = 1.0;
            class_matrix.extend(row.iter().cloned());
        }
        let targets = Matrix::new(num_points, num_classes, class_matrix);
        // Train Gaussian Naive Bayes classifer on matrix
        let mut model = NaiveBayes::<Gaussian>::new();
        model.train(&inputs, &targets).unwrap();
        // Get location data from contract state
        let locations = Self::get_locations();
        let mut input: Vec<f64> = Vec::new();
        for point in &locations {
            input.push(point.latitude as f64);
            input.push(point.longitude as f64);
        }
        // Create matrix for model
        let num_points = locations.len();
        let matrix = Matrix::new(num_points, 2, input);
        // Predict using trained model
        let outputs = model.predict(&matrix).unwrap();
        let frequency_array = outputs.sum_rows(); // Rows are columns for rusty-machine matrices
        let mut outputstring = String::new();
        for (class, frequency) in frequency_array.iter().enumerate() {
            let this_freq = eformat!("Class {}: {}. ", class, frequency);
            outputstring += &this_freq;
        }
        eformat!("{}", outputstring)
    }

}
