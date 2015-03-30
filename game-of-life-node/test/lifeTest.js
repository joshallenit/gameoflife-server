var request  = require('supertest');
var async    = require('async');
var chai     = require('chai');
var util     = require('util');
var main = require('./testMain');

// Any live cell with fewer than two live neighbours dies, as if caused by under-population.

describe("life.js tests", function () {

    main.test("iterate - given one cell - cell dies", function (done) {
        chai.assert(false);
        done();
    });

});