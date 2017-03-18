var express = require('express');
var app = express();

var path = require('path');
var bodyParser = require('body-parser');
var mustacheExpress = require('mustache-express');
var assert =  require('assert');
var randomstring = require('randomstring');
var session = require('client-sessions');

var MongoClient = require('mongodb').MongoClient;
var ObjectID =  require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/adoptable'

var nodemailer = require('nodemailer');
var transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: 'cs356.wp2.dansam@gmail.com',
		pass: 'cse356wp2'
	}
}, {
	from: 'Dan Harel and Sam McKay <noreply@stonybrook.edu>'
});

app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/json' }))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use(session({
	cookieName: 'session',
	secret: randomstring.generate(),
	duration: 30 * 60 * 1000,
	activeDuration: 5 * 60 * 1000,
}));

app.engine('html', mustacheExpress());

app.set('view engine', 'mustache');
app.set('views', path.join(__dirname, 'static', 'templates'));

var sendFileOptions = {
    root: path.join(__dirname, 'static')
};

var BACKDOOR = 'abracadabra';

var SUCCESS =  {status: "OK", message: "Success"};
var ERROR = {status: "ERROR"};

app.get('/', function(req, res) {
	res.redirect('/html/login.html');
});

app.post('/', function(req, res) {
});

app.post('/adduser', function(req, res) {
    console.log("RECEIVED REQUEST AT: /adduser");

    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;

        console.log("PARAMETER 'username': " + username);
        console.log("PARAMETER 'password': " + password);
        console.log("PARAMETER 'email': " + email);

    MongoClient.connect(url, function(err, db) {
                assert.equal(null, err);
                console.log("Connected to MongoDB server");
                var users = db.collection('users');
        var key = randomstring.generate();
        users.insert({
                username: username,
                password: password,
                email: email,
                verified: false,
                key: key,
                items: [],
        }, function(err, r) {
                if (err != null) {
                        res.send({
                                status: "ERROR",
                                message: "Unable to create user."
                        });
                } else {
                        console.log("Sucessfully created user " + username);
                                transporter.sendMail({
                                        to: username + ' <' + email + '>',
                                        subject: "Please verify!",
                                        text: "130.245.168.148/html/verify.html?key=" + key + "&email=" + email,
                                }, function(err, info) {
                                        if (err != null) {
                                                console.log(err);
                                        } else {
                                                console.log("Sent email");
                                        }
                                });
                        res.send(SUCCESS);
                }
        });
    });

});

app.post('/verify', function(req, res) {
    console.log("RECEIVED REQUEST AT: /verify");
    var email = req.body.email;
    var key = req.body.key;

        console.log("PARAMETER 'email': " + email);
        console.log("PARAMETER 'key': " + key);

        // If the backdoor was passed in, then automatically verify the user
        if (key == BACKDOOR) {
                console.log("backdoor received");
                MongoClient.connect(url, function(err, db) {
                        assert.equal(null, err);
                        console.log("Connected to MongoDB server");
                        var users = db.collection('users');
                        users.findOneAndUpdate(
                                {email:email},
                                {$set: {verified: true}},
                                {},
                                function(err, response) {
                                        console.log(response);
                                        if (response.lastErrorObject.updatedExisting){
                                                res.send(SUCCESS);
                                        }
                                        else {
                                                res.send({
                                                        status: "ERROR",
                                                        message: "Failed to verify user. Please contact system administrator.",
                                                });
                                        }
                                }
                        );
                });
        }
        // If the backdoor was not used, verify normally
        else {
                MongoClient.connect(url, function(err, db) {
                        assert.equal(null, err);
                        console.log("Connected to MongoDB server");
                        var users = db.collection('users');
                        // Locate a user with the given email and key
                        users.findOneAndUpdate(
                                {email:email, key:key},
                                {$set: {verified: true}},
                                {},
                                function(err, response) {
                                        console.log(response);
                                        if (response.lastErrorObject.updatedExisting){
                                                res.send(SUCCESS);
                                        }
                                        // If the object was not successfully updated, then the
                                        // email or key is wrong. Notify the user.
                                        else {
                                                res.send({
                                                        status: "ERROR",
                                                        message: "Unable to validate user. Please contact your system administrator.",
                                                });
                                        }
                                }
                        );
                });
        }


});


app.post('/login', function(req, res) {
        console.log("RECEIVED REQUEST AT: /login");

        var username = req.body.username;
        var password = req.body.password;
        console.log("PARAMETER 'username': " + username);
        console.log("PARAMETER 'password': " + password);

        MongoClient.connect(url, function(err, db) {
                if (err) {
                        res.send({
                                status: "ERROR",
                                message: "Could not connect to database."
                        });
                }
                var users = db.collection('users');
                users.findOne({username: username, password: password}, function(err, result) {
                        if (err) {
                                res.send({
                                        status: "ERROR",
                                        message: "Could not query database."
                                });
                        }
                        else if (!result) {
                                res.send({
                                        status: "ERROR",
                                        message: "Incorrect username or password."
                                });
                        }
                        else {
                                req.session.username = username;
                                res.send(SUCCESS);
                        }
                });
        });

});

app.post('/logout', function(req, res) {
	console.log("logout");
        req.session.reset();
        res.send(SUCCESS);

});

app.post('/like', function(req, res) {
        console.log("RECEIVED REQUEST AT: /like");
	var username = req.body.username;
	var id = req.body.id;
	var remove = req.body.remove;
        MongoClient.connect(url, function(err, db) {
                   assert.equal(null, err);
                   console.log("Connected to MongoDB server");
                   var users = db.collection('users');
		   var items = db.collection('items');
		   var item = items.find({id: id});
                   // Locate a user with the given email and key
                  users.findOneAndUpdate(
                           {username: username},
                           {$push: {liked: item}},
                           {},
                           function(err, response) {
                                   console.log(response);
                                   if (response.lastErrorObject.updatedExisting){
                                           res.send(SUCCESS);
                                   }
                                   // If the object was not successfully updated, then the
                                   // email or key is wrong. Notify the user.
                                   else {
                                           res.send({
                                                   status: "ERROR",
                                                   message: "Unable to validate user. Please contact your system administrator.",
                                           });
                                   }
                           }
                   );
           });
	

});

app.post('/additem', function(req, res){
	        console.log("RECEIVED REQUEST AT: /additem");
	var name = req.body.content;
	var description = req.body.petDescription;
	var location = req.body.petLocation;
    MongoClient.connect(url, function(err, db) {
                assert.equal(null, err);
                console.log("Connected to MongoDB server");
                var items = db.collection('items');
        items.insert({
		name: name,
		petDescription: description,
		petLocation: location,
        }, function(err, r) {
                if (err != null) {
                        res.send({
                                status: "ERROR",
                                message: "Unable to add item."
                        });
                } else {
                        console.log("Sucessfully added item");
                                });
                        res.send(SUCCESS);
                }
        });
    });

});

app.get('/item', function(req, res){
	var id = req.query.id;
    MongoClient.connect(url, function(err, db) {
                assert.equal(null, err);
                console.log("Connected to MongoDB server");
                var items = db.collection('items');
                items.findOne({id: id}, function(err, result) {
                        if (err || !result) {
                                res.send({
                                        status: "ERROR",
                                        error: "Cannot find item with that ID"
                                });
                        }
                        else {
                                res.send({
                                        status: "OK",
                                        id: id,
                                        item: result.item,
                                });
                        }
                });
        });


});


app.listen(80, function() {
    console.log("Listening on port 80");
});


