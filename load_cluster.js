//this is my load balancer cluster
//run this file in cmd separately to start load balancing clustered server, command- node load_cluster.js (enter)
var cluster = require('cluster');
var numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
} 
else {
    //change this line to Your Node.js app entry point.
    require("./app.js");    // require() actually executes all statements inside the required file,
                            // thts the reason why project size increases when we require new modules into our app.js server file 
}