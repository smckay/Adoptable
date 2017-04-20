#!/bin/sh
# Install mongodb
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
echo "deb [ arch=amd64 ] http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
sudo apt-get update
sudo apt-get install -y mongodb-org
service mongod start
sudo mkdir /data
sudo mkdir /data/configdb
sudo mkdir /data/db
sudo chown -R `id -u` /data/configdb
sudo chown -R `id -u` /data/db

# Install NPM, Node, and Node modules
sudo apt-get install -y python-software-properties
curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
sudo apt-get install -y nodejs

# Download code and dependencies
sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/smckay/petflix.git
cd petflix
npm install
