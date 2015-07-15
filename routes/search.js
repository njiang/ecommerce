var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
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

module.exports = router;