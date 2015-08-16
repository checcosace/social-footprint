import sys
import numpy as np
import pymongo as mongodb
from nltk.tokenize import RegexpTokenizer
from nltk.corpus import stopwords
from nltk.corpus import wordnet as wn
import time

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
    # print 'START analyzing twitter data'
    decimalStopwords = [u'0',u'1',u'2',u'3',u'4',u'5',u'6',u'7',u'8',u'9',]
    moreStopwords = [u'a',u'b',u'c',u'd',u'e',u'f',u'g',u'h',u'i',u'l',u'n',u'm',u'o',u'p',u'q',u'r',u's',u'u',u'v']
    moreStopwords = moreStopwords + [u'z',u'http',u'co',u'com',u'rt',u'\xec',u'https']
    stop = stopwords.words('italian') + stopwords.words('english') + moreStopwords + decimalStopwords
    # print stop
    tokenizer = RegexpTokenizer(r'\w+')
    for user in twitterData:
        user['freqArgTable'] = None
        user['freqDescTable'] = None
        user['freqArgTable'] = createFreqTable(user,stop,tokenizer,'tweets','freqArgTable')
        user['description'] = [user['description']]
        user['freqDescTable'] = createFreqTable(user,stop,tokenizer,'description','freqDescTable')
    # print 'END analyzing twitter data'
    return removeIrrelevantData(twitterData)
    # return twitterData

def analyseFacebookData(facebookData):
    # print 'START analyzing facebook data'
    decimalStopwords = [u'0',u'1',u'2',u'3',u'4',u'5',u'6',u'7',u'8',u'9',]
    moreStopwords = [u'a',u'b',u'c',u'd',u'e',u'f',u'g',u'h',u'i',u'l',u'n',u'm',u'o',u'p',u'q',u'r',u's',u'u',u'v']
    moreStopwords = moreStopwords + [u'z',u'http',u'com']
    stop = stopwords.words('italian') + stopwords.words('english') + moreStopwords + decimalStopwords
    # print stop
    tokenizer = RegexpTokenizer(r'\w+')
    irrelevantKeys = ['userName','profileImage','description','pageLink','freqArgTable','freqDescTable']
    for user in facebookData:
        user['freqArgTable'] = None
        user['freqDescTable'] = None
        for key in user.keys():
            if (key not in irrelevantKeys):
                user['freqArgTable'] = createFreqTable(user,stop,tokenizer,key,'freqArgTable')
        user['freqDescTable'] = createFreqTable(user,stop,tokenizer,'description','freqDescTable')
        # print 'END analyzing facebook data'
    return removeIrrelevantData(facebookData)
    # return facebookData


def createFreqTable(user,stop,tokenizer,property,table):
    # print 'CREATING '+table
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
    # return []

def tokenizeSentences(user,stop,tokenizer,property):
    # print 'TOKENIZING '+property
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
    # print "REMOVING IRRELEVANT DATA"
    for user in data:
        if(user['freqArgTable']!=None):
            user['freqArgTable'] = sorted(user['freqArgTable'], key=lambda x: int(x[1]), reverse=True)
            limit = len(user['freqArgTable'])
            index = 0
            while index < limit:
                if (int(user['freqArgTable'][index][1])<2) or len(user['freqArgTable'][index][0])<2:
                    user['freqArgTable'] = np.delete(user['freqArgTable'],index,0)
                    index -= 1
                    limit = len(user['freqArgTable'])
                    # post = (user['freqArgTable'][index][0]).encode('utf8')+' counted '+user['freqArgTable'][index][1].encode('utf8')+' times'
                    # print post
                index += 1
            #print user['freqArgTable']
    # print data
    return data

def calculateDistances(twitterData,facebookData):
    results = []
    # print 'calculating distances'
    for twitterProfile in twitterData:
        profileDistances = {str(twitterProfile['nickName']):[]}
        for facebookProfile in facebookData:
            if (len(twitterProfile['freqArgTable'])==0 or len(facebookProfile['freqArgTable'])==0):
                argDistance = 0
            else:
                # argDistance = calculateExtendedJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
                argDistance = calculateJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
            # print argDistance
            if (len(twitterProfile['freqDescTable'])==0 or len(facebookProfile['freqDescTable'])==0):
                descDistance = 0
            else:
                # descDistance = calculateExtendedJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])
                descDistance = calculateJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])
            # print descDistance
            if (len(twitterProfile['freqArgTable'])==0 or len(facebookProfile['freqDescTable'])==0):
                hybridDist1 = 0
            else:
                # hybridDist1 = calculateExtendedJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqDescTable'])
                hybridDist1 = calculateJaccardDistance(twitterProfile['freqArgTable'],facebookProfile['freqDescTable'])
            # print hybridDist1
            if (len(twitterProfile['freqDescTable'])==0 or len(facebookProfile['freqArgTable'])==0):
                hybridDist2 = 0
            else:
                # hybridDist2 = calculateExtendedJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqArgTable'])
                hybridDist2 = calculateExtendedJaccardDistance(twitterProfile['freqDescTable'],facebookProfile['freqArgTable'])
            # print hybridDist2

            profileDistance = (argDistance*2 + descDistance*4 + hybridDist1 + hybridDist2)/8
            # profileDistance = (argDistance*2 + descDistance*4 )/6
            # print profileDistance
            # similarities = getSimilarities(twitterProfile['freqArgTable'],facebookProfile['freqArgTable'])
            # np.hstack((similarities,getSimilarities(twitterProfile['freqDescTable'],facebookProfile['freqDescTable'])))
            profileDistances[str(twitterProfile['nickName'])].append([str(facebookProfile['pageLink']),profileDistance])#,similarities
        results.append(profileDistances)
    for tw in results:
        tw[tw.keys()[0]] = sorted(tw[tw.keys()[0]],key=lambda x: x[1],reverse=True)
    return results
        # print tw
        # print

def calculateExtendedJaccardDistance(tab1,tab2):
    unionSize = 0
    intersectionSize = 0
    if len(tab1)>len(tab2):
        table1 = tab1
        table2 = tab2
    else:
        table1 = tab2
        table2 = tab1
    # print 'calculateExtendedJaccardDistance'
    if (table1!=None and table2!=None):
        if(len(table1)!=0 and len(table2)!=0):
            # appTable = []
            # for el in table1:
            #     appTable.append([el[0].encode('utf8')]*int(el[1]))
            #     appTable.append([syn.name().encode('utf8').split('.')[0] for syn in wn.synsets(el[0],lang='ita')])
            #     appTable.append([syn.name().encode('utf8').split('.')[0] for syn in wn.synsets(el[0])])
            #     # appTable.append(wn.synsets(el[0],lang='ita'))
            #     # appTable.append(wn.synsets(el[0]))
            # table1 = sum(appTable,[])
            # appTable = []
            # for el in table2:
            #     appTable.append([el[0].encode('utf8')]*int(el[1]))
            #     appTable.append([syn.name().encode('utf8').split('.')[0] for syn in wn.synsets(el[0],lang='ita')])
            #     appTable.append([syn.name().encode('utf8').split('.')[0] for syn in wn.synsets(el[0])])
            #     # appTable.append(wn.synsets(el[0],lang='ita'))
            #     # appTable.append(wn.synsets(el[0]))
            # table2 = sum(appTable,[])
            #
            # # for word in table2:
            # #     # print word
            # #     # print table2
            # #     intersectionSize += table1.count(word)
            # intersectionSize = len(list(set(table1) & set(table2)))
            # # unionSize = len(table1)+len(table2)
            # unionSize = len(list(set(table1) | set(table2)))
            # return float(intersectionSize)/float(unionSize)

            # qif (not isinstance(table1[0],np.ndarray)):
            #     # print table1
            #     table1 = [table1]
            # if (not isinstance(table2[0],np.ndarray)):
            #     # print table2
            #     table2 = [table2]
            # print '-------------------------------------------------------------'
            # print len(table1)
            # print len(table2)
            for word1 in table1:
                found = False
                index = 0
                # syns1 = [y.name() for x in wn.synsets(word1[0],lang='ita') if x.lemma_names('ita')!=None for y in x.lemmas('ita')]
                # syns3 = [y.name() for x in wn.synsets(word1[0]) if x.lemma_names()!=None for y in x.lemmas()]
                syns1 = wn.synsets(word1[0],lang='ita')
                syns3 = wn.synsets(word1[0])
                if len(syns1)>0 or len(syns3)>0:
                    while(index in range(len(table2)) and not found):
                        # start1 = time.time()
                        word2 = table2[index]
                        index += 1
                        # if (word1[0].find(word2[0])!=-1 or word2[0].find(word1[0])!=-1):
                        if (word1[0]==word2[0]):
                            intersectionSize += int(word1[1]) + int(word2[1])
                            np.delete(table2,index-1)
                            index -= 1
                            found = True
                            # print 'iteration shutdown in'+str(time.time()-start1)
                        else:
                            syns2 = wn.synsets(word2[0],lang='ita')
                            syns4 = wn.synsets(word2[0])
                            # syns2 = [y.name() for x in wn.synsets(word2[0],lang='ita') if x.lemma_names('ita')!=None for y in x.lemmas('ita')]
                            # syns4 = [y.name() for x in wn.synsets(word2[0]) if x.lemma_names()!=None for y in x.lemmas()]
                            # print 'syns computed in'+str(time.time()-start2)
                            # if len(list(set(syns1) & set(syns2) & set(syns3) & set(syns4))) > 0:
                            if len(list(set(syns1) & set(syns2) )) > 0:
                                intersectionSize += int(word1[1]) + int(word2[1])
                                np.delete(table2,index-1)
                                index -= 1
                                found = True
                            # print 'iteration shutdown in'+str(time.time()-start1)
                            # print 'iteration senza syns'+str((time.time()-start1) - (time.time()-start2))
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
            intersection = list(set(table1) & set(table2))
            intersectionSize = len(intersection)

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
