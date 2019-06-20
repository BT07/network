#!/bin/bash
echo " "
echo " "
echo "==> REMOVING EXISTING CONTAINERS<=="
echo " "
echo " "
sudo ./rmfl.sh

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

export CHANNEL_ONE_NAME=channelone
export CHANNEL_ONE_PROFILE=ChannelOne
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "   "
echo "   "
echo "=============>Start of the network<==============="
echo "   "
echo "   "
#Start the network
docker-compose -f docker-compose.yml up -d

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo "=====================>Channel Creation<================="
echo "   "
echo "   "
#The channel creation is done by using the transaction tx that’s created in channel-artifacts folder.

docker exec cli peer channel create -o orderer.example.com:7050 -c $CHANNEL_ONE_NAME -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_ONE_NAME}.tx --tls --cafile $ORDERER_CA

echo "   "
echo "   "
echo "=====================>Join Channel As University peer<=========================="
echo "   "
echo "   "

#Join the Channel One as Org1 Peer
docker exec cli peer channel join -b ${CHANNEL_ONE_NAME}.block --tls --cafile $ORDERER_CA

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo "=====================>Join Channel As College peer<=========================="
echo "   "
echo "   "

#Similarly we’ll change the environment variables to make the cli act as Org2 Peers and join the channel.

docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:7051" cli peer channel join -b ${CHANNEL_ONE_NAME}.block --tls --cafile $ORDERER_CA


#Join the Channel One as Org3 Peer

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo "=====================>Join Channel As Beneficiary peer<=========================="
#Similarly we’ll change the environment variables to make the cli act as Org3 Peers and join the channel.
echo "   "
echo "   "

docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org3.example.com:7051" cli peer channel join -b ${CHANNEL_ONE_NAME}.block --tls --cafile $ORDERER_CA

export FIRST_CHAINCODE_NAME="firstchaincode"
export FIRST_CHAINCODE_SRC="github.com/chaincode/one"
export CHAINCODE_VERSION="1.0"

echo "   "
echo "   "
echo "=====================>Install Chaincode on University peer<=========================="
echo "   "
echo "   "
#Install Chaincode (firstchaincode) in Org1 Peer
docker exec cli peer chaincode install -n $FIRST_CHAINCODE_NAME -p $FIRST_CHAINCODE_SRC -v $CHAINCODE_VERSION

echo "   "
echo "   "
echo "=====================>Instantiate Chaincode on University peer<=========================="
echo "   "
echo "   "
#Instantiate Chaincode (firstchaincode) in Org1 Peer

docker exec cli peer chaincode instantiate -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_ONE_NAME -c '{"Args":[]}' -n $FIRST_CHAINCODE_NAME -v $CHAINCODE_VERSION -P "OR('Org1MSP.member', 'Org2MSP.member', 'Org3MSP.member')"

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo " ===========================================>Invoke<================================================="
echo "   "
echo "   "
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_ONE_NAME -c '{"function":"initLedger","Args":[""]}' -n $FIRST_CHAINCODE_NAME

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo "=====================>Install Chaincode on College peer<=========================="
echo "   "
echo "   "

#Install Chaincode (firstchaincode) in Org2 Peer
docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:7051" cli peer chaincode install -n $FIRST_CHAINCODE_NAME -p $FIRST_CHAINCODE_SRC -v $CHAINCODE_VERSION

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "=======================================Invoke Chaincode (firstchaincode) in Org2 Peer============================="
echo "   "

docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_ONE_NAME -c '{"function":"readCert","Args":["201916721"]}' -n $FIRST_CHAINCODE_NAME

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo "=====================>Install Chaincode on Beneficiary peer<=========================="
echo "   "
echo "   "

#Install Chaincode (firstchaincode) in Org3 Peer
docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org3.example.com:7051" cli peer chaincode install -n $FIRST_CHAINCODE_NAME -p $FIRST_CHAINCODE_SRC -v $CHAINCODE_VERSION

export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

echo "   "
echo "   "
echo " ========================================Invoke=====================================s"
echo "   "
echo "   "

docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile $ORDERER_CA -C $CHANNEL_ONE_NAME -c '{"function":"readCert","Args":["201916721"]}' -n $FIRST_CHAINCODE_NAME

echo "  "
echo "=====================>The SecureCert Network is set up<=========================="
echo "=====================>Run respective node files to enroll the Admin and register the user<=========================="
echo "  "
