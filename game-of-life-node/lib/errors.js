var util = require('util');
var pluralize = require('pluralize');
var config = require(__base + 'config');

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var ARGUMENT_NAMES = /([^\s,]+)/g;

/**
 * @param errorCode    ID from id constant table.
 * @param errorMessage Descriptive message.
 * @return {error: 'message', errorCode: 'BAD_PARAM', contextData: {...} }
 */
var toError = function (errorCode, errorMessage, userMessage, errorFunc, startContextDataAt) {
    var contextData = {};
    var paramNames = getParamNames(errorFunc);
    var start = startContextDataAt ? startContextDataAt : 0;
    for (var i = start; i < errorFunc.arguments.length; i++) {
        if (i < paramNames.length) {
            contextData[paramNames[i]] = errorFunc.arguments[i];
        }
        else {
            contextData[i + 1] = errorFunc.arguments[i];
        }
    }

    // Use an actual Error() because next() in mongoose requires it to report an error.
    var errorObject = new Error(errorMessage, errorCode);

    // Add properties as enumerable so they are displayed.
    errorObject.success = false;
    errorObject.errorCode = errorCode;
    errorObject.error = errorMessage;
    errorObject.userMessage = userMessage;
    errorObject.contextData = contextData;
    if (config.isDebug) {
        errorObject.stackTrace = errorObject.stack;
    }
    return errorObject;
};

/**
 * Modified from http://stackoverflow.com/a/9924463
 */
var getParamNames = function(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if(result === null) {
        result = [];
    }
    return result;
};

var isErrorObject = function (obj) {
    return obj &&
        obj.hasOwnProperty('success') &&
        obj.hasOwnProperty('errorCode') &&
        obj.hasOwnProperty('error') &&
        obj.hasOwnProperty('userMessage') &&
        obj.hasOwnProperty('contextData');
};

/**
 * Guards against error "Converting circular structure to JSON"
 */
var stringify = function() {
    try {
        return JSON.stringify.apply(JSON.stringify, arguments);
    }
    catch (ex) {
        return util.inspect.apply(util.inspect, arguments);
    }
};

exports.toErrorObject = function (err) {
    if (!err) {
        err = {};
    }
    if (isErrorObject(err)) {
        return err;
    }
    var causedBy = err.stack;
    if (stringify(err) == '{}') {
        // Special case for Error(), which is used by mongoose middleware pre next()
        err = JSON.parse(stringify(err, ["message", "arguments", "type", "name", "stack"]));
    }
    err = exports.otherError(err);
    if (causedBy) {
        // Special case for an Error object that comes back from Mongoose sometimes,
        // like when bad object ID is given to findById.
        err.stack += '\n        Caused by:        \n' + causedBy;
    }
    return err;
};

exports.redirectToErrorPage = function(res, err) {
    err = exports.toErrorObject(err);
    err.contextData = util.inspect(err.contextData);
    err = new Buffer(stringify(err)).toString('base64');
    err = encodeURIComponent(err);
    res.redirect('/site/error?errorObject=' + err);
};

function truncate(dynamicVar, length) {
    if (!dynamicVar) {
        return dynamicVar;
    }
    return dynamicVar.substring(0, length);
}

// Error definitions

/**
 * @param typeName   Name of type of object that could not be found.
 * @param conditions Condition that was used to find object. If string then it is assumed to be an ID.
 */
exports.objectNotFound = function objectNotFound(typeName, conditions) {
    var conditionName = (typeof conditions == 'string') ? 'id ' : '';
    return toError(
        'OBJECT_NOT_FOUND',
        'No ' + typeName + ' with ' + conditionName + util.inspect(conditions),
        truncate(typeName, 20) + ' not found',
        objectNotFound);
};


exports.dealVerificationFailed = function dealVerificationFailed(userMessage) {
    return toError(
        'DEAL_VERIFICATION_FAILED',
        userMessage,
        userMessage,
        dealVerificationFailed, 1);
};

exports.passwordWeak = function passwordWeak() {
    var msg = 'Please pick a stronger password. Passwords must be at least eight characters long and be a mix of uppercase, lowercase, digits, and special characters.';
    return toError(
        'PASSWORD_WEAK',
        msg,
        msg,
        passwordWeak);
};

exports.passwordIncorrect = function passwordIncorrect(email) {
    return toError(
        'PASSWORD_INCORRECT',
        'Incorrect password for ' + util.inspect(email),
        'Incorrect password',
        passwordIncorrect);
};


exports.passwordResetInvalid = function passwordResetInvalid() {
    return toError(
        'PASSWORD_RESET_TOKEN_EXPIRED',
        'Password reset token is invalid or has expired.',
        'Token has expired, please ask for new password reset email.',
        passwordResetInvalid);

};

exports.zipCodeInvalid = function zipCodeInvalid(zipCode) {
    var msg = 'Zip Code ' + truncate(zipCode, 20) + ' is invalid or for an unsupported region. Please enter a valid zip code from US or Canada';
    return toError(
        'PARAMS_INVALID',
        msg,
        msg,
        zipCodeInvalid);
};


exports.sessionExpired = function sessionExpired() {
    return toError(
        'SESSION_EXPIRED',
        'Session expired',
        'Session has expired, please login again',
        sessionExpired);
};

exports.sessionInvalid = function sessionInvalid(description) {
    return toError(
        'SESSION_INVALID',
        description,
        'Session has expired, please login again',
        sessionInvalid, 1);
};

exports.paramInvalid = function paramInvalid(description) {
    return toError(
        'PARAMS_INVALID',
        description,
        description,
        paramInvalid, 1);
};

/**
 * @param params Parameter or Array of parameter names.
 */
exports.paramsMissing = function paramsMissing(params) {
    // Forcing missingParams to be an Array
    params = [].concat( params );
    var msg = 'Missing required ' + pluralize('parameter', params.length) + ': ' + truncate(params.join(", "), 100);
    return toError(
        // Note: use same code as paramInvalid, just with a different message.
        'PARAMS_INVALID',
        msg,
        msg,
        paramsMissing);
};

/**
 * @param params Parameter or Array of parameters.
 */
exports.paramsUnknown = function paramsUnknown(params) {
    // Forcing missingParams to be an Array
    params = [].concat( params );
    var msg = 'Unknown ' + pluralize('parameter', params.length) + ': ' + truncate(params.join(", "), 100);
    return toError(
        // Note: use same code as paramInvalid, just with a different message.
        'PARAMS_INVALID',
        msg,
        msg,
        paramsUnknown);
};

exports.permissionsAdminMissing = function permissionsAdminMissing(permissions) {
    // Forcing permissions to be an Array
    permissions = [].concat( permissions );
    var msg = 'Missing admin ' + pluralize('permission', permissions.length) + ': ' + truncate(permissions.join(", "), 100);
    return toError(
        'NOT_AUTHORIZED',
        msg,
        msg,
        permissionsAdminMissing);
};

exports.otherError = function otherError(err) {
    if (err.name == 'MongoError' || err.name == 'ValidationError' || err.name == 'CastError') {
        return exports.mongoError(err);
    }
    arguments[0] = util.inspect(err);
    return toError(
        'OTHER_ERROR',
        'Error - see contextData for details',
        'Could not process request. Please try again later.',
        otherError);
};

exports.mongoError = function mongoError(err) {
    if (err.name == 'MongoError') {
        if (err.code == 11000 && err.err) {
            // Parse key and value out of:
            // "insertDocument :: caused by :: 11000 E11000 duplicate key error index: fanwish.users.$email_1  dup key: { : \"ironman@dsuperheros.com\" }"
            var myRegexp = /duplicate key error index.*\$(\w*).*dup key:\s*\{\s*:\s*"([^"]*)/g;
            var match = myRegexp.exec(err.err);
            if (match && match[1] && match[2]) {
                var key = match[1].replace(/_\d$/, '');
                return exports.duplicateKeyError(key, match[2]);
            }
        }
    }
    else if (err.name == 'ValidationError') {
        var badParams = Object.keys(err.errors);
        return exports.paramInvalid('Bad value for ' + pluralize('parameter', badParams.length) + ': ' + badParams.join(', '), err);
    }
    else if (err.name == 'CastError' && err.path) {
        var paramName = err.path.replace(/^_+/, '');
        return exports.paramInvalid('Bad value for parameter: ' + paramName, err);
    }
    return toError(
        'DATABASE_ERROR',
        'Database Error - see contextData for details',
        'Could not process request. Please try again later.',
        mongoError);
};

exports.duplicateKeyError = function duplicateKeyError(key, value) {
    var msg = truncate(key, 30) + ' ' + truncate(value, 50) + ' already exists';
    return toError(
        'DUPLICATE_KEY',
        msg,
        msg,
        duplicateKeyError);
};

exports.emailConfirmationInvalid = function emailConfirmationInvalid() {
    return toError(
        'EMAIL_CONFIRMATION_INVALID',
        'Email Confirmation invalid',
        'The email address has already been changed',
        emailConfirmationInvalid);
};

exports.paymentError = function paymentError(result) {
    if (result && result.transaction && result.transaction.status == 'processor_declined') {
        return exports.paymentDeclined(result.transaction.id);
    }
    return exports.otherError(result);
};

/**
 * @param transactionId Transaction ID. We do not include the actual declined reason to help prevent fraud.
 */
exports.paymentDeclined = function paymentDeclined(transactionId) {
    return toError(
        'PAYMENT_DECLINED',
        'Payment declined',
        'There was a problem processing your credit card, please double check your data and try again.'
            + '\n(Transaction ID ' + transactionId + ')',
        paymentDeclined);
};

exports.emailInvalid = function emailInvalid(email) {
    return toError(
        'EMAIL_INVALID',
        'The email address, ' + email + ', is invalid.',
        'Invalid Email',
        emailInvalid);
};

exports.notificationError = function notificationError(err) {
    arguments[0] = util.inspect(err);
    return toError(
        'PUSH_NOTIFICATION_ERROR',
        'Could not send push notification',
        'Could not send push notification',
        notificationError);
};

exports.emailSendError = function emailSendError(mailOptions, err) {
    arguments[1] = util.inspect(err);
    return toError(
        'SEND_EMAIL_FAILED',
        'Could not send email "'+mailOptions.subject+'" to '+mailOptions.to,
        'Could not send email',
        emailSendError);
};

