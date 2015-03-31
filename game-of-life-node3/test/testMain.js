var request     = require('supertest');
var async       = require('async');
var sinon       = require('sinon');
var domain      = require('domain');

var toLoggingDone = function (done) {
    return function (err, info) {
        if (err && info && info.res && (info.res.body || info.res.text)) {
            console.log('Server returned', info.res.body || info.res.text);
        }
        done.apply(done, arguments);
    }
}

/**
 * Runs testFunction in a domain so exceptions are reported.
 *
 * @param testFunction function(done) - done: function(err)
 */
exports.test = function(description, testFunction) {
    it(description, function (done) {
        var that = this;
        var theArgs = arguments;
        done = toLoggingDone(done);
        var d = domain.create();
        d.on('error', done);
        d.run(function() {
            // Run as that so that this.timeout(xxx) still works.
            testFunction.apply(that, theArgs);
        });
    });
}
