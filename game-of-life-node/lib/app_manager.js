var async        = require('async');
var bodyParser   = require('body-parser');
var cookieParser = require('cookie-parser');
var domain       = require('domain');
var EventEmitter = require('events').EventEmitter;
var express      = require('express');
var winston      = require('winston');
var util         = require('util');
var config       = require('./config');
var errors       = require(__base + 'errors');
var app          = express();

app.port         = process.env.PORT || 8080;

// set up config based on environment
config.setEnvConfig(process.env.NODE_ENV);

/**
 * Adds contextData onto the process domain and on uncaught exceptions returns HTTP 500 instead of crashing the app.
 *
 * For example, to get the current hostName: config.getContextData().hostName
 */
app.use(function(req, res, next) {
    var requestDomain = domain.create();
    requestDomain.contextData = getDomainContextData(req);
    requestDomain.add(req);
    requestDomain.add(res);
    requestDomain.on('error', function(err) {
        winston.error('Uncaught exception', err);
        if (config.crashOnError) {
            // Makes it easier to find problems when developing.
            throw err;
        }
        else {
            app.error(res, err);
        }
    });
    requestDomain.run(next);
});

// used by admin routes to make API calls
app.apiHost = 'http://localhost:' + app.port;
app.adminPath = '/admin';

var getDomainContextData = function(req) {
    return {
        hostName: req.protocol + '://' + req.get('host'),
        apiHost: app.apiHost
    };
};

// Set up app for rendering pages and cookies
app.set("view engine", "jade");
app.set("views", __base + "/templates");
app.use(express.static(__base + 'public'));
app.use(cookieParser('f4nw1shc00k13s3cr3t'));

// Configure app to use bodyParser
// * This will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/**
 * Redirect web page requests
 */
app.redirect = function(res, redirectLocation) {
    res.writeHead(302, {
        'Location': redirectLocation
    });
    res.end();
}

/**
 * Global error handler
 */
app.error = function (res, err) {
    // Returns status code 200 even for errors.
    // The client will parse success = true or false to determine if it is an error.
    // This simplifies the clients use of networking libraries that ignore responses on HTTP codes >= 300.
    try {
        res.status(200).json(errors.toErrorObject(err)).end();
    } catch (ex) {
        winston.error('Could not send HTTP error message (probably because a response has already been sent)', err, ex);
    }
}

/**
 * Adds data with success message to response and ends response.
 *
 * @param res       Express response
 * @param data      Object with data to include in the response.
 * @param [message] String message.
 */
app.success = function (res, data, message) {
    // Use a new object instead of just adding to data so that success: true is the first property listed.
    var outputJSON = {success: true, message: message};
    if(data) {
        for (var prop in data) {
            outputJSON[prop] = data[prop];
        }
    }
    res.json(outputJSON).end();
}

/**
 * @returns String parameter in URL path, in POST body, in URL query parameters, or in header.
 *          Modifies some parameters via trim and lowercase as required.
 */
app.param = function(req, field) {
    var val;
    if(typeof req.params[field] !== 'undefined') {
        val = req.params[field];
    }
    else if(typeof req.body[field] !== 'undefined') {
        val = req.body[field];
    }
    else if(typeof req.query[field] !== 'undefined') {
        val = req.query[field];
    }
    else if(field == 'accessToken') {
        val = req.headers['access-token'];
    }
    if (val && field == 'email') {
        val = val.toLowerCase().trim();
    }
    return val;
}

/**
 * Events: appStarted
 * @constructor
 */
function AppManager() {
    EventEmitter.call(this);
}

util.inherits(AppManager, EventEmitter);

AppManager.prototype.start = function () {

    var self = this;
    async.series([
        function (callback) {
            // Set up routes
            require(__base + 'index')(app);
            callback();
        }
    ], function (err) {
        if (err) {
            console.error('Could not start app', err);
            throw (err);
        }
        console.log('Listening on port:', app.port);
        app.listen(app.port);
        self.emit('appStarted');
        console.log('FanWish application started');
    });
};

AppManager.prototype.expressApp = app;

module.exports = AppManager;
