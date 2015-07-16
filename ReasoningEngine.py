import sys
import numpy as np
import pymongo as mongodb

def sendResultToServer(result):
    print("Hi Node, I'm Python, nice to meet U") #put final results into this print
    sys.stdout.flush()

def run():
    queryResult = getDataFromDB()
    for res in queryResult:
        if res['source']=='Twitter':
            twitterData = analyseTwitterData(res)
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

def analyseTwitterData(data):


def analyseTwitterData(data):



if __name__ == "__main__":
    run()
