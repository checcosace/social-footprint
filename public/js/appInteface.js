var resCounter = 0
var chunkLength = 0

function submitText(textForm){
  if(event.keyCode==13){
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
                          console.log("RISULTATI "+result)
                          console.log(result.source)
                          scope.setSource(result.source)
                          scope.setResults(result.results)
                        })
                    }
                    else {
                      if(resCounter==2){
                        scope = angular.element('.pageBarRight').scope()
                        scope.$apply(
                          function () {
                            console.log(result)
                            console.log(result.source)
                            scope.setSource(result.source)
                            scope.setResults(result.results)
                          })
                      }
                    }
                  }
                  resCounter++
                }
            }
    // success: function(result){
    //   result = JSON.parse(result)
    //   var scope=null;
    //   //console.log("RESPONSE:"+result)
    //   if(resCounter==0){
    //     scope = angular.element('.pageBarLeft').scope()
    //     scope.$apply(
    //       function () {
    //         console.log("RISULTATI "+result)
    //         console.log(result.source)
    //         scope.setSource(result.source)
    //         scope.setResults(result.results)
    //         resCounter++
    //       })
    //   }
    //   else {
    //     if(resCounter==1){
    //       scope = angular.element('.pageBarRight').scope()
    //       scope.$apply(
    //         function () {
    //           console.log(result)
    //           console.log(result.source)
    //           scope.setSource(result.source)
    //           scope.setResults(result.results)
    //         })
    //     }
    //   }
    // }
  })


  // var xhr = new XMLHttpRequest()
  // xhr.open("GET", "http://localhost:8080/sendQuery?q="+query, true)
  // xhr.onprogress = function (event) {
  //   console.log(event)
  //   resCounter=resCounter+1
  //   console.log("Source: "+JSON.parse(xhr.responseText).source)//works...aggiungere il resto
  // }
  // xhr.send()
}
