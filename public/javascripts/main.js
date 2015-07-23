// App Module: the name AngularStore matches the ng-app attribute in the main <html> tag
// the route provides parses the URL and injects the appropriate partial page
var app = angular.module('pgApp', ['ngRoute', 'ui.bootstrap']);
app.config(function($routeProvider) {
  $routeProvider.
	  when('/searchresults',{
		 templateUrl: '/searchresults',
		 controller: searchResultsController,
		 resolve: {
			data: function ($q, $http) {
					var deferred = $q.defer();
					var keywords = $("#inputSearch").val();
					if (keywords.trim().length > 0) {
						var url = "/search?term=" + keywords;
						$http({method: 'GET', url: url}).then(function(data) {
						  deferred.resolve(data);
						});
					}
					else 
						deferred.resolve(null);
					return deferred.promise;
			}
		 }
	  }).
      when('/store', {
        templateUrl: '/store',
        controller: storeController 
      }). 
      when('/products/:productSku', {
        templateUrl: '/product',
        controller: storeController
      }).
      when('/cart', {
        templateUrl: '/cart',
        controller: storeController
      }).
      otherwise({
        redirectTo: '/store'
      });
});

// create a data service that provides a store and a shopping cart that
// will be shared by all views (instead of creating fresh ones for each view).
app.factory("DataService", function () {

    // create store
    var myStore = new store();

    // create shopping cart
    var myCart = new shoppingCart("AngularStore");
	
	var searchResults = null;

    // enable PayPal checkout
    // note: the second parameter identifies the merchant; in order to use the 
    // shopping cart with PayPal, you have to create a merchant account with 
    // PayPal. You can do that here:
    // https://www.paypal.com/webapps/mpp/merchant
    myCart.addCheckoutParameters("PayPal", "paypaluser@youremail.com");

    // enable Google Wallet checkout
    // note: the second parameter identifies the merchant; in order to use the 
    // shopping cart with Google Wallet, you have to create a merchant account with 
    // Google. You can do that here:
    // https://developers.google.com/commerce/wallet/digital/training/getting-started/merchant-setup
    myCart.addCheckoutParameters("Google", "xxxxxxx",
        {
            ship_method_name_1: "UPS Next Day Air",
            ship_method_price_1: "20.00",
            ship_method_currency_1: "USD",
            ship_method_name_2: "UPS Ground",
            ship_method_price_2: "15.00",
            ship_method_currency_2: "USD"
        }
    );

    // enable Stripe checkout
    // note: the second parameter identifies your publishable key; in order to use the 
    // shopping cart with Stripe, you have to create a merchant account with 
    // Stripe. You can do that here:
    // https://manage.stripe.com/register
    myCart.addCheckoutParameters("Stripe", "pk_test_xxxx",
        {
            chargeurl: "https://localhost:1234/processStripe.aspx"
        }
    );

    // return data object with store and cart
    return {
        store: myStore,
        cart: myCart,
		searchresults: searchResults
    };
});

// Directive detects finish of data binding
app.directive('myPostRepeatDirective', function() {
    return function(scope, element, attrs) {
      if (scope.$last) {
        scope.$eval('doSearchComplete()');
      }
    };
});

function findItem(value, key, list)
{
	var result = null;
	for (var i = 0; i < list.length; i++) {
		if (list[i][key] == value)
			return list[i];
	};
	return null;
}
 
function processUserOrders(orders, products) {
	// HACK HACK we get product info from user.products instead of from DB
	var ordertable = [];
	orders.forEach(function(order) {
		order.products.forEach(function(prod) {
			var p = findItem(prod.id, "id", products);
			if (p != null) 
				prod.item = p.item;
		});
		ordertable.push(order);
	});
	return ordertable;
}
 
function getPrice(product, count)
{
	for (var i = 0; i < product.item.price.length; i++) {
		
		if (count >= parseInt(product.item.price[i].from)) {
			if (product.item.price[i].to.length == 0 || count <= parseInt(product.item.price[i].to))
				return i;
		}
	}
	return 0; // return the highest price group
}
 
function processGroupedOrders(groupedorders, products) {
	for (var key in groupedorders) {
		var p = findItem(key, "id", products);
		if (p) {
			p.item.price.forEach(function(pr) {
				pr.current = false;
			});
			//gourpedorders[key].item = p;
			p.item.price[getPrice(p, groupedorders[key].count)].current = true;
			p.currentOrders = groupedorders[key].count;
		}
	}
} 
 
app.controller("pgController", function($scope, $rootScope, $sce, $http, $window, $location, DataService) {
	$scope.results = null;
	$scope.userId = "1";
	$scope.cart = DataService.cart;
	$scope.user = null;
	$scope.orders = null;
	$scope.groupedOrders = null;
	
	$scope.loadUserData = function() {
		var url = "/user/" + $scope.userId;
		var response = $http.get(url);
		response.success(function(user) {
			$scope.user = user;
			if (user && user.products) {
				user.products.forEach(function(p) {
					p.selected = true;
				});
				
				$scope.orders = processUserOrders(user.openorders, user.products);
				$scope.groupedOrders = processGroupedOrders(user.groupedProducts, user.products);
			}
		});
		response.error(function() {
			
		});
	};
	$scope.$watch("userId", function(oldvalue, newvalue) {
		$scope.loadUserData();
	});
	
	
	$scope.searchProducts = function() {
		var keywords = $("#inputSearch").val();
		var url = "/search?term=" + keywords;
		if (keywords.trim().length > 0)
		var response = $http.get(url);
		response.success(function(data) {
			if (data != null)
				data.forEach(function(item) {
					item.quantity = 1;
				});
			DataService.searchresults = data;
			if ($location.url().indexOf("store") < 0)
				$location.path('/#/store');
		});
		response.error(function() {
			
		});
	}
	
	$scope.submitOrders = function(user) {
		if (user && user.products) {
			var data = {user: user.id};
			var items = [];
			user.products.forEach(function(p) {
				if (p.selected) {
					var item = {id: p.id, quantity: p.quantity};
					items.push(item);
				}
			});
			if (items.length > 0) {
				data.orders = items;
				var promise = $http.post("/order", data);
				promise.success(function(data) {
					$scope.orders = processUserOrders(data.openorders, $scope.user.products);
					$scope.groupedOrders = processGroupedOrders(data.groupedOrders, $scope.user.products);
				});
				promise.error(function() {
					
				});
			}
		}
	};
});