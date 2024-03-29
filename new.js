'use strict';
/*
 * Chaincode Invoke
 */
var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');
var fs = require('fs');
var fabric_client = new Fabric_Client();
var org1peersurl = [{url:"grpcs://localhost:7051",eventurl:"grpcs://localhost:7053"}];
var org3peersurl = [{url:"grpcs://localhost:9051",eventurl:"grpcs://localhost:9053"}];

// setup the fabric network
var channel = fabric_client.newChannel('channelone');
var orgPath = 'org1';
var patientId = 'Student1'

var caRootsPath = "../crypto-config/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
let data = fs.readFileSync(caRootsPath);
let caroots = Buffer.from(data).toString();

var orderer = fabric_client.newOrderer(
		"grpcs://localhost:7050",
		{
			'pem': caroots,
			'ssl-target-name-override': 'orderer.org3.example.com'
		}
);

channel.addOrderer(orderer);

for (var i=0;i<org1peersurl.length;i++) {
	
		let peer = org1peersurl[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = fabric_client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<org3peersurl.length;i++) {
	
		let peer = org3peersurl[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = fabric_client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
		channel.addPeer(peer_obj);
	}

var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext(patientId, true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded patient from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get patient.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	// must send the proposal to endorsing peers
	var request = {
		//targets: let default to the peer assigned to the client
		chaincodeId: 'firstchaincode',
		fcn: 'addCert',
		args: [patientId,'201510371','PCCE','8020','May/June 2019','2019','56'],
		chainId: 'channelone',
		txId: tx_id
	};

	// send the transaction proposal to the peers
	return channel.sendTransactionProposal(request);
}).then((results) => {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
		let event_hub = fabric_client.newEventHub();
		let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
		event_hub.setPeerAddr(org1peersurl[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			event_hub.connect();

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, 3000);
			event_hub.connect();
			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);
				event_hub.unregisterTxEvent(transaction_id_string);
				event_hub.disconnect();

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
		});
		promises.push(txPromise);

		return Promise.all(promises);
	} else {
		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + response.status);
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
	} else {
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err);
});
