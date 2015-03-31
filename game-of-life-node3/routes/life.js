var express = require('express');
var router = express.Router();

/**
 * @param grid - number[][] - two dimensional array where 1 = on, 0 = off
 */
var iterate = function(grid) {
    return grid;
};


/* GET users listing. */
router.get('/iterate', function(req, res, next) {
    console.log('HERE HERE yay')
    //var grid = JSON.parse(req.query.grid);
    //var next = iterate(grid);
    //res.json(next);
    //next();
});

module.exports = router;
