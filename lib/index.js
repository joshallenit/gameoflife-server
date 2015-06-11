var _ = require('underscore');
var requestify = require('requestify');
var async = require('async');
var util = require('util');
var winston = require('winston');
var get_ip = require('ipware')().get_ip;
var machines = {};

module.exports = function (app) {

    app.put('/register', function (req, res) {


        var ip = get_ip(req).clientIp;
        // ipv6 interferes with the clients ability to map URL, for some reason when using ipv6 URL's the IP is included
        // as part of the path.
        ip = ip.replace('::ffff:', '');
        var address = ip + ':' + req.body.port;
        machines[address] = {
            // Save address so that it is accessible after sorting.
            address: address,
            name: req.body.name,
            onColor: req.body.onColor,
            offColor: req.body.offColor,
            registeredDate: new Date(),
            originalRegisteredDate: machines[address] ? machines[address].originalRegisteredDate : new Date()
        };
        winston.info("registered server", machines[address]);
        res.json({success: true, message: 'Registered'}).end();
    });

    app.get('/life/iterate_machines', function (req, res) {
        var allRequests = [];
        var allMachines = [];

        winston.verbose('Getting iterate from all ', machines.length, 'machines');
        _.each(machines, function (machine) {
            allRequests.push(function(callback) {
                var url = 'http://'+machine.address+'/life/iterate?grid='+encodeURIComponent(req.query.grid);
                console.log('requesting', url, 'for machine', machine);
                requestify
                    .get(url, {timeout: 5000})
                    .then(function(response) {
                        allMachines.push( {
                            // Add these values so we can sort them.
                            name: machine.name,
                            originalRegisteredDate: machine.originalRegisteredDate,
                            machine: machine,
                            response: response.getBody()
                        });
                        callback();
                    })
                    .catch(function(err) {
                        winston.error('error', arguments);
                        allMachines.push({
                            machine: machine,
                            error: util.inspect(err)
                        });
                        //delete allMachines[ip];
                        callback();
                    });
            })
        });
        async.parallel(allRequests, function() {
            winston.verbose('done all requests', arguments);
            // Sort the results
            allMachines = _.sortBy(allMachines, 'name');
            allMachines = _.sortBy(allMachines, 'originalRegisteredDate');
            res.json(allMachines).end();
        });
    });

};