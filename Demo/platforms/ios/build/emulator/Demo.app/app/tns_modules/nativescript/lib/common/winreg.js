///<reference path=".d.ts"/>
"use strict";
var Future = require("fibers/future");
var Registry = require("winreg");
var WinReg = (function () {
    function WinReg() {
        this.registryKeys = {
            HKLM: { registry: Registry.HKLM },
            HKCU: { registry: Registry.HKCU },
            HKCR: { registry: Registry.HKCR },
            HKCC: { registry: Registry.HKCC },
            HKU: { registry: Registry.HKU }
        };
    }
    WinReg.prototype.getRegistryValue = function (valueName, hive, key, host) {
        var future = new Future();
        try {
            var regKey = new Registry({
                hive: (hive && hive.registry) ? hive.registry : null,
                key: key,
                host: host
            });
            regKey.get(valueName, function (err, value) {
                if (err) {
                    future.throw(err);
                }
                else {
                    future.return(value);
                }
            });
        }
        catch (err) {
            future.throw(err);
        }
        return future;
    };
    return WinReg;
})();
exports.WinReg = WinReg;
$injector.register("winreg", WinReg);
