var git = require("nodegit");
var rimraf = require('rimraf');
var util = require('util');
var async = require('async');
var _ = require('underscore');
var errors = require(__base + 'lib/errors');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var objects = require(__base + 'lib/object_lib');

var nodeEntryRepo = 'https://github.com/joshallenit/lunchandlearn-tdd-entry-node.git';

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

    var nodeRepoDir = 'nodeEntryRepo_master';
    var branches;
    async.series([
            function (callback) {
                console.log('removing directory');
                rimraf(nodeRepoDir, callback);
            },
            function (callback) {
                console.log('cloning repo', nodeEntryRepo, 'to', nodeRepoDir);
                git
                    .Clone(nodeEntryRepo, nodeRepoDir, {
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
                console.log('finding branches');
                exec('git branch -r', {cwd: 'nodeEntryRepo_master'}, function (error, stdout, stderr) {
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
                        cloneAndCheckout(nodeEntryRepo, 'node', branch, port++, checkoutCallback);
                    })
                });
                async.parallel(checkoutFunctions, callback);
            }
        ],
        done);
};

var cloneAndCheckout = function (url, prefix, branch, port, done) {
    var dir = __base + prefix + '_clones/' + branch;
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
                        repository
                            .checkoutBranch('origin/'+branch)
                            .then(function () {
                                callback();
                            })
                            .catch(callback);
                    })
                    .catch(callback);
            },
            function (callback) {
                console.log('installing', branch, 'in', dir);
                exports.machines[branch] =
                {
                    status: 'installing',
                    stdout: '',
                    stderr: ''
                };
                exec('npm install', {cwd: dir}, function (error, stdout, stderr) {
                    console.log('done running install for', branch, 'in', dir, arguments);
                    if (error || stderr) {
                        return callback(errors.toErrorObject('Could not find branches', error || stderr));
                    }
                    exports.machines[branch].status += ', installed';
                    callback();
                });
            },
            function (callback) {
                console.log('RUNNING NODE npm start in ', dir);
                try {
                    var env = {};
                    objects.copyFields(process.env, env)
                    env.PORT = port;
                    var npm = spawn('npm', ['start'], {cwd: dir, env: env});
                    exports.machines[branch].status += ', starting';
                    exports.machines[branch].process = npm;
                    npm.stderr.on('data', function (data) {
                        exports.machines[branch].status += ', error';
                        exports.machines[branch].stderr += data;
                    });
                    npm.stdout.on('data', function (data) {
                        if (!/error/.test(exports.machines[branch].status)) {
                            exports.machines[branch].status += ', started';
                        }
                        exports.machines[branch].stdout += data;
                    });
                    npm.on('close', function (/*code, signal*/) {
                        exports.machines[branch].status += ', closed' + util.inspect(arguments);
                    });
                    npm.on('error', function (/*code, signal*/) {
                        exports.machines[branch].status += ', error' + util.inspect(arguments);
                    });
                } catch (ex) {
                    exports.machines[branch].status += ', error '+util.inspect(ex);
                }
                callback();
            }
        ],
        done);

}