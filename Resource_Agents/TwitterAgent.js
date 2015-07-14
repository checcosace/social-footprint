var Twitter = require('twitter');
var async = require('async')

var client = new Twitter({
  consumer_key: 'kUkSj2JViYQzcE4Bqsbq6Myjg',
  consumer_secret: 'SEEnhtKc04yATvPVUsO7TDOqh4GZRRBdCRcYnPD1pLbu5aPj1M',
  access_token_key: '1390496706-UmGd3ICa4zJqfBKzPGNHgZiFnxlozMyZcIqj3lj',
  access_token_secret: '6mX5CZM7Gt8rPGSkyQTxMlUVA1dfzScjwUUC4HAALutII'
})


module.exports={
  pullDataFromSource: function (name,callback){
    //var name = "Crippa Francesco"
    console.log("TWITTER Agent Started")
    var query = createQuery(name)
    //esegue le due query
    async.map(query,getUsersList,
      function(err,result){
      //result continene le due liste di screen_name corrispondenti alle due query
      var userList = merge(result)
      async.map(userList,getUserData,function(err,queryResult){
        //console.log(queryResult)
        console.log('TWITTER Callbacking query results')
        callback(queryResult) //RESULTS
        })
    })
  }
}

// ritorna i primi 2 utenti che corrispondono alla query inserita
var getUsersList = function(query,callback){
  var params = {q: query}
  var userList = []
  client.get('users/search.json', params, function(error, users, response){
    if (!error) {
      for (index in users){
        userList.push(users[index].screen_name)
      }
      console.log('TWITTER Getting users\'s list')
      return callback(null,userList)
    }
    else{
      console.log(error)
    }
  })
}

var getUserData = function(screen_name,callback){
  params = {screen_name:screen_name,count:200}
  client.get('statuses/user_timeline', params, function(error, tweets, response){
    var userInfo = {'tweets':[]}
    if (!error) {
      if(tweets.length!=0){
        userInfo['id']=tweets[0].user.id
        userInfo['screen_name']=tweets[0].user.screen_name
        userInfo['name']=tweets[0].user.name
        userInfo['description']=tweets[0].user.description
        userInfo['profile_image_url']=tweets[0].user.profile_image_url
        for (index in tweets){
          userInfo['tweets'].push(tweets[index].text)
        }
        //console.log(userInfo)
        return callback(null,userInfo)
      }
      else{
        userInfo = getUserInformation(screen_name,function(userInfo){
          //console.log(userInfo)
          console.log('TWITTER Getting users\'s data')
          return callback(null,userInfo)
        })
      }
    }
    else{
      console.log(error)
    }
  })
}



// crea query del tipo [nome cognome, cognome nome]
function createQuery(query){
  var name = query.split(' ')
  query=[]
  query.push(name[0]+' '+name[1])
  query.push(name[1]+' '+name[0])
  return query
}
// fonde le due liste di screen_name, creandone una unica senza duplicati
function merge(userLists){
  var mergedUserList = []
  for (index in userLists){
    for (userName in userLists[index]){
      if (mergedUserList.indexOf(userLists[index][userName])==-1){
        mergedUserList.push(userLists[index][userName])
      }
    }
  }
  return mergedUserList
}


function getUserInformation(screen_name,callback){
  params = {q:screen_name}
  client.get('users/search.json', params, function(error, users, response){
    if (!error) {
      var userInfo = {}
      userInfo['id']=users[0].id
      userInfo['screen_name']=users[0].screen_name
      userInfo['name']=users[0].name
      userInfo['description']=users[0].description
      userInfo['profile_image_url']=users[0].profile_image_url
      callback(userInfo)
    }
    else{
      console.log(error)
    }
  })
}
