#!/bin/bash

export CHANNEL_ONE_NAME=channelone
export CHANNEL_ONE_PROFILE=ChannelOne
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

#Start the network
docker-compose -f docker-compose.yml up -d

#The channel creation is done by using the transaction tx that’s created in channel-artifacts folder.

docker exec cli peer channel create -o orderer.example.com:7050 -c $CHANNEL_ONE_NAME -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_ONE_NAME}.tx --tls --cafile $ORDERER_CA

#Join the Channel One as Org2 Peer

#Similarly we’ll change the environment variables to make the cli act as Org2 Peers and join the channel.

docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:7051" cli peer channel join -b ${CHANNEL_ONE_NAME}.block --tls --cafile $ORDERER_CA

#Join the Channel One as Org3 Peer

#Similarly we’ll change the environment variables to make the cli act as Org2 Peers and join the channel.

docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org3.example.com:7051" cli peer channel join -b ${CHANNEL_ONE_NAME}.block --tls --cafile $ORDERER_CA

export FIRST_CHAINCODE_NAME="firstchaincode"
export FIRST_CHAINCODE_SRC="github.com/chaincode/one"
export CHAINCODE_VERSION="1.0"

#Install Chaincode (firstchaincode) in Org1 Peer
docker exec cli peer chaincode install -n $FIRST_CHAINCODE_NAME -p $FIRST_CHAINCODE_SRC -v $CHAINCODE_VERSION

#Instantiate Chaincode (firstchaincode) in Org1 Peer

docker exec cli peer chaincode instantiate -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_ONE_NAME -c '{"Args":[]}' -n $FIRST_CHAINCODE_NAME -v $CHAINCODE_VERSION -P "OR('Org1MSP.member', 'Org2MSP.member')"
