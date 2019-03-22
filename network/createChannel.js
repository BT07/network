var Client = require('fabric-client');
var fs = require('fs');
var path = require('path');

var channel_name = 'firstchannel';
var org1mspid = "Org1MSP";
var org2mspid = "Org2MSP";
var org3mspid = "Org3MSP";

//creates the client object 
var client = new Client();
var config =null;
var signatures = [];
var org1peersurl = [{url:"grpcs://localhost:7051",eventurl:"grpcs://localhost:7053"}];
var org3peersurl = [{url:"grpcs://localhost:9051",eventurl:"grpcs://localhost:9053"}];

var caRootsPath = "../crypto-config/ordererOrganizations/org3.example.com/orderers/orderer.org3.example.com/msp/tlscacerts/tlsca.org3.example.com-cert.pem"
let data = fs.readFileSync(caRootsPath);
let caroots = Buffer.from(data).toString();

var orderer = client.newOrderer(
		"grpcs://localhost:7050",
		{
			'pem': caroots,
			'ssl-target-name-override': 'orderer.org3.example.com'
		}
);

//createChannel(channel_name,org1mspid,'org1');
//joinChannel(org1mspid,'org1',org1peersurl)
//joinChannel(org3mspid,'org3',org3peersurl)
getallChannels(org1peersurl,org1mspid,'org1')
//getallChannels(org3peersurl,org3mspid,'org3')
//getChannelInfo();

function createChannel(channel_name,org1mspid,org1dir){
	console.log('Inside createChannel function()');
	//return instance of the KeyValueStore which is used to store to save sensitive information such as authenticated user's private keys, certificates, etc.
	Client.newDefaultKeyValueStore({
			path: "/hfc-test-kvs/"+org1mspid
	}).then((store) => {
	
		console.log("\nCreate a storage for Org1 certs");
		//sets a state store to persist application states so that heavy-weight objects such as the certificate and private keys do not have to be passed in repeatedly
		client.setStateStore(store);
		console.log("\nEnrolling Admin for Org1");
		//returns a user object with signing identities based on the private key and the corresponding x509 certificate.
		return getAdmin(client, org1dir,org1mspid);
			
	}).then((admin) =>{
		
		console.log('\nSuccessfully enrolled admin for Org1');
		console.log('\nread the mychannel.tx file for signing');
		//read the channel.tx file
		let envelope_bytes = fs.readFileSync('../channel-artifacts/channel.tx');

		//the channel.tx file is of type ConfigEnvelope which contains two fields(i.e config and last envelope)
		//extracts the config field from ConfigEnvelope
		config = client.extractChannelConfig(envelope_bytes);
		console.log('\nSigning the channel config');
		
		//signs the config object
		var signature = client.signChannelConfig(config);
		//encodes the signature in buffer to hex 
		var string_signature = signature.toBuffer().toString('hex');
		
		//adds to the signature array defined above
		signatures.push(string_signature);
		signatures.push(string_signature);
		
		//generates transaction id
		let tx_id = client.newTransactionID();
		
		// builds the create channel request
		var request = {
			config: config,
			signatures : signatures,
			name : channel_name,
			orderer : orderer,
			txId  : tx_id
		};
		// send create request to orderer
		return client.createChannel(request);
			
	}).then((result) => {
		
		//gets the response from the orderer and check for the status
		console.log('\ncompleted the create channel request');
		console.log('\nresponse: ',result);
		console.log('\nSuccessfully created the channel.');
		
		if(result.status && result.status === 'SUCCESS') {
			console.log('\nSuccessfully created the channel...SUCCESS 200');
		} else {
			console.log('\nFailed to create the channel. ');
		}
	}, (err) => {
		console.log('\nFailed to create the channel: ' , err);
			
	}).then((nothing) => {
		console.log('\nSuccessfully waited to make sure new channel was created.');
	
	}, (err) => {
			console.log('\nFailed to sleep due to error: ', err);
			
	});

}

function getAdmin(client, userOrg,mspID){
	
	console.log('Inside getAdmin function()');
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

function joinChannel(mspID,orgPath,peers){

	//gets the channel object from the client object that we created globally
	var channel = client.newChannel(channel_name);
	//sets the orderer to the channel
	channel.addOrderer(orderer)
	var targets = [];
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+mspID
	}).then((store) => {
		
		console.log("\nRegistering "+orgPath+" admin")
		client.setStateStore(store);
		return getAdmin(client,orgPath,mspID);
		
	}).then((admin) => {
	
		console.log('\nSuccessfully enrolled '+orgPath+' \'admin\'');
		tx_id = client.newTransactionID();
		//build a request object for getting the genesis block for the channel from ordering service
		let request = {
			txId : 	tx_id
		};
		console.log('\nGetting the genesis block from orderer');
		//request genesis block from ordering service
		return channel.getGenesisBlock(request);
		
	}).then((block) =>{
	
		//gets the geneis block
		console.log('\nSuccessfully got the genesis block');
		genesis_block = block;		
		console.log('\nEnrolling org1 admin');
		return getAdmin(client,orgPath,mspID);
		
	}).then((admin) => {
		console.log('\nSuccessfully enrolled org:' + mspID + ' \'admin\'');
		//client.newPeer returns a peer object initialized with URL and its tls certificates and stores in a array named target
		//admin of org can choose which peers to join the channel
		for (var i=0;i<peers.length;i++) {

			let peer = peers[i];
			data = fs.readFileSync("../crypto-config/peerOrganizations/"+orgPath+".example.com/peers/peer"+i+"."+orgPath+".example.com/msp/tlscacerts/tlsca."+orgPath+".example.com-cert.pem");
			targets.push(client.newPeer(
							peer.url,
							{
								pem: Buffer.from(data).toString(),
								'ssl-target-name-override': "peer"+i+"."+orgPath+".example.com"
							}
						)
			);
		}
		tx_id = client.newTransactionID();
		//builds the join channel request with genesis block and peers(targets)
		let request = {
			targets : targets,
			block : genesis_block,
			txId : 	tx_id
		};
		//request specified peers to join the channel
		return channel.joinChannel(request);
		
	}, (err) => {
	
		console.log('Failed to enroll user admin due to error: ' + err);
		
	}).then((results) => {
	
		//gets the response from the peers and check response status
		console.log('\nResponse of one peer: ',results[0]);
		if(results[0] && results[0].response && results[0].response.status == 200) {
			console.log('\nPeers successfully joined the channel');
		} else {
			console.log(' Failed to join channel');
		}
	}, (err) => {
		console.log('Failed to join channel due to error: ' + err);
	});
	
}

function getallChannels(peers,orgmspid,orgPath){

	targets=[];
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
	
		console.log("\nRegistering orderer admin")
		client.setStateStore(store);
		return getAdmin(client,orgPath,orgmspid)
		
	}).then((admin) => {
	
		console.log('\nSuccessfully enrolled ' +orgPath+ 'admin');
		console.log('\nGetting the channel list from peer');
		return client.queryChannels(targets[0])
		
	}).then((ChannelQueryResponse) =>{
		console.log('\nChannel info: ',ChannelQueryResponse);
	});
}

function getChannelInfo(){

	data = fs.readFileSync("../crypto-config/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/msp/tlscacerts/tlsca.org3.example.com-cert.pem");
	var channel = client.newChannel(channel_name);
	var peer = client.newPeer(
					"grpcs://localhost:9051",
					{
						pem: Buffer.from(data).toString(),
						'ssl-target-name-override': "peer0.org3.example.com"
					}
				);
	Client.newDefaultKeyValueStore({
		path: "/hfc-test-kvs/"+"Org3MSP"
	}).then((store) => {
	
		console.log("\nRegistering orderer admin")
		client.setStateStore(store);
		return getAdmin(client,"org3",'Org3MSP')
		
	}).then((admin) => {
	
		console.log('\nSuccessfully enrolled org3 \'admin\'');
		console.log('\Getting the channel info block from orderer');
		return channel.queryInfo(peer)
		
	}).then((info) =>{
	
		console.log('\Channel info: ',info);
	
	});
}
