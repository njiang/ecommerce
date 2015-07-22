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
var uuid = require("uuid");

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

function groupOrders(ordercollection, userOrders, callback)
{
	var products = {};
	userOrders.forEach(function(order) {
		var prodid = order.product.id;
		if (products[prodid] == null)
			products[prodid] = {count: 0};
	});
	
	// HACK HACK we get all the open orders for now, should just get orders for the products
	ordercollection.find({"status": {$eq: 1}}).toArray(function(err, docs) {
		if (!err) {
			docs.forEach(function (order) {
				if (products[order.product.id]) 
					products[order.product.id].count += parseInt(order.product.quantity);
			});
			if (callback) callback(products);
		}
		else if (callback)
			callback(null);
	});
}

app.get('/user/:id', function(req, res, next) {
	var usercollection = req.db.collection('usercollection');
	var productcollection = req.db.collection('productcollection');
	var ordercollection = req.db.collection('ordercollection');
	usercollection.findOne({"id": {$eq: req.params.id}}, function(err1, user) {
		if (!err1) {
			getProduct(productcollection, user, 0, function(user) {
				// get all open orders of the user
				ordercollection.find({$and: [{"userid": {$eq: req.params.id}}, {"status": {$eq: 1}}]}).toArray(function(e,docs) {
					if (!e) {
						user.openorders = docs;
						groupOrders(ordercollection, docs, function(products) {
							user.groupedProducts = products;
							res.contentType('json');
							res.send(user);
						})
						
					}
				});
			});
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

function insertOrders(ordercollection, orders, index, userid, callback)
{
	if (index < orders.length) {
		var orderid = uuid.v1();
		ordercollection.insert({userid: userid, orderid: orderid, product: orders[index], status: 1});
		insertOrders(ordercollection, orders, index + 1, userid, callback);
	}
	else if (callback)
		callback();
}



app.post('/order', function(req, res) {
	console.log('Received orders');
	var ordercollection = req.db.collection('ordercollection');
	var userid = req.body.user;
	
	insertOrders(ordercollection, req.body.orders, 0, userid, function() {
		var result = {};
		// get all open orders of the user
		ordercollection.find({$and: [{"userid": {$eq: userid}}, {"status": {$eq: 1}}]}).toArray(function(e,docs) {
			if (!e) {
				result.openorders = docs;
				// Group orders
				groupOrders(ordercollection, docs, function(products) {
					result.groupedOrders = products;
					res.contentType('json');
					res.send(result);
				})
				
			}
		});
	});
});

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
