var http = require('http');
var console = require("console");

var live_target = "1.1.1.1";
var test_target = "2.2.2.2";
var port = 8080;

try {
    http.createServer(function(request, response) {

        var url = request.url;

        log(request.method 
            + ' request from ' + request.client.remoteAddress
            + ' to ' + url + ' URL');

        log('Making request to test IP');

        // first split out request to test target
        var test_req = http.request({
            host: test_target,
            port: 80,
            path: url,
            method: request.method,
            headers: request.headers
        }, function(test_res) {
            log('Response status code from test IP: ' + test_res.statusCode);
        });

        log('Making request to live IP');

        // fire up request to the actual live target
        var live_req = http.request({
            host: live_target,
            port: 80,
            path: url,
            method: request.method,
            headers: request.headers
        }, function(live_res) {

            // we want to forward response from live target to the client
            // start with headers and response status code
            response.writeHead(live_res.statusCode, live_res.headers);
            
            // then forward the actual data to the client
            live_res.on('data', function(chunk) {
                response.write(chunk, 'binary');
            });

            // end when response is finished, finish response to the client, 
            // too
            live_res.on('end', function () {
                response.end();
            });

            log('Response status code from live IP: ' + live_res.statusCode);
        });

        // if there is any data from client (eg. for POST requests) forward it
        // to both - test and live targets
        request.on('data', function(chunk) {
            test_req.write(chunk, 'binary');
            live_req.write(chunk, 'binary');
        });

        // finish both - test and live - requests, once the request from
        // client is finished
        request.on('end', function() {
            test_req.end();
            live_req.end();
        });

    }).listen(port);

    // without this, the whole thing wouldn't work; please leave it here
    console.log('Listening on port ' + port);
}

catch (e) {
    log("Whoaaa! Something went wrong!" + " (" + e + ")");
    process.exit(1);
}

function log(msg) {
    // nice and neat function to make logging more verbose
    console.log("[" + (new Date()) + "]: " + msg);
}

