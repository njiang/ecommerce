//var async					= require("async");
var crypto				= require("crypto");
var express				= require("express");
var fs						= require("fs");
var mongodb				= require("mongodb");
//var multiparty 		= require("multiparty");
//var passwordHash	= require("password-hash");
//var request				= require("request");
//var oauth 				= require("oauth");
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

//var routes = require('./routes/index');
//var users = require('./routes/users');
//var search = require('./routes/search');

var pgDB = new mongodb.Db("PickGo", new mongodb.Server("127.0.0.1", 27017), {safe: true});
pgDB.open(function(error) {});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = pgDB;
    next();
});

//app.use('/', routes);
//app.use('/users', users);
//app.use('/search', search);

app.get('/', function(req, res, next) {
	res.sendFile('/index.html');
});

app.get('/search', function(req, res, next) {
    var collection = req.db.collection('productcollection');
    collection.find({}).toArray(function(e,docs){
	if (e) throw error;
	
	res.contentType('json');
	//res.header("Access-Control-Allow-Origin", "*");
	//res.header('Access-Control-Allow-Methods', 'GET, PUT');
	//res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
	res.send(docs);
  });      
});

function getProduct(productcollection, user, index, callback) {
	if (index < user.products.length) {
		productcollection.findOne({"id": {$eq: user.products[index].id}}, function(err2, pitem) {
			if (!err2)
				user.products[index].item = pitem;
			getProduct(productcollection, user, index + 1, callback);
		});
	}
	else if (callback) {
		callback(user);
	}
}

app.get('/user/:id', function(req, res, next) {
	var usercollection = req.db.collection('usercollection');
	var productcollection = req.db.collection('productcollection');
	usercollection.findOne({"id": {$eq: req.params.id}}, function(err1, user) {
		if (!err1) {
			getProduct(productcollection, user, 0, function(user) {
				res.contentType('json');
				res.send(user);
			})
		}
		else {
			res.contentType('json');
			res.send(null);
		}
	});
});

app.get('/searchresults', function(req, res, next) {
	res.render('searchresults');
});

app.get('/store', function(req, res, next) {
	console.log("store view");
	res.render('store');
});

app.get('/cart', function(req, res, next) {
	console.log("cart view");
	res.render('shoppingCart');
});

app.get(/^(.+)$/, function(req, res) 
{ 
	res.sendFile(req.params[0]); 
});

//app.post('/shoppingCart.html', function(req, res) {
//	console.log('Got cart post');
//	res.render('cart');
//});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
