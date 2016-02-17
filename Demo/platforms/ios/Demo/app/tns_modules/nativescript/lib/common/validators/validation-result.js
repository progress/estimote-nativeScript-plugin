///<reference path="../.d.ts"/>
"use strict";
var ValidationResult = (function () {
    function ValidationResult(errorMsg) {
        this.errorMsg = errorMsg;
    }
    Object.defineProperty(ValidationResult.prototype, "error", {
        get: function () {
            return this.errorMsg;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ValidationResult.prototype, "isSuccessful", {
        get: function () {
            return !this.errorMsg;
        },
        enumerable: true,
        configurable: true
    });
    ValidationResult.Successful = new ValidationResult(null);
    return ValidationResult;
})();
exports.ValidationResult = ValidationResult;
