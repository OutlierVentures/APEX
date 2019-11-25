#![no_std]

extern crate eng_wasm;
extern crate eng_wasm_derive;

use eng_wasm::*;
use eng_wasm_derive::pub_interface;
use eng_wasm_derive::eth_contract;

use eng_wasm::String;

#[eth_contract("ABI.json")]
struct EthContract;

#[pub_interface]
pub trait ContractInterface{
    fn writeData(data: String);
    fn readData() -> String;
}

pub struct Contract;

impl ContractInterface for Contract {

    // Specify Eth contract here
    let eth_contract = EthContract::new("0x0000000000000000000000000000000000000000");

    fn writeData(data: String) {
        eth_contract.writeData(data);
    }

    fn readData(data: String) {
        eth_contract.readData()
    }

}