/**
 * Functions useful for javascript objects.
 *
 */
exports.MINUTE = 1000*60;
exports.HOUR = exports.MINUTE * 60;
exports.DAY = exports.HOUR * 24;

// Overwrite existing fields in dest with their values from src
exports.overwriteFields = function (src, dest) {
    for (var item in dest) {
        if (typeof src[item] !== 'undefined') {
            dest[item] = src[item];
        }
    }
};


// Overwrite each field is src with dest value
exports.copyFields = function (src, dest) {
    if (!src) {
        return;
    }
    for (var item in src) {
        dest[item] = src[item];
    }
};

// Set any undefined src values to default values
exports.setDefaults = function (src, defaults) {
    for (var item in defaults) {
        if (typeof src[item] === 'undefined') {
            src[item] = defaults[item];
        }
    }
};

// Check various empty conditions on a field
exports.isEmpty = function(obj, field) {
    var val = obj[field];
    return typeof val === 'undefined' || val === null || val === '';
};
