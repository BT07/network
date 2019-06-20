#!/bin/bash

export CHANNEL_ONE_NAME=channelone
export CHANNEL_ONE_PROFILE=ChannelOne
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

export FIRST_CHAINCODE_NAME="firstchaincode"
export FIRST_CHAINCODE_SRC="github.com/chaincode/one"
export CHAINCODE_VERSION="1.0"

#Install Chaincode (firstchaincode) in Org3 Peer
docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org3.example.com:7051" cli peer chaincode install -n $FIRST_CHAINCODE_NAME -p $FIRST_CHAINCODE_SRC -v $CHAINCODE_VERSION

sleep 10

docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_ONE_NAME -c '{"function":"readCert","Args":["201916721"]}' -n $FIRST_CHAINCODE_NAME

