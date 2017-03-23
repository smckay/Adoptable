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
        // res.sendFile(path.join('html', 'eliza.html'), sendFileOptions);
    // res.sendFile(path.join('html', 'eliza.html'), sendFileOptions);
    MongoClient.connect(url, function(err, db) {
                if (err) {
                	res.send(error_obj(err));
                	return;
                }
                console.log("Connected to MongoDB server");
                if (req.session && req.session.username) {
                        var users = db.collection('users');
                        users.findOne({username: req.session.username}, function(err, result) {
                                if (!result) {
                                        req.session.reset();
                                        res.redirect('/html/login.html');
                                }
                                else if (!result.verified) {
                                        res.redirect('/html/verify.html');
                                }
                                else {
                                    res.redirect('/html/feed.html');
                                }
                        });
                }
                else {
                        res.redirect('/html/login.html');
                }
        });

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
                if (err) {
                	res.send(error_obj(err));
                	return;
                }
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
						/*
						transporter.sendMail(
							{
								to: username + ' <' + email + '>',
								subject: "Please verify!",
								text: "130.245.168.148/html/verify.html?key=" + key + "&email=" + email,
							}, function(err, info) {
								if (err != null) {
									console.log(err);
								} else {
									console.log("Sent email");
								}
							}
						);
						*/
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
			if (err) {
				res.send(error_obj(err));
				return;
			}
			console.log("Connected to MongoDB server");
			var users = db.collection('users');
			users.findOneAndUpdate(
				{email:email},
				{$set: {verified: true}},
				{},
				function(err, response) {
					if (response.lastErrorObject.updatedExisting){
						req.session.username = response.value.username;
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
			if (err) {
				res.send(error_obj(err));
				return;
			}
			console.log("Connected to MongoDB server");
			var users = db.collection('users');
			// Locate a user with the given email and key
			users.findOneAndUpdate(
				{email:email, key:key},
				{$set: {verified: true}},
				{},
				function(err, response) {
					if (response.value){
						var username = response.value.username;
						req.session.username = username;
						console.log("verified");
						res.send(SUCCESS);
					}
					// If the object was not successfully updated, then the
					// email or key is wrong. Notify the user.
					else {
						res.send(error_obj("Unable to validate user. Please contact your system administrator."));
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
                	res.send(error_obj(err));
                	return;
                }
                var users = db.collection('users');
                users.findOne({username: username, password: password}, function(err, result) {
                	console.log(result);
					if (err) {
						res.send(error_obj("Could not query database."));
					}
					else if (!result) {
						res.send(error_obj("Incorrect username or password."));
					}
					else if (!result.verified) {
						res.send(error_obj("Not verified"));
					}
					else {
						req.session.username = username;
						res.send(SUCCESS);
					}
                });
        });

});

app.post('/logout', function(req, res) {
	console.log("RECEIVED REQUEST AT: /logout");
	req.session.reset();
	res.send(SUCCESS);
});

app.post('/like', function(req, res) {
	console.log("RECEIVED REQUEST AT: /like");
	var username = req.body.username;
	var id = req.body.id;
	var remove = req.body.remove;
	console.log("PARAMETER 'username': " + username);
	console.log("PARAMETER 'id': " + id);
	console.log("PARAMETER 'remove': " + remove);
	MongoClient.connect(url, function(err, db) {
		if (err) {
			res.send(error_obj(err));
			return;
		}
		console.log("Connected to MongoDB server");
		var users = db.collection('users');
		var items = db.collection('items');
		var item = items.find({_id: ObjectID(id)});
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
	var content = req.body.content;
	var description = req.body.petDescription;
	var location = req.body.petLocation;
	console.log("PARAMETER 'content': " + content);
	console.log("PARAMETER 'description': " + description);
	console.log("PARAMETER 'location': " + location);

	if (!req.session || !req.session.username) {
		res.send(error_obj("Cannot find valid session. Please login"));
		return;
	}

	console.log("SESSION 'username': req.session.username");

    MongoClient.connect(url, function(err, db) {
		if (err) {
			res.send(error_obj(err));
			return;
		}
		console.log("Connected to MongoDB server");
		var items = db.collection('items');
        items.insertOne(
    		{
    			username: req.session.username,
				content: content,
				petDescription: description,
				petLocation: location,
				timestamp: new Date().getTime()/1000,
			}, function(err, r) {
				if (err != null) {
					res.send(error_obj("Unable to add item."));
				} else {
					console.log("Sucessfully added item");
					res.send({
						status: "OK",
						id: r.ops[0]._id,
					});
				}
			}
		);
    });
});

app.get('/item', function(req, res){
	var id = req.query.id;
	console.log("PARAMETER 'id': " + id);
    MongoClient.connect(url, function(err, db) {
                if (err) {
                	res.send(error_obj(err));
                	return;
                }
                console.log("Connected to MongoDB server");
                var items = db.collection('items');
                items.findOne({id: id}, function(err, result) {
                        if (err || !result) {
                                res.send(error_obj("Cannot find item with that ID"));
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

app.get('/item/:item_id', function(req, res) {
    console.log("RECEIVED REQUEST AT: /item");
	
	var item_id = req.params.item_id;
	console.log("PARAMETER 'item_id': " + item_id);

    MongoClient.connect(url, function(err, db) {
		if (err) {
			res.send(error_obj(err));
			return;
		}
		console.log("Connected to MongoDB server");
		var items = db.collection('items');
		items.findOne(
			{_id: ObjectID(item_id)},
			function(err, doc) {
				if (err) {
					res.send( error_obj(error));
				}
				res.send( {status: "OK", item: doc});
			}
		);
	});
});

app.post('/search', function(req, res) {
    console.log("RECEIVED REQUEST AT: /search");

	var timestamp = parseInt(req.body.timestamp || Date.now());
	var limit = Math.min(parseInt(req.body.limit || 25), 100);
	var q = req.body.q;
	var username = req.body.username;
	var following = req.body.following || true;
	var rank = req.body.rank || "interest";

	console.log("PARAMETER 'timestamp': " + timestamp);
	console.log("PARAMETER 'limit': " + limit);
	console.log("PARAMETER 'q': " + q);
	console.log("PARAMETER 'username': " + username);
	console.log("PARAMETER 'following': " + following);
	console.log("PARAMETER 'rank': " + rank);

    MongoClient.connect(url, function(err, db) {
		if (err) res.send(error_obj(err));
		console.log("Connected to MongoDB server");
		var items = db.collection('items');
		/*
		items.find(
			{'timestamp':
				{$lt: timestamp}
			},
			{
				"contents": true,
				"petLocation": true,
				"name": true,
				"petDescription": true,
			}
		).limit(limit).toArray(function(err, docs) {
			res.send({
				"status": "OK",
				"items": docs,
			});
		});
		*/
		items.aggregate([
			{$project: 
				{
					id: "$_id",
					name: 1,
					petDescription: 1,
					petLocation: 1,
					username: 1,
					timestamp: 1,
					content: 1,
				}
			},
		]).limit(limit).toArray(function(err, docs) {
			res.send({
				"status": "OK",
				"items": docs,
			});
		});
	});
});

function error_obj(err) {
	console.log(err);
	return {
		status: "error",
		error: err,
	};
}

app.listen(80, function() {
    console.log("Listening on port 80");
});


