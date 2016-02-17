///<reference path=".d.ts"/>
"use strict";
var url = require("url");
var Future = require("fibers/future");
var helpers = require("./helpers");
var zlib = require("zlib");
var util = require("util");
var progress = require("progress-stream");
var filesize = require("filesize");
var HttpClient = (function () {
    function HttpClient($logger, $staticConfig, $config) {
        this.$logger = $logger;
        this.$staticConfig = $staticConfig;
        this.$config = $config;
    }
    HttpClient.prototype.httpRequest = function (options) {
        var _this = this;
        return (function () {
            if (_.isString(options)) {
                options = {
                    url: options,
                    method: "GET"
                };
            }
            var unmodifiedOptions = _.clone(options);
            if (options.url) {
                var urlParts = url.parse(options.url);
                if (urlParts.protocol) {
                    options.proto = urlParts.protocol.slice(0, -1);
                }
                options.host = urlParts.hostname;
                options.port = urlParts.port;
                options.path = urlParts.path;
                delete options.url;
            }
            var requestProto = options.proto || "http";
            delete options.proto;
            var body = options.body;
            delete options.body;
            var pipeTo = options.pipeTo;
            delete options.pipeTo;
            var proto = _this.$config.USE_PROXY ? "http" : requestProto;
            var http = require(proto);
            options.headers = options.headers || {};
            var headers = options.headers;
            if (_this.$config.USE_PROXY) {
                options.path = requestProto + "://" + options.host + options.path;
                headers.Host = options.host;
                options.host = _this.$config.PROXY_HOSTNAME;
                options.port = _this.$config.PROXY_PORT;
                _this.$logger.trace("Using proxy with host: %s, port: %d, path is: %s", options.host, options.port, options.path);
            }
            if (!headers.Accept || headers.Accept.indexOf("application/json") < 0) {
                if (headers.Accept) {
                    headers.Accept += ", ";
                }
                else {
                    headers.Accept = "";
                }
                headers.Accept += "application/json; charset=UTF-8, */*;q=0.8";
            }
            if (!headers["User-Agent"]) {
                if (!_this.defaultUserAgent) {
                    _this.defaultUserAgent = util.format("%sCLI/%s (Node.js %s; %s; %s)", _this.$staticConfig.CLIENT_NAME, _this.$staticConfig.version, process.versions.node, process.platform, process.arch);
                    _this.$logger.debug("User-Agent: %s", _this.defaultUserAgent);
                }
                headers["User-Agent"] = _this.defaultUserAgent;
            }
            if (!headers["Accept-Encoding"]) {
                headers["Accept-Encoding"] = "gzip,deflate";
            }
            var result = new Future();
            _this.$logger.trace("httpRequest: %s", util.inspect(options));
            var request = http.request(options, function (response) {
                var data = [];
                var isRedirect = helpers.isResponseRedirect(response);
                var successful = helpers.isRequestSuccessful(response);
                if (!successful) {
                    pipeTo = undefined;
                }
                var responseStream = response;
                switch (response.headers["content-encoding"]) {
                    case "gzip":
                        responseStream = responseStream.pipe(zlib.createGunzip());
                        break;
                    case "deflate":
                        responseStream = responseStream.pipe(zlib.createInflate());
                        break;
                }
                if (pipeTo) {
                    pipeTo.on("finish", function () {
                        _this.$logger.trace("httpRequest: Piping done. code = %d", response.statusCode.toString());
                        if (!result.isResolved()) {
                            result.return({
                                response: response,
                                headers: response.headers
                            });
                        }
                    });
                    pipeTo = _this.trackDownloadProgress(pipeTo);
                    responseStream.pipe(pipeTo);
                }
                else {
                    responseStream.on("data", function (chunk) {
                        data.push(chunk);
                    });
                    responseStream.on("end", function () {
                        _this.$logger.trace("httpRequest: Done. code = %d", response.statusCode.toString());
                        var responseBody = data.join("");
                        if (successful || isRedirect) {
                            if (!result.isResolved()) {
                                result.return({
                                    body: responseBody,
                                    response: response,
                                    headers: response.headers
                                });
                            }
                        }
                        else {
                            var errorMessage = _this.getErrorMessage(response, responseBody);
                            var theError = new Error(errorMessage);
                            theError.response = response;
                            theError.body = responseBody;
                            result.throw(theError);
                        }
                    });
                }
            });
            request.on("error", function (error) {
                if (!result.isResolved()) {
                    result.throw(error);
                }
            });
            _this.$logger.trace("httpRequest: Sending:\n%s", _this.$logger.prepare(body));
            if (!body || !body.pipe) {
                request.end(body);
            }
            else {
                body.pipe(request);
            }
            var response = result.wait();
            if (helpers.isResponseRedirect(response.response)) {
                if (response.response.statusCode === 303) {
                    unmodifiedOptions.method = "GET";
                }
                _this.$logger.trace("Begin redirected to %s", response.headers.location);
                unmodifiedOptions.url = response.headers.location;
                return _this.httpRequest(unmodifiedOptions).wait();
            }
            return response;
        }).future()();
    };
    HttpClient.prototype.trackDownloadProgress = function (pipeTo) {
        var _this = this;
        var lastMessageSize = 0, carriageReturn = "\x1B[0G", timeElapsed = 0;
        var progressStream = progress({ time: 1000 }, function (progress) {
            timeElapsed = progress.runtime;
            if (timeElapsed >= 1) {
                _this.$logger.write("%s%s", carriageReturn, Array(lastMessageSize + 1).join(" "));
                var message = util.format("%sDownload progress ... %s | %s | %s/s", carriageReturn, Math.floor(progress.percentage) + "%", filesize(progress.transferred), filesize(progress.speed));
                _this.$logger.write(message);
                lastMessageSize = message.length;
            }
        });
        progressStream.on("finish", function () {
            if (timeElapsed >= 1) {
                _this.$logger.out("%s%s%s%s", carriageReturn, Array(lastMessageSize + 1).join(" "), carriageReturn, "Download completed.");
            }
        });
        progressStream.pipe(pipeTo);
        return progressStream;
    };
    HttpClient.prototype.getErrorMessage = function (response, body) {
        if (response.statusCode === 402) {
            var subscriptionUrl = util.format("%s://%s/appbuilder/account/subscription", this.$config.AB_SERVER_PROTO, this.$config.AB_SERVER);
            return util.format("Your subscription has expired. Go to %s to manage your subscription. Note: After you renew your subscription, " +
                "log out and log back in for the changes to take effect.", subscriptionUrl);
        }
        else {
            try {
                var err = JSON.parse(body);
                if (_.isString(err)) {
                    return err;
                }
                if (err.ExceptionMessage) {
                    return err.ExceptionMessage;
                }
                if (err.Message) {
                    return err.Message;
                }
            }
            catch (parsingFailed) {
                return "The server returned unexpected response: " + parsingFailed.toString();
            }
            return body;
        }
    };
    return HttpClient;
})();
exports.HttpClient = HttpClient;
$injector.register("httpClient", HttpClient);
