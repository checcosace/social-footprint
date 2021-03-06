var express = require('express')
var app = express()
var url = require('url')
var fs = require('fs')
var async = require('async')
// Write XML
var builder = require('xmlbuilder')
// Read XML
var xml2js = require('xml2js')
// MongoDB
var MongoClient = require('mongodb').MongoClient
var db = require('mongodb').Db
// Run Python script
var spawn = require("child_process").spawn
var process = spawn('python',["./ReasoningEngine.py"])



var mongoUrl = 'mongodb://localhost:27017/socialFootprint';
var resource_agents = null
var queryName = null
var numberUserAgent = 0

module.exports={
  sendQuery: function(query,callback){
    //query = 'Crippa Francesco'
    // Cancella i dati 'vecchi'
    removeCollection()
    runBrokerAgent(query,function(queryResult){
      // MONGODB SAVE RESULTS
      insertQueryResult(queryResult,callback)
      // Callback result to userAgent
      callback(queryResult)
    })
  }
}

function runBrokerAgent(query,finalCallback){
  console.log("Broker Agent Stared")
  queryName = query
  fs.readdir('Resource_Agents',function(err,files){
    var xml_content = createXmlConfig(err,files)
    fs.writeFile('config.xml',xml_content,function(err){
      if (err){
        return console.log(err)
      }
      else{
        loadXMLDoc(finalCallback)
      }
    })
  })
}

function createXmlConfig(err,files){
  console.log('XML Configuration')
  var root = builder.create('resource_agents')
  for (index in files){
      var item = root.ele('resource_agent')
        item.txt(files[index])
  }
  return root.toString({pretty:true})
}

function loadXMLDoc(finalCallback) {
  try {
      var fileData = fs.readFileSync('config.xml', 'ascii');
      var parser = new xml2js.Parser();
      parser.parseString(fileData.substring(0, fileData.length), function (err, result) {
        var resource_agents = result['resource_agents']['resource_agent']
        numberUserAgent = resource_agents.length
        console.log("NUMBERUSERAGENT "+numberUserAgent)
        var tasks = []
        console.log('Agent\'s tasks generation')
        tasks = resourceAgentsTaskGeneration(resource_agents,
          function(tasks){
            //call resource agents
            async.parallel(tasks)
          },finalCallback)
      })
    } catch (ex) {console.log("Exception: "+ex)}
}
function resourceAgentsTaskGeneration(resource_agents,callback,finalCallback){
  async.map(resource_agents,
    function(agent,callback){
        taskGenerator(agent,callback,finalCallback)
    },
    function(err,result){
    callback(result)
  })
}

function taskGenerator(resource_agent,callback,finalCallback){
  var task = function () {
    var ResourceAgent = require('./Resource_Agents/'+resource_agent)
    ResourceAgent.pullDataFromSource(queryName,function(queryResult){
      finalCallback(queryResult)
    })
  }
  return callback(null,task)
}

function insertQueryResult(queryResult,callback){
  MongoClient.connect(mongoUrl,function(err,db){
		var collection = db.collection('queryResult')
		collection.insert(queryResult,
    	function (err, inserted) {
          if(err){
            console.log(err)
          }
          else {
            runReasoningEngine(callback)
            db.close()
          }
    	})
	})
}

function removeCollection(){

  MongoClient.connect(mongoUrl,function(err,db){
		var collection = db.collection('queryResult')
    collection.remove()
    db.close()
	})
}

function runReasoningEngine(callback){
  console.log("TRYING TO CALL REASONING ENGINE")
  MongoClient.connect(mongoUrl,function(err,db){
		var collection = db.collection('queryResult')
    collection.count({},function(error,collectionSize){
      if(error){
        console.log(error)
      }
      else{
        if(collectionSize==numberUserAgent){
          //CALLPy
          console.log("CALLING REASONING ENGINE")
          res = ""
          var process = spawn('python',["./ReasoningEngine.py"])
          process.stdout.on('data', function (data){
            // console.log("BROKERAGENT: "+data.toString())
            res = res+data.toString('ascii')
            // console.log("-----------------------------------------------------------")
            // console.log(res)
            // console.log((res[res.length-1]=='?' && res[res.length-2]==']'))
            // console.log(res[res.length-1])
            // console.log(res[res.length-2])
            // console.log("-----------------------------------------------------------")
            if(res[res.length-2]=='?' && res[res.length-3]==']'){
              console.log("CALLING PARSER ")
              parseJSONdata(res.substr(0,res.length-2),function(parsedData){
                console.log("PARSEDDATA: "+parsedData)
                console.log("BrokerAgent Callbacking Distances")
                callback(parsedData)
              })
            }
            // callback(data)
          })
        }
        else{
          console.log("WAIT PLEASE...")
        }
      }
    db.close()
    })
	})
}


function parseJSONdata(JSONString,callback){
  parsedData = ""
  for (char in JSONString){
    if(JSONString[char] == "\'"){
      parsedData=parsedData+"\""
    }
    else{
      if(JSONString[char] == "\\"){
        parsedData=parsedData+"\\"
      }
      parsedData=parsedData+JSONString[char]
    }
    if(char==JSONString.length-1){
      // console.log("-----------------------------------------------------------")
      // console.log(char)
      // console.log(JSONString.length-1)
      // console.log("-----------------------------------------------------------")
      callback(parsedData)
    }
  }

}
