'use strict';

var redis = require('redis');
var MultiError = require('./multi-error');

function deSerializeDate(key, value){
  if(typeof value === 'string'){
    if(value.match(/^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)$/)){
      return new Date(value);
    }
  }
  return value;
}



module.exports = function(options, errorHandler) {
  var client;

  if (options) {
    if (options.host && options.port) {
      client = redis.createClient(options.port, options.host, options);
    }
    else {
      client = redis.createClient(options);
    }
  }
  else {
    client = redis.createClient();
  }

  if(client.hasOwnProperty('on')){
    client.on('error', function (err){
      return errorHandler(err);
    });
  } else {
    // no return here, to support stubbing the testing harness
    errorHandler(new Error('unable to create redis client'));
  }

  return {
    set: function (key, value, ttl, callback) {
      if(typeof ttl === 'function'){
        callback = ttl;
        ttl = 0;
      }
      client.set(key, JSON.stringify(value), function(err, reply){
        if(ttl > 0){
          client.expire(key, ttl, callback);
        } else {
          callback(err, reply);
        }
      });
    },
    get: function (keys, callback) {
      client.get(keys, function(err, reply){
        if(err) {
          return callback(err);
        }
        //REDIS will return null for a missing key, we want the API
        // to return KeyNotFoundError
        if(reply === null){
          return callback(new MultiError.KeyNotFoundError());
        }
        return callback(err, JSON.parse(reply, deSerializeDate));
      });
    },
    del: function (keys, callback) {
      client.del(keys, callback);
    },
    flushAll: function (callback) {
      client.flushall(callback);
    }
  };
};
