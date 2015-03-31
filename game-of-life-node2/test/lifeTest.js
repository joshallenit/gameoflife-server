var request  = require('supertest');
var async    = require('async');
var chai     = require('chai');
var util     = require('util');
var main = require('./testMain');



describe("life.js tests", function () {

    // Any live cell with fewer than two live neighbours dies, as if caused by under-population.
    main.test("iterate - given one cell - cell dies", function (done) {
        var start = [
            [0, 0, 0],
            [0, 1, 0],
            [0, 0, 0],
        ];
        request(app)
            .get('/iterate')
            .set('Accept', 'application/json')
            .send('grid='+encodeURIComponent(util.inspect(start)))
            .expect(/"success":true/)
            .expect(200, function (err, info) {
                if (err) {
                    return callback(err);
                }
                var success = info.res.body;
                var expected = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0],
                ];
                chai.assert(success.grid.length).to.deep.equal(expected)
                done();
            });
    });

});