magma
=====

magma is a framework for creating scalable AMQP back ends.

### Install Magma

```bash
npm install magma
```

### Create a Router

A router takes in incoming HTTP connections and routes them to a worker.

Routers serve up **resources**. Each resource acts as an endpoint on the
router. For example, the `network` resource would correspond to the following
endpoint: `http://yourendpoint.com/network`.

A router can have multiple resources, and each resource can handle create,
read, update, and delete requests via HTTP `POST`, `GET`, `PUT`, and `DELETE`
requests respectively.

```js
var magma  = require('magma');
var router = magma.router();

router.connect(function () {
  router.resource('network');
});

var server = router.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});
```

### Create a Worker

A worker handles a specific resource. Multiple workers can exist for a single
resource, which is how magma handles scaling. RabbitMQ will automatically
load balance router requests amongst workers.

```js
var magma  = require('magma');
var worker = magma.worker();

worker.connect(function () {
  worker.resource('network', function () {
    this.create = function (req, res) {
      res.success(req.data.id);
    };

    this.read = function (req, res) {
      res.success(req.data.id);
    };

    this.update = function (req, res) {
      res.success(req.data.id);
    };

    this.delete = function (req, res) {
      res.success(req.data.id);
    };
  });
});
```
