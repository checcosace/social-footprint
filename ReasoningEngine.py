import sys
import numpy as np
import pymongo as mongodb
from nltk.tokenize import RegexpTokenizer
from nltk.corpus import stopwords
from nltk.corpus import wordnet as wn

def sendResultToServer(result):
    print(str(result)+'?') #put final results into this print
    sys.stdout.flush()

def run():
    queryResult = getDataFromDB()
    for res in queryResult:
        if res['source']=='Twitter':
            twitterData = analyseTwitterData(res['results'])
            #print twitterData
        else:
            if res['source']=='Facebook':
                facebookData = analyseFacebookData(res['results'])
                # print facebookData
            else:
                print('Error! Data Source Unknown')
    finalResults = calculateDistances(twitterData,facebookData)
    # matchPercentage = calculateMatchPercentage(finalResults)
    # print facebookData
    # sendResultToServer(matchPercentage)
    sendResultToServer(finalResults)


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
    decimalStopwords = [u'0',u'1',u'2',u'3',u'4',u'5',u'6',u'7',u'8',u'9',]
    moreStopwords = [u'a',u'b',u'c',u'd',u'e',u'f',u'g',u'h',u'i',u'l',u'n',u'm',u'o',u'p',u'q',u'r',u's',u'u',u'v']
    moreStopwords = moreStopwords + [u'z',u'http',u'co',u'com',u'RT',u'\xec','RT']
    stop = stopwords.words('italian') + stopwords.words('english') + moreStopwords + decimalStopwords
    tokenizer = RegexpTokenizer(r'\w+')
    for user in twitterData:
        user['freqArgTable'] = None
        user['freqDescTable'] = None
        user['freqArgTable'] = createFreqTable(user,stop,tokenizer,'tweets','freqArgTable')
        user['description'] = [user['description']]
        user['freqDescTable'] = createFreqTable(user,stop,tokenizer,'description','freqDescTable')
    return removeIrrelevantData(twitterData)
    # return twitterData

def analyseFacebookData(facebookData):
    decimalStopwords = [u'0',u'1',u'2',u'3',u'4',u'5',u'6',u'7',u'8',u'9',]
    moreStopwords = [u'a',u'b',u'c',u'd',u'e',u'f',u'g',u'h',u'i',u'l',u'n',u'm',u'o',u'p',u'q',u'r',u's',u'u',u'v']
    moreStopwords = moreStopwords + [u'z',u'http',u'co',u'com',u'@RT']
    stop = stopwords.words('italian') + stopwords.words('english')
    tokenizer = RegexpTokenizer(r'\w+')
    irrelevantKeys = ['userName','profileImage','description','pageLink','freqArgTable','freqDescTable']
    for user in facebookData:
        user['freqArgTable'] = None
        user['freqDescTable'] = None
        for key in user.keys():
            if (key not in irrelevantKeys):
                user['freqArgTable'] = createFreqTable(user,stop,tokenizer,key,'freqArgTable')
        user['freqDescTable'] = createFreqTable(user,stop,tokenizer,'description','freqDescTable')
    return removeIrrelevantData(facebookData)
    # return facebookData


def createFreqTable(user,stop,tokenizer,property,table):
    tokens = tokenizeSentences(user,stop,tokenizer,property)
    if len(tokens)!=0:
        # tokens = tokensExpansion(tokens)
        for token in tokens:
            if user[table]!=None and len(user[table])!=0:
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
    if (user[table]==None or len(user[table])==0):
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
                tokens = [word for tweet in user[property] for word in tweet if word.lower() not in stop]
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
            argDistance = calculateExtendedJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
            descDistance = calculateExtendedJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])
            hybridDist1 = calculateExtendedJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqDescTable'])
            hybridDist2 = calculateExtendedJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqArgTable'])
            profileDistance = (argDistance*2 + descDistance*4 + hybridDist1 + hybridDist2)/8
            # similarities = getSimilarities(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
            # np.hstack((similarities,getSimilarities(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])))
            profileDistances[str(twitterProfile['nickName'])].append([str(facebookProfile['pageLink']),profileDistance])#,similarities
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
                found = False
                index = 0
                while(index in range(len(table2)) and not found):
                    word2 = table2[index]
                    index += 1
                    if (word1.find(word2)!=-1 or word2.find(word1)!=-1):
                        intersectionSize += 1
                        found = True
                    else:
                        syns1 = wn.synsets(word1,lang='ita')
                        syns2 = wn.synsets(word2,lang='ita')
                        if len(list(set(table1) & set(table2))) > 0:
                            intersectionSize += 1
                            found = True
                        else:
                            syns1 = wn.synsets(word1)
                            syns2 = wn.synsets(word2)
                            if len(list(set(table1) & set(table2))) > 0:
                                intersectionSize += 1
                                found = True
                        # synIndex = 0
                        # while (synIndex in range(len(syns1)) and not found):
                        #     syn = syns1[synIndex]
                        #     synIndex += 1
                        #     if syn in syns2:
                        #         intersectionSize += 1
                        #         found = True
            # print 'INTERSEZIONE INSIEMISTICA: '+str(len(list(set(table1) & set(table2))))
            # print 'INTERSEZIONE Semantica: '+str(intersectionSize)
            # unionSize = len(list(set(table1) | set(table2)))#
            unionSize = len(table1)+len(table2)

            # print 'UNIONE INSIEMISTICA: '+str(unionSize)
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

def getSimilarities(table1,table2):
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

            similarities = list(set(table1) & set(table2))
            for index in range(len(similarities)):
                similarities[index] = similarities[index].encode('utf8')
            return similarities
        else:
            return []
    else:
        return []

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

def tokensExpansion(tokens):
    result = []
    if len(tokens)!=0:
        if tokens != None:
            for token in tokens:
                synonym = wn.synsets(token,lang='ita')
                if (len(synonym)!=0 and synonym!=None):
                        if synonym[0].lemma_names('ita')!=None:
                            lems = synonym[0].lemmas('ita')
                            if (len(lems)!=0 and lems!=None):
                                result.append([lemma.name() for lemma in lems])
                            else:
                                result.append([token])
                        else:
                            result.append([token])
                else:
                    result.append([token])
            result = sum(result,[])
            return result
    return result


if __name__ == "__main__":
    run()
