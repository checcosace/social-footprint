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

app.controller('FinalResultsController', function($scope) {
  $scope.setResults = function(results){
    $scope.title="MatchingPercentage"
    $scope.finalResults = results
  }

  $scope.setTwitterData = function(twData){
    $scope.twitterData = twData
  }

  $scope.setFacebookData = function(fbData){
    $scope.facebookData = fbData
  }

  $scope.showDigitalFootprint = function(index){
    if ($('#digitalFootprint'+index).attr('class')=='hidden'){
      $('#digitalFootprint'+index).removeClass('hidden')
      $('#digitalFootprint'+index).addClass('active')
    }
    else{
      $('#digitalFootprint'+index).removeClass('active')
      $('#digitalFootprint'+index).addClass('hidden')
    }
    //showDigitalFootprint(index)
  }

})
