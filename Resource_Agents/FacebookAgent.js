var Xray = require('x-ray')
xray = Xray()
var request = require('request')
var cheerio = require('cheerio')
var http = require('http')
var fs = require('fs')
var async = require('async')

var profilesInfos = []
var numberCalls=0
module.exports={
  pullDataFromSource: function (query,callback){


  }
}
// inizializza e lancia lo scrape
var name = "Crippa Francesco"
var query = createQuery(name)
var index=0
async.each(query,
  function(singleQuery,callback){
    getRoughFile(singleQuery,index)
    index++
    callback()
  })



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
// "ACCOPPIAMENTO": non ci sono utenti duplicati, siccome si eseguono due query
// se lo stesso utente compare due volte si fa in modo che non ci siano duplicati

// ottiene il file "grezzo" della pagina HTML che deve essere parsato
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

// salva il file HTML ritornato dalla chiamata in un file in locale
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

// esegue il parsing del file HTML in locale e lo trasforma in un formato
// utilizzabile. Poi esegue lo scraping del file e ritorna un array di utenti
// con oggetti in forma {userName:nome dell'utente, pageLink:indirizzo della
// pagina dell'utente, informations: array di informazioni ricavate}
// L'array degli utenti viene poi filtrato per togliere i nomi che non
// corrispondono alla query
function buildUserList(file){
  numberCalls++
  fs.readFile(file,'utf8',function(err,data){
    $=cheerio.load(data)
    var counter = $('.detailedsearch_result').length
    $('.detailedsearch_result').each(function(index,element){
      userInfos = $(this)
      scrape = cheerio.load(userInfos+"\n")
      var userInfo = {'informations':[]}
      var pageLink = scrape('.instant_search_title a')[0].attribs.href
      var userName = scrape('.instant_search_title a').text()
      userInfo['pageLink']= pageLink
      userInfo['userName']= userName
      scrape('.fbProfileBylineLabel').each(function(index2,item){
        info = $(this)
        userInfo['informations'].push(info.text())
        //console.log(userInfo)
      })
      //console.log(pageLink)
      var isIn = profilesInfos.filter(function(obj){
        return obj.pageLink === pageLink
      })

      if (userInfo['pageLink'].indexOf('/pages/')==-1 && isIn[0]==undefined){
        profilesInfos.push(userInfo)
        if(numberCalls==2 && index==counter-1){
          getUsersData(filterUsers(profilesInfos))
          //console.log(profilesInfos)
        }
      }
    })
 })
}

// verifica che gli userName degli utenti trovati corrispondano alla query
// inserita, controllando nome e cognome
function filterUsers(profilesInfos){
    var nomeCognome = query[0].split("-")
    for (index in profilesInfos){
      condition1=(nomeCognome[0].indexOf(profilesInfos[index]['userName'])!=-1)
      condition2=(nomeCognome[1].indexOf(profilesInfos[index]['userName'])!=-1)
      if(condition1 || condition2){
        profilesInfos[index]= null
      }
    }
    var profileCounter = 0
    var filteredProfileInfos = []
    for (index in profilesInfos){
      if (profilesInfos[index]!=null){
        filteredProfileInfos[profileCounter]=profilesInfos[index]
        profileCounter++
      }
    }
    return filteredProfileInfos
}

// riceve la lista degli utenti con le informazioni base e l'indirizzo della
// pagina dell'utente (tutto in profilesInfos). Questa funzione per ogni utente
// esegue invoca un'altra funzione che esegue lo scraping dell'indirizzo
// segnalato.
function getUsersData(profilesInfos){
  // IMPOSTARE TIMEOUT PER EVITARE CHE FB BLOCCHI L'ID
  // async x ogni utente e chiamo scrapeUser
  // async.map(profilesInfos, scrapeUser, function(err, results){
  //   // handle results
  // })
}

function scrapeUser(profileInfo,callback){
  console.log(profileInfo)
  callback(null,profileInfo)
}
