var Router = require('./lib/core/Router');
var Worker = require('./lib/core/Worker');

module.exports = {
  router: function () {
    return new Router();
  },

  worker: function() {
    return new Worker();
  }
};
