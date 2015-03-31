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
        var query = '?grid='+encodeURIComponent(util.inspect(start))
        request(main.app)
            .get('/life/iterate'+query)
            .set('Accept', 'application/json')
            .expect(200, function (err, info) {
                if (err) {
                    return done(err);
                }
                var success = info.res.body;
                var expected = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0],
                ];
                console.log('SUCCESS', success, expected);
                chai.assert.deepEqual(success, expected);
                done();
            });
    });

    // Any live cell with two live neighbours lives on to the next generation.
    main.test("iterate - given cell with two live neighbours - cell lives", function (done) {
        var start = [
            [1, 1, 0],
            [0, 1, 0],
            [0, 0, 0],
        ];
        var query = '?grid='+encodeURIComponent(util.inspect(start))
        request(main.app)
            .get('/life/iterate'+query)
            .set('Accept', 'application/json')
            .expect(200, function (err, info) {
                if (err) {
                    return done(err);
                }
                var success = info.res.body;
                var expected = [
                    [1, 1, 0],
                    [1, 1, 0],
                    [0, 0, 0],
                ];
                console.log('SUCCESS', success, expected);
                chai.assert.deepEqual(success, expected);
                done();
            });
    });

    // Any live cell with three live neighbours lives on to the next generation.
    main.test("iterate - given cell with three live neighbours - cell lives", function (done) {
        var start = [
            [1, 1, 0],
            [1, 1, 0],
            [0, 0, 0],
        ];
        var query = '?grid='+encodeURIComponent(util.inspect(start))
        request(main.app)
            .get('/life/iterate'+query)
            .set('Accept', 'application/json')
            .expect(200, function (err, info) {
                if (err) {
                    return done(err);
                }
                var success = info.res.body;
                var expected = [
                    [1, 1, 0],
                    [1, 1, 0],
                    [0, 0, 0],
                ];
                console.log('SUCCESS', success, expected);
                chai.assert.deepEqual(success, expected);
                done();
            });
    });

    // Any live cell with more than three live neighbours dies, as if by overcrowding.
    main.test("iterate - given cell with four live neighbours - cell dies", function (done) {
        var start = [
            [1, 1, 0],
            [1, 1, 0],
            [0, 1, 0],
        ];
        var query = '?grid='+encodeURIComponent(util.inspect(start))
        request(main.app)
            .get('/life/iterate'+query)
            .set('Accept', 'application/json')
            .expect(200, function (err, info) {
                if (err) {
                    return done(err);
                }
                var success = info.res.body;
                var expected = [
                    [1, 1, 0],
                    [0, 0, 1],
                    [1, 1, 0],
                ];
                console.log('SUCCESS', success, expected);
                chai.assert.deepEqual(success, expected);
                done();
            });
    });

    // Any dead cell with exactly three live neighbours becomes a live cell, as if by reproduction.
    main.test("iterate - given cell with four live neighbours - cell dies", function (done) {
        var start = [
            [1, 1, 0],
            [1, 1, 0],
            [0, 1, 0],
        ];
        var query = '?grid='+encodeURIComponent(util.inspect(start))
        request(main.app)
            .get('/life/iterate'+query)
            .set('Accept', 'application/json')
            .expect(200, function (err, info) {
                if (err) {
                    return done(err);
                }
                var success = info.res.body;
                var expected = [
                    [1, 1, 0],
                    [0, 0, 1],
                    [1, 1, 0],
                ];
                console.log('SUCCESS', success, expected);
                chai.assert.deepEqual(success, expected);
                done();
            });
    });
});