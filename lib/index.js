var _ = require('underscore');
var requestify = require('requestify');
var async = require('async');
var util = require('util');

var machines = {};

module.exports = function (app) {

    app.put('/register', function (req, res) {
        console.log("registering server");
        var address = req.ip+':'+req.body.port;
        machines[address] = {
            // Save address so that it is accessible after sorting.
            address: address,
            name: req.body.name,
            onColor: req.body.onColor,
            offColor: req.body.offColor,
            registeredDate: new Date(),
            originalRegisteredDate: machines[address] ? machines[address].originalRegisteredDate : new Date()
        };
        res.json({success: true, message: 'Registered'}).end();
    });

    app.get('/life/iterate_machines', function (req, res) {
        console.log('Getting iterate from all machines');
        var allRequests = [];
        var allMachines = [];
        // I need to add the keys to a sorted array...
        var sortedMachine = _.sortBy(machines, 'name');
        var sortedMachine = _.sortBy(sortedMachine, 'originalRegisteredDate');
        _.each(sortedMachine, function (machine) {
            allRequests.push(function(callback) {
                var url = 'http://'+machine.address+'/life/iterate?grid='+encodeURIComponent(req.query.grid);
                console.log('requesting', url, 'for machine', machine);
                requestify
                    .get(url)
                    .then(function(response) {
                        console.log('got response', response.getBody());
                        allMachines.push( {
                            machine: machine,
                            response: response.getBody()
                        });
                        callback();
                    })
                    .catch(function(err) {
                        console.log('error', arguments);
                        allMachines.push({
                            machine: machine,
                            error: util.inspect(err)
                        });
                        //delete allMachines[ip];
                        callback();
                    });
            })
        });
        console.log('making requests');
        async.parallel(allRequests, function() {
            console.log('done all requests', arguments);
            res.json(allMachines).end();
        });
    });

};