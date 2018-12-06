// Dependencies
var express = require('express');
var OpenTok = require('../../lib/opentok');
var bodyParser = require('body-parser');
var app = express();

var opentok;
var apiKey = process.env.API_KEY || '';
var apiSecret = process.env.API_SECRET || '';
var IP_ADDRESS = 'localhost';
var PORT = 3000;

// Verify that the API Key and API Secret are defined
if (!apiKey || !apiSecret) {
  console.log('You must specify API_KEY and API_SECRET environment variables');
  process.exit(1);
}

// Starts the express app
function init() {
  app.listen(PORT, IP_ADDRESS, function () {
    console.log('You\'re app is now ready at ' + IP_ADDRESS + ':' + PORT);
  });
}

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

// Initialize the express app
app.use(express.static(__dirname + '/public'));

// Initialize OpenTok
opentok = new OpenTok(apiKey, apiSecret);
init();

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    // res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

/**
 * Start a session
 */
app.post('/session', function (req, res) {
  // var users = req.body.users;
  // var user1;
  // var user2;
  // if (users && users.length >= 2) {
  //   // start a new session between these two users [1,2]
  //   user1 = users[0];
  //   user2 = users[1];

  var sessionProperties = {};

    // Create a session and store it in the express app
    opentok.createSession(sessionProperties, function (err, session) {
      if (err) {
          console.log('Error creating session: ' + err);
          res.status(500);
      }
      else {
          app.set('sessionId', session.sessionId);
          console.log('Session created: ' + session.sessionId);
          res.json({
              sessionId: session.sessionId
          }).status(200);
      }
    });


  // }
  // else {
  //   res.status(403);
  // }
});


//TODO - endpoint for TOXBOX to send notifications too
//TODO - handle connectionCreated | connectionDestroyed | streamCreated | streamDestroyed

/**
 * Stop all participants of a session
 */
app.delete('/session', function (req, res) {
    var sessionId = req.body.sessionId;

    console.log('Stopping session: ' + sessionId);

    // list streams
    opentok.listStreams(sessionId, function (error, streams) {
        if (!error && streams && streams.length > 0) {
            streams.forEach(function (stream) {
                console.log('Found stream: ' + stream.id);

                // force disconnect each stream
                opentok.forceDisconnect(sessionId, stream.connection.id, function (error) {
                    if(error) throw error;
                    console.log('Stream terminated: ' + stream.id);
                });
            });
            res.status(200);
        }
        else {
            console.log('No streams found for this session: ' + sessionId);
            res.json({
                msg: 'No streams found'
            }).status(200);
        }
    });
});

/**
 * View all participants of a session
 */
app.post('/session/streams', function (req, res) {
    var sessionId = req.body.sessionId;
    console.log('Listing streams for session: ' + sessionId);
    var streams = [];
    // list streams
    opentok.listStreams(sessionId, function (error, returnedStreams) {
        if (!error && returnedStreams && returnedStreams.length > 0) {
            returnedStreams.forEach(function (stream) {
                console.log('Found stream: ' + stream.id);
                streams.push(stream);
            });
            res.json({
                sessionId: sessionId,
                streams: streams
            }).status(200);
        }
        else {
            console.log('No streams found for this session: ' + sessionId);
            res.json({
                msg: 'No streams found'
            }).status(200);
        }
    });
});


/**
 * Browser endpoint to join a session - view is rendered here
 */
app.get('/', function (req, res) {
    var sessionId = app.get('sessionId');

    // generate a fresh token for this client
    var token = opentok.generateToken(sessionId);
    // var token = opentok.generateToken(sessionId, {
    //   role: 'moderator',
    //   expireTime: (new Date().getTime() / 1000) + (7 * 24 * 60 * 60), // in one week
    //   data: 'name=Darach',
    //   initialLayoutClassList: ['focus']
    // });
    console.log('Token provided for client: ' + token);

    res.render('index.ejs', {
        apiKey: apiKey,
        sessionId: sessionId,
        token: token
    });
});


/**
 * Mobile endpoint to join a session i.e. obtain a token and sessionId to use
 */
app.get('/join-session', function (req, res) {
    var sessionId = app.get('sessionId');

    // generate a fresh token for this client
    var token = opentok.generateToken(sessionId);
    console.log('Token provided for client: ' + token);

    res.json({
        sessionId: sessionId,
        token: token
    }).status(200);
});

/**
 * Called by Toxbox with session updates
 * {
    "sessionId": "2_MX4xMzExMjU3MX5-MTQ3MDI1NzY3OTkxOH45QXRr",
    "projectId": "123456",
    "event": "connectionCreated",
    "timestamp": 1470257688309,
    "connection": {
        "id": "c053fcc8-c681-41d5-8ec2-7a9e1434a21e",
        "createdAt": 1470257688143,
        "data": "TOKENDATA"
    }
}
 */
app.post('/session/updates', function (req, res) {
    console.log('Session update received');
    var event = req.body;

    if (event.event === 'connectionCreated') {
        console.log('Connection created for sessionId: ' + event.sessionId + ' :: connectionId: ' + event.connection.id);
    }
    else if (event.event === 'connectionDestroyed') {
        console.log('Connection destroyed for sessionId: ' + event.sessionId + ' :: connectionId: ' + event.connection.id);
    }
    else if (event.event === 'streamCreated') {
        console.log('Stream created for sessionId: ' + event.sessionId + ' :: connectionId: ' + event.stream.connection.id);
    }
    else if (event.event === 'streamDestroyed') {
        console.log('Stream destroyed for sessionId: ' + event.sessionId + ' :: connectionId: ' + event.stream.connection.id);
    }

    res.json({
        msg: 'thanks'
    }).status(200);

});

app.get('/appData', function (req, res) {
    res.json([
        {
            "type": "sessionBookingTimesTypes",
            "data": "15 mins, 30 mins, 45 mins,60 mins,1 hour 15 mins,1 hour 30 mins,1 hour 45 mins,2 hours"
        }
    ]).status(200);
});
















