var app = angular.module('pgApp', []);

app.controller("pgController", function($scope, $rootScope, $sce, $http, $window) {
	$scope.results = null;
	$scope.search = function() {
		var keywords = $("#inputSearch").val();
		var url = "/search?term=" + keywords;
		var response = $http.get(url);
		response.success(function(data) {
			$scope.results = data;
		});
		response.error(function() {
			
		});
	}
	
	$scope.addCart = function(item) {
		
	}
});