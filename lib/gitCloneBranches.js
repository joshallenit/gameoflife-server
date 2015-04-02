var git = require("nodegit");
var rimraf = require('rimraf');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var errors = require(__base + 'lib/errors');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var objects = require(__base + 'lib/object_lib');


exports.machines = {};

/**
 List branches
 for each of those branches checkout one of these branches in their own directory
 for "Node" apps start the node startup command which should take environment parameters for PORT
 then store these values so that they are returned for "machines", which is reallyt the port number that
 we are going to call
 then we will pipe the value from the running server to our web page
 modify web page to get the list of machine, create a page based on these schemes, and then call each library one by one
 funniest would be to overlay every machine on top of one.. so that they are responsible for rendering part of the screen even though they are given the whole page
 */
exports.cloneAll = function (done) {
    async.series([
            function (callback) {
                cloneOne('https://github.com/joshallenit/gameoflife-entry-node.git', runNode, callback);
            },
            function (callback) {
                cloneOne('https://github.com/joshallenit/gameoflife-entry-ios.git', runIos, callback);
            },
        ],
        done);
};

/**
 * @param runFunction function (machine)
 * @param done function (err)
 */
var cloneOne = function (repoUrl, runFunction, done) {

    var repoPrefix = __base + 'clones/' + repoUrl.substring(repoUrl.lastIndexOf('/'), repoUrl.lastIndexOf('.')) + '_';
    var masterDir = repoPrefix + 'master';
    var branches;
    async.series([
            function (callback) {
                console.log('removing directory');
                rimraf(masterDir, callback);
            },
            function (callback) {
                console.log('cloning repo', repoUrl, 'to', masterDir);
                git
                    .Clone(repoUrl, masterDir, {
                        remoteCallbacks: {
                            certificateCheck: function () {
                                // github will fail cert check on some OSX machines
                                // this overrides that check
                                return 1;
                            }
                        }
                    })
                    .then(function (/*repository*/) {
                        callback();
                    })
                    .catch(callback);
            },
            function (callback) {
                console.log('finding branches in ', masterDir);
                exec('git branch -r', {cwd: masterDir}, function (error, stdout, stderr) {
                    if (error || stderr) {
                        return callback(errors.toErrorObject('Could not find branches', error || stderr));
                    }
                    branches = stdout.split('\n');
                    _.each(branches, function (branch, i) {
                        branches[i] = branch.replace('origin/', '').trim();
                    })
                    callback();
                });
            },
            function (callback) {
                console.log('checking out branches');
                var port = 3000;
                var checkoutFunctions = [];
                _.each(branches, function (branch) {
                    if (!/entry/i.test(branch)) {
                        console.log('ignoring branch', branch, 'because it is not an entry');
                        return;
                    }
                    checkoutFunctions.push(function (checkoutCallback) {
                        var dir = repoPrefix + branch;
                        cloneAndCheckout(repoUrl, dir, branch, function (err) {
                            if (err) {
                                return checkoutCallback(err);
                            }
                            var machine = {
                                dir: dir,
                                port: port++,
                                status: 'installing',
                                stdout: '',
                                stderr: ''
                            };
                            exports.machines[branch] = machine;
                            try {
                                runFunction(machine);
                            } catch (ex) {
                                machine.status += ', error ' + util.inspect(ex);
                            }
                            checkoutCallback();
                        });
                    })
                });
                async.parallel(checkoutFunctions, callback);
            }
        ],
        done);
};


/**
 * @param done function(err)
 */
var cloneAndCheckout = function (url, dir, branch, done) {
    async.series([
            function (callback) {
                console.log('removing clones dir', dir);
                rimraf(dir, callback);
            },
            function (callback) {
                console.log('cloning for branch', url, branch);
                git
                    .Clone(url, dir, {
                        remoteCallbacks: {
                            certificateCheck: function () {
                                // github will fail cert check on some OSX machines
                                // this overrides that check
                                return 1;
                            }
                        }
                    })
                    .then(function (repository) {
                        console.log('checking out branch', branch, 'from', repository);
                        exec('git checkout '+branch, {cwd: dir}, function (error) {
                            if (error) {
                                return callback(errors.toErrorObject('git checkout '+error, error));
                            }
                            callback();
                        });
                    })
                    .catch(callback);
            }
        ],
        done);
}

var runNode = function (machine) {
    async.series([
            function (callback) {
                exec('npm install', {cwd: machine.dir}, function (error, stdout, stderr) {
                    if (error || stderr) {
                        return callback(errors.toErrorObject('npm install failed', error || stderr));
                    }
                    machine.status += ', installed';
                    callback();
                });
            },
            function (callback) {
                // Copy environment so that we can change port.
                var env = {};
                objects.copyFields(process.env, env)
                env.PORT = machine.port;
                // Use node instead of npm start so that we do not check parent directories.
                var npm = spawn('node', ['bin/www'], {cwd: machine.dir, env: env});
                machine.status += ', starting';
                machine.process = npm;
                npm.stderr.on('data', function (data) {
                    machine.status += ', error';
                    machine.stderr += data;
                });
                npm.stdout.on('data', function (data) {
                    if (!/error/.test(machine.status)) {
                        machine.status += ', started';
                    }
                    machine.stdout += data;
                });
                npm.on('close', function (/*code, signal*/) {
                    machine.status += ', closed' + util.inspect(arguments);
                    callback();
                });
                npm.on('error', function (/*code, signal*/) {
                    machine.status += ', error' + util.inspect(arguments);
                });
            }
        ],
        function (err) {
            if (err) {
                machine.status += ', error' + util.inspect(arguments);
            }
            console.log('Node ended', machine);
        });
};

var runIos = function (machine) {
    async.series([
            function (callback) {
                var cmd = 'xcodebuild ' +
                    '-workspace "Game of Life - iOS Entry.xcworkspace" ' +
                    '-scheme "Game of Life - iOS Entry" ' +
                    '-configuration "Release" ' +
                    '-sdk iphonesimulator8.2 ' +
                    'ONLY_ACTIVE_ARCH=NO  ' +
                    'CONFIGURATION_BUILD_DIR=.';
                exec(cmd, {cwd: machine.dir}, function (error, stdout, stderr) {
                    if (error || stderr) {
                        return callback(errors.toErrorObject(cmd + ' failed', error || stderr));
                    }
                    machine.status += ', installed';
                    callback();
                });
            },
            function (callback) {
                var args = ['launch', './Game of Life - iOS Entry.app', '--args', '--port', machine.port];
                var simulator = spawn('ios-sim', args, {cwd: machine.dir});
                machine.status += ', starting';
                machine.process = npm;
                simulator.stderr.on('data', function (data) {
                    machine.status += ', error';
                    machine.stderr += data;
                });
                simulator.stdout.on('data', function (data) {
                    if (!/error/.test(machine.status)) {
                        machine.status += ', started';
                    }
                    machine.stdout += data;
                });
                simulator.on('close', function (/*code, signal*/) {
                    machine.status += ', closed' + util.inspect(arguments);
                    callback();
                });
                simulator.on('error', function (/*code, signal*/) {
                    machine.status += ', error' + util.inspect(arguments);
                });
            }
        ],
        function (err) {
            if (err) {
                machine.status += ', error' + util.inspect(arguments);
            }
            console.log('Node ended', machine);
        });
}

