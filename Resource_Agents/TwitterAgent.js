var Twitter = require('twitter');
var async = require('async')

var client = new Twitter({
  consumer_key: 'kUkSj2JViYQzcE4Bqsbq6Myjg',
  consumer_secret: 'SEEnhtKc04yATvPVUsO7TDOqh4GZRRBdCRcYnPD1pLbu5aPj1M',
  access_token_key: '1390496706-UmGd3ICa4zJqfBKzPGNHgZiFnxlozMyZcIqj3lj',
  access_token_secret: '6mX5CZM7Gt8rPGSkyQTxMlUVA1dfzScjwUUC4HAALutII'
})
// !!!!!!!!!!!!!!!!!!!!!!!!!MANCA FILTRAGGIO UTENTI !!!!!!!!!!!!!!!!!!!!!!!!!!!

module.exports={
  pullDataFromSource: function (name,callback){
    //var name = "Crippa Francesco"
    console.log("TWITTER Agent Started")
    var query = createQuery(name)
    //esegue le due query
    async.map(query,getUsersList,
      function(err,result){
      //result continene le due liste di screen_name corrispondenti alle due query
      var userList = merge(result,name)
      async.map(userList,getUserData,function(err,queryResult){
        //console.log(queryResult)
        console.log('TWITTER Callbacking query results')
        callback({source:'Twitter',results:queryResult}) //RESULTS
        })
    })
  }
}

// crea query del tipo [nome cognome, cognome nome]
function createQuery(query){
  var name = query.split('-')
  query=[]
  query.push(name[0]+' '+name[1])
  query.push(name[1]+' '+name[0])
  return query
}

// fonde le due liste di screen_name, creandone una unica e senza duplicati
function merge(userLists,name){
  var mergedUserList = []
  for (index in userLists){
    for (id in userLists[index]){
      if (mergedUserList.indexOf(userLists[index][id])==-1){
        mergedUserList.push(userLists[index][id])
      }
      else{
        console.log("TWITTER DELETE DUPLICATE ---> "+userLists[index][id])
      }
    }
  }
  console.log(JSON.stringify(mergedUserList))
  return mergedUserList
}


// ritorna i primi 2 utenti che corrispondono alla query inserita
var getUsersList = function(query,callback){
  var params = {q: query}
  var userList = []
  client.get('users/search.json', params, function(error, users, response){
    if (!error) {
      for (index in users){
        userList.push(users[index].id)
      }
      console.log('TWITTER Getting users\'s list')
      return callback(null,userList)
    }
    else{
      console.log(error)
    }
  })
}

var getUserData = function(id,callback){
  params = {user_id:id,count:200}
  client.get('statuses/user_timeline', params, function(error, tweets, response){
    var userInfo = {'tweets':[]}
    if (!error) {
      if(tweets.length!=0){
        userInfo['id']=tweets[0].user.id
        userInfo['userName']=tweets[0].user.name
        userInfo['nickName']=tweets[0].user.screen_name
        userInfo['description']=tweets[0].user.description
        userInfo['pageLink']='www.twitter.com/'+tweets[0].user.screen_name
        userInfo['profileImage']=tweets[0].user.profile_image_url
        for (index in tweets){
          if (tweets[index].retweeted){
            userInfo['tweets'].push(tweets[index].retweeted_status.text)
          }
          else{
            userInfo['tweets'].push(tweets[index].text)
          }

        }
        //console.log(userInfo)
        return callback(null,userInfo)
      }
      else{
        userInfo = getUserInformation(id,function(userInfo){
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


function getUserInformation(id,callback){
  params = {user_id:id}
  client.get('users/show.json', params, function(error, users, response){
    if (!error) {
      var userInfo = {}
      userInfo['id']=users.id
      userInfo['userName']=users.name
      userInfo['nickName']=users.screen_name
      userInfo['description']=users.description
      userInfo['pageLink']='www.twitter.com/'+users.screen_name
      userInfo['profileImage']=users.profile_image_url
      callback(userInfo)
    }
    else{
      console.log("GetUserInfoError: "+error)
    }
  })
}
