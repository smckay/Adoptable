var express = require('express');
var app = express();

var path = require('path');
var bodyParser = require('body-parser');
var mustacheExpress = require('mustache-express');
var assert =  require('assert');
var randomstring = require('randomstring');
var session = require('client-sessions');

var MongoClient = require('mongodb').MongoClient;
var Grid = require('gridfs-stream');
var GridStore = require('mongodb').GridStore;

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

var db;
var gfs;
MongoClient.connect(url, function(err, database) {
	if (err) return console.log(err)
	db = database;
	gfs = Grid(db, MongoClient);	
});

app.get('/', function(req, res) {
//    MongoClient.connect(url, function(err, db) {
/*
                if (err) {
                	res.send(error_obj(err));
                	return;
                }
                */
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
//        });

});

app.post('/', function(req, res) {
});

app.post('/adduser', function(req, res) {
    console.log(" [*] RECEIVED REQUEST AT: /adduser");

    var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;

	console.log("PARAMETER 'username': " + username);
	console.log("PARAMETER 'password': " + password);
	console.log("PARAMETER 'email': " + email);

	console.log("Connected to MongoDB server");
	var users = db.collection('users');
	var key = randomstring.generate();


	/*users.findOne(
                {username: username},
                function(err, doc) {
                        if (err == null) {
				console.log("user already exists");
                                res.send({
                               	 	status: "ERROR",
                                	message: "Unable to create user."
                        	});
                        }
                }
        );*/

        users.insert({
                username: username,
                password: password,
                email: email,
                verified: false,
                key: key,
                liked: [],
                followers: [],
                following: [],
        }, function(err, r) {
                if (err != null) {
                        res.send({
                                status: "ERROR",
                                message: "Unable to create user."
                        });
                } else {
                        console.log("Sucessfully created user " + username);
						
					/*	transporter.sendMail(
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
						);*/
						
                        res.send(SUCCESS);
                }
        });
});

app.post('/verify', function(req, res) {
    console.log(" [*] RECEIVED REQUEST AT: /verify");
    var email = req.body.email;
    var key = req.body.key;

	console.log("PARAMETER 'email': " + email);
	console.log("PARAMETER 'key': " + key);

	// If the backdoor was passed in, then automatically verify the user
	if (key == BACKDOOR) {
		console.log("backdoor received");
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
	}
	// If the backdoor was not used, verify normally
	else {
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
	}
});


app.post('/login', function(req, res) {
        console.log(" [*] RECEIVED REQUEST AT: /login");

        var username = req.body.username;
        var password = req.body.password;
        console.log("PARAMETER 'username': " + username);
        console.log("PARAMETER 'password': " + password);

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

app.post('/logout', function(req, res) {
	console.log(" [*] RECEIVED REQUEST AT: /logout");
	req.session.reset();
	res.send(SUCCESS);
});

app.post('/item/:id/like', function(req, res) {
	console.log(" [*] RECEIVED REQUEST AT: /like");

	var username = req.session.username;
	var id = req.params.id;
	var like = req.body.like;

	console.log("PARAMETER 'username': " + username);
	console.log("PARAMETER 'id': " + id);
	console.log("PARAMETER 'like': " + like);

	var users = db.collection('users');
	var items = db.collection('items');
	
	//var item = items.find({_id: ObjectID(id)});

	items.findOne(
		{_id: ObjectID(id)},
		function(err, response){
			console.log(response);
			if((like == "true" || like == true) && !err){
				users.findOneAndUpdate(
					{username: username},
					{$push: {liked: response._id}},
					{},
					function(err, response){
						console.log(response);
						if(response.lastErrorObject.updatedExisting){
							res.send(SUCCESS);
						}
						else{
							res.send(ERROR);
						}
					}
				);				
			}
			else if(!err){
                                users.findOneAndUpdate(
                                        {username: username},
                                        {$pull: {liked: response._id}},
                                        {},
                                        function(err, response){
                                                console.log(response);
                                                if(response.lastErrorObject.updatedExisting){
                                                        res.send(SUCCESS);
                                                }
                                                else{
                                                        res.send(ERROR);
                                                }
                                        }
                                );
			
			}
			else{
				res.send(ERROR);
			}
		}
	);	
});

app.post('/additem', function(req, res){
	console.log(" [*] RECEIVED REQUEST AT: /additem");
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

app.get('/item', function(req, res){
	var id = req.query.id;
	console.log("PARAMETER 'id': " + id);
	var items = db.collection('items');
	items.find({id: id}, function(err, docs) {
		if (err) {
			res.send(error_obj(err));
		}
		else if(!docs || docs.length == 0) {
			res.send(error_obj("Cannot find item with that ID"));
		}
		else {
			res.send({
				status: "OK",
				id: id,
				item: docs[0],
			});
		}
	});
});

app.get('/item/:item_id', function(req, res) {
    console.log(" [*] RECEIVED REQUEST AT: /item");
	
	var item_id = req.params.item_id;
	console.log("PARAMETER 'item_id': " + item_id);

	var items = db.collection('items');
	items.find({_id: ObjectID(item_id)}).toArray(function(err, docs) {
		if (err) {
			res.send( error_obj(error));
		}
		else if (!docs || docs.length == 0) {
			res.send( error_obj("Cannot find pet with id " + item_id));
		}
		else {
			res.send( {status: "OK", item: docs[0]});
		}
	});
});

app.post('/search', function(req, res) {
    console.log(" [*] RECEIVED REQUEST AT: /search");
    
    console.log(req.body.following);

	var timestamp = parseInt(req.body.timestamp || Date.now());
	var limit = Math.min(parseInt(req.body.limit || 25), 100);
	var q = req.body.q;
	var username = req.body.username;
	var following = (req.body.following == "false" || req.body.following == false) ? false : true;
	var rank = req.body.rank || "interest";

	if (!req.session || !req.session.username) {
		res.send(error_obj("Cannot find valid session. Please login"));
		return;
	}
	var current_user = req.session.username;

	console.log("SESSION 'username': " + current_user);
	console.log("PARAMETER 'timestamp': " + timestamp);
	console.log("PARAMETER 'limit': " + limit);
	console.log("PARAMETER 'q': " + q);
	console.log("PARAMETER 'username': " + username);
	console.log("PARAMETER 'following': " + following);
	console.log("PARAMETER 'rank': " + rank);

	var query = {}
	if (q) {
		query.content = {$regex: ".*" + q + ".*", $options: "i"};
	}
	username_queries = [];
	if (username) {
		username_queries.push({username: username});
	}
	if (following) {
		users_following = null;
		users = db.collection('users');
		users.findOne({username: current_user}, function(err, doc) {
			// This is asynchronous...
			if (doc.following) {
				username_queries.push({username: {$in: doc.following}});
			}
			if (username_queries.length > 0) {
				query.username = {$and: username_queries};
			}
			console.log("SEARCH QUERY:\n" + JSON.stringify(query, null, 2));

			var items = db.collection('items');
			items.aggregate([
				{$match: query},
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
					"items": docs || [],
				});
			});
		});
		// users_following will be null here, because the query didn't finish
	}
	else {
		if (username_queries.length > 0) {
			query.username = {$and: username_queries};
		}
		console.log("SEARCH QUERY:\n" + JSON.stringify(query, null, 2));

		var items = db.collection('items');
		items.aggregate([
			{$match: query},
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
				"items": docs || [],
			});
		});
	}
});

app.get('/user/:username', function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /user/username");

	var username = req.params.username;
	console.log("PARAMETER 'username': " + username);

	var users = db.collection('users');
	users.findOne(
		{username: username},
		function(err, doc) {
			if (err) {
				res.send( error_obj(error));
			}
			res.send( {"status": "OK", "user": {"email": doc.email, "followers":doc.followers.length, "following":doc.following.length,}});
		}
	);
});


app.post('/follow', function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /follow");

	if (!req.session || !req.session.username) {
		res.send(error_obj("No valid session found. Please login."));
		return;
	}
	var username = req.session.username;
	console.log("SESSION 'username': " + username);

	var userToFollow = req.body.username;
	var follow = req.body.follow;

	console.log("PARAMETER 'username': " + userToFollow);
	console.log("PARAMETER 'follow': " + follow);

	var users = db.collection('users');
	if(follow == "true" || follow == true){
		console.log("adding " + userToFollow);
		users.findOneAndUpdate(
			{username: username},
			{$push: {following: userToFollow}},
			{},
			function(err, response){
				console.log(response);
				if(response.lastErrorObject.updatedExisting){
				}
				else{
					res.send(error_obj(err));
				}
			}
		);
		users.findOneAndUpdate(
			{username: userToFollow},
			{$push: {followers: username}},
			{},
			function(err, response){
				console.log(response);
				if(response.lastErrorObject.updatedExisting){
					res.send(SUCCESS);
				}
				else{
					res.send(error_obj(err));
				}
			}
		);
	}
	else{
		console.log("removing " + userToFollow);
		
		users.findOneAndUpdate(
			{username: username},
			{$pull: {following: userToFollow}},
			{},
			function(err, response){
				console.log(response);
				if(response.lastErrorObject.updatedExisting){
				}
				else{
					res.send(ERROR);
				}
			}
		);
		users.findOneAndUpdate(
			{username: userToFollow},
			{$pull: {followers: username}},
			{},
			function(err, response){
				console.log(response);
				if(response.lastErrorObject.updatedExisting){
					res.send(SUCCESS);
				}
				else{
					res.send(ERROR);
				}
			}
		);
		

	}

});

app.get('/user/:username/followers', function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /user/:username/followers");

	var username = req.params.username;
	var limit = Math.min(parseInt(req.body.limit || 50), 200);


	console.log("PARAMETER 'username': " + username);
	console.log("PARAMETER 'limit': " + limit);

	console.log("retrieving " + limit + " followers from user " + username);

	var users = db.collection('users');
	users.findOne(
		{username: username},
		{_id: 0, "followers": {$slice: limit}},
		function(err, docs){
			console.log(docs.followers);
			if(err){
				res.send(error_obj(error));
			}
			res.send({     
				"status": "OK",
				"users": docs.followers,
			}); 
		}
	);
});

app.get('/user/:username/following', function(req, res){
	var username = req.params.username;
	var limit = Math.min(parseInt(req.body.limit || 50), 200);
	var users = db.collection('users');

	console.log("retrieving " + limit + " following from user " + username);

	users.findOne(
		{username: username},
		{_id: 0, "following": {$slice: limit}},
		function(err, docs){
			console.log(docs.following);
			if(err){
				res.send(error_obj(error));
			}
			res.send({
				"status": "OK",
				"users": docs.following,
			});
		}
	);
});

app.delete('/item/:id', function(req, res){
	var id = req.params.id;

	var items = db.collection('items');
	items.remove({_id: ObjectID(id)}, function(err, result) {
		if (err || !result) {
			res.send(error_obj(err));
		} else if (result.result.n == 0) {
			res.send(error_obj("No elements with that ID"));
		} else {
			res.send(SUCCESS);
		}
	});
});

app.post('/addmedia', function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /addmedia");

	var media = req.body.content;
	//console.log(media);


	res.send(SUCCESS);
/*	grid.put(media, {content_type: 'image'}, function(err, fileInfo){
		if(!err){
			console.log("Finished writing file");
			res.send({"status": "OK", "id": fileInfo._id,});
		}
		else{
			res.send(ERROR);
		}
	});*/
});

app.get('/media/:id', function(req, res){
	var id = req.params.id;
	grid.get(id, function(err, data){
		if(!err){
			res.send(data);
		}
		else{
			res.send(ERROR);
		}
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

