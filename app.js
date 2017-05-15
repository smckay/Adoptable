var express = require('express');
var app = express();

var path = require('path');
var bodyParser = require('body-parser');
var mustacheExpress = require('mustache-express');
var assert =  require('assert');
var randomstring = require('randomstring');
var session = require('client-sessions');

var wait = require('wait.for');
var async = require('asyncawait/async');
var await = require('asyncawait/await');

var mongodb = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var Grid = require('gridfs-stream');
Grid.mongo = mongodb.mongo;
var GridStore = require('mongodb').GridStore;
var fs = require('fs');
var stream = require('stream');
//var bufferStream = new stream.PassThrough();

var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({dest: '/uploads', storage: storage});

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
	//secret: randomstring.generate(),
	secret: 'cse356',
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
var bucket;
MongoClient.connect(url, function(err, database) {
	if (err) return console.log(err)
	db = database;
	bucket = new mongodb.GridFSBucket(db);
});

app.get('/', function(req, res) {
//    MongoClient.connect(url, function(err, db) {
/*
                if (err) {
                	res.send(error_obj(__line + "--" + err));
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

app.post('/verify', async(function(req, res) {
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
	    var username = await(users.findOne({email: email})).username;
	    users.findOneAndUpdate(
		{email:email, username:username},
		{$set: {verified: true}},
		{},
		function(err, response) {
		    if (err) {
			res.send(error_obj(__line + "--" + err));
		    }
		    else if (!response) {
			res.send(error_obj(__line + "--" + "Failed to verify user. Please contact system administrator."));
			return;
		    }
      		    else if (response.lastErrorObject.updatedExisting){
	    	        req.session.username = response.value.username;
			res.send(SUCCESS);
			return;
	            }
		    else {
			res.send({
			    status: "ERROR",
			    message: "Failed to verify user. Please contact system administrator.",
			});
			return;
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
						res.send(error_obj(__line + "--" + "Unable to validate user. Please contact your system administrator."));
					}
				}
			);
	}
}));


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
			res.send(error_obj(__line + "--" + "Could not query database."));
		}
		else if (!result) {
			res.send(error_obj(__line + "--" + "Incorrect username or password."));
		}
		else if (!result.verified) {
			res.send(error_obj(__line + "--" + "Not verified"));
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
	
	if(like == "true" || like == true){
		items.findOneAndUpdate(
			{_id: ObjectID(id)},
			{$push: {likes: username}},
			function(err, response){
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
                items.findOneAndUpdate(
                        {_id: ObjectID(id)},
                        {$pull: {likes: username}},
                        function(err, response){
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

app.post('/additem', function(req, res){
	console.log(" [*] RECEIVED REQUEST AT: /additem");
	var content = req.body.content;
	var description = req.body.petDescription;
	var location = req.body.petLocation;
	var parent = req.body.parent;
	var media = req.body.media;
	console.log("PARAMETER 'content': " + content);
	console.log("PARAMETER 'description': " + description);
	console.log("PARAMETER 'location': " + location);
	console.log("PARAMETER 'parent': " + parent);
	console.log("PARAMETER 'media': " + media);

	if (!req.session || !req.session.username) {
		res.send(error_obj(__line + "--" + "Cannot find valid session. Please login"));
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
			parent: parent,
			media: media,
			children: [],
			likes: [],
		}, function(err, r) {
			if (err) {
				res.send(error_obj(__line + "--" + "Unable to add item."));
			} else {
				console.log("Sucessfully added item");
				var newId = r.ops[0]._id;
				if (!parent) {
					res.send({
						status: "OK",
						id: newId,
					});
				}
				else {
					items.findOneAndUpdate(
						{_id: ObjectID(parent)},
						{$push: {children: newId}},
						{},
						function(err, response){
							console.log(response);
							if (err || !response) {
								res.send(error_obj(__line + "--" + err));
							}
							else if(response.lastErrorObject.updatedExisting){
								res.send({
									status: "OK",
									id: newId,
								});
							}
							else{
								res.send(error_obj(__line + "--" + "Could not find/update doc"));
							}
						}
					);
				}
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
			res.send(error_obj(__line + "--" + err));
		}
		else if(!docs || docs.length == 0) {
			res.send(error_obj(__line + "--" + "Cannot find item with that ID"));
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
			res.send( error_obj(__line + "--" + error));
		}
		else if (!docs || docs.length == 0) {
			res.send( error_obj(__line + "--" + "Cannot find pet with id " + item_id));
		}
		else {
			res.send( {status: "OK", item: docs[0]});
		}
	});
});

app.post('/search', async(function (req, res) {
    console.log(" [*] RECEIVED REQUEST AT: /search");
    
    console.log(req.body.following);

	var timestamp = parseInt(req.body.timestamp || Date.now());
	var limit = Math.min(parseInt(req.body.limit || 25), 100);
	var q = req.body.q;
	var username = req.body.username;
	var following = !(req.body.following == "false" || req.body.following == false);
	var rank = req.body.rank || "interest";
	var parent = req.body.parent;
	var replies = !(req.body.replies == "false" || req.body.replies == false);

	if (!req.session || !req.session.username) {
		res.send(error_obj(__line + "--" + "Cannot find valid session. Please login"));
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
	console.log("PARAMETER 'parent': " + parent);
	console.log("PARAMETER 'replies': " + replies);

	var query = {}
	if (q) {
		query.content = {$regex: ".*" + q + ".*", $options: "i"};
	}
	if (parent) {
		var children = await(items.findOne({_id: parent})).children;
		console.log(children);
		query._id = {$in: children};
	}
	if (!replies) {
		query.parent = null;
	}
	username_queries = [];
	if (username) {
		username_queries.push({username: username});
	}
	if (following) {
		users = db.collection('users');
		var users_following = await(users.findOne({username: current_user})).following;
		if (users_following) {
			username_queries.push({username: {$in: users_following}});
		}
	}
	if (username_queries.length > 0) {
		query.username = {$and: username_queries};
	}
	console.log("SEARCH QUERY:\n" + JSON.stringify(query, null, 2));

	var sort = rank === "time" ? {"time": 1} : {"interest": -1};
	console.log(sort);

	var items = db.collection('items');
	items.aggregate([
		{$match: query},
		{$limit: limit}, 
		{$project: 
			{
				id: "$_id",
				name: 1,
				petDescription: 1,
				petLocation: 1,
				username: 1,
				timestamp: 1,
				content: 1,
				interest: {$add: [{$size: "$children"}, {$size: "$likes"}]},
			}
		},
		//{$sort: sort},
	]).toArray(function(err, docs) {
		docs = docs || [];
		// Manually sort the list, because the pipeline stage for some reason
		// always sorts ascending instead of descensing
		var key = rank === "time" ? "timestamp" : "interest";
		docs.sort(function(a,b) {
			return b[key] - a[key];
		});
		res.send({
			"status": "OK",
			"items": docs || [],
		});
	});
	//}
}));

app.get('/user/:username', function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /user/username");

	var username = req.params.username;
	console.log("PARAMETER 'username': " + username);

	var users = db.collection('users');
	users.findOne(
		{username: username},
		function(err, doc) {
			if (err) {
				res.send( error_obj(__line + "--" + error));
			}
			res.send( {"status": "OK", "user": {"email": doc.email, "followers":doc.followers.length, "following":doc.following.length,}});
		}
	);
});


app.post('/follow', function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /follow");

	if (!req.session || !req.session.username) {
		res.send(error_obj(__line + "--" + "No valid session found. Please login."));
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
					res.send(error_obj(__line + "--" + err));
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
					res.send(error_obj(__line + "--" + err));
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
				res.send(error_obj(__line + "--" + error));
			}
			res.send({     
				"status": "OK",
				"users": docs.followers,
			}); 
		}
	);
});

app.get('/user/:username/following', function(req, res){
	console.log(" [*] RECEIVED REQUEST AT: /user/:username/following");
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
				res.send(error_obj(__line + "--" + error));
			}
			res.send({
				"status": "OK",
				"users": docs.following,
			});
		}
	);
});

app.delete('/item/:id', function(req, res){
	console.log(" [*] RECEIVED REQUEST AT: delete item");

	var id = req.params.id;

	var items = db.collection('items');
	items.findOne({_id: ObjectID(id)}, function(err, result){
		if (err) {
			res.send(error_obj(__line + "--" + err));
			return;
		} else if (!result) {
			res.send(error_obj(__line + "--" + "Cannot find item"));
			return;
		}
		else{
			var media = result.media;
        		items.remove({_id: ObjectID(id)}, function(err, result) {
                		console.log(result);
               		 	if (err || !result) {
                			res.send(error_obj(__line + "--" + err));
              			 } else if (result.result.n == 0) {
                        		res.send(error_obj(__line + "--" + "No elements with that ID"));
                		} else {
					if(media){deleteMedia(media);}
                        		res.send(SUCCESS);
                		}
        		});
		}		
	});

});

app.post('/addmedia', upload.single('content'), function(req, res){
    console.log(" [*] RECEIVED REQUEST AT: /addmedia");

	//console.log(req.file.buffer);	
	var bufferStream = new stream.PassThrough();

	bufferStream.end(req.file.buffer);
	var buck = bucket.openUploadStream(" ");	
	console.log(buck.id);

	//fs.createReadStream('./example.jpg').
	bufferStream.
		pipe(buck).
		on('error', function(error){
			//assert.ifError(error);
			res.send(error_obj(__line + "--" + error));
		}).
		on('finish', function(){
			res.send({status: "OK", id: buck.id,});
		});

});

app.get('/media/:id', function(req, res){
	console.log(" [*] RECEIVED REQUEST AT: /getmedia");

        var id = req.params.id;

	var files = db.collection('fs.files');

	files.findOne({_id: ObjectID(id)}, function(err, doc){
		if(!doc){
			console.log("MEDIA NOT FOUND");
			res.send(ERROR);
		}
		else{
			console.log("Retrieving media...");
			res.writeHead(200, {'Content-Type': 'image',});
			var media = bucket.openDownloadStream(ObjectID(id));
			media.pipe(res).on('error', function(error){
				console.log("error retrieving");
				res.send(ERROR);
			});
		}
	});

	/*var id = req.params.id;
	console.log(" [*] PARAMETER 'id': " + id);

	var gfs = Grid(db);
	gfs.files.find({_id: ObjectId(id)}).toArray(function (err, files) {
		if (err) {
			res.json(err);
		}
		if (files.length > 0) {
			res.set('Content-Type', 'image');
			var stream = gfs.createReadStream({_id: ObjectID(id)});
			stream.pipe(res);
			stream.on('finish', function() {
				res.end();
			});
		} else {
			res.json(error_obj(__line + "--" + "Cannot find file with id '" + id + "'"));
		}
	});*/
	


	
});

function error_obj(err) {
	console.log(err);
	fs.writeFile("log.txt", err);
	return {
		status: "error",
		error: err,
	};
}

function deleteMedia(media){
	for(i = 0; i < media.length; i++){
		var id = media[i];
		bucket.delete(ObjectID(id), function(error){
			console.log("error deleting media");
		});
	}
}

Object.defineProperty(global, '__stack', {
	get: function() {
		var orig = Error.prepareStackTrace;
		Error.prepareStackTrace = function(_, stack) {
			return stack;
		};
		var err = new Error;
		Error.captureStackTrace(err, arguments.callee);
		var stack = err.stack;
		Error.prepareStackTrace = orig;
		return stack;
	}
});

Object.defineProperty(global, '__line', {
	get: function() {
		return __stack[1].getLineNumber();
	}
});

Object.defineProperty(global, '__function', {
	get: function() {
		return __stack[1].getFunctionName();
	}
});

app.listen(80, function() {
    console.log("Listening on port 80");
});

