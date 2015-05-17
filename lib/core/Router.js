var express = require('express');
var bodyParser = require('body-parser');
var amqp = require('amqp');
var uuid = require('node-uuid');
var merge = require('merge');

function Router () {
  this.app = express();
  this.resources = [];
  this.exchanges = {};
  this.queues = {};
  this.replyToHandlers = {};

  this.app.use(bodyParser.urlencoded({ extended: false }))
  this.app.use(bodyParser.json())
}

Router.prototype.resource = function (name, rpcCalls) {
  var $this = this;

  if ( rpcCalls ) {
    rpcCalls.forEach(function (rpcCall) {
      var parts     = rpcCall.split(':');
      var route     = parts[0];
      var method    = parts[1];
      var fullRoute = name + '/' + route;

      $this.resources.push(fullRoute);
      $this.setupReplyTo(fullRoute);

      if ( method === 'get' )
        $this.app.get('/' + fullRoute, $this.handleRead(name, route));

      if ( method === 'put' )
        $this.app.put('/' + fullRoute, $this.handleUpdate(name, route));

      if ( method === 'post' )
        $this.app.post('/' + fullRoute, $this.handleCreate(name, route));

      if ( method === 'delete' )
        $this.app.delete('/' + fullRoute, $this.handleDelete(name, route));
    });
  }

  this.resources.push(name);
  this.setupReplyTo(name);

  this.app.get('/' + name, this.handleRead(name));
  this.app.put('/' + name, this.handleUpdate(name));
  this.app.post('/' + name, this.handleCreate(name));
  this.app.delete('/' + name, this.handleDelete(name));
};

Router.prototype.listen = function () {
  return this.app.listen.apply(
    this.app,
    arguments
  );
};

Router.prototype.connect = function (options, callback) {
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

Router.prototype.setupReplyTo = function (name) {
  var replyToHandlers = this.replyToHandlers;

  this.getExchange(name + '.replyTo');

  this.getQueue(name + '.replyTo', function (q) {
    q.bind(name + '.replyTo', '#');

    q.subscribe(function (message) {
      var data = JSON.parse(message.data.toString());

      if ( replyToHandlers.hasOwnProperty(data.replyTo) ) {
        replyToHandlers[data.replyTo](data);
      }
    });
  });
};

Router.prototype.onReply = function (replyTo, callback) {
  this.replyToHandlers[replyTo] = callback;
};

Router.prototype.handleCreate = function (resource, rpcMethod) {
  var amqpConnection = this.amqpConnection;
  var getExchange = this.getExchange.bind(this);
  var onReply = this.onReply.bind(this);
  var exchange = resource + ((rpcMethod) ? '.' + rpcMethod : '.create');

  getExchange(exchange);

  return function (req, res, next) {
    var data = merge(req.query, req.body);
    data.replyTo = uuid.v1();
    data.headers = req.headers;

    onReply(data.replyTo, function (data) {
      delete data.replyTo;

      if ( data.successful ) {
        res.status(200).end(JSON.stringify(data));
      } else {
        res.status(400).end(JSON.stringify(data));
      }
    });

    getExchange(exchange, function (e) {
      e.publish('', JSON.stringify(data));
    });
  };
};

Router.prototype.handleRead = function (resource, rpcMethod) {
  var amqpConnection = this.amqpConnection;
  var getExchange = this.getExchange.bind(this);
  var onReply = this.onReply.bind(this);
  var exchange = resource + ((rpcMethod) ? '.' + rpcMethod : '.read');

  getExchange(exchange);

  return function (req, res, next) {
    var data = req.query;
    data.replyTo = uuid.v1();
    data.headers = req.headers;

    onReply(data.replyTo, function (data) {
      delete data.replyTo;

      if ( data.successful ) {
        res.status(200).end(JSON.stringify(data));
      } else {
        res.status(400).end(JSON.stringify(data));
      }
    });

    getExchange(exchange, function (e) {
      e.publish('', JSON.stringify(data));
    });
  };
};

Router.prototype.handleUpdate = function (resource, rpcMethod) {
  var amqpConnection = this.amqpConnection;
  var getExchange = this.getExchange.bind(this);
  var onReply = this.onReply.bind(this);
  var exchange = resource + ((rpcMethod) ? '.' + rpcMethod : '.update');

  getExchange(exchange);

  return function (req, res, next) {
    var data = merge(req.query, req.body);
    data.replyTo = uuid.v1();
    data.headers = req.headers;

    onReply(data.replyTo, function (data) {
      delete data.replyTo;

      if ( data.successful ) {
        res.status(200).end(JSON.stringify(data));
      } else {
        res.status(400).end(JSON.stringify(data));
      }
    });

    getExchange(exchange, function (e) {
      e.publish('', JSON.stringify(data));
    });
  };
};

Router.prototype.handleDelete = function (resource, rpcMethod) {
  var amqpConnection = this.amqpConnection;
  var getExchange = this.getExchange.bind(this);
  var onReply = this.onReply.bind(this);
  var exchange = resource + ((rpcMethod) ? '.' + rpcMethod : '.delete');

  getExchange(exchange);

  return function (req, res, next) {
    var data = merge(req.query, req.body);
    data.replyTo = uuid.v1();
    data.headers = req.headers;

    onReply(data.replyTo, function (data) {
      delete data.replyTo;

      if ( data.successful ) {
        res.status(200).end(JSON.stringify(data));
      } else {
        res.status(400).end(JSON.stringify(data));
      }
    });

    getExchange(exchange, function (e) {
      e.publish('', JSON.stringify(data));
    });
  };
};

Router.prototype.getExchange = function (exchange, callback) {
  callback = callback || function () {};

  if ( this.exchanges.hasOwnProperty(exchange) ) {
    callback(this.exchanges[exchange]);
  } else {
    this.exchanges[exchange] = this.amqpConnection.exchange(exchange);
    callback(this.exchanges[exchange]);
  }
};

Router.prototype.getQueue = function (queue, callback) {
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

module.exports = Router;
