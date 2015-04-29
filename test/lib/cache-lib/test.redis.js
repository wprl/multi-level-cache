'use strict';

var assert = require('assert');
var sinon = require('sinon');

// setup redis for testing w/o our framework
var redis = require('redis');
var redisAdapter = require('../../../lib/cache-lib/redis');

/*eslint-disable max-statements */
describe('redis adapter', function(){

  it('should call callback if redis returns an error in get', function(done) {
    var redisStub = sinon.stub(redis, 'createClient', function () {
      return {
        'get': function (key, callback) {
          return callback('fake error');
        }
      };
    });

    // This instance of the redis plugin will use our stubbed out redis.clientCreate
    // above to return an object with a get() that returns an error.
    var redisPlugin = redisAdapter({});
    redisPlugin.get('testkey', function (err, value) {
      assert(err);
      assert.equal('fake error', err);
      assert.equal(undefined, value);
      redisStub.restore();
      done();
    });
  });


  it.only('should call set a key with no TTL', function(done){
    var clientStub = {
      'set': sinon.stub().callsArg(2)
    };
    var redisStub = sinon.stub(redis, 'createClient', function(){
      return clientStub;
    });

    var redisPlugin = redisAdapter({});
    redisPlugin.set('testkey', 'testvalue', function(err){
      console.log(err)
      assert.equal(clientStub.set.callCount, 1);
      redisStub.restore();
      done();
    });
  });

  it('should call set a key with a TTL', function(done){
    var clientStub = {
      'set': sinon.stub().callsArg(2),
      'expire': sinon.stub().callsArg(2)
    };
    var redisStub = sinon.stub(redis, 'createClient', function() {
      return clientStub;
    });

    var redisPlugin = redisAdapter({}, errorHandlerSwallowError);
    redisPlugin.set('testkey', 'testvalue', 15, function(){
      assert.equal(clientStub.set.callCount, 1);
      assert.equal(clientStub.expire.callCount, 1);
      redisStub.restore();
      done();
    });
  });

  it('should call get a valid key', function(done){
    var clientStub = {
      // the value returned from redis is pure JSON, needs to be literal here
      // increasing testing here to include parser revive function
      'get': sinon.stub().callsArgWith(1, null, '{"a":"2015-04-21T04:58:20.648Z","b":"something"}')
    };
    var redisStub = sinon.stub(redis, 'createClient', function() {
      return clientStub;
    });

    var redisPlugin = redisAdapter({});
    redisPlugin.get('testkey', function(){
      assert.equal(clientStub.get.callCount, 1);
      redisStub.restore();
      done();
    });

  });

  it('should callback with KeyNotFoundError if there is no key', function(done){
    var clientStub = {
      'get': sinon.stub().callsArgWith(1, null, null)
    };
    var redisStub = sinon.stub(redis, 'createClient', function() {
      return clientStub;
    });

    var redisPlugin = redisAdapter({});
    redisPlugin.get('this key is not in the cache', function(err, result){
      assert(err);
      assert.equal('MultiError', err.name);
      assert.equal(true, err.keyNotFound);
      assert.equal('Key not found in cache', err.message);
      assert.equal(result, undefined);
      assert.equal(clientStub.get.callCount, 1);
      redisStub.restore();
      done();
    });
  });

  it('should call delete a key', function(done){
    var clientStub = {
      'del': sinon.stub().callsArg(1)
    };
    var redisStub = sinon.stub(redis, 'createClient', function() {
      return clientStub;
    });

    var redisPlugin = redisAdapter({});
    redisPlugin.del('testkey', function(){
      assert.equal(clientStub.del.callCount, 1);
      redisStub.restore();
      done();
    });
  });

  it('should call flushAll', function(done){
    var clientStub = {
      'flushall': function(callback) {
        callback();
      }
    };
    var redisStub = sinon.stub(redis, 'createClient', function() {
      return clientStub;
    });

    var redisPlugin = redisAdapter({});
    redisPlugin.flushAll(function(err){
      assert(!err);
      redisStub.restore();
      done();
    });
  });

  it('should not parse strings as dates that contain dates but are not dates', function (done) {

    var clientStub = {
      // the value returned from redis is pure JSON, needs to be literal here
      // increasing testing here to include parser revive function
      'get': sinon.stub().callsArgWith(1, null,
        '{"a":"{foo:2015-04-21T04:58:20.648Z}","b":"something"}')
    };
    var redisStub = sinon.stub(redis, 'createClient', function() {
      return clientStub;
    });

    var redisPlugin = redisAdapter({}, errorHandlerSwallowError);
    redisPlugin.get('testkey', function(error, cachedValue){
      // Check for Invalid Date (not a date or not Invalid Date)
      assert(!cachedValue.a.getTime || !isNaN(cachedValue.a.getTime()));
      assert.equal(typeof cachedValue.a, 'string');
      assert.equal(clientStub.get.callCount, 1);
      redisStub.restore();
      done();
    });
  });

  it('uses default options if no options set', function () {
    var redisStub = sinon.stub(redis, 'createClient').returns({});

    redisAdapter(null);
    assert(redisStub.calledOnce);
    assert(redisStub.calledWithExactly());

    redisStub.restore();
  });

  it('uses an options object if passed in', function () {
    var redisStub = sinon.stub(redis, 'createClient').returns({});
    var options = {};

    redisAdapter(options);
    assert(redisStub.calledOnce);
    assert(redisStub.calledWithExactly(options));

    redisStub.restore();
  });

  it('uses host and port if passed in', function () {
    var redisStub = sinon.stub(redis, 'createClient').returns({});
    var options = {
      host: 'localhost',
      port: 123123,
      x: 'y'
    };

    redisAdapter(options);
    assert(redisStub.calledOnce);
    assert(redisStub.calledWithExactly(options.port, options.host, options));

    redisStub.restore();
  });
});
/*eslint-enable max-statements */
