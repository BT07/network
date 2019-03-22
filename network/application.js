var Client = require('fabric-client');
var fs = require('fs');
var path = require('path');

var channel_name = 'firstchannel';
var org1mspid = "Org1MSP";
var org2mspid = "Org2MSP";
var org3mspid = "Org3MSP";

var org1peersurl = [{url:"grpcs://localhost:7051",eventurl:"grpcs://localhost:7053"}];
var org3peersurl = [{url:"grpcs://localhost:9051",eventurl:"grpcs://localhost:9053"}];

//creates the client object 
var client = new Client();

var caRootsPath = "../crypto-config/ordererOrganizations/org3.example.com/orderers/orderer.org3.example.com/msp/tlscacerts/tlsca.org3.example.com-cert.pem"
let data = fs.readFileSync(caRootsPath);
let caroots = Buffer.from(data).toString();

var patientId = 'patient7';
var caseId = '1000'

var orderer = client.newOrderer(
		"grpcs://localhost:7050",
		{
			'pem': caroots,
			'ssl-target-name-override': 'orderer.org3.example.com'
		}
);

//installchaincode(org1peersurl,'org1',org1mspid,"chaincode","mychaincode","v11");
//installchaincode(org3peersurl,'org3',org3mspid,"chaincode","mychaincode","v11");

// instantiateChaincode(channel_name,org1peersurl,org3peersurl,'org1',org1mspid,"chaincode","mychaincode","v0");
//getInstantiatedChaincodes(org1peersurl,org1mspid,'org1')
//upgradeChaincode(channel_name,org1peersurl,org3peersurl,'org1',org1mspid,"chaincode","mychaincode","v11")

//InvokeChaincode will enter the patient details by doc,by patient can be done from patientDetails.js
//invokechaincode(channel_name,org1mspid,'org1',org1peersurl,org3peersurl,"mychaincode",patientId)
//querychaincode(channel_name,org1mspid,'org1',org1peersurl,org3peersurl,"mychaincode",patientId,'org3')
//querychaincode(channel_name,org3mspid,'org3',org3peersurl,org1peersurl,"mychaincode",patientId,'org1')

//createcase will create a case for particular patient,and map the case Id to that patient
//createCasechaincode(channel_name,org1mspid,'org1',org1peersurl,org3peersurl,"mychaincode",patientId,caseId)

//queryCaseChaincode(channel_name,org1mspid,'org1',org1peersurl,org3peersurl,"mychaincode",caseId)
submitClaimchaincode(channel_name,org1mspid,'org1',org1peersurl,org3peersurl,"mychaincode",caseId,patientId)
approveClaimchaincode(channel_name,org3mspid,'org3',org3peersurl,org1peersurl,"mychaincode",caseId)

function installchaincode(peers,orgPath,orgmspid,chaincodepath,chaincodeid,chaincodeversion){

	var targets = [];
	for (var i=0;i<peers.length;i++) {
		
		let peer = peers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		targets.push(peer_obj);
	}
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgmspid
	}).then((store) => {
	
		console.log("\nRegistering "+orgPath+" admin")
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgmspid)
		
	}).then((admin) => {
		
		console.log('\nSuccessfully enrolled '+orgPath+' \'admin\'');
		// send proposal to endorser
		console.log("\nBuilding the request object")
		//building the request for installing chaincode on the peers
		//specify chaincode path, chaincode id, chaincode version and peers you want to install chaincode
		var request = {
			targets: targets,
			chaincodePath: chaincodepath,
			chaincodeId: chaincodeid,
			chaincodeVersion: chaincodeversion
		};
		console.log("\nSending the install chaincode request to peers\n")
		//sends the request to the peers
		return client.installChaincode(request);
		
	},(err) => {
		console.log('Failed to enroll user \'admin\'. ' + err);
	}).then((results) => {
		
		//gets response of peers and check the response status
		var proposalResponses = results[0];
		var proposal = results[1];
		var all_good = true;
		var errors = [];
		for(var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[i].response && proposalResponses[i].response.status === 200) {
				one_good = true;
				
			} else {
				one_good = false;
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			console.log('\nSuccessfully sent install Proposal and received ProposalResponse: Status 200');
		}
	},
	(err) => {
		console.log('Failed to send install proposal due to error: ',err)
	});
}

function getAdmin(client, userOrg,mspID){

	var keyPath = '../crypto-config/peerOrganizations/'+userOrg+'.example.com/users/Admin@'+userOrg+'.example.com/msp/keystore';
	var keyPEM = Buffer.from(readAllFiles(keyPath)[0]).toString();
	var certPath = '../crypto-config/peerOrganizations/'+userOrg+'.example.com/users/Admin@'+userOrg+'.example.com/msp/signcerts';
	var certPEM = readAllFiles(certPath)[0];
	return Promise.resolve(client.createUser({
		username: 'peer'+userOrg+'Admin',
		mspid: mspID,
		cryptoContent: {
			privateKeyPEM: keyPEM.toString(),
			signedCertPEM: certPEM.toString()
		}
	}));

}

function readAllFiles(dir) {
	var files = fs.readdirSync(dir);
	var certs = [];
	files.forEach((file_name) => {
		let file_path = path.join(dir,file_name);
		let data = fs.readFileSync(file_path);
		certs.push(data);
	});
	return certs;
}

function instantiateChaincode(channel_name,peers,bpeers,orgPath,orgName,chaincodePath,chaincodeID,chaincodeVersion){

	//sets the timeout for the request, make sure you set enough time out because on the request peer build a container for chaincode 
	//and it make take some more time to send the response
	Client.setConfigSetting('request-timeout', 25000);
	
	var type = 'instantiate';
	var targets = [];
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	
	//return peers object of org1 
	for (var i=0;i<peers.length;i++) {
	
		let peer = peers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		targets.push(peer_obj);
		channel.addPeer(peer_obj);
	}
	
	//return peers object of org3 
	for (var i=0;i<bpeers.length;i++) {
	
		let peer = bpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
		
		targets.push(peer_obj);
		channel.addPeer(peer_obj);
	}
	
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
	
		console.log("\nRegistering "+orgPath+" admin")
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
	
		console.log('\nSuccessfully enrolled '+orgPath+' \'admin\'');
		//console.log('Admin Details : ',admin);
		//Retrieves the configuration for the channel from the orderer
		return channel.initialize();
		
	}, (err) => {

		console.log('Failed to enroll user admin ',err);			

	}).then(() => {
	
			console.log('\nBuilding instantiate proposal');
			//build request for instantiation
			let request = buildChaincodeProposal(client, chaincodePath, chaincodeVersion,chaincodeID);
			
			tx_id = request.txId;
			console.log('\nSending instantiate request to peers');
			console.log("req: ",request)
			//send transaction to the peers for endorsement
			return channel.sendInstantiateProposal(request);
	
	}, (err) => {

		console.log('Failed to initialize the channel: ',err);
		
	}).then((results) => {
		
		//gets the endorsement response from the peer and check if enough peers have endorsed the transaction
		var proposalResponses = results[0];
		var proposal = results[1];
		var all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[0].response &&
				proposalResponses[0].response.status === 200) {
				one_good = true;
				console.log('instantiate proposal was good');
			} else {
				console.log('instantiate proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
		
			console.log('Successfully sent Proposal and received ProposalResponse:',
					proposalResponses[0].response.status, proposalResponses[0].response.message,
					proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature);
				
			//building the request to send the obtained proposal from peers to the orderer
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			var deployId = tx_id.getTransactionID();
			
			console.log('Deploy Id : ',deployId ," Request : " +request);
			
			//registers for the event to the peer0 for confirming whether the transaction is successfully committed or not
			eh = client.newEventHub();
			let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
			eh.setPeerAddr(peers[0].eventurl, {
				pem: Buffer.from(data).toString(),
				'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			eh.connect();
			console.log("eh.connect : ");
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					eh.disconnect();
					reject();
				}, 30000);
			console.log('Inside txPromise');
				eh.registerTxEvent(deployId, (tx, code) => {
					console.log('The chaincode instantiate transaction has been committed on peer ',eh._ep._endpoint.addr);
					clearTimeout(handle);
					eh.unregisterTxEvent(deployId);
					eh.disconnect();
					if (code !== 'VALID') {
						console.log('The chaincode instantiate transaction was invalid, code = ',code);
					
						reject();
					} else {
						console.log('The chaincode instantiate transaction was valid.');
						resolve();
				
					}
				});
			});
			
			console.log('txPromise : ',txPromise);
			//sends the obtained respose from peers to orderer for ordering
			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat([txPromise])).then((results) => {
				
				console.log('Event promise all complete and testing complete');
				return results[0]; 
			
			}).catch((err) => {
				console.log('Failed to send instantiate transaction and get notifications within the timeout period: ' ,err);
				return 'Failed to send instantiate transaction and get notifications within the timeout period.';
			});
		
		} else {
		
			console.log('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	
	},(err) => {
	
		console.log('Failed to send instantiate proposal due to error: ',err);
	
		
	}).then((response) => {
	
		//gets the response from the orderer and verifies the response status
		if (response.status === 'SUCCESS') {
		
			console.log('Successfully sent transaction to the orderer.');
			
		} else {
			console.log('Failed to order the transaction. Error code: ',response);
		
		}
	}, (err) => {
		console.log('Failed to send instantiate due to error: ',err);
	
	});
}

function buildChaincodeProposal(client, chaincode_path, version,chaincodeID){
	
	var tx_id = client.newTransactionID();

	// build instantiate proposal to send for endorsement
	//specify the function name , arguments , endorsement-policy etc
	var request = {
		chaincodePath: chaincode_path,
		chaincodeId: chaincodeID,
		chaincodeVersion: version,
		fcn: 'init',
		args: [],
		txId: tx_id,
		// use this to demonstrate the following policy:
		// 'if signed by org1 admin, then that's the only signature required,
		// but if that signature is missing, then the policy can also be fulfilled
		// when members (non-admin) from both orgs signed'
		'endorsement-policy': {
			identities: [
				{ role: { name: 'member', mspId: org1mspid }},
				{ role: { name: 'member', mspId: org3mspid }},
				{ role: { name: 'admin', mspId: org1mspid}}
			],
			policy: {
				'1-of': [
					{ 'signed-by': 2},
					{ '2-of': [{ 'signed-by': 0}, { 'signed-by': 1 }]}
				]
			}
		}
	};

	return request;

}

function getInstantiatedChaincodes(peers,orgName,orgPath){

	Client.setConfigSetting('request-timeout', 100000);
	var client = new Client();
	var targets = [];
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<peers.length;i++) {
	
		let peer = peers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		targets.push(peer_obj);
	}
	Client.newDefaultKeyValueStore({
		
		path: "/hfc-test-kvs/"+orgName
		
	}).then((store) => {
	
		console.log("\nRegistering orderer admin")
		client.setStateStore(store);
		
		return getAdmin(client,orgPath,orgName)
		
	}).then((admin) => {
	
		console.log('\nSuccessfully enrolled org1 \'admin\'');
		console.log('\Getting the channel info block from orderer');
		return channel.queryInstantiatedChaincodes(targets[0])
		
	}).then((ChaincodeQueryResponse) =>{
	
		console.log('\Chaincodes: ',ChaincodeQueryResponse);
	
	});
	
}

function invokechaincode(channel_name,orgName,orgPath,apeers,zpeers,chaincodeId,patientId){

	var client = new Client();
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<apeers.length;i++) {
	
		let peer = apeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<zpeers.length;i++) {
	
		let peer = zpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
		channel.addPeer(peer_obj);
	}
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
	
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
	
		return channel.initialize();
		
	}, (err) => {
		console.log('Failed to enroll user admin ',err);
	}).then(() => {
	
		tx_id = client.newTransactionID();
		
		//build invoke request
		var request = {
			chaincodeId : chaincodeId,
			fcn: 'createPatient',
			args: [patientId,'testFirst','testLast','12-09-1963',''],
			txId: tx_id,
		};
		// send proposal to endorser
		return channel.sendTransactionProposal(request);
	
	}, (err) => {
		console.log('Failed to initialize the channel: ',err);
	}).then((results) =>{
	
		//get the endorsement response from the peers and check for response status
		pass_results = results;
		console.log("Results: ",results)
		var proposalResponses = pass_results[0];

		var proposal = pass_results[1];
		var all_good = true;
		for(var i in proposalResponses) {
			let one_good = false;
			let proposal_response = proposalResponses[i];
			if( proposal_response.response && proposal_response.response.status === 200) {
				console.log('transaction proposal has response status of good');
				one_good = channel.verifyProposalResponse(proposal_response);
				if(one_good) {
					console.log(' transaction proposal signature and endorser are valid');
				}
			} else {
				console.log('transaction proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			
			//checks if the proposal has same read/write sets.
			//This will validate that the endorsing peers all agree on the result of the chaincode execution.
			all_good = channel.compareProposalResponseResults(proposalResponses);
			if(all_good){
				console.log(' All proposals have a matching read/writes sets');
			}
			else {
				console.log(' All proposals do not have matching read/write sets');
			}
		}
		if (all_good) {
			// check to see if all the results match
			console.log('Successfully sent Proposal and received ProposalResponse');
			console.log('Successfully sent Proposal and received ProposalResponse: ', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature);

			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			var invokeId = tx_id.getTransactionID();
			
			eh = client.newEventHub();
			let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
			eh.setPeerAddr(apeers[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			eh.connect();
				
			let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(() => {
						eh.disconnect();
						reject();
					}, 30000);

					eh.registerTxEvent(invokeId, (tx, code) => {
						console.log('The chaincode invoke transaction has been committed on peer ',eh._ep._endpoint.addr);
						clearTimeout(handle);
						eh.unregisterTxEvent(invokeId);
						eh.disconnect();
						if (code !== 'VALID') {
							console.log('The chaincode invoke transaction was invalid, code = ',code);
							reject();
							
						} else {
							console.log('The chaincode invoke transaction was valid.');
							resolve();
							
						}
					});
			});
			
			//sends the endorsement response to the orderer for ordering
			var sendPromise = channel.sendTransaction(request);
			
			return Promise.all([sendPromise].concat([txPromise])).then((results) => {
				console.log('Event promise all complete and testing complete');
				return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
			}).catch((err) => {
				console.log('Failed to send instantiate transaction and get notifications within the timeout period:P ', err)
				return 'Failed to send instantiate transaction and get notifications within the timeout period.';
			});
		
		}
	
	}).then((response) => {

		//gets the final response from the orderer and check the response status
		if (response.status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		
		} else {
			console.log('Failed to order the transaction. Error code: ',err);

		}
	}, (err) => {

		console.log('Failed to send transaction due to error: ',err);

		
	});
	
}

function querychaincode(channel_name,orgName,orgPath,apeers,zpeers,chaincodeID,patientId,subOrg){

	var targets =[]
	var client = new Client();
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<apeers.length;i++) {
	
		let peer = apeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
						console.log('Peer Value',peer_obj)	
		targets.push(peer_obj)
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<zpeers.length;i++) {
	
		let peer = zpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+subOrg+".example.com/peers/peer"+i+"."+subOrg+".example.com/msp/tlscacerts/tlsca."+subOrg+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+subOrg+".example.com"
							}
						);
		console.log('Peer Value',peer_obj)				
		targets.push(peer_obj)
		channel.addPeer(peer_obj);
	}

	
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
		console.log('Checking if admin is enrolled')
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
		console.log('Successfully enrolled Admin')
		return channel.initialize();
	}, (err) => {
		console.log('Failed to enroll user admin ',err);
	}).then(() => {
	
			tx_id = client.newTransactionID();
			console.log('Txn ID : ',tx_id);
			// build query request
			var request = {
				chaincodeId: chaincodeID,
				txId: tx_id,
				fcn: 'queryPatient',
				args: [patientId]
			};
			//send query request to peers
			console.log('Formed request');
			return channel.queryByChaincode(request, targets);
	
	}, (err) => {

		console.log('Failed to initialize the channel: ',err);
	

	}).then((response_payloads) =>{
	
		//gets response from each peer and check for status
		if (response_payloads) {
			console.log(response_payloads[0].toString('utf8'));
		} else {
			console.log('response_payloads is null');
		}
		
	},(err) => {
		console.log('Failed to send query due to error: ',err);
	});
}

function createCasechaincode(channel_name,orgName,orgPath,apeers,zpeers,chaincodeId,patientId,caseId){

	var client = new Client();
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<apeers.length;i++) {
	
		let peer = apeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<zpeers.length;i++) {
	
		let peer = zpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
		channel.addPeer(peer_obj);
	}
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
	
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
	
		return channel.initialize();
		
	}, (err) => {
		console.log('Failed to enroll user admin ',err);
	}).then(() => {
	
		tx_id = client.newTransactionID();
		
		//build invoke request
		var request = {
			chaincodeId : chaincodeId,
			fcn: 'createCase',
			args: [caseId,patientId,'12-09-1963','medicalReport1','20000'],
			txId: tx_id,
		};
		// send proposal to endorser
		return channel.sendTransactionProposal(request);
	
	}, (err) => {
		console.log('Failed to initialize the channel: ',err);
	}).then((results) =>{
	
		//get the endorsement response from the peers and check for response status
		pass_results = results;
		console.log("Results: ",results)
		var proposalResponses = pass_results[0];

		var proposal = pass_results[1];
		var all_good = true;
		for(var i in proposalResponses) {
			let one_good = false;
			let proposal_response = proposalResponses[i];
			if( proposal_response.response && proposal_response.response.status === 200) {
				console.log('transaction proposal has response status of good');
				one_good = channel.verifyProposalResponse(proposal_response);
				if(one_good) {
					console.log(' transaction proposal signature and endorser are valid');
				}
			} else {
				console.log('transaction proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			
			//checks if the proposal has same read/write sets.
			//This will validate that the endorsing peers all agree on the result of the chaincode execution.
			all_good = channel.compareProposalResponseResults(proposalResponses);
			if(all_good){
				console.log(' All proposals have a matching read/writes sets');
			}
			else {
				console.log(' All proposals do not have matching read/write sets');
			}
		}
		if (all_good) {
			// check to see if all the results match
			console.log('Successfully sent Proposal and received ProposalResponse');
			console.log('Successfully sent Proposal and received ProposalResponse: ', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature);

			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			var invokeId = tx_id.getTransactionID();
			
			eh = client.newEventHub();
			let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
			eh.setPeerAddr(apeers[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			eh.connect();
				
			let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(() => {
						eh.disconnect();
						reject();
					}, 30000);

					eh.registerTxEvent(invokeId, (tx, code) => {
						console.log('The chaincode invoke transaction has been committed on peer ',eh._ep._endpoint.addr);
						clearTimeout(handle);
						eh.unregisterTxEvent(invokeId);
						eh.disconnect();
						if (code !== 'VALID') {
							console.log('The chaincode invoke transaction was invalid, code = ',code);
							reject();
							
						} else {
							console.log('The chaincode invoke transaction was valid.');
							resolve();
							
						}
					});
			});
			
			//sends the endorsement response to the orderer for ordering
			var sendPromise = channel.sendTransaction(request);
			
			return Promise.all([sendPromise].concat([txPromise])).then((results) => {
				console.log('Event promise all complete and testing complete');
				return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
			}).catch((err) => {
				console.log('Failed to send instantiate transaction and get notifications within the timeout period:P ', err)
				return 'Failed to send instantiate transaction and get notifications within the timeout period.';
			});
		
		}
	
	}).then((response) => {

		//gets the final response from the orderer and check the response status
		if (response.status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		
		} else {
			console.log('Failed to order the transaction. Error code: ',err);

		}
	}, (err) => {

		console.log('Failed to send transaction due to error: ',err);

		
	});
	
}

function queryCaseChaincode(channel_name,orgName,orgPath,apeers,zpeers,chaincodeID,caseId){

	var targets =[]
	var client = new Client();
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<apeers.length;i++) {
	
		let peer = apeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		targets.push(peer_obj)
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<zpeers.length;i++) {
	
		let peer = zpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
						
		targets.push(peer_obj)
		channel.addPeer(peer_obj);
	}

	
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {

		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
		return channel.initialize();
	}, (err) => {
		console.log('Failed to enroll user admin ',err);
	}).then(() => {
	
			tx_id = client.newTransactionID();

			// build query request
			var request = {
				chaincodeId: chaincodeID,
				txId: tx_id,
				fcn: 'queryCase',
				args: [caseId]
			};
			//send query request to peers
			return channel.queryByChaincode(request, targets);
	
	}, (err) => {

		console.log('Failed to initialize the channel: ',err);
	

	}).then((response_payloads) =>{
	
		//gets response from each peer and check for status
		if (response_payloads) {
			console.log(response_payloads[0].toString('utf8'));
		} else {
			console.log('response_payloads is null');
		}
		
	},(err) => {
		console.log('Failed to send query due to error: ',err);
	});
}

function submitClaimchaincode(channel_name,orgName,orgPath,apeers,zpeers,chaincodeId,caseId,patientId){

	var client = new Client();
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<apeers.length;i++) {
	
		let peer = apeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<zpeers.length;i++) {
	
		let peer = zpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
		channel.addPeer(peer_obj);
	}
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
	
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
	
		return channel.initialize();
		
	}, (err) => {
		console.log('Failed to enroll user admin ',err);
	}).then(() => {
	
		tx_id = client.newTransactionID();
		
		//build invoke request
		var request = {
			chaincodeId : chaincodeId,
			fcn: 'submitClaim',
			args: [caseId],
			txId: tx_id,
		};
		// send proposal to endorser
		return channel.sendTransactionProposal(request);
	
	}, (err) => {
		console.log('Failed to initialize the channel: ',err);
	}).then((results) =>{
	
		//get the endorsement response from the peers and check for response status
		pass_results = results;
		console.log("Results: ",results)
		var proposalResponses = pass_results[0];

		var proposal = pass_results[1];
		var all_good = true;
		for(var i in proposalResponses) {
			let one_good = false;
			let proposal_response = proposalResponses[i];
			if( proposal_response.response && proposal_response.response.status === 200) {
				console.log('transaction proposal has response status of good');
				one_good = channel.verifyProposalResponse(proposal_response);
				if(one_good) {
					console.log(' transaction proposal signature and endorser are valid');
				}
			} else {
				console.log('transaction proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			
			//checks if the proposal has same read/write sets.
			//This will validate that the endorsing peers all agree on the result of the chaincode execution.
			all_good = channel.compareProposalResponseResults(proposalResponses);
			if(all_good){
				console.log(' All proposals have a matching read/writes sets');
			}
			else {
				console.log(' All proposals do not have matching read/write sets');
			}
		}
		if (all_good) {
			// check to see if all the results match
			console.log('Successfully sent Proposal and received ProposalResponse');
			console.log('Successfully sent Proposal and received ProposalResponse: ', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature);

			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			var invokeId = tx_id.getTransactionID();
			
			eh = client.newEventHub();
			let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
			eh.setPeerAddr(apeers[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			eh.connect();
				
			let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(() => {
						eh.disconnect();
						reject();
					}, 30000);

					eh.registerTxEvent(invokeId, (tx, code) => {
						console.log('The chaincode invoke transaction has been committed on peer ',eh._ep._endpoint.addr);
						clearTimeout(handle);
						eh.unregisterTxEvent(invokeId);
						eh.disconnect();
						if (code !== 'VALID') {
							console.log('The chaincode invoke transaction was invalid, code = ',code);
							reject();
							
						} else {
							console.log('The chaincode invoke transaction was valid.');
							resolve();
							
						}
					});
			});
			
			ehc = client.newEventHub();
			ehc.setPeerAddr(apeers[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			ehc.connect();
			
			let event_submit = new Promise((resolve, reject) => {
					let regid = null;
					let handle = setTimeout(() => {
					ehc.disconnect();
						reject();
				}, 30000);
				
				console.log('Checking for chaincode event')

				regid = ehc.registerChaincodeEvent(chaincodeId, 'submitClaim',
					(event, block_num, txnid, status) => {
					
					console.log('Successfully got a chaincode event with transid:'+ txnid + ' with status:'+status);

					// to see the event payload, the channel_event_hub must be connected(true)
					let event_payload = event.payload.toString('utf8');
					
					console.log('Event Payload  : ',event_payload);
					if(event_payload.indexOf('caseId') > -1) {
						clearTimeout(handle);
						
						ehc.unregisterChaincodeEvent(regid);
						console.log('Successfully received the chaincode event for case ');
						resolve();
					} else {
						console.log('Successfully got chaincode event ... just not the one we are looking for on block number ');
					}
				}, (error)=> {
					clearTimeout(handle);
					console.log('Failed to receive the chaincode event ::'+error);
					reject();
				}
					
				);
			});
	
			//sends the endorsement response to the orderer for ordering
			var sendPromise = channel.sendTransaction(request);
			
			return Promise.all([sendPromise].concat([txPromise])).then((results) => {
				console.log('Event promise all complete and testing complete');
				return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
			}).catch((err) => {
				console.log('Failed to send instantiate transaction and get notifications within the timeout period:P ', err)
				return 'Failed to send instantiate transaction and get notifications within the timeout period.';
			});
			
				
		}
	
	}).then((response) => {

		//gets the final response from the orderer and check the response status
		if (response.status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		
		} else {
			console.log('Failed to order the transaction. Error code: ',err);

		}
	}, (err) => {

		console.log('Failed to send transaction due to error: ',err);

		
	});
	
}

function approveClaimchaincode(channel_name,orgName,orgPath,apeers,zpeers,chaincodeId,caseId){

	var client = new Client();
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	for (var i=0;i<apeers.length;i++) {
	
		let peer = apeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		channel.addPeer(peer_obj);
	}
	for (var i=0;i<zpeers.length;i++) {
	
		let peer = zpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org1"+".example.com/peers/peer"+i+"."+"org1"+".example.com/msp/tlscacerts/tlsca."+"org1"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org1"+".example.com"
							}
						);
		channel.addPeer(peer_obj);
	}
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
	
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
	
		return channel.initialize();
		
	}, (err) => {
		console.log('Failed to enroll user admin ',err);
	}).then(() => {
	
		tx_id = client.newTransactionID();
		
		//build invoke request
		var request = {
			chaincodeId : chaincodeId,
			fcn: 'approveClaim',
			args: [caseId],
			txId: tx_id,
		};
		// send proposal to endorser
		return channel.sendTransactionProposal(request);
	
	}, (err) => {
		console.log('Failed to initialize the channel: ',err);
	}).then((results) =>{
	
		//get the endorsement response from the peers and check for response status
		pass_results = results;
		console.log("Results: ",results)
		var proposalResponses = pass_results[0];

		var proposal = pass_results[1];
		var all_good = true;
		for(var i in proposalResponses) {
			let one_good = false;
			let proposal_response = proposalResponses[i];
			if( proposal_response.response && proposal_response.response.status === 200) {
				console.log('transaction proposal has response status of good');
				one_good = channel.verifyProposalResponse(proposal_response);
				if(one_good) {
					console.log(' transaction proposal signature and endorser are valid');
				}
			} else {
				console.log('transaction proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
			
			//checks if the proposal has same read/write sets.
			//This will validate that the endorsing peers all agree on the result of the chaincode execution.
			all_good = channel.compareProposalResponseResults(proposalResponses);
			if(all_good){
				console.log(' All proposals have a matching read/writes sets');
			}
			else {
				console.log(' All proposals do not have matching read/write sets');
			}
		}
		if (all_good) {
			// check to see if all the results match
			console.log('Successfully sent Proposal and received ProposalResponse');
			console.log('Successfully sent Proposal and received ProposalResponse: ', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature);

			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			var invokeId = tx_id.getTransactionID();
			
			eh = client.newEventHub();
			let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
			eh.setPeerAddr(apeers[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			eh.connect();
				
			let txPromise = new Promise((resolve, reject) => {
					let handle = setTimeout(() => {
						eh.disconnect();
						reject();
					}, 30000);

					eh.registerTxEvent(invokeId, (tx, code) => {
						console.log('The chaincode invoke transaction has been committed on peer ',eh._ep._endpoint.addr);
						clearTimeout(handle);
						eh.unregisterTxEvent(invokeId);
						eh.disconnect();
						if (code !== 'VALID') {
							console.log('The chaincode invoke transaction was invalid, code = ',code);
							reject();
							
						} else {
							console.log('The chaincode invoke transaction was valid.');
							resolve();
							
						}
					});
			});
			
			ehc = client.newEventHub();
			ehc.setPeerAddr(apeers[0].eventurl, {
					pem: Buffer.from(data).toString(),
					'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			ehc.connect();
			
			let event_submit = new Promise((resolve, reject) => {
					let regid = null;
					let handle = setTimeout(() => {
					ehc.disconnect();
						reject();
				}, 30000);
				
				console.log('Checking for chaincode event')

				regid = ehc.registerChaincodeEvent(chaincodeId, 'approveClaim',
					(event, block_num, txnid, status) => {
					
					console.log('Successfully got a chaincode event with transid:'+ txnid + ' with status:'+status);

					// to see the event payload, the channel_event_hub must be connected(true)
					let event_payload = event.payload.toString('utf8');
					
					console.log('Event Payload  : ',event_payload);
					if(event_payload.indexOf('caseId') > -1) {
						clearTimeout(handle);
						
						ehc.unregisterChaincodeEvent(regid);
						console.log('Successfully received the chaincode event for case ');
						resolve();
					} else {
						console.log('Successfully got chaincode event ... just not the one we are looking for on block number ');
					}
				}, (error)=> {
					clearTimeout(handle);
					console.log('Failed to receive the chaincode event ::'+error);
					reject();
				}
					
				);
			});
			
			//event_submit.then(()=>{console.log('inside event Submit')})
			//sends the endorsement response to the orderer for ordering
			var sendPromise = channel.sendTransaction(request);
			
			return Promise.all([sendPromise].concat([txPromise]).concat([event_submit])).then((results) => {
				console.log('Event promise all complete and testing complete', results);
				return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
			}).catch((err) => {
				console.log('Failed to send instantiate transaction and get notifications within the timeout period:P ', err)
				return 'Failed to send instantiate transaction and get notifications within the timeout period.';
			});
		
		}
	
	}).then((response) => {

		//gets the final response from the orderer and check the response status
		if (response.status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
			return Promise.resolve();
		
		} else {
			console.log('Failed to order the transaction. Error code: ',err);

		}
	}, (err) => {

		console.log('Failed to send transaction due to error: ',err);

		
	});
	
}

function upgradeChaincode(channel_name,peers,bpeers,orgPath,orgName,chaincodePath,chaincodeID,chaincodeVersion){

	//sets the timeout for the request, make sure you set enough time out because on the request peer build a container for chaincode 
	//and it make take some more time to send the response
	Client.setConfigSetting('request-timeout', 30000);
	
	var type = 'instantiate';
	var targets = [];
	var channel = client.newChannel(channel_name);
	channel.addOrderer(orderer)
	
	//return peers object of org1 
	for (var i=0;i<peers.length;i++) {
	
		let peer = peers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						);
		
		targets.push(peer_obj);
		channel.addPeer(peer_obj);
	}
	
	//return peers object of org3 
	for (var i=0;i<bpeers.length;i++) {
	
		let peer = bpeers[i];
		data = fs.readFileSync("../crypto-config/peerOrganizations/"+"org3"+".example.com/peers/peer"+i+"."+"org3"+".example.com/msp/tlscacerts/tlsca."+"org3"+".example.com-cert.pem");
	
		let peer_obj = client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+"org3"+".example.com"
							}
						);
		
		targets.push(peer_obj);
		channel.addPeer(peer_obj);
	}
	
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+orgName
	}).then((store) => {
	
		console.log("\nRegistering "+orgPath+" admin")
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgName);
		
	}).then((admin) => {
	
		console.log('\nSuccessfully enrolled '+orgPath+' \'admin\'');
		//console.log('Admin Details : ',admin);
		//Retrieves the configuration for the channel from the orderer
		return channel.initialize();
		
	}, (err) => {

		console.log('Failed to enroll user admin ',err);			

	}).then(() => {
	
			console.log('\nBuilding upgrade proposal');
			//build request for instantiation
			let request = buildChaincodeProposal(client, chaincodePath, chaincodeVersion,chaincodeID);
			
			tx_id = request.txId;
			console.log('\nSending upgrade request to peers');
			console.log("req: ",request)
			//send transaction to the peers for endorsement
			return channel.sendUpgradeProposal(request);
	
	}, (err) => {

		console.log('Failed to initialize the channel: ',err);
		
	}).then((results) => {
		
		//gets the endorsement response from the peer and check if enough peers have endorsed the transaction
		var proposalResponses = results[0];
		var proposal = results[1];
		var all_good = true;
		for (var i in proposalResponses) {
			let one_good = false;
			if (proposalResponses && proposalResponses[0].response &&
				proposalResponses[0].response.status === 200) {
				one_good = true;
				console.log('upgrade proposal was good');
			} else {
				console.log('upgrade proposal was bad');
			}
			all_good = all_good & one_good;
		}
		if (all_good) {
		
			console.log('Successfully sent Proposal and received ProposalResponse:',
					proposalResponses[0].response.status, proposalResponses[0].response.message,
					proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature);
				
			//building the request to send the obtained proposal from peers to the orderer
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
			var deployId = tx_id.getTransactionID();
			
			console.log('Deploy Id : ',deployId ," Request : " +request);
			
			//registers for the event to the peer0 for confirming whether the transaction is successfully committed or not
			eh = client.newEventHub();
			let data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer0."+orgPath+".example.com/tls/ca.crt");
			eh.setPeerAddr(peers[0].eventurl, {
				pem: Buffer.from(data).toString(),
				'ssl-target-name-override': 'peer0.'+orgPath+'.example.com'
			});
			eh.connect();
			console.log("eh.connect : ");
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					eh.disconnect();
					reject();
				}, 30000);
			console.log('Inside txPromise');
				eh.registerTxEvent(deployId, (tx, code) => {
					console.log('The chaincode instantiate transaction has been committed on peer ',eh._ep._endpoint.addr);
					clearTimeout(handle);
					eh.unregisterTxEvent(deployId);
					eh.disconnect();
					if (code !== 'VALID') {
						console.log('The chaincode instantiate transaction was invalid, code = ',code);
					
						reject();
					} else {
						console.log('The chaincode instantiate transaction was valid.');
						resolve();
				
					}
				});
			});
			
			console.log('txPromise : ',txPromise);
			//sends the obtained respose from peers to orderer for ordering
			var sendPromise = channel.sendTransaction(request);
			return Promise.all([sendPromise].concat([txPromise])).then((results) => {
				
				console.log('Event promise all complete and testing complete');
				return results[0]; 
			
			}).catch((err) => {
				console.log('Failed to send instantiate transaction and get notifications within the timeout period: ' ,err);
				return 'Failed to send instantiate transaction and get notifications within the timeout period.';
			});
		
		} else {
		
			console.log('Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	
	},(err) => {
	
		console.log('Failed to send instantiate proposal due to error: ',err);
	
		
	}).then((response) => {
	
		//gets the response from the orderer and verifies the response status
		if (response.status === 'SUCCESS') {
		
			console.log('Successfully sent transaction to the orderer.');
			
		} else {
			console.log('Failed to order the transaction. Error code: ',response);
		
		}
	}, (err) => {
		console.log('Failed to send instantiate due to error: ',err);
	
	});
}
