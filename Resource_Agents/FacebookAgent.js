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
var name = "Crippa Elisabetta"
var query = createQuery(name)
var index=0
async.each(query,
  function(singleQuery,callback){
    getRoughFile(singleQuery,index)
    index++
    callback()
  },
  function(err,result){
    if(err){
      console.log(err)
    }
    else{
      console.log("RESULT"+profilesInfos)
    }
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



// ottiene il file "grezzo" della pagina HTML che deve essere parsato
function getRoughFile(query,index) {
  url = 'http://www.facebook.com/public/'+query
  xray(url, 'body@html')(function(err,result){
    var regex1 = /<code class="hidden_elem" id="u_._."><!-- <div><div class="mbm detailedsearch_result">/i
    var regex2 = /<\/a><\/div><\/div> --><\/code>/i
    var regex3 = /<code class="hidden_elem" id="u_._."><!-- <div>/i
    start_index = result.search(regex1) + result.match(regex3)[0].length
    finish_index = result.search(regex2)
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
      })
      var isIn = profilesInfos.filter(function(obj){
        return obj.pageLink === pageLink
      })

      if (userInfo['pageLink'].indexOf('/pages/')==-1 && isIn[0]==undefined){
        profilesInfos.push(userInfo)
      }
      if(numberCalls==2 && index==counter-1){
        getUsersData(filterUsers(profilesInfos))
        // console.log(profilesInfos)
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
  scheduleScraping(profilesInfos,0)
}

function scheduleScraping(profilesInfos,index){
  var start_time = new Date().getTime()
  setTimeout(function(){
    //console.log(new Date().getTime()-start_time)
    scrapeUser(profilesInfos[index])
    if(index<profilesInfos.length-1){
      scheduleScraping(profilesInfos,index+1)
    }
    else{
      return (profilesInfos)
    }
  },3000)
}


function scrapeUser(userInfo){
  var file = 'singleuser.html'
  var url = userInfo['pageLink']
  xray(url, 'body@html')(function(err,result){
    var regex1 = /<code class="hidden_elem" id="u_._."><!-- <div class="fbTimelineSection mtm timelineFavorites fbTimelineCompactSection"><div class="profileInfoSection"/i
    var regex2 = /<\/tbody><\/table><\/div><\/div><\/div> --><\/code>/i
    var regex3 = /<code class="hidden_elem" id="u_._."><!-- /i
    start_index = result.search(regex1) + result.match(regex3)[0].length
    finish_index = result.search(regex2)
    var file_content = result.substr(start_index,finish_index)
    fs.writeFile(file,file_content,function(err){
      if (err){
        return console.log(err)
      }
      else{
        fs.readFile(file,'utf8',function(err,data){
          $=cheerio.load(data)
          var interests = $('.profileInfoSection tbody').each(function(index,element){
            var interest = $(this)
            var scrape = cheerio.load(interest+"\n")
            var label = scrape('.label .labelContainer').text()
            userInfo[label]=[]
            scrape('.data a').each(function(index2,item){
              var value = scrape(this)
              userInfo[label].push(value.text())
            })
          })
          var regex1 = /<code class="hidden_elem" id="._._."><!-- <div class="timelineLoggedOutSignUp.*">/i
          var regex2 = /data-referrer="pagelet_contact"><\/div><\/div><\/div><\/div><\/div> --><\/code>/i
          var regex3 = /<code class="hidden_elem" id="._._."><!--/i
          var regex4 = /data-referrer="pagelet_contact"><\/div><\/div><\/div><\/div><\/div> -->/i
          start_index = result.search(regex1) + result.match(regex3)[0].length
          finish_index = result.search(regex2) + result.match(regex4)[0].length
          var file_content = result.substr(start_index,finish_index)
          fs.writeFile(file,file_content,function(err){
            if (err){
              return console.log(err)
            }
            else{
              fs.readFile(file,'utf8',function(err,data){
                $=cheerio.load(data)
                if($('.profilePic')[0]!=undefined){
                  userInfo['profileImgSrc'] = $('.profilePic')[0].attribs.src
                }
                else{
                  userInfo['profileImgSrc'] = null
                }
              })
            }
          })
        })
      }
    })
  })
}
