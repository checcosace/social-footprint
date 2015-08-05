var resCounter = 0
var chunkLength = 0

function submitText(textForm){
  if(event.keyCode==13){
    var target1 = document.getElementById("leftContent")
    spinner1 = new Spinner(opts).spin()
    target1.appendChild(spinner1.el)
    var target2 = document.getElementById("rightContent")
    spinner2 = new Spinner(opts).spin()
    target2.appendChild(spinner2.el)
    sendQuery(textForm.value)
  }
}

function sendQuery(query) {
  // console.log(query)
  $.ajax({
    type: "GET",
    url: "http://localhost:8080/sendQuery",
    data: {q:query},
    xhrFields: {
      onprogress: function(e){
        if(resCounter!=0){
          var chunk = e.currentTarget.response.substring(chunkLength,e.currentTarget.response.length)
          result = JSON.parse(chunk)
          chunkLength = e.currentTarget.response.length
          if(resCounter==1){
            scope = angular.element('.pageBarLeft').scope()
            scope.$apply(
              function () {
                console.log(result)
                console.log(result.source)
                spinner1.stop()
                scope.setSource(result.source)
                scope.setResults(result.results)
              })
              scope = angular.element('.pageContent').scope()
              scope.$apply(
                function(){
                  if (result.source == 'Twitter'){
                    scope.setTwitterData(result.results)
                  }
                  else{
                    scope.setFacebookData(result.results)
                  }
                }
              )
          }
          else {
            if(resCounter==2){
              scope = angular.element('.pageBarRight').scope()
              scope.$apply(
                function () {
                  console.log(result)
                  console.log(result.source)
                  spinner2.stop()
                  var target3 = document.getElementById("centralContent")
                  spinner3 = new Spinner(opts).spin()
                  target3.appendChild(spinner3.el)
                  scope.setSource(result.source)
                  scope.setResults(result.results)
                })
                scope = angular.element('.pageContent').scope()
                scope.$apply(
                  function(){
                    if (result.source == 'Twitter'){
                      scope.setTwitterData(result.results)
                    }
                    else{
                      scope.setFacebookData(result.results)
                    }
                  }
                )
            }
            else{
              if(resCounter==3){
                scope = angular.element('.pageContent').scope()
                scope.$apply(
                  function(){
                    spinner3.stop()
                    console.log("Distances")
                    console.log(result)
                    result = JSON.parse(result)
                    console.log(result)
                    scope.setResults(result)
                  }
                )
              }
            }
          }
        }
      resCounter++
    }
  }
  })
}

var opts = {
  lines: 13 // The number of lines to draw
, length: 28 // The length of each line
, width: 14 // The line thickness
, radius: 42 // The radius of the inner circle
, scale: 0.5 // Scales overall size of the spinner
, corners: 1 // Corner roundness (0..1)
, color: '#000' // #rgb or #rrggbb or array of colors
, opacity: 0.25 // Opacity of the lines
, rotate: 0 // The rotation offset
, direction: 1 // 1: clockwise, -1: counterclockwise
, speed: 1 // Rounds per second
, trail: 60 // Afterglow percentage
, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
, zIndex: 2e9 // The z-index (defaults to 2000000000)
, className: 'spinner' // The CSS class to assign to the spinner
, top: '300px' // Top position relative to parent
, left: '50%' // Left position relative to parent
, shadow: false // Whether to render a shadow
, hwaccel: false // Whether to use hardware acceleration
, position: 'relative' // Element positioning
}

// var target = document.getElementById("centralContent")
// console.log(target)
// var spinner = new Spinner(opts).spin()
// target.appendChild(spinner.el)
