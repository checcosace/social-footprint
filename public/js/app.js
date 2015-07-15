var app = angular.module('app', []);
app.controller('FirstSourceController', function($scope) {

  $scope.setSource = function(source){
    console.log("SOURCE "+source)
    $scope.source = source
  }

  $scope.setResults = function(results){
    $scope.queryResult = results
  }

})

app.controller('SecondSourceController', function($scope) {

  $scope.setSource = function(source){
    console.log("SOURCE "+source)
    $scope.source = source
  }

  $scope.setResults = function(results){
    $scope.queryResult = results
  }

})

// app.controller('FinalResultsController', function($scope) {
//
// })
