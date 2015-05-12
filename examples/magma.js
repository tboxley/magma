/**
 * Resource Example
 */

// -- ROUTER
// -- Routes incoming HTTP requests to a series of workers via RabbitMQ

var magma  = require("./index");
var router = magma.router();

router.connect(function () {
	router.resource("network"); // declare the resource as available
});

var server = router.listen(3000, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log("Listening at http://%s:%s/", host, port);
});


var worker = magma.worker();

worker.connect(function () {
	worker.resource("network", function () {
		this.create = function (req, res) {
			res.success('create ' + req.data.id);
		};

		this.read = function (req, res) {
			res.success('read ' + req.data.id);
		};

		this.update = function (req, res) {
			res.success('update ' + req.data.id);
		};

		this.delete = function (req, res) {
			res.success('delete ' + req.data.id);
		};
	});
});
