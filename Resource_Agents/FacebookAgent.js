var Xray = require('x-ray')
xray = Xray()
var request = require('request')
var cheerio = require('cheerio')
var http = require('http')
var fs = require('fs')
var async = require('async')

var profilesLinks = []
var numberCalls=0
module.exports={
  pullDataFromSource: function (query,callback){


  }
}

//createQuery("Crippa Francesco")

// crea una query formattata nella corretta maniera.
// query è un array di due elementi del tipo:
// [cognome-nome, nome-cognome]
function createQuery(query){
  var name = query.split(' ')
  query=[]
  query.push(name[0]+'-'+name[1])
  query.push(name[1]+'-'+name[0])
  return query
}


// ritorna la lista degli utenti che corrispondono alla query
// FILTRO: vengono tolti dalla lista gli utenti con nome simile ma non corrispondente
// alla query
// ACCOPPIAMENTO: non ci sono utenti duplicati, siccome si eseguono due query
// se lo stesso utente compare due volte si fa in modo che non ci siano duplicati
function getRoughFile(query,index) {
  url = 'http://www.facebook.com/public/'+query
  xray(url, 'body@html')(function(err,result){
    var pattern = '<code class="hidden_elem" id="u_0_7"><!-- '
    start_index = result.indexOf(pattern)+pattern.length
    finish_index = result.lastIndexOf(' --></code>')//('\n<script>bigPipe.beforePageletArrive("pagelet_search_results")</script>\n')
    var file_content = result.substr(start_index,finish_index)
    writeRoughFile(file_content,index)
  })
}


function writeRoughFile(file_content,index){
  fs.writeFile('users'+index+'.html',file_content,function(err){
    if (err){
      return console.log(err)
    }
    else{
      buildUserList('users'+index+'.html')
    }
  })
}


var name = "Crippa Francesco"
var query = createQuery(name)
var index=0
async.each(query,
  function(singleQuery,callback){
    getRoughFile(singleQuery,index)
    index++
    callback()
  })


function buildUserList(file){
  numberCalls++
  fs.readFile(file,'utf8',function(err,data){
    $=cheerio.load(data)
    var counter = $('.instant_search_title a').length
    $('.instant_search_title a').each(function(i,element){
      var link = $(this)
      link = link.attr('href')
      var profileInfos = $('.fsm div')
      console.log(profileInfos+"\n")
      var profileInfo = $(profileInfos[i])
      console.log(profileInfo.length)
      scrape=cheerio.load(profileInfo+"\n")
      // console.log("______________________________________________________")
      // console.log(link)
      // console.log(profileInfo)
      if(profileInfo.length!=0){
        scrape('.fbProfileBylineLabel a').each(function(k,item){
          var information = $(this)
          information = information.text()
          // console.log(information)
        })
      }
      else{
        console.log("NO INFORMATION ON THIS ACCOUNT")
      }

      //console.log("INDEX "+i+": "+profileInfo)
      if (link.indexOf('/pages/')==-1 && profilesLinks.indexOf(link)==-1){
        profilesLinks.push(link)
        if(numberCalls==2 && i==counter-1){
          getUsersData(profilesLinks)
        }
      }
    })
  })
}

function getUsersData(profilesLinks){
    //async x ogni utente e chiamo scrapeUser
  async.map(profilesLinks, scrapeUser, function(err, results){
    console.log("Results: "+results)
  })
}

function scrapeUser(userLink,callback){
  callback(null,userLink)
}
