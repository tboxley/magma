magma
=====

magma is a framework for creating scalable AMQP back ends.

### Install Magma

```bash
npm install magma
```

### Create a Router

In magma, everything starts with a Router. Routers take in incoming commands and dispatch them to Workers using RabbitMQ. Currently, magma only has one type of Router - the HTTP router. The HTTP router uses [express](http://expressjs.com) to take incoming HTTP requests and transmit them to a Worker.

```js
var magma  = require('magma');
var router = magma.router();

router.connect(function () {
  router.resource('article');
});

var server = router.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  
  console.log('Listening at http://%s:%s', host, port);
});
```

#### Resources

The Router above declares one resource: `article`. In magma, a resource acts as a type of object. Each resource can be created, read, updated, and deleted using HTTP `POST`, `GET`, `PUT`, and `DELETE` requests respectively. When a resource is declared on the Router, endpoints matching the name of that resource are automatically created. For example:

```
GET http://.../network
```

#### Access Express

The HTTP Router is based around the [express framework](http://expressjs.com). You can access the express instance using the `Router.app` property. This allows you to add helpful features, such as authentication middleware. On a similar note, the `Router.listen` method is basically a direct proxy to the express `listen` method.

### Create a Worker

The next piece of a magma application is the Worker. Workers are in charge of performing a specific set of tasks related to a resource. While a Worker can handle more than one resource at a time, it's typically best practice to make a new worker for each declared resource. Workers can be spawned and despawned as the workload for the resource increases, and RabbitMQ will automatically handle load balancing between them.

It's important to rememeber that Workers should be&mdash;on their own&mdash;stateless. Any session or long term storage should be handled using a caching system such as Redis, or a database such as MongoDB. You should write your worker with the assumption that it can be spun up or down at any time.

```js
var magma  = require('magma');
var worker = magma.worker();

worker.connect(function () {
  worker.resource('article', function () {
    this.create = function (req, res) {
      var articleId = req.data.id;                // Access data using `req.data`
      var authHeader = req.headers.authorization; // Access headers using `req.headers`
    };
    
    this.read = function (req, res) {
      res.success('good job!'); // Send successful responses using `res.success`
    };
    
    this.update = function (req, res) {
      res.fail('something went wrong!'); // Send failure responses using `res.fail`.
    };
    
    this.delete = function (req, res) {
      // And so on...
    };
  });
});
```

When binding a Worker to a Resource, you must implement the `create`, `read`, `update`, and `delete` methods for that resource. These methods are automatically invoked corresponding to the `POST`, `GET`, `PUT`, and `DELETE` HTTP requests from the Router.

You can access request data using the `req.data` object. Query string data as well as POSTed body data will be combined into this key value array.
