
class QueryResults{
  constructor(results){
    this.results = results;
  }

  first(){
    return this.results[0];
  }

  last(){
    return this.results[this.results.length - 1];
  }

  findFirst(fn){
    for(var i in this.results){
      if(fn(this.results[i])){
        return this.results[i];
      }
    }
  }

  mergeVariables(varMergers){
    for(var result of this.results){
      for(var newkey in varMergers){
        var obj = {};
        for(var varVariable of varMergers[newkey]){
          for(var key in result[varVariable]){
            obj[key] = result[varVariable][key];
          }
        }
        result[newkey] = obj;
      }
    }

    return this;
  }

  chunk(chunkSize){
    var chunks = [];
    for(var i = 0; i < this.results.length; i++){
      if(i % chunkSize === 0){
        chunks.push([]);
      }
      chunks[chunks.length - 1].push(this.results[i]);
    }
    return chunks;
  }

  values(){
    return this.results;
  }
}

module.exports = QueryResults;
