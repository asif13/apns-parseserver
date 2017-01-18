// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var path = require('path');
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
var ParseDashboard = require('parse-dashboard');
var adapter = require('parse-token-based-push-ios').ParsePushAdapter;

var configuration = {ios: {
      // pfx: "apnsios_dev.p12",
      // passphrase: '',
      // bundleId: "com.nsi.apnsios",
      production: false,
      tokenPath: 'apns.p8', 
      tokenKey: 'TQR7U48P84', 
      teamId: 'BML7Y29427' 
}};

var pushAdapter = new adapter(configuration);
if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'daupsfbubaf8rfairwubngur9bgnr',
  masterKey: process.env.MASTER_KEY || 'master', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  push: {
    adapter:pushAdapter
  }
});

var app = express();
var dashboard = new ParseDashboard({
  "apps": [
    {
      "serverURL": "http://localhost:1337/parse",
      "appId": "daupsfbubaf8rfairwubngur9bgnr",
      "masterKey": "master",
      "appName": "MyApp"
    }
  ],verbose:1
});
app.use('/dashboard', dashboard);

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
