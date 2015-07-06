var express = require('express')
var app = express()
var url = require('url')
var fs = require('fs')
var builder = require('xmlbuilder')
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
  })
})


var server = app.listen(8080, "localhost");
console.log('Local Server Listening at http://localhost:',8080);
