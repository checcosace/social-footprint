var express = require('express')
var app = express()
var url = require('url')
var fs = require('fs')
var async = require('async')
var builder = require('xmlbuilder')
var xml2js = require('xml2js')
var resource_agents = null

function createXmlConfig(err,files){
  var root = builder.create('resource_agents')
  for (index in files){
      var item = root.ele('resource_agent')
        item.txt(files[index])
  }
    return root.toString({pretty:true})
}

fs.readdir('Resource_Agents',function(err,files){
  var xml_content = createXmlConfig(err,files)
  fs.writeFile('config.xml',xml_content,function(err){
    if (err){
      return console.log(err)
    }
    else{
      loadXMLDoc()
    }
  })
})

function loadXMLDoc() {
  try {
      var fileData = fs.readFileSync('config.xml', 'ascii');
      var parser = new xml2js.Parser();
      parser.parseString(fileData.substring(0, fileData.length), function (err, result) {
        var resource_agents = result['resource_agents']['resource_agent']
        var tasks = []
        tasks = resourceAgentsTaskGeneration(resource_agents,
          function(tasks){
            async.parallel(tasks)
          })
      })
    } catch (ex) {console.log("Exception: "+ex)}
}
function resourceAgentsTaskGeneration(resource_agents,callback){
  var tasks = []
  async.map(resource_agents,taskGenerator,function(err,result){
    callback(result)
  })
}

function taskGenerator(resource_agent,callback){
  var task = function () {
    var ResourceAgent = require('./Resource_Agents/'+resource_agent)
    ResourceAgent.pullDataFromSource("Crippa Francesco",function(queryResult){
      console.log(queryResult)
    })
  }
  // console.log(task)
  return callback(null,task)
}

var server = app.listen(8080, "localhost");
console.log('Local Server Listening at http://localhost:',8080);
