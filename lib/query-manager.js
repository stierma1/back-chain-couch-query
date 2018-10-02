var {BackwordsChainer} = require("backwords-chainer");
var request = require("request");
var JSONPath = require('jsonpath-plus');
var QueryResults = require("./query-results");

class QueryManager{
  constructor(connectionInfo){
    this.engine = new BackwordsChainer();
    this._loadDefaults = false;
    this._queryString = "";
    this.connectionInfo = connectionInfo;
    this.topCon = new.target || QueryManager;
    if(connectionInfo instanceof QueryManager){
      var oldQM = connectionInfo;
      this.connectionInfo = oldQM.connectionInfo;
      if(oldQM._loadDefaults){
        this.loadDefaults();
      }

      this.loadQueryString(oldQM._queryString);
      return;
    }

    this.loadQueryString(this.connectionInfo);
  }

  loadDefaults(){
    this._loadDefaults = true;
    this.engine.loadDefaults();
    return this;
  }

  loadQueryString(qString){
    if(qString === "" || typeof(qString) !== "string"){
      return this;
    }
    this._queryString += qString + "\n";
    this.engine.parseRules(qString + "\n");
    return this;
  }

  loadFromDB(id, path){
    var {Protocol, DBName, Username, Password, Hostname} = this.run(`couchdb_protocol(Protocol),
      couchdb_dbname(DBName),
      couchdb_hostname(Hostname),
      couchdb_username(Username),
      couchdb_password(Password)
      `).first();

    return new Promise((res, rej) => {
      request({method:"GET", url:`${Protocol}://${Username}:${Password}@${Hostname}/${DBName}/${id}`}, (err, resp, body) => {
        if(err){
          return rej(err);
        }

        var b = JSON.parse(body);
        var result = JSONPath({json:b, path});
        if(result === null){
          return rej(new Error("No Data found under path: " + path));
        }
        this.loadQueryString(result[0]);
        return res();
      });
    })
  }

  run(goal, maxQuery){
    var gen = this.engine.run(goal);
    var vals = [];
    var generated = gen.next();
    if(generated.value === null || generated.value === undefined){
      return this.convertChainTypes(vals);
    }

    vals.push(generated.value);
    for(var i = 0; i < (maxQuery || 100000000000) && !generated.done; i++){
      generated = gen.next();
      if(generated.value !== null && generated.value !== undefined){
        vals.push(generated.value);
      }
    }

    return new QueryResults(this.convertChainTypes(vals));
  }

  convertChainTypes(arrValues){
    return arrValues.map((val) => {
      for(var i in val){
        val[i] = this.convertChainType(val[i]);
      }
      return val;
    });
  }

  convertChainType(val){
    if(val.name !== "_list" && val.name[0] === "_"){
      return "_";
    }
    if(val.name === '_list' && val.arity >= 1){
      var arr = [];
      if(val.toString() === "[]"){
        return [];
      }
      var firstConvert = this.convertChainType(val.argsList[0]);
      return [firstConvert, ...this.convertChainType(val.argsList[1])];
    }
    //Predicate check
    if(val.arity >= 1){
      var obj = {};
      obj[val.name] = val.argsList.map(this.convertChainType.bind(this));
      return obj;
    }
    if(val.name === "[]"){
      return [];
    }
    if(val.removeQuotes){
      return val.removeQuotes();
    }
    if(val.toNumber){
      return val.toNumber();
    }
    return val.toString();
  }

  clone(){
    return new this.topCon(this);
  }
}

module.exports = QueryManager;
