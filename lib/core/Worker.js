var amqp = require('amqp');

function Worker () {
  this.resources = {};
  this.queues = {};
  this.exchanges = {};
}

Worker.prototype.resource = function (resource, handler) {
  this.resources[resource] = new handler();

  this.handleCreate(resource, this.resources[resource]);
  this.handleRead(resource, this.resources[resource]);
  this.handleUpdate(resource, this.resources[resource]);
  this.handleDelete(resource, this.resources[resource]);
};

Worker.prototype.connect = function (options, callback) {
  if ( typeof options === 'function' ) {
    callback = options;
    options = undefined;
  }

  options = options || { host: '127.0.0.1' };

  this.amqpConnection = amqp.createConnection(options);

  this.amqpConnection.on('ready', function () {
    callback();
  });

  this.amqpConnection.on('error', function (err) {
    throw err;
  });
};

Worker.prototype.handleCreate = function (resource, handler) {
  var getRequest = this.getRequest.bind(this);
  var getResponse = this.getResponse.bind(this);

  this.getExchange(resource + '.create');

  this.getQueue(resource + '.create', function (q) {
    q.bind(resource + '.create', '#');

    q.subscribe(function (message) {
      var req = getRequest(resource, message);
      var res = getResponse(resource, req, message);
      handler.create(req, res);
    });
  });
};


Worker.prototype.handleRead = function (resource, handler) {
  var getRequest = this.getRequest.bind(this);
  var getResponse = this.getResponse.bind(this);

  this.getExchange(resource + '.read');

  this.getQueue(resource + '.read', function (q) {
    q.bind(resource + '.read', '#');

    q.subscribe(function (message) {
      var req = getRequest(resource, message);
      var res = getResponse(resource, req, message);
      handler.read(req, res);
    });
  });
};

Worker.prototype.handleUpdate = function (resource, handler) {
  var getRequest = this.getRequest.bind(this);
  var getResponse = this.getResponse.bind(this);

  this.getExchange(resource + '.update');

  this.getQueue(resource + '.update', function (q) {
    q.bind(resource + '.update', '#');

    q.subscribe(function (message) {
      var req = getRequest(resource, message);
      var res = getResponse(resource, req, message);
      handler.update(req, res);
    });
  });
};

Worker.prototype.handleDelete = function (resource, handler) {
  var getRequest = this.getRequest.bind(this);
  var getResponse = this.getResponse.bind(this);

  this.getExchange(resource + '.delete');

  this.getQueue(resource + '.delete', function (q) {
    q.bind(resource + '.delete', '#');

    q.subscribe(function (message) {
      var req = getRequest(resource, message);
      var res = getResponse(resource, req, message);
      handler.delete(req, res);
    });
  });
};

Worker.prototype.getQueue = function (queue, callback) {
  var $this = this;
  callback = callback || function () {};

  if ( this.queues.hasOwnProperty(queue) ) {
    callback(this.queues[queue]);
  } else {
    this.amqpConnection.queue(queue, function (q) {
      $this.queues[queue] = q;
      callback($this.queues[queue]);
    });
  }
};

Worker.prototype.getExchange = function (exchange, callback) {
  callback = callback || function () {};

  if ( this.exchanges.hasOwnProperty(exchange) ) {
    callback(this.exchanges[exchange]);
  } else {
    this.exchanges[exchange] = this.amqpConnection.exchange(exchange);
    callback(this.exchanges[exchange]);
  }
};

Worker.prototype.getRequest = function (resource, message) {
  return {
    data: JSON.parse(message.data.toString()),
    message: message
  };
};

Worker.prototype.getResponse = function (resource, req, message) {
  var $this = this;

  return {
    success: function (data) {
      var json = JSON.stringify({
        replyTo: req.data.replyTo,
        successful: true,
        data: data
      });

      $this.getExchange(resource + '.replyTo', function (e) {
        e.publish('', json);
      });
    },

    fail: function (data) {
      var json = JSON.stringify({
        replyTo: req.data.replyTo,
        successful: false,
        data: data
      });

      var e = $this.getExchange(resource + '.replyTo');
      e.publish('', json);
    }
  };
};

module.exports = Worker;
