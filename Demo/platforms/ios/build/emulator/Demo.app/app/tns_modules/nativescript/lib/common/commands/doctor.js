///<reference path="../.d.ts"/>
"use strict";
var os_1 = require("os");
var future = require("fibers/future");
var DoctorCommand = (function () {
    function DoctorCommand($doctorService, $logger, $staticConfig) {
        this.$doctorService = $doctorService;
        this.$logger = $logger;
        this.$staticConfig = $staticConfig;
        this.allowedParameters = [];
    }
    DoctorCommand.prototype.canExecute = function (args) {
        return future.fromResult(true);
    };
    DoctorCommand.prototype.execute = function (args) {
        var _this = this;
        return (function () {
            var warningsPrinted = _this.$doctorService.printWarnings();
            if (warningsPrinted) {
                var client = _this.$staticConfig.CLIENT_NAME_ALIAS || _this.$staticConfig.CLIENT_NAME;
                _this.$logger.out(("These warnings are just used to help the " + client + " maintainers with debugging if you file an issue.").bold
                    + os_1.EOL + ("Please ignore them if everything you use " + client + " for is working fine.").bold + os_1.EOL);
            }
            else {
                _this.$logger.out("No issues were detected.".bold);
            }
        }).future()();
    };
    return DoctorCommand;
})();
exports.DoctorCommand = DoctorCommand;
$injector.registerCommand("doctor", DoctorCommand);
