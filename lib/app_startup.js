require('../lib/globals');
// Connects to the database using test env.
process.env.PORT = '9000'
process.env.NODE_ENV = 'test'

var AppManager = require(__base + 'lib/app_manager');
var appManager = new AppManager();

appManager.start();