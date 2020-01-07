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
use rusty_machine::learning::SupModel; // Used by model.train

// Encrypted state keys
static LOCATIONS: &str = "locations";

// Structs
#[derive(Serialize, Deserialize, Clone)]
pub struct Location {
    // Multiply by 1M - contracts only support integers
    latitude: i32,
    longitude: i32,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LocationInput {
    latitude: f64,
    longitude: f64,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LocationWithClassInput {
    latitude: f64,
    longitude: f64,
    class: i32,
}


struct LocationContract;

#[pub_interface]

impl LocationContract {

    // GET LOCATION DATA FROM CONTRACT STATE
    fn get_locations() -> Vec<Location> {
        read_state!(LOCATIONS).unwrap_or_default()
    }

    // ADD LAT/LONG LOCATION DATA TO CONTRACT STATE
    // Input latitude and longitude X1M (multiplied in EnigmaJS) as Enigma can't store floats
    pub fn add_location(lat_long_json: String) {
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

    // TRAIN CLASSIFIER
    // Could add shared training, i.e. contract state has LocationWithClass
    // In this case all parties must agree on the number of classes
    pub fn train_classifier(lat_long_class_json: String) -> NaiveBayes::<Gaussian> {
        // Deserialise data
        let array: Vec<LocationWithClassInput> = serde_json::from_str(&lat_long_class_json).unwrap();
        // Write data to matrices
        let mut locations: Vec<f64> = Vec::new();
        let mut classes: Vec<i32> = Vec::new();
        for elem in array.iter() {
            locations.push(elem.latitude as f64);
            locations.push(elem.longitude as f64);
            classes.push(elem.class as i32);
        }
        let num_points = locations.len();
        let inputs = Matrix::new(num_points, 2, locations);
        // Create classes matrix
        let num_classes = *classes.iter().max().unwrap() as usize; // FIXME Will panic on empty list
        let mut class_matrix: Vec<f64> = Vec::new();
        for elem in &classes {
            let mut row = Vec::new();
            row.resize(num_classes, 0f64);
            let index = (elem - 1) as usize;
            row[index] = 1.0;
            class_matrix.extend(&row)
        }
        let targets = Matrix::new(num_points, num_classes, class_matrix);
        // Train Gaussian Naive Bayes classifer on matrix
        let mut model = NaiveBayes::<Gaussian>::new();
        model.train(&inputs, &targets).unwrap();
        model
    }

    // CLASSIFY LOCATIONS IN CONTRACT STATE
    // Will need to train model on labelled data first
    pub fn classify(model: NaiveBayes::<Gaussian>) -> String {
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
        eformat!("{}", outputs)
    }

}
