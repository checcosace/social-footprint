import sys
import numpy as np
import pymongo as mongodb
from nltk.tokenize import RegexpTokenizer
from nltk.corpus import stopwords

def sendResultToServer(result):
    print("Hi Node, I'm Python, nice to meet U") #put final results into this print
    sys.stdout.flush()

def run():
    queryResult = getDataFromDB()
    for res in queryResult:
        if res['source']=='Twitter':
            twitterData = analyseTwitterData(res['results'])
            print twitterData
        else:
            if res['source']=='Facebook':
                facebookData = analyseFacebookData(res)
            else:
                print('Error! Data Source Unknown')

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
    return user[table]

def createFreqDescTable(user,stop,tokenizer):
    user['description']=[user['description']]
    tokens = tokenizeSentences(user,stop,tokenizer,'description')
    if len(tokens)!=0:
        for token in tokens:
            if user['freqArgTable']!=None:
                index = 0
                notFound = True
                while index < len(user['freqArgTable']) and  notFound:
                    if token == user['freqArgTable'][index][0]:
                        user['freqArgTable'][index][1] = int(user['freqArgTable'][index][1]) + 1
                        notFound = False
                    index = index+1
                if notFound==True:
                    newToken = np.array([token,1])
                    user['freqArgTable'] = np.vstack((user['freqArgTable'],newToken))
            else:
                user['freqArgTable']= np.array([token,1])
    return user['freqDescTable']

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
            return tokens
    else:
        #user['tweets']=None
        return []

def removeIrrelevantData(twitterData):
    for user in twitterData:
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
    return twitterData

#def analyseTwitterData(data):



if __name__ == "__main__":
    run()
