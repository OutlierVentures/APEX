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
    fn write_data(data: String, address: String);
    fn read_data(address: String) -> String;
}

pub struct Contract;

impl ContractInterface for Contract {

    fn write_data(data: String, address: String) {
        let eth_contract = EthContract::new(&address);
        eth_contract.writeData(data);
    }

    fn read_data(address: String) -> String {
        let eth_contract = EthContract::new(&address);
        eth_contract.readData();
        eformat!("ABIs still in dev")
    }

}