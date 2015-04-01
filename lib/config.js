var winston     = require('winston');
var util        = require('util');

/**
 * Sets these members of exports:
 *
      isDebug: Boolean,
      db: {
            databaseUrl: 'mongodb://...'
            replacaSet: {
                  repset: {
                      strategy: 'ping',
                      rs_name: 'rs0'
                  }
            },
      s3: {},
      mandril: {}
      adminSessionTimeout: timeout in milliseconds
 *
 * @param env String - environment name: production, test, or blank for default which is develop.
 *
 */
exports.setEnvConfig = function(env) {
    switch (env) {
        case 'production':
            exports.isDebug = false;
            exports.crashOnError = false;
            break;
        case 'test':
            exports.isDebug = false;
            exports.crashOnError = true;
            break;
        default:
            exports.isDebug = true;
            exports.crashOnError = true;
            break;
    }
    if (exports.isDebug) {
        winston.level = 'verbose';
    }
    setUpWinston();
};

exports.getContextData = function() {
    return process.domain.contextData;
}

var setUpWinston = function() {
    // Log the Error message too as otherwise Winston only logs the stack trace.
    var oldError = winston.log;
    winston.log = function() {
        var newArgs = [];
        for (var i = 0; i < arguments.length; i++) {
            var arg = arguments[i];
            if (arg && arg.stack) {
                newArgs.push(util.inspect(arg));
            }
            newArgs.push(arg);
        };
        oldError.apply(oldError, newArgs);
    };
}
