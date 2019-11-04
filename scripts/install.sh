#!/bin/bash

onred='\033[41m'
ongreen='\033[42m'
onyellow='\033[43m'
endcolor="\033[0m"

# Handle errors
set -e
error_report() {
    echo -e "${onred}Error: failed on line $1.$endcolor"
}
trap 'error_report $LINENO' ERR

if [[ "$OSTYPE" != "linux-gnu" ]]; then
    echo -e "${onred}OS not supported. This software runs on Linux.$endcolor"
fi

echo -e "${onyellow}Installing core tools...$endcolor"

sudo apt-get update
sudo apt-get install build-essential
curl https://sh.rustup.rs -sSf | sh -s -- -y
export PATH="$HOME/.cargo/bin:$PATH" # Use rustc without having to relog

echo -e "${onyellow}Installing Enigma...$endcolor"

curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g @enigmampc/discovery-cli --unsafe-perm=true
