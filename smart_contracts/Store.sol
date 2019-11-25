
pragma solidity ^0.5.13;
contract Chainterface {

    string serialisedData;
    address owner;
    
    constructor() public {
    }

    function writeData(string memory data) public {
        if (msg.sender == owner) {
            serialisedData = data; 
        }
    }
    
    function readData() public view returns (string memory) {
        return serialisedData;
    } 

}