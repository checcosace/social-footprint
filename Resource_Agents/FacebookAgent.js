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
  pullDataFromSource: function (name,callbackMain){
    // inizializza e lancia lo scrape
    // var name = "Crippa Francesco"
    console.log("FACEBOOK Agent Started")
    var query = createQuery(name)
    var index=0
    async.each(query,
      function(singleQuery,callback){
        getRoughFile(singleQuery,index,function(profiles){
          getUsersData(filterUsers(query,profilesInfos),
          function(queryResult){
            console.log('FACEBOOK Callbacking query results')
            callbackMain({source:'Facebook',results:queryResult})
            //console.log(queryResult) //QUERYRESULT CONTIENE I RISULTATI FINALI
          })
        })
        index++
        callback()
      })
    }
  }

  // module.exports.pullDataFromSource("Carlo-Clericetti",function(res){
  //   console.log("-----------------------------------------------------------")
  //   console.log("R I S U L T A T I")
  //   console.log("-----------------------------------------------------------")
  //   console.log(res)
  // })
  // crea una query formattata nella corretta maniera.
  // query è un array di due elementi del tipo:
  // [cognome-nome, nome-cognome]
  function createQuery(query){
    var name = query.split('-')
    query=[]
    query.push(name[0]+'-'+name[1])
    query.push(name[1]+'-'+name[0])
    return query
  }

  // Retunr true if array contains an object with same property
  function contains(array,object,property){
    // console.log(JSON.stringify(array))
    if (array.length==0){
      return false
    }
    else{
      for (index in array){
        if (array[index]==null){
          return false
        }
        else{
          if (array[index][property]==object[property]){
            console.log("DELETED DUPLICATE-->"+JSON.stringify(object))
            return true
          }
        }
      }
      return false
    }
  }

  // ottiene il file "grezzo" della pagina HTML che deve essere parsato
  function getRoughFile(query,index,callback) {
    console.log("FACEBOOK Scraping users list")
    url = 'http://www.facebook.com/public/'+query
    xray(url, 'body@html')(function(err,result){
      var regex1 = /<code class="hidden_elem" id="u_._."><!-- <div><div class="mbm detailedsearch_result">/i
      var regex2 = /<\/a><\/div><\/div> --><\/code>/i
      var regex3 = /<code class="hidden_elem" id="u_._."><!-- <div>/i
      start_index = result.search(regex1) + result.match(regex3)[0].length
      finish_index = result.search(regex2)
      if (finish_index==-1){
        var regex2 = /<\/div><\/div> --><\/code>/i
        finish_index = result.search(regex2)
      }
      // console.log(start_index)
      // console.log(finish_index)
      var file_content = result.substr(start_index,finish_index)
      writeRoughFile(file_content,index,callback)
    })
  }

  // salva il file HTML ritornato dalla chiamata in un file in locale
  function writeRoughFile(file_content,index,callback){
    fs.writeFile('users'+index+'.html',file_content,function(err){
      if (err){
        return console.log(err)
      }
      else{
        buildUserList('users'+index+'.html',callback)
      }
    })
  }

  // esegue il parsing del file HTML in locale e lo trasforma in un formato
  // utilizzabile. Poi esegue lo scraping del file e ritorna un array di utenti
  // con oggetti in forma {userName:nome dell'utente, pageLink:indirizzo della
  // pagina dell'utente, description: array di informazioni ricavate}
  // L'array degli utenti viene poi filtrato per togliere i nomi che non
  // corrispondono alla query
  function buildUserList(file,callback){
    numberCalls++
    console.log("FACEBOOK Getting users list")
    fs.readFile(file,'utf8',function(err,data){
      if(!err){
        $=cheerio.load(data)
        var counter = $('.detailedsearch_result').length
        // console.log("COUNTER "+counter)
        $('.detailedsearch_result').each(function(index,element){
          userInfos = $(this)
          scrape = cheerio.load(userInfos+"\n")
          // console.log(userInfos+"\n")
          // console.log(scrape+"")
          var userInfo = {'description':[]}
          var pageLink = scrape('.instant_search_title a')[0].attribs.href
          var userName = scrape('.instant_search_title a').text()
          userInfo['pageLink']= pageLink
          userInfo['userName']= userName
          scrape('.fbProfileBylineLabel').each(function(index2,item){
            info = $(this)
            userInfo['description'].push(info.text())
          })

          var isIn = contains(profilesInfos,userInfo,'pageLink')
          if (userInfo['pageLink'].indexOf('/pages/')==-1 && isIn==false){
            profilesInfos.push(userInfo)
          }
          // console.log(index)
          // console.log(counter-1)
          if(numberCalls==2 && index==counter-1){
            console.log('FACEBOOK Getting users\'s list')
            // console.log(JSON.stringify(profilesInfos,null,2))
            callback(profilesInfos)
          }
        })
      }
      else{
        console.log("READ FILE ERROR "+err)
      }
    })
  }

  // verifica che gli userName degli utenti trovati corrispondano alla query
  // inserita, controllando nome e cognome
  function filterUsers(query,profilesInfos){
    var nomeCognome = query[0].split("-")
    for (index in profilesInfos){
      condition1=(profilesInfos[index]['userName'].toLowerCase().indexOf(nomeCognome[0].toLowerCase())==-1)
      condition2=(profilesInfos[index]['userName'].toLowerCase().indexOf(nomeCognome[1].toLowerCase())==-1)
      if(condition1 || condition2){
        console.log("DELETED FILTERED-->"+JSON.stringify(profilesInfos[index]))
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
    // console.log("USERLIST: "+JSON.stringify(filteredProfileInfos))
    return filteredProfileInfos
  }

  // riceve la lista degli utenti con le informazioni base e l'indirizzo della
  // pagina dell'utente (tutto in profilesInfos). Questa funzione per ogni utente
  // esegue invoca un'altra funzione che esegue lo scraping dell'indirizzo
  // segnalato.
  function getUsersData(profilesInfos,callback){
    scheduleScraping(profilesInfos,0,callback)
  }

  function scheduleScraping(profilesInfos,index,callback){
    setTimeout(function(){
      if(index<profilesInfos.length){
        console.log('FACEBOOK Getting user\'s data')
        scrapeUser(profilesInfos[index])
        scheduleScraping(profilesInfos,index+1,callback)
      }
      else{
        callback(profilesInfos)
      }
    },2100)
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
              if (label == 'Altro'){
                scrape('.data span a').each(function(index2,item){
                  var value = scrape(this)
                  userInfo[label].push(value.text())
                })
              }
              else{
                scrape('.data .mediaPageName').each(function(index2,item){
                  var value = scrape(this)

                  userInfo[label].push(value.text())
                })
              }

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
                    userInfo['profileImage'] = $('.profilePic')[0].attribs.src
                  }
                  else{
                    userInfo['profileImage'] = null
                  }
                })
              }
            })
          })
        }
      })
    })
  }
