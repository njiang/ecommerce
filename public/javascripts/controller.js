'use strict';

// the storeController contains two objects:
// - store: contains the product list
// - cart: the shopping cart object
function storeController($scope, $routeParams, DataService) {

    // get store and cart from service
    $scope.store = DataService.store;
    $scope.cart = DataService.cart;
	$scope.results = DataService.searchresults;
	
	$scope.$watch(function () { return DataService.searchresults }, function (newVal, oldVal) {
		$scope.results = DataService.searchresults;
	});

	$scope.addCart = function(item) {
		console.log("Add item");
		$scope.cart.addItem(item._id, item.name, item.price, item.quantity);
	}
	
    // use routing to pick the selected product
    if ($routeParams.productSku != null) {
        $scope.product = $scope.store.getProduct($routeParams.productSku);
    }
}

function searchResultsController($scope, $routeParams, DataService, data) {
	if (data != null) {
		data.data.forEach(function(item) {item.quantity = 1;});
		$scope.results = data.data;
	}
	$scope.cart = DataService.cart;
	$scope.store = DataService.store;
	
	$scope.addCart = function(item) {
		console.log("Add item");
		$scope.cart.addItem(item._id, item.name, item.price, item.quantity);
	}
}