var magma  = require('../index');
var router = magma.router();

router.connect(function () {
  router.resource('network', ['doSomething:get']);
});

var server = router.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Listening at http://%s:%s', host, port);
});


var worker = magma.worker();

worker.connect(function () {
  worker.resource('network', function () {
    this.create = function (req, res) {
      res.success('create');
    };
    
    this.doSomething = function (req, res) {
      res.success('test');
    };
  });
});
