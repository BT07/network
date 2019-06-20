
var express = require('express');         // call express
var app = express();                      // define our app using express
var bodyParser = require('body-parser');
/* var http = require('http')
var fs = require('fs');
var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os'); */
var cors = require('cors');

app.use(bodyParser.urlencoded({ extended: true })); // Load all of our middleware
app.use(bodyParser.json());                         // configure app to use bodyParser()
app.options('*', cors());                           // this will let us get the data from a POST

require('./routes.js')(app); // this line requires and runs the code from our routes.js file and passes it app
app.use(cors())

var port = process.env.PORT || 8000;  // Save our port
// Start the server and listen on port 
app.listen(port, function () {
  console.log("Live on port: " + port);
});
