var _ = require('underscore');
var requestify = require('requestify');
var async = require('async');
var util = require('util');

var machines = {};

module.exports = function (app) {

    app.put('/register', function (req, res) {
        console.log("registering server");
        machines[req.ip+':'+req.body.port] = {
            name: req.body.name,
            onColor: req.body.onColor,
            offColor: req.body.offColor,
            registeredDate: new Date()
        };
        res.json({success: true, message: 'Registered'}).end();
    });

    app.get('/life/iterate_machines', function (req, res) {
        console.log('Getting iterate from all machines');
        var allRequests = [];
        var allMachines = [];
        _.each(machines, function (machine, ip) {
            allRequests.push(function(callback) {
                var url = 'http://'+ip+'/life/iterate?grid='+encodeURIComponent(req.query.grid);
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