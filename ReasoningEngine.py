import sys
import numpy as np
import pymongo as mongodb
from nltk.tokenize import RegexpTokenizer
from nltk.corpus import stopwords

def sendResultToServer(result):
    print(str(result)+'?') #put final results into this print
    sys.stdout.flush()

def run():
    queryResult = getDataFromDB()
    for res in queryResult:
        if res['source']=='Twitter':
            twitterData = analyseTwitterData(res['results'])
            # print twitterData
        else:
            if res['source']=='Facebook':
                facebookData = analyseFacebookData(res['results'])
                # print facebookData
            else:
                print('Error! Data Source Unknown')
    finalResults = calculateDistances(twitterData,facebookData)
    matchPercentage = calculateMatchPercentage(finalResults)
    sendResultToServer(matchPercentage)
    # sendResultToServer(finalResults)


def getDataFromDB():
    client = mongodb.MongoClient('mongodb://localhost:27017/')
    db = client['socialFootprint']
    collection = db.queryResult
    documents = collection.find()
    result = list()
    for doc in documents:
        result.append(doc)
    return result


def analyseTwitterData(twitterData):
    for user in twitterData:
        user['freqArgTable'] = None
        user['freqDescTable'] = None
        stop = stopwords.words('italian') + stopwords.words('english')
    	tokenizer = RegexpTokenizer(r'\w+')
        user['freqArgTable'] = createFreqTable(user,stop,tokenizer,'tweets','freqArgTable')
        user['description'] = [user['description']]
        user['freqDescTable'] = createFreqTable(user,stop,tokenizer,'description','freqDescTable')
    return removeIrrelevantData(twitterData)

def analyseFacebookData(facebookData):
    for user in facebookData:
        user['freqArgTable'] = None
        user['freqDescTable'] = None
        stop = stopwords.words('italian') + stopwords.words('english')
    	tokenizer = RegexpTokenizer(r'\w+')
        irrelevantKeys = ['userName','profileImage','description','pageLink','freqArgTable','freqDescTable']
        for key in user.keys():
            if (key not in irrelevantKeys):
                user['freqArgTable'] = createFreqTable(user,stop,tokenizer,key,'freqArgTable') #potrei creare table dedicate x argomento (tramite la chiave
        user['freqDescTable'] = createFreqTable(user,stop,tokenizer,'description','freqDescTable')
    return removeIrrelevantData(facebookData)


def createFreqTable(user,stop,tokenizer,property,table):
    tokens = tokenizeSentences(user,stop,tokenizer,property)
    if len(tokens)!=0:
        for token in tokens:
            if user[table]!=None:
                index = 0
                notFound = True
                while index < len(user[table]) and  notFound:
                    if token == user[table][index][0]:
                        user[table][index][1] = int(user[table][index][1]) + 1
                        notFound = False
                    index = index+1
                if notFound==True:
                    newToken = np.array([token,1])
                    user[table] = np.vstack((user[table],newToken))
            else:
                user[table]= np.array([token,1])
    if (user[table]==None):
        return []
    if (not isinstance(user[table][0],np.ndarray)):
        user[table] = [user[table]]
    return user[table]

def tokenizeSentences(user,stop,tokenizer,property):
    if (property in user):
        if(len(user[property])!=0):
            if(len(user[property])>1):
                user[property] = map(lambda sent: tokenizer.tokenize(sent),user[property])
                # Remove stopwords
                tokens = [word for tweet in user[property] for word in tweet if word not in stop]
            else:
                user[property] = tokenizer.tokenize(user[property][0])
                tokens = [word for word in user[property] if word not in stop]
            # print tokens
            return tokens
        else:
            return []
    else:
        #user['tweets']=None
        return []

def removeIrrelevantData(data):
    for user in data:
        if(user['freqArgTable']!=None):
            user['freqArgTable'] = sorted(user['freqArgTable'], key=lambda x: int(x[1]), reverse=True)
            limit = len(user['freqArgTable'])
            index = 0
            while index < limit:
                if int(user['freqArgTable'][index][1])<2:
                    user['freqArgTable'] = np.delete(user['freqArgTable'],index,0)
                    index -= 1
                    limit = len(user['freqArgTable'])
                    # post = (user['freqArgTable'][index][0]).encode('utf8')+' counted '+user['freqArgTable'][index][1].encode('utf8')+' times'
                    # print post
                index += 1
            #print user['freqArgTable']
    return data

def calculateDistances(twitterData,facebookData):
    results = []
    for twitterProfile in twitterData:
        profileDistances = {str(twitterProfile['nickName']):[]}
        for facebookProfile in facebookData:
            # argDistance = calculateExtendedJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
            # descDistance = calculateExtendedJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])
            argDistance = calculateJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
            descDistance = calculateJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])
            profileDistance = argDistance + descDistance
            profileDistances[str(twitterProfile['nickName'])].append([str(facebookProfile['pageLink']),profileDistance])
        results.append(profileDistances)
    for tw in results:
        tw[tw.keys()[0]] = sorted(tw[tw.keys()[0]],key=lambda x: x[1],reverse=True)
    return results
        # print tw
        # print

def calculateExtendedJaccardDistance(table1,table2):
    unionSize = 0
    intersectionSize = 0

    if (table1!=None and table2!=None):
        if(len(table1)!=0 and len(table2)!=0):
            appTable = []
            for el in table1:
                appTable.append([el[0]]*int(el[1]))
            table1 = sum(appTable,[])
            appTable = []
            for el in table2:
                appTable.append([el[0]]*int(el[1]))
            table2 = sum(appTable,[])
            # if (not isinstance(table1[0],np.ndarray)):
            #     # print table1
            #     table1 = [table1]
            # if (not isinstance(table2[0],np.ndarray)):
            #     # print table2
            #     table2 = [table2]
            # print '-------------------------------------------------------------'
            for word1 in table1:
                for word2 in table2:
                    if (word1.find(word2)!=-1 or word2.find(word1)!=-1):
                        intersectionSize += 1
                        break
            unionSize = len(table1)+len(table2)
            return float(intersectionSize)/float(unionSize)
        else:
            return 0
    else:
        return 0

def calculateJaccardDistance(table1,table2):
    if (table1!=None and table2!=None):
        if(len(table1)!=0 and len(table2)!=0):
            appTable = []
            for el in table1:
                appTable.append([el[0]]*int(el[1]))
            table1 = sum(appTable,[])
            appTable = []
            for el in table2:
                appTable.append([el[0]]*int(el[1]))
            table2 = sum(appTable,[])

            unionSize = len(list(set(table1) | set(table2)))
            intersectionSize = len(list(set(table1) & set(table2)))
            return float(intersectionSize)/float(unionSize)
        else:
            return 0
    else:
        return 0

def calculateMatchPercentage(finalResults):
    cumulates = []
    for res in finalResults:
        cumulate = 0
        for measures in res[res.keys()[0]]:
            cumulate += measures[1]
        cumulates.append(cumulate)
    index = 0
    for res in range(len(finalResults)):
        if cumulates[index]!=0:
            for measures in range(len(finalResults[res][finalResults[res].keys()[0]])):
                finalResults[res][finalResults[res].keys()[0]][measures][1] = float(finalResults[res][finalResults[res].keys()[0]][measures][1])/float(cumulates[index])
        index += 1
    return finalResults


if __name__ == "__main__":
    run()
