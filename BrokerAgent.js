var express = require('express')
var app = express()
var url = require('url')
var fs = require('fs')
var async = require('async')
var builder = require('xmlbuilder')
var xml2js = require('xml2js')

var resource_agents = null
var queryName = null

module.exports={
  sendQuery: function(query,callback){
    //query = 'Crippa Francesco'
    runBrokerAgent(query,function(queryResult){
      // MONGODB SAVE RESULTS
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
