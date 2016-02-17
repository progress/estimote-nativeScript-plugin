///<reference path="../../.d.ts"/>
"use strict";
var packet_stream_1 = require("./packet-stream");
var net = require("net");
var semver = require("semver");
var ws = require("ws");
var temp = require("temp");
var helpers = require("../../common/helpers");
var SocketProxyFactory = (function () {
    function SocketProxyFactory($logger, $projectData, $projectDataService) {
        this.$logger = $logger;
        this.$projectData = $projectData;
        this.$projectDataService = $projectDataService;
    }
    SocketProxyFactory.prototype.createSocketProxy = function (factory) {
        var _this = this;
        return (function () {
            var socketFactory = function (callback) { return helpers.connectEventually(factory, callback); };
            _this.$projectDataService.initialize(_this.$projectData.projectDir);
            var frameworkVersion = _this.$projectDataService.getValue("tns-ios").wait().version;
            var result;
            if (semver.gte(frameworkVersion, "1.4.0")) {
                result = _this.createTcpSocketProxy(socketFactory);
            }
            else {
                result = _this.createWebSocketProxy(socketFactory);
            }
            return result;
        }).future()();
    };
    SocketProxyFactory.prototype.createWebSocketProxy = function (socketFactory) {
        var _this = this;
        var localPort = 8080;
        this.$logger.info("\nSetting up debugger proxy...\nPress Ctrl + C to terminate, or disconnect.\n");
        var server = ws.createServer({
            port: localPort,
            verifyClient: function (info, callback) {
                _this.$logger.info("Frontend client connected.");
                socketFactory(function (_socket) {
                    _this.$logger.info("Backend socket created.");
                    info.req["__deviceSocket"] = _socket;
                    callback(true);
                });
            }
        });
        server.on("connection", function (webSocket) {
            var encoding = "utf16le";
            var deviceSocket = webSocket.upgradeReq["__deviceSocket"];
            var packets = new packet_stream_1.PacketStream();
            deviceSocket.pipe(packets);
            packets.on("data", function (buffer) {
                webSocket.send(buffer.toString(encoding));
            });
            webSocket.on("message", function (message, flags) {
                var length = Buffer.byteLength(message, encoding);
                var payload = new Buffer(length + 4);
                payload.writeInt32BE(length, 0);
                payload.write(message, 4, length, encoding);
                deviceSocket.write(payload);
            });
            deviceSocket.on("end", function () {
                _this.$logger.info("Backend socket closed!");
                process.exit(0);
            });
            webSocket.on("close", function () {
                _this.$logger.info('Frontend socket closed!');
                process.exit(0);
            });
        });
        this.$logger.info("Opened localhost " + localPort);
        return server;
    };
    SocketProxyFactory.prototype.createTcpSocketProxy = function (socketFactory) {
        var _this = this;
        this.$logger.info("\nSetting up proxy...\nPress Ctrl + C to terminate, or disconnect.\n");
        var server = net.createServer({
            allowHalfOpen: true
        });
        server.on("connection", function (frontendSocket) {
            _this.$logger.info("Frontend client connected.");
            frontendSocket.on("end", function () {
                _this.$logger.info('Frontend socket closed!');
                process.exit(0);
            });
            socketFactory(function (backendSocket) {
                _this.$logger.info("Backend socket created.");
                backendSocket.on("end", function () {
                    _this.$logger.info("Backend socket closed!");
                    process.exit(0);
                });
                backendSocket.pipe(frontendSocket);
                frontendSocket.pipe(backendSocket);
                frontendSocket.resume();
            });
        });
        var socketFileLocation = temp.path({ suffix: ".sock" });
        server.listen(socketFileLocation);
        return socketFileLocation;
    };
    return SocketProxyFactory;
})();
exports.SocketProxyFactory = SocketProxyFactory;
$injector.register("socketProxyFactory", SocketProxyFactory);
