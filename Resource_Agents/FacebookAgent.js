var Xray = require('x-ray')
xray = Xray()
var request = require('request')
var cheerio = require('cheerio')
var http = require('http')
var fs = require('fs')
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
    console.log(index+':'+start_index)
    console.log(index+':'+finish_index)
    var file_content = result.substr(start_index,finish_index)
    //console.log(file_content)
    writeRoughFile(file_content,index)
  })
}


function writeRoughFile(file_content,index){
  fs.writeFile('users'+index+'.html',file_content,function(err){
    if (err){
      return console.log(err)
    }
    else{
      buildUserList()
    }
  })
}


var name = "Crippa Francesco"
var query = createQuery(name)
query.map(getRoughFile)


function buildUserList(){
  fs.readFile('users0.html','utf8',function(err,data){
    $=cheerio.load(data)
    console.log($('.detailedsearch_result').text())
  })
}
