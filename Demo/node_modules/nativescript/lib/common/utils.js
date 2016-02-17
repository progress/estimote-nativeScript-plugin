///<reference path=".d.ts"/>
"use strict";
var Utils = (function () {
    function Utils($options, $logger) {
        this.$options = $options;
        this.$logger = $logger;
    }
    Utils.prototype.getParsedTimeout = function (defaultTimeout) {
        var timeout = defaultTimeout;
        if (this.$options.timeout) {
            var parsedValue = parseInt(this.$options.timeout);
            if (!isNaN(parsedValue) && parsedValue >= 0) {
                timeout = parsedValue;
            }
            else {
                this.$logger.warn("Specify timeout in a number of seconds to wait. Default value: " + timeout + " seconds will be used.");
            }
        }
        return timeout;
    };
    Utils.prototype.getMilliSecondsTimeout = function (defaultTimeout) {
        var timeout = this.getParsedTimeout(defaultTimeout);
        return timeout * 1000;
    };
    return Utils;
})();
exports.Utils = Utils;
$injector.register("utils", Utils);
