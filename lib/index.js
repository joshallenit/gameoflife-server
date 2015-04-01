var numNeighbours = function (grid, x, y) {

    // [-1,-1] [0,-1] [+1, -1]
    // [-1, 0] [0, 0] [+1,  0]
    // [-1,+1] [0,+1] [+1, +1]
    var count = 0;
    if (grid[x - 1] && grid[x - 1][y - 1]) {
        count++;
    }
    if (grid[x] && grid[x][y - 1]) {
        count++;
    }
    if (grid[x + 1] && grid[x + 1][y - 1]) {
        count++;
    }
    if (grid[x - 1] && grid[x - 1][y]) {
        count++;
    }
    if (grid[x + 1] && grid[x + 1][y]) {
        count++;
    }
    if (grid[x - 1] && grid[x - 1][y + 1]) {
        count++;
    }
    if (grid[x] && grid[x][y + 1]) {
        count++;
    }
    if (grid[x + 1] && grid[x + 1][y + 1]) {
        count++;
    }
    return count;
}

/**
 * @param grid - number[][] - two dimensional array where 1 = on, 0 = off
 */
var iterate = function (grid) {
    var next = []
    for (var i = 0, width = grid.length; i < width; i++) {
        next.push([]);
        for (var j = 0, height = grid[i].length; j < height; j++) {
            var neighbours = numNeighbours(grid, i, j);
            if (grid[i][j]) {
                if (neighbours < 2) {
                    next[i].push(0);
                }
                else if (neighbours > 3) {
                    next[i].push(0);
                }
                else {
                    next[i].push(1);
                }
            } else {
                if (neighbours == 3) {
                    next[i].push(1);
                }
                else {
                    next[i].push(0);
                }
            }
        }
    }
    return next;
};

var git = require(__base + 'lib/gitCloneBranches');
git.cloneAll(function(err) {
    console.log('done cloned all', arguments);
    if (err) {
        throw err;
    }
    console.log('Cloned all');
    displayMachines();
});

var displayMachines = function() {
    console.log('Machines', git.machines);
    setTimeout(displayMachines, 2000);
}

module.exports = function (app) {
    app.get('/life/iterate', function (req, res) {
        var grid = JSON.parse(req.query.grid);
        console.log("parsed", grid);
        try {
            var next = iterate(grid);
        }
        catch (ex) {
            console.log('could not iterate', ex, ex.stack);
        }
        console.log('NEXT', next);
        res.json(next);
    });
}