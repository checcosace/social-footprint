var express = require('express')
var url = require('url')
var app = express()
var BrokerAgent = require('./BrokerAgent')
var resCounter = 0

app.get(/^.*-.*(?:\/(?=$))?$/i,function(req,res){
  var urlPath = req.url
  var startIndex = 1
  var finalIndex = req.url.length-1
  var query = urlPath.substr(startIndex,finalIndex)
  var minusIndex = query.indexOf('-')
  if (finalIndex+1!=0 && minusIndex!=-1 && minusIndex!=finalIndex-1 && minusIndex!=0){
    BrokerAgent.sendQuery(query,function(queryResult){
      console.log(queryResult)
      res.write(JSON.stringify(queryResult,null,2))
      resCounter = resCounter+1
      if (resCounter==2){ // mettere == 3 quando si aggiungerà lo script python
        res.end()
      }
      //res.end(JSON.stringify(queryResult))
    })
  }
  else{
    res.end('ERROR! Insert path like LastName-FirstName OR FirstName-LastName')
  }
})


app.get('/index.html',function(req,res){
  res.sendFile(__dirname+'/index.html')
})

// return the requested resource
app.get('/public*',function(req,res){
    //match request path
    //console.log(JSON.stringify(req.params[0]))
    res.sendFile(__dirname+'/public'+req.params[0])
})

app.get('/sendQuery',function(req,res){
  var query = req.query.q
  index = query.indexOf(" ")
  query = query.substr(0,index)+"-"+query.substr(index+1,query.length)
  console.log(query)
  BrokerAgent.sendQuery(query,function(queryResult){
    //res.writeHead(200, {'Content-Type': 'text/plain'})
    res.write(JSON.stringify(queryResult))
    resCounter = resCounter+1
    if (resCounter==3){ // mettere == 3 quando si aggiungerà lo script python
      // console.log(JSON.stringify(queryResult,null,4))
      res.end()
    }
    //res.end(JSON.stringify(queryResult))
  })
})


var server = app.listen(8080, "localhost")
console.log('Local Server Listening at http://localhost:',8080)
