///<reference path="../../.d.ts"/>
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var path = require("path");
var ref = require("ref");
var ffi = require("ffi");
var struct = require("ref-struct");
var bufferpack = require("bufferpack");
var plistlib = require("plistlib");
var plist = require("plist");
var helpers = require("../../helpers");
var net = require("net");
var util = require("util");
var Future = require("fibers/future");
var bplistParser = require("bplist-parser");
var string_decoder = require("string_decoder");
var stream = require("stream");
var assert = require("assert");
var os_1 = require("os");
var CoreTypes = (function () {
    function CoreTypes() {
    }
    CoreTypes.pointerSize = ref.types.size_t.size;
    CoreTypes.voidPtr = ref.refType(ref.types.void);
    CoreTypes.intPtr = ref.refType(ref.types.int);
    CoreTypes.uintPtr = ref.refType(ref.types.uint);
    CoreTypes.charPtr = ref.refType(ref.types.char);
    CoreTypes.ptrToVoidPtr = ref.refType(ref.refType(ref.types.void));
    CoreTypes.uintType = ref.types.uint;
    CoreTypes.uint32Type = ref.types.uint32;
    CoreTypes.intType = ref.types.int;
    CoreTypes.longType = ref.types.long;
    CoreTypes.boolType = ref.types.bool;
    CoreTypes.doubleType = ref.types.double;
    CoreTypes.am_device_p = CoreTypes.voidPtr;
    CoreTypes.cfDictionaryRef = CoreTypes.voidPtr;
    CoreTypes.cfDataRef = CoreTypes.voidPtr;
    CoreTypes.cfStringRef = CoreTypes.voidPtr;
    CoreTypes.afcConnectionRef = CoreTypes.voidPtr;
    CoreTypes.afcFileRef = ref.types.uint64;
    CoreTypes.afcDirectoryRef = CoreTypes.voidPtr;
    CoreTypes.afcError = ref.types.uint32;
    CoreTypes.amDeviceRef = CoreTypes.voidPtr;
    CoreTypes.amDeviceNotificationRef = CoreTypes.voidPtr;
    CoreTypes.cfTimeInterval = ref.types.double;
    CoreTypes.kCFPropertyListXMLFormat_v1_0 = 100;
    CoreTypes.kCFPropertyListBinaryFormat_v1_0 = 200;
    CoreTypes.kCFPropertyListImmutable = 0;
    CoreTypes.am_device_notification = struct({
        unknown0: ref.types.uint32,
        unknown1: ref.types.uint32,
        unknown2: ref.types.uint32,
        callback: CoreTypes.voidPtr,
        cookie: ref.types.uint32
    });
    CoreTypes.am_device_notification_callback_info = struct({
        dev: CoreTypes.am_device_p,
        msg: ref.types.uint,
        subscription: ref.refType(CoreTypes.am_device_notification)
    });
    CoreTypes.am_device_notification_callback = ffi.Function("void", [ref.refType(CoreTypes.am_device_notification_callback_info), CoreTypes.voidPtr]);
    CoreTypes.am_device_install_application_callback = ffi.Function("void", [CoreTypes.cfDictionaryRef, CoreTypes.voidPtr]);
    CoreTypes.am_device_mount_image_callback = ffi.Function("void", [CoreTypes.voidPtr, CoreTypes.intType]);
    CoreTypes.cf_run_loop_timer_callback = ffi.Function("void", [CoreTypes.voidPtr, CoreTypes.voidPtr]);
    return CoreTypes;
})();
exports.CoreTypes = CoreTypes;
var IOSCore = (function () {
    function IOSCore($hostInfo) {
        this.$hostInfo = $hostInfo;
        this.cfDictionaryKeyCallBacks = struct({
            version: CoreTypes.uintType,
            retain: CoreTypes.voidPtr,
            release: CoreTypes.voidPtr,
            copyDescription: CoreTypes.voidPtr,
            equal: CoreTypes.voidPtr,
            hash: CoreTypes.voidPtr
        });
        this.cfDictionaryValueCallBacks = struct({
            version: CoreTypes.uintType,
            retain: CoreTypes.voidPtr,
            release: CoreTypes.voidPtr,
            copyDescription: CoreTypes.voidPtr,
            equal: CoreTypes.voidPtr
        });
        this.adjustDllSearchPath();
    }
    Object.defineProperty(IOSCore.prototype, "CoreFoundationDir", {
        get: function () {
            if (this.$hostInfo.isWindows) {
                return path.join(this.CommonProgramFilesPath, "Apple", "Apple Application Support");
            }
            else if (this.$hostInfo.isDarwin) {
                return "/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation";
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSCore.prototype, "MobileDeviceDir", {
        get: function () {
            if (this.$hostInfo.isWindows) {
                return path.join(this.CommonProgramFilesPath, "Apple", "Mobile Device Support");
            }
            else if (this.$hostInfo.isDarwin) {
                return "/System/Library/PrivateFrameworks/MobileDevice.framework/MobileDevice";
            }
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IOSCore.prototype, "CommonProgramFilesPath", {
        get: function () {
            return process.env.CommonProgramFiles;
        },
        enumerable: true,
        configurable: true
    });
    IOSCore.prototype.getForeignPointer = function (lib, name, type) {
        var pointer = lib.get(name);
        pointer.type = ref.refType(type);
        return pointer;
    };
    IOSCore.prototype.adjustDllSearchPath = function () {
        if (this.$hostInfo.isWindows) {
            process.env.PATH = this.CoreFoundationDir + ";" + process.env.PATH;
            process.env.PATH += ";" + this.MobileDeviceDir;
        }
    };
    IOSCore.prototype.getCoreFoundationLibrary = function () {
        var coreFoundationDll = this.$hostInfo.isWindows ? path.join(this.CoreFoundationDir, "CoreFoundation.dll") : this.CoreFoundationDir;
        var lib = ffi.DynamicLibrary(coreFoundationDll);
        return {
            "CFRunLoopRun": ffi.ForeignFunction(lib.get("CFRunLoopRun"), "void", []),
            "CFRunLoopStop": ffi.ForeignFunction(lib.get("CFRunLoopStop"), "void", [CoreTypes.voidPtr]),
            "CFRunLoopGetCurrent": ffi.ForeignFunction(lib.get("CFRunLoopGetCurrent"), CoreTypes.voidPtr, []),
            "CFStringCreateWithCString": ffi.ForeignFunction(lib.get("CFStringCreateWithCString"), CoreTypes.cfStringRef, [CoreTypes.voidPtr, "string", "uint"]),
            "CFDictionaryGetValue": ffi.ForeignFunction(lib.get("CFDictionaryGetValue"), CoreTypes.voidPtr, [CoreTypes.cfDictionaryRef, CoreTypes.cfStringRef]),
            "CFNumberGetValue": ffi.ForeignFunction(lib.get("CFNumberGetValue"), CoreTypes.boolType, [CoreTypes.voidPtr, "uint", CoreTypes.voidPtr]),
            "CFStringGetCStringPtr": ffi.ForeignFunction(lib.get("CFStringGetCStringPtr"), CoreTypes.charPtr, [CoreTypes.cfStringRef, "uint"]),
            "CFStringGetCString": ffi.ForeignFunction(lib.get("CFStringGetCString"), CoreTypes.boolType, [CoreTypes.cfStringRef, CoreTypes.charPtr, "uint", "uint"]),
            "CFStringGetLength": ffi.ForeignFunction(lib.get("CFStringGetLength"), "ulong", [CoreTypes.cfStringRef]),
            "CFDictionaryGetCount": ffi.ForeignFunction(lib.get("CFDictionaryGetCount"), CoreTypes.intType, [CoreTypes.cfDictionaryRef]),
            "CFDictionaryGetKeysAndValues": ffi.ForeignFunction(lib.get("CFDictionaryGetKeysAndValues"), "void", [CoreTypes.cfDictionaryRef, CoreTypes.ptrToVoidPtr, CoreTypes.ptrToVoidPtr]),
            "CFDictionaryCreate": ffi.ForeignFunction(lib.get("CFDictionaryCreate"), CoreTypes.cfDictionaryRef, [CoreTypes.voidPtr, CoreTypes.ptrToVoidPtr, CoreTypes.ptrToVoidPtr, "int", ref.refType(this.cfDictionaryKeyCallBacks), ref.refType(this.cfDictionaryValueCallBacks)]),
            "kCFTypeDictionaryKeyCallBacks": lib.get("kCFTypeDictionaryKeyCallBacks"),
            "kCFTypeDictionaryValueCallBacks": lib.get("kCFTypeDictionaryValueCallBacks"),
            "CFRunLoopRunInMode": ffi.ForeignFunction(lib.get("CFRunLoopRunInMode"), CoreTypes.intType, [CoreTypes.cfStringRef, CoreTypes.cfTimeInterval, CoreTypes.boolType]),
            "kCFRunLoopDefaultMode": this.getForeignPointer(lib, "kCFRunLoopDefaultMode", ref.types.void),
            "kCFRunLoopCommonModes": this.getForeignPointer(lib, "kCFRunLoopCommonModes", ref.types.void),
            "CFRunLoopTimerCreate": ffi.ForeignFunction(lib.get("CFRunLoopTimerCreate"), CoreTypes.voidPtr, [CoreTypes.voidPtr, CoreTypes.doubleType, CoreTypes.doubleType, CoreTypes.uintType, CoreTypes.uintType, CoreTypes.cf_run_loop_timer_callback, CoreTypes.voidPtr]),
            "CFRunLoopAddTimer": ffi.ForeignFunction(lib.get("CFRunLoopAddTimer"), "void", [CoreTypes.voidPtr, CoreTypes.voidPtr, CoreTypes.cfStringRef]),
            "CFRunLoopRemoveTimer": ffi.ForeignFunction(lib.get("CFRunLoopRemoveTimer"), "void", [CoreTypes.voidPtr, CoreTypes.voidPtr, CoreTypes.cfStringRef]),
            "CFAbsoluteTimeGetCurrent": ffi.ForeignFunction(lib.get("CFAbsoluteTimeGetCurrent"), CoreTypes.doubleType, []),
            "CFPropertyListCreateData": ffi.ForeignFunction(lib.get("CFPropertyListCreateData"), CoreTypes.voidPtr, [CoreTypes.voidPtr, CoreTypes.voidPtr, ref.types.long, ref.types.ulong, CoreTypes.voidPtr]),
            "CFPropertyListCreateWithData": ffi.ForeignFunction(lib.get("CFPropertyListCreateWithData"), CoreTypes.voidPtr, [CoreTypes.voidPtr, CoreTypes.voidPtr, ref.types.ulong, ref.refType(ref.types.long), CoreTypes.voidPtr]),
            "CFGetTypeID": ffi.ForeignFunction(lib.get("CFGetTypeID"), ref.types.long, [CoreTypes.voidPtr]),
            "CFStringGetTypeID": ffi.ForeignFunction(lib.get("CFStringGetTypeID"), ref.types.long, []),
            "CFDictionaryGetTypeID": ffi.ForeignFunction(lib.get("CFDictionaryGetTypeID"), ref.types.long, []),
            "CFDataGetTypeID": ffi.ForeignFunction(lib.get("CFDataGetTypeID"), ref.types.long, []),
            "CFNumberGetTypeID": ffi.ForeignFunction(lib.get("CFNumberGetTypeID"), ref.types.long, []),
            "CFBooleanGetTypeID": ffi.ForeignFunction(lib.get("CFBooleanGetTypeID"), ref.types.long, []),
            "CFArrayGetTypeID": ffi.ForeignFunction(lib.get("CFArrayGetTypeID"), ref.types.long, []),
            "CFDateGetTypeID": ffi.ForeignFunction(lib.get("CFDateGetTypeID"), ref.types.long, []),
            "CFSetGetTypeID": ffi.ForeignFunction(lib.get("CFSetGetTypeID"), ref.types.long, []),
            "CFDataGetBytePtr": ffi.ForeignFunction(lib.get("CFDataGetBytePtr"), ref.refType(ref.types.uint8), [CoreTypes.voidPtr]),
            "CFDataGetLength": ffi.ForeignFunction(lib.get("CFDataGetLength"), ref.types.long, [CoreTypes.voidPtr]),
            "CFDataCreate": ffi.ForeignFunction(lib.get("CFDataCreate"), CoreTypes.voidPtr, [CoreTypes.voidPtr, CoreTypes.voidPtr, ref.types.long]),
            "CFStringGetMaximumSizeForEncoding": ffi.ForeignFunction(lib.get("CFStringGetMaximumSizeForEncoding"), CoreTypes.intType, [CoreTypes.intType, CoreTypes.uint32Type])
        };
    };
    IOSCore.prototype.getMobileDeviceLibrary = function () {
        var mobileDeviceDll = this.$hostInfo.isWindows ? path.join(this.MobileDeviceDir, "MobileDevice.dll") : this.MobileDeviceDir;
        var lib = ffi.DynamicLibrary(mobileDeviceDll);
        return {
            "AMDeviceNotificationSubscribe": ffi.ForeignFunction(lib.get("AMDeviceNotificationSubscribe"), "uint", [CoreTypes.am_device_notification_callback, "uint", "uint", "uint", CoreTypes.ptrToVoidPtr]),
            "AMDeviceConnect": ffi.ForeignFunction(lib.get("AMDeviceConnect"), "uint", [CoreTypes.am_device_p]),
            "AMDeviceIsPaired": ffi.ForeignFunction(lib.get("AMDeviceIsPaired"), "uint", [CoreTypes.am_device_p]),
            "AMDevicePair": ffi.ForeignFunction(lib.get("AMDevicePair"), "uint", [CoreTypes.am_device_p]),
            "AMDeviceValidatePairing": ffi.ForeignFunction(lib.get("AMDeviceValidatePairing"), "uint", [CoreTypes.am_device_p]),
            "AMDeviceStartSession": ffi.ForeignFunction(lib.get("AMDeviceStartSession"), "uint", [CoreTypes.am_device_p]),
            "AMDeviceStopSession": ffi.ForeignFunction(lib.get("AMDeviceStopSession"), "uint", [CoreTypes.am_device_p]),
            "AMDeviceDisconnect": ffi.ForeignFunction(lib.get("AMDeviceDisconnect"), "uint", [CoreTypes.am_device_p]),
            "AMDeviceStartService": ffi.ForeignFunction(lib.get("AMDeviceStartService"), "uint", [CoreTypes.am_device_p, CoreTypes.cfStringRef, CoreTypes.intPtr, CoreTypes.voidPtr]),
            "AMDeviceTransferApplication": ffi.ForeignFunction(lib.get("AMDeviceTransferApplication"), "uint", ["int", CoreTypes.cfStringRef, CoreTypes.cfDictionaryRef, CoreTypes.am_device_install_application_callback, CoreTypes.voidPtr]),
            "AMDeviceInstallApplication": ffi.ForeignFunction(lib.get("AMDeviceInstallApplication"), "uint", ["int", CoreTypes.cfStringRef, CoreTypes.cfDictionaryRef, CoreTypes.am_device_install_application_callback, CoreTypes.voidPtr]),
            "AMDeviceLookupApplications": ffi.ForeignFunction(lib.get("AMDeviceLookupApplications"), CoreTypes.uintType, [CoreTypes.am_device_p, CoreTypes.uintType, ref.refType(CoreTypes.cfDictionaryRef)]),
            "AMDeviceUninstallApplication": ffi.ForeignFunction(lib.get("AMDeviceUninstallApplication"), "uint", ["int", CoreTypes.cfStringRef, CoreTypes.cfDictionaryRef, CoreTypes.am_device_install_application_callback, CoreTypes.voidPtr]),
            "AMDeviceStartHouseArrestService": ffi.ForeignFunction(lib.get("AMDeviceStartHouseArrestService"), CoreTypes.intType, [CoreTypes.am_device_p, CoreTypes.cfStringRef, CoreTypes.voidPtr, CoreTypes.intPtr, CoreTypes.voidPtr]),
            "AFCConnectionOpen": ffi.ForeignFunction(lib.get("AFCConnectionOpen"), "uint", ["int", "uint", ref.refType(CoreTypes.afcConnectionRef)]),
            "AFCConnectionClose": ffi.ForeignFunction(lib.get("AFCConnectionClose"), "uint", [CoreTypes.afcConnectionRef]),
            "AFCDirectoryCreate": ffi.ForeignFunction(lib.get("AFCDirectoryCreate"), "uint", [CoreTypes.afcConnectionRef, "string"]),
            "AFCFileInfoOpen": ffi.ForeignFunction(lib.get("AFCFileInfoOpen"), "uint", [CoreTypes.afcConnectionRef, "string", CoreTypes.cfDictionaryRef]),
            "AFCFileRefOpen": (this.$hostInfo.isDarwin || process.arch === "x64") ? ffi.ForeignFunction(lib.get("AFCFileRefOpen"), "uint", [CoreTypes.afcConnectionRef, "string", "uint", ref.refType(CoreTypes.afcFileRef)]) : ffi.ForeignFunction(lib.get("AFCFileRefOpen"), "uint", [CoreTypes.afcConnectionRef, "string", "uint", "uint", ref.refType(CoreTypes.afcFileRef)]),
            "AFCFileRefClose": ffi.ForeignFunction(lib.get("AFCFileRefClose"), "uint", [CoreTypes.afcConnectionRef, CoreTypes.afcFileRef]),
            "AFCFileRefWrite": ffi.ForeignFunction(lib.get("AFCFileRefWrite"), "uint", [CoreTypes.afcConnectionRef, CoreTypes.afcFileRef, CoreTypes.voidPtr, "uint"]),
            "AFCFileRefRead": ffi.ForeignFunction(lib.get("AFCFileRefRead"), "uint", [CoreTypes.afcConnectionRef, CoreTypes.afcFileRef, CoreTypes.voidPtr, CoreTypes.uintPtr]),
            "AFCRemovePath": ffi.ForeignFunction(lib.get("AFCRemovePath"), "uint", [CoreTypes.afcConnectionRef, "string"]),
            "AFCDirectoryOpen": ffi.ForeignFunction(lib.get("AFCDirectoryOpen"), CoreTypes.afcError, [CoreTypes.afcConnectionRef, "string", ref.refType(CoreTypes.afcDirectoryRef)]),
            "AFCDirectoryRead": ffi.ForeignFunction(lib.get("AFCDirectoryRead"), CoreTypes.afcError, [CoreTypes.afcConnectionRef, CoreTypes.afcDirectoryRef, ref.refType(CoreTypes.charPtr)]),
            "AFCDirectoryClose": ffi.ForeignFunction(lib.get("AFCDirectoryClose"), CoreTypes.afcError, [CoreTypes.afcConnectionRef, CoreTypes.afcDirectoryRef]),
            "AMDeviceCopyDeviceIdentifier": ffi.ForeignFunction(lib.get("AMDeviceCopyDeviceIdentifier"), CoreTypes.cfStringRef, [CoreTypes.am_device_p]),
            "AMDeviceCopyValue": ffi.ForeignFunction(lib.get("AMDeviceCopyValue"), CoreTypes.cfStringRef, [CoreTypes.am_device_p, CoreTypes.cfStringRef, CoreTypes.cfStringRef]),
            "AMDeviceNotificationUnsubscribe": ffi.ForeignFunction(lib.get("AMDeviceNotificationUnsubscribe"), CoreTypes.intType, [CoreTypes.amDeviceNotificationRef]),
            "AMDeviceMountImage": this.$hostInfo.isDarwin ? ffi.ForeignFunction(lib.get("AMDeviceMountImage"), CoreTypes.uintType, [CoreTypes.am_device_p, CoreTypes.cfStringRef, CoreTypes.cfDictionaryRef, CoreTypes.am_device_mount_image_callback, CoreTypes.voidPtr]) : null,
            "AMDSetLogLevel": ffi.ForeignFunction(lib.get("AMDSetLogLevel"), CoreTypes.intType, [CoreTypes.intType]),
            "AMDeviceGetInterfaceType": ffi.ForeignFunction(lib.get("AMDeviceGetInterfaceType"), CoreTypes.longType, [CoreTypes.am_device_p]),
            "AMDeviceGetConnectionID": ffi.ForeignFunction(lib.get("AMDeviceGetConnectionID"), CoreTypes.longType, [CoreTypes.am_device_p]),
            "USBMuxConnectByPort": ffi.ForeignFunction(lib.get("USBMuxConnectByPort"), CoreTypes.intType, [CoreTypes.intType, CoreTypes.intType, CoreTypes.intPtr])
        };
    };
    IOSCore.getWinSocketLibrary = function () {
        var winSocketDll = path.join(process.env.SystemRoot, "System32", "ws2_32.dll");
        return ffi.Library(winSocketDll, {
            "closesocket": ["int", ["uint"]],
            "recv": ["int", ["uint", CoreTypes.charPtr, "int", "int"]],
            "send": ["int", ["uint", CoreTypes.charPtr, "int", "int"]],
            "setsockopt": ["int", ["uint", "int", "int", CoreTypes.voidPtr, "int"]],
            "WSAGetLastError": ["int", []]
        });
    };
    IOSCore.kCFStringEncodingUTF8 = 0x08000100;
    return IOSCore;
})();
$injector.register("iOSCore", IOSCore);
var CoreFoundation = (function () {
    function CoreFoundation($iOSCore, $errors) {
        this.$errors = $errors;
        this.coreFoundationLibrary = $iOSCore.getCoreFoundationLibrary();
    }
    CoreFoundation.prototype.stringGetMaximumSizeForEncoding = function (len, encoding) {
        return this.coreFoundationLibrary.CFStringGetMaximumSizeForEncoding(len, encoding);
    };
    CoreFoundation.prototype.runLoopRun = function () {
        this.coreFoundationLibrary.CFRunLoopRun();
    };
    CoreFoundation.prototype.runLoopGetCurrent = function () {
        return this.coreFoundationLibrary.CFRunLoopGetCurrent();
    };
    CoreFoundation.prototype.kCFRunLoopCommonModes = function () {
        return this.coreFoundationLibrary.kCFRunLoopCommonModes.deref();
    };
    CoreFoundation.prototype.kCFRunLoopDefaultMode = function () {
        return this.coreFoundationLibrary.kCFRunLoopDefaultMode.deref();
    };
    CoreFoundation.prototype.kCFTypeDictionaryValueCallBacks = function () {
        return this.coreFoundationLibrary.kCFTypeDictionaryValueCallBacks;
    };
    CoreFoundation.prototype.kCFTypeDictionaryKeyCallBacks = function () {
        return this.coreFoundationLibrary.kCFTypeDictionaryKeyCallBacks;
    };
    CoreFoundation.prototype.runLoopTimerCreate = function (allocator, fireDate, interval, flags, order, callout, context) {
        return this.coreFoundationLibrary.CFRunLoopTimerCreate(allocator, fireDate, interval, flags, order, callout, context);
    };
    CoreFoundation.prototype.absoluteTimeGetCurrent = function () {
        return this.coreFoundationLibrary.CFAbsoluteTimeGetCurrent();
    };
    CoreFoundation.prototype.runLoopAddTimer = function (r1, timer, mode) {
        this.coreFoundationLibrary.CFRunLoopAddTimer(r1, timer, mode);
    };
    CoreFoundation.prototype.runLoopRemoveTimer = function (r1, timer, mode) {
        this.coreFoundationLibrary.CFRunLoopRemoveTimer(r1, timer, mode);
    };
    CoreFoundation.prototype.runLoopStop = function (r1) {
        this.coreFoundationLibrary.CFRunLoopStop(r1);
    };
    CoreFoundation.prototype.stringGetCStringPtr = function (theString, encoding) {
        return this.coreFoundationLibrary.CFStringGetCStringPtr(theString, encoding);
    };
    CoreFoundation.prototype.stringGetLength = function (theString) {
        return this.coreFoundationLibrary.CFStringGetLength(theString);
    };
    CoreFoundation.prototype.stringGetCString = function (theString, buffer, bufferSize, encoding) {
        return this.coreFoundationLibrary.CFStringGetCString(theString, buffer, bufferSize, encoding);
    };
    CoreFoundation.prototype.stringCreateWithCString = function (alloc, str, encoding) {
        return this.coreFoundationLibrary.CFStringCreateWithCString(alloc, str, encoding);
    };
    CoreFoundation.prototype.createCFString = function (str) {
        return this.stringCreateWithCString(null, str, IOSCore.kCFStringEncodingUTF8);
    };
    CoreFoundation.prototype.dictionaryCreate = function (allocator, keys, values, count, dictionaryKeyCallbacks, dictionaryValueCallbacks) {
        return this.coreFoundationLibrary.CFDictionaryCreate(allocator, keys, values, count, dictionaryKeyCallbacks, dictionaryValueCallbacks);
    };
    CoreFoundation.prototype.dictionaryGetValue = function (theDict, value) {
        return this.coreFoundationLibrary.CFDictionaryGetValue(theDict, value);
    };
    CoreFoundation.prototype.dictionaryGetCount = function (theDict) {
        return this.coreFoundationLibrary.CFDictionaryGetCount(theDict);
    };
    CoreFoundation.prototype.dictionaryGetKeysAndValues = function (dictionary, keys, values) {
        this.coreFoundationLibrary.CFDictionaryGetKeysAndValues(dictionary, keys, values);
    };
    CoreFoundation.prototype.dictionaryGetTypeID = function () {
        return this.coreFoundationLibrary.CFDictionaryGetTypeID();
    };
    CoreFoundation.prototype.numberGetValue = function (num, theType, valuePtr) {
        return this.coreFoundationLibrary.CFNumberGetValue(num, theType, valuePtr);
    };
    CoreFoundation.prototype.getTypeID = function (buffer) {
        return this.coreFoundationLibrary.CFGetTypeID(buffer);
    };
    CoreFoundation.prototype.propertyListCreateData = function (allocator, propertyListRef, propertyListFormat, optionFlags, error) {
        return this.coreFoundationLibrary.CFPropertyListCreateData(allocator, propertyListRef, propertyListFormat, optionFlags, error);
    };
    CoreFoundation.prototype.propertyListCreateWithData = function (allocator, propertyList, optionFlags, propertyListFormat, error) {
        return this.coreFoundationLibrary.CFPropertyListCreateWithData(allocator, propertyList, optionFlags, propertyListFormat, error);
    };
    CoreFoundation.prototype.stringGetTypeID = function () {
        return this.coreFoundationLibrary.CFStringGetTypeID();
    };
    CoreFoundation.prototype.dataGetTypeID = function () {
        return this.coreFoundationLibrary.CFDataGetTypeID();
    };
    CoreFoundation.prototype.numberGetTypeID = function () {
        return this.coreFoundationLibrary.CFNumberGetTypeID();
    };
    CoreFoundation.prototype.booleanGetTypeID = function () {
        return this.coreFoundationLibrary.CFBooleanGetTypeID();
    };
    CoreFoundation.prototype.arrayGetTypeID = function () {
        return this.coreFoundationLibrary.CFArrayGetTypeID();
    };
    CoreFoundation.prototype.dateGetTypeID = function () {
        return this.coreFoundationLibrary.CFDateGetTypeID();
    };
    CoreFoundation.prototype.setGetTypeID = function () {
        return this.coreFoundationLibrary.CFSetGetTypeID();
    };
    CoreFoundation.prototype.dataGetBytePtr = function (buffer) {
        return this.coreFoundationLibrary.CFDataGetBytePtr(buffer);
    };
    CoreFoundation.prototype.dataGetLength = function (buffer) {
        return this.coreFoundationLibrary.CFDataGetLength(buffer);
    };
    CoreFoundation.prototype.dataCreate = function (allocator, data, length) {
        return this.coreFoundationLibrary.CFDataCreate(allocator, data, length);
    };
    CoreFoundation.prototype.convertCFStringToCString = function (cfstr) {
        var result;
        if (cfstr != null) {
            var rawData = this.stringGetCStringPtr(cfstr, IOSCore.kCFStringEncodingUTF8);
            if (ref.address(rawData) === 0) {
                var cfstrLength = this.stringGetLength(cfstr);
                var length_1 = cfstrLength + 1;
                var stringBuffer = new Buffer(length_1);
                var status_1 = this.stringGetCString(cfstr, stringBuffer, length_1, IOSCore.kCFStringEncodingUTF8);
                if (status_1) {
                    result = stringBuffer.toString("utf8", 0, cfstrLength);
                }
            }
            else {
                result = ref.readCString(rawData, 0);
            }
        }
        return result;
    };
    CoreFoundation.prototype.cfTypeFrom = function (value) {
        var keys = _.keys(value);
        var values = _.values(value);
        var len = keys.length;
        var keysBuffer = new Buffer(CoreTypes.pointerSize * len);
        var valuesBuffer = new Buffer(CoreTypes.pointerSize * len);
        var offset = 0;
        for (var i = 0; i < len; i++) {
            var cfKey = this.createCFString(keys[i]);
            var cfValue = void 0;
            if (typeof values[i] === "string") {
                cfValue = this.createCFString(values[i]);
            }
            else if (values[i] instanceof Buffer) {
                cfValue = this.dataCreate(null, values[i], values[i].length);
            }
            else {
                cfValue = this.cfTypeFrom(values[i]);
            }
            ref.writePointer(keysBuffer, offset, cfKey);
            ref.writePointer(valuesBuffer, offset, cfValue);
            offset += CoreTypes.pointerSize;
        }
        return this.dictionaryCreate(null, keysBuffer, valuesBuffer, len, this.kCFTypeDictionaryKeyCallBacks(), this.kCFTypeDictionaryValueCallBacks());
    };
    CoreFoundation.prototype.cfTypeTo = function (dataRef) {
        var typeId = this.getTypeID(dataRef);
        if (typeId === this.stringGetTypeID()) {
            return this.convertCFStringToCString(dataRef);
        }
        else if (typeId === this.dataGetTypeID()) {
            var len = this.dataGetLength(dataRef);
            var retval = ref.reinterpret(this.dataGetBytePtr(dataRef), len);
            return retval;
        }
        else if (typeId === this.dictionaryGetTypeID()) {
            var count = this.dictionaryGetCount(dataRef);
            var keys = new Buffer(count * CoreTypes.pointerSize);
            var values = new Buffer(count * CoreTypes.pointerSize);
            this.dictionaryGetKeysAndValues(dataRef, keys, values);
            var jsDictionary = Object.create(null);
            var offset = 0;
            for (var i = 0; i < count; i++) {
                var keyPointer = ref.readPointer(keys, offset, CoreTypes.pointerSize);
                var valuePointer = ref.readPointer(values, offset, CoreTypes.pointerSize);
                offset += CoreTypes.pointerSize;
                var jsKey = this.cfTypeTo(keyPointer);
                var jsValue = this.cfTypeTo(valuePointer);
                jsDictionary[jsKey] = jsValue;
            }
            return jsDictionary;
        }
        else {
            return "";
        }
    };
    CoreFoundation.prototype.dictToPlistEncoding = function (dict, format) {
        var cfDict = this.cfTypeFrom(dict);
        var cfData = this.propertyListCreateData(null, cfDict, format, 0, null);
        return this.cfTypeTo(cfData);
    };
    CoreFoundation.prototype.dictFromPlistEncoding = function (str) {
        var retval = null;
        var cfData = this.dataCreate(null, str, str.length);
        if (cfData) {
            var cfDict = this.propertyListCreateWithData(null, cfData, CoreTypes.kCFPropertyListImmutable, null, null);
            if (cfDict) {
                retval = this.cfTypeTo(cfDict);
            }
        }
        return retval;
    };
    return CoreFoundation;
})();
exports.CoreFoundation = CoreFoundation;
$injector.register("coreFoundation", CoreFoundation);
var MobileDevice = (function () {
    function MobileDevice($iOSCore, $errors, $hostInfo) {
        this.$errors = $errors;
        this.$hostInfo = $hostInfo;
        this.mobileDeviceLibrary = $iOSCore.getMobileDeviceLibrary();
    }
    MobileDevice.prototype.deviceNotificationSubscribe = function (notificationCallback, p1, p2, p3, callbackSignature) {
        return this.mobileDeviceLibrary.AMDeviceNotificationSubscribe(notificationCallback, p1, p2, p3, callbackSignature);
    };
    MobileDevice.prototype.deviceCopyDeviceIdentifier = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceCopyDeviceIdentifier(devicePointer);
    };
    MobileDevice.prototype.deviceCopyValue = function (devicePointer, domain, name) {
        return this.mobileDeviceLibrary.AMDeviceCopyValue(devicePointer, domain, name);
    };
    MobileDevice.prototype.deviceConnect = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceConnect(devicePointer);
    };
    MobileDevice.prototype.deviceIsPaired = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceIsPaired(devicePointer);
    };
    MobileDevice.prototype.devicePair = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDevicePair(devicePointer);
    };
    MobileDevice.prototype.deviceValidatePairing = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceValidatePairing(devicePointer);
    };
    MobileDevice.prototype.deviceStartSession = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceStartSession(devicePointer);
    };
    MobileDevice.prototype.deviceStopSession = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceStopSession(devicePointer);
    };
    MobileDevice.prototype.deviceDisconnect = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceDisconnect(devicePointer);
    };
    MobileDevice.prototype.deviceStartService = function (devicePointer, serviceName, socketNumber) {
        return this.mobileDeviceLibrary.AMDeviceStartService(devicePointer, serviceName, socketNumber, null);
    };
    MobileDevice.prototype.deviceTransferApplication = function (service, packageFile, options, installationCallback) {
        return this.mobileDeviceLibrary.AMDeviceTransferApplication(service, packageFile, options, installationCallback, null);
    };
    MobileDevice.prototype.deviceInstallApplication = function (service, packageFile, options, installationCallback) {
        return this.mobileDeviceLibrary.AMDeviceInstallApplication(service, packageFile, options, installationCallback, null);
    };
    MobileDevice.prototype.deviceUninstallApplication = function (service, bundleId, options, callback) {
        return this.mobileDeviceLibrary.AMDeviceUninstallApplication(service, bundleId, options, callback, null);
    };
    MobileDevice.prototype.deviceStartHouseArrestService = function (devicePointer, bundleId, options, fdRef) {
        return this.mobileDeviceLibrary.AMDeviceStartHouseArrestService(devicePointer, bundleId, options, fdRef, null);
    };
    MobileDevice.prototype.deviceMountImage = function (devicePointer, imagePath, options, mountCallBack) {
        if (this.$hostInfo.isDarwin) {
            return this.mobileDeviceLibrary.AMDeviceMountImage(devicePointer, imagePath, options, mountCallBack, null);
        }
        this.$errors.fail("AMDeviceMountImage is exported only on Darwin OS");
    };
    MobileDevice.prototype.deviceLookupApplications = function (devicePointer, appType, result) {
        return this.mobileDeviceLibrary.AMDeviceLookupApplications(devicePointer, appType, result);
    };
    MobileDevice.prototype.deviceGetInterfaceType = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceGetInterfaceType(devicePointer);
    };
    MobileDevice.prototype.deviceGetConnectionId = function (devicePointer) {
        return this.mobileDeviceLibrary.AMDeviceGetConnectionID(devicePointer);
    };
    MobileDevice.prototype.afcConnectionOpen = function (service, timeout, afcConnection) {
        return this.mobileDeviceLibrary.AFCConnectionOpen(service, timeout, afcConnection);
    };
    MobileDevice.prototype.afcConnectionClose = function (afcConnection) {
        return this.mobileDeviceLibrary.AFCConnectionClose(afcConnection);
    };
    MobileDevice.prototype.afcDirectoryCreate = function (afcConnection, path) {
        return this.mobileDeviceLibrary.AFCDirectoryCreate(afcConnection, path);
    };
    MobileDevice.prototype.afcFileInfoOpen = function (afcConnection, path, afcDirectory) {
        return this.mobileDeviceLibrary.AFCFileInfoOpen(afcConnection, path, afcDirectory);
    };
    MobileDevice.prototype.afcFileRefOpen = function (afcConnection, path, mode, afcFileRef) {
        if (this.$hostInfo.isWindows && process.arch === "ia32") {
            return this.mobileDeviceLibrary.AFCFileRefOpen(afcConnection, path, mode, 0, afcFileRef);
        }
        else if (this.$hostInfo.isDarwin || process.arch === "x64") {
            return this.mobileDeviceLibrary.AFCFileRefOpen(afcConnection, path, mode, afcFileRef);
        }
    };
    MobileDevice.prototype.afcFileRefClose = function (afcConnection, afcFileRef) {
        return this.mobileDeviceLibrary.AFCFileRefClose(afcConnection, afcFileRef);
    };
    MobileDevice.prototype.afcFileRefWrite = function (afcConnection, afcFileRef, buffer, byteLength) {
        return this.mobileDeviceLibrary.AFCFileRefWrite(afcConnection, afcFileRef, buffer, byteLength);
    };
    MobileDevice.prototype.afcFileRefRead = function (afcConnection, afcFileRef, buffer, byteLength) {
        return this.mobileDeviceLibrary.AFCFileRefRead(afcConnection, afcFileRef, buffer, byteLength);
    };
    MobileDevice.prototype.afcRemovePath = function (afcConnection, path) {
        return this.mobileDeviceLibrary.AFCRemovePath(afcConnection, path);
    };
    MobileDevice.prototype.afcDirectoryOpen = function (afcConnection, path, afcDirectory) {
        return this.mobileDeviceLibrary.AFCDirectoryOpen(afcConnection, path, afcDirectory);
    };
    MobileDevice.prototype.afcDirectoryRead = function (afcConnection, afcDirectory, name) {
        return this.mobileDeviceLibrary.AFCDirectoryRead(afcConnection, afcDirectory, name);
    };
    MobileDevice.prototype.afcDirectoryClose = function (afcConnection, afcDirectory) {
        return this.mobileDeviceLibrary.AFCDirectoryClose(afcConnection, afcDirectory);
    };
    MobileDevice.prototype.isDataReceivingCompleted = function (reply) {
        return reply.Status && reply.Complete && !reply.PercentComplete;
    };
    MobileDevice.prototype.setLogLevel = function (logLevel) {
        return this.mobileDeviceLibrary.AMDSetLogLevel(logLevel);
    };
    MobileDevice.prototype.uSBMuxConnectByPort = function (connectionId, port, socketRef) {
        return this.mobileDeviceLibrary.USBMuxConnectByPort(connectionId, port, socketRef);
    };
    return MobileDevice;
})();
exports.MobileDevice = MobileDevice;
$injector.register("mobileDevice", MobileDevice);
var WinSocket = (function () {
    function WinSocket(service, format, $logger, $errors, $childProcess, $staticConfig) {
        this.service = service;
        this.format = format;
        this.$logger = $logger;
        this.$errors = $errors;
        this.$childProcess = $childProcess;
        this.$staticConfig = $staticConfig;
        this.winSocketLibrary = null;
        this.winSocketLibrary = IOSCore.getWinSocketLibrary();
    }
    WinSocket.prototype.read = function (bytes) {
        var _this = this;
        var data = new Buffer(bytes);
        var result;
        helpers.block(function () {
            result = _this.winSocketLibrary.recv(_this.service, data, bytes, 0);
        });
        if (result < 0) {
            this.$errors.fail("Error receiving data: %s", result);
        }
        else if (result === 0) {
            return null;
        }
        return data;
    };
    WinSocket.prototype.readSystemLogBlocking = function () {
        var data = this.read(WinSocket.BYTES_TO_READ);
        while (data) {
            var output = ref.readCString(data, 0);
            process.send(output);
            data = this.read(WinSocket.BYTES_TO_READ);
        }
        this.close();
    };
    WinSocket.prototype.readSystemLog = function (printData) {
        var serviceArg = this.service || '';
        var formatArg = this.format || '';
        var sysLog = this.$childProcess.fork(path.join(__dirname, "ios-sys-log.js"), [this.$staticConfig.PATH_TO_BOOTSTRAP, serviceArg.toString(), formatArg.toString()], { silent: true });
        sysLog.on('message', function (data) {
            printData(data);
        });
    };
    WinSocket.prototype.receiveMessage = function () {
        var _this = this;
        return (function () {
            var message = _this.receiveMessageCore();
            if (_this.format === CoreTypes.kCFPropertyListXMLFormat_v1_0) {
                var reply = plist.parse(message);
                return reply;
            }
            return null;
        }).future()();
    };
    WinSocket.prototype.sendMessage = function (data) {
        var message = null;
        if (typeof (data) === "string") {
            message = new Buffer(data);
        }
        else {
            var payload = new Buffer(plistlib.toString(this.createPlist(data)));
            var packed = bufferpack.pack(">i", [payload.length]);
            message = Buffer.concat([packed, payload]);
        }
        var writtenBytes = this.sendCore(message);
        this.$logger.debug("WinSocket-> sending message: '%s', written bytes: '%s'", message.toString(), writtenBytes.toString());
        this.$errors.verifyHeap("sendMessage");
    };
    WinSocket.prototype.sendAll = function (data) {
        while (data.length !== 0) {
            var result = this.sendCore(data);
            if (result < 0) {
                this.$errors.fail("Error sending data: %s", result);
            }
            data = data.slice(result);
        }
    };
    WinSocket.prototype.receiveAll = function (handler) {
        var data = this.read(WinSocket.BYTES_TO_READ);
        while (data) {
            handler(data);
            data = this.read(WinSocket.BYTES_TO_READ);
        }
        this.close();
    };
    WinSocket.prototype.exchange = function (message) {
        this.sendMessage(message);
        return this.receiveMessage();
    };
    WinSocket.prototype.close = function () {
        this.winSocketLibrary.closesocket(this.service);
        this.$errors.verifyHeap("socket close");
    };
    WinSocket.prototype.receiveMessageCore = function () {
        var data = this.read(4);
        var reply = "";
        if (data !== null && data.length === 4) {
            var l = bufferpack.unpack(">i", data)[0];
            var left = l;
            while (left > 0) {
                var r = this.read(left);
                if (r === null) {
                    this.$errors.fail("Unable to read reply");
                }
                reply += r;
                left -= r.length;
            }
        }
        var result = reply.toString();
        this.$errors.verifyHeap("receiveMessage");
        return result;
    };
    WinSocket.prototype.sendCore = function (data) {
        var writtenBytes = this.winSocketLibrary.send(this.service, data, data.length, 0);
        this.$logger.debug("WinSocket-> sendCore: writtenBytes '%s'", writtenBytes);
        return writtenBytes;
    };
    WinSocket.prototype.createPlist = function (data) {
        var keys = _.keys(data);
        var values = _.values(data);
        var plistData = { type: "dict", value: {} };
        for (var i = 0; i < keys.length; i++) {
            var type = "";
            var value = void 0;
            if (values[i] instanceof Buffer) {
                type = "data";
                value = values[i].toString("base64");
            }
            else if (values[i] instanceof Object) {
                type = "dict";
                value = {};
            }
            else if (typeof (values[i]) === "number") {
                type = "integer";
                value = values[i];
            }
            else {
                type = "string";
                value = values[i];
            }
            plistData.value[keys[i]] = { type: type, value: value };
        }
        this.$logger.trace("created plist: '%s'", plistData.toString());
        return plistData;
    };
    WinSocket.BYTES_TO_READ = 1024;
    return WinSocket;
})();
exports.WinSocket = WinSocket;
var ReadState;
(function (ReadState) {
    ReadState[ReadState["Length"] = 0] = "Length";
    ReadState[ReadState["Plist"] = 1] = "Plist";
})(ReadState || (ReadState = {}));
var PosixSocket = (function () {
    function PosixSocket(service, format, $coreFoundation, $mobileDevice, $logger, $errors) {
        this.format = format;
        this.$coreFoundation = $coreFoundation;
        this.$mobileDevice = $mobileDevice;
        this.$logger = $logger;
        this.$errors = $errors;
        this.socket = null;
        this.buffer = new Buffer(0);
        this.state = ReadState.Length;
        this.length = 4;
        this.socket = new net.Socket({ fd: service });
    }
    PosixSocket.prototype.receiveMessage = function () {
        var _this = this;
        var result = new Future();
        this.socket
            .on("data", function (data) {
            _this.buffer = Buffer.concat([_this.buffer, data]);
            if (_this.format === CoreTypes.kCFPropertyListBinaryFormat_v1_0) {
                try {
                    while (_this.buffer.length >= _this.length) {
                        switch (_this.state) {
                            case ReadState.Length:
                                _this.length = _this.buffer.readInt32BE(0);
                                _this.buffer = _this.buffer.slice(4);
                                _this.state = ReadState.Plist;
                                break;
                            case ReadState.Plist:
                                try {
                                    var plistBuffer = _this.buffer.slice(0, _this.length);
                                    var message = bplistParser.parseBuffer(plistBuffer);
                                    _this.$logger.trace("MESSAGE RECEIVING");
                                    _this.$logger.trace(message);
                                    try {
                                        if (message && typeof (message) === "object" && message[0]) {
                                            message = message[0];
                                            var output = "";
                                            if (message.Status) {
                                                output += util.format("Status: %s", message.Status);
                                            }
                                            if (message.PercentComplete) {
                                                output += util.format(" PercentComplete: %s", message.PercentComplete);
                                            }
                                            _this.$logger.out(output);
                                            var errorMessage = "";
                                            if (message.Error) {
                                                errorMessage += "Error: " + message.Error + " " + os_1.EOL;
                                            }
                                            if (message.ErrorDescription) {
                                                errorMessage += "ErrorDescription: " + message.ErrorDescription + " " + os_1.EOL;
                                            }
                                            if (message.ErrorDetail) {
                                                errorMessage += "ErrorDetail: " + message.ErrorDetail + " " + os_1.EOL;
                                            }
                                            if (errorMessage && !result.isResolved()) {
                                                result.throw(new Error(errorMessage));
                                            }
                                            if (message.Status && message.Status === "Complete") {
                                                if (!result.isResolved()) {
                                                    result.return(message);
                                                }
                                            }
                                            var status_2 = message[0].Status;
                                            var percentComplete = message[0].PercentComplete;
                                            _this.$logger.trace("Status: " + status_2 + " PercentComplete: " + percentComplete);
                                        }
                                    }
                                    catch (e) {
                                        _this.$logger.trace("Failed to retreive state: " + e);
                                    }
                                }
                                catch (e) {
                                    _this.$logger.trace("Failed to parse bplist: " + e);
                                }
                                _this.buffer = _this.buffer.slice(_this.length);
                                _this.state = ReadState.Length;
                                _this.length = 4;
                                break;
                        }
                    }
                }
                catch (e) {
                    _this.$logger.trace("Exception thrown: " + e);
                }
            }
            else if (_this.format === CoreTypes.kCFPropertyListXMLFormat_v1_0) {
                var parsedData = {};
                try {
                    parsedData = plist.parse(_this.buffer.toString());
                }
                catch (e) {
                    _this.$logger.trace("An error has occured: " + e.toString());
                }
                if (!result.isResolved()) {
                    result.return(parsedData);
                }
            }
        })
            .on("error", function (error) {
            if (!result.isResolved()) {
                result.throw(error);
            }
        });
        return result;
    };
    PosixSocket.prototype.readSystemLog = function (action) {
        var _this = this;
        this.socket
            .on("data", function (data) {
            var output = ref.readCString(data, 0);
            action(output);
        })
            .on("end", function () {
            _this.close();
            _this.$errors.verifyHeap("readSystemLog");
        })
            .on("error", function (error) {
            _this.$errors.fail(error);
        });
    };
    PosixSocket.prototype.sendMessage = function (message, format) {
        if (typeof (message) === "string") {
            this.socket.write(message);
        }
        else {
            var data = this.$coreFoundation.dictToPlistEncoding(message, format);
            var payload = bufferpack.pack(">i", [data.length]);
            this.$logger.trace("PlistService sending: ");
            this.$logger.trace(data.toString());
            this.socket.write(payload);
            this.socket.write(data);
        }
        this.$errors.verifyHeap("sendMessage");
    };
    PosixSocket.prototype.receiveAll = function (handler) {
        this.socket.on('data', handler);
    };
    PosixSocket.prototype.exchange = function (message) {
        this.$errors.fail("Exchange function is not implemented for OSX");
        return null;
    };
    PosixSocket.prototype.close = function () {
        this.socket.destroy();
        this.$errors.verifyHeap("socket close");
    };
    return PosixSocket;
})();
var PlistService = (function () {
    function PlistService(service, format, $injector, $hostInfo) {
        this.service = service;
        this.format = format;
        this.$injector = $injector;
        this.$hostInfo = $hostInfo;
        this.socket = null;
        if (this.$hostInfo.isWindows) {
            this.socket = this.$injector.resolve(WinSocket, { service: this.service, format: this.format });
        }
        else if (this.$hostInfo.isDarwin) {
            this.socket = this.$injector.resolve(PosixSocket, { service: this.service, format: this.format });
        }
    }
    PlistService.prototype.receiveMessage = function () {
        return this.socket.receiveMessage();
    };
    PlistService.prototype.readSystemLog = function (action) {
        this.socket.readSystemLog(action);
    };
    PlistService.prototype.sendMessage = function (message) {
        this.socket.sendMessage(message, this.format);
    };
    PlistService.prototype.exchange = function (message) {
        return this.socket.exchange(message);
    };
    PlistService.prototype.close = function () {
        this.socket.close();
    };
    PlistService.prototype.sendAll = function (data) {
        this.socket.sendAll(data);
    };
    PlistService.prototype.receiveAll = function (handler) {
        if (this.socket.receiveAll) {
            this.socket.receiveAll(handler);
        }
    };
    return PlistService;
})();
exports.PlistService = PlistService;
function getCharacterCodePoint(ch) {
    assert.equal(ch.length, 1);
    var code = ch.charCodeAt(0);
    assert.ok(!(0xD800 <= code && code <= 0xffff));
    return code;
}
var GDBStandardOutputAdapter = (function (_super) {
    __extends(GDBStandardOutputAdapter, _super);
    function GDBStandardOutputAdapter(opts) {
        _super.call(this, opts);
        this.utf8StringDecoder = new string_decoder.StringDecoder("utf8");
    }
    GDBStandardOutputAdapter.prototype._transform = function (packet, encoding, done) {
        try {
            var result = "";
            for (var i = 0; i < packet.length; i++) {
                if (packet[i] === getCharacterCodePoint("$")) {
                    var start = ++i;
                    while (packet[i] !== getCharacterCodePoint("#")) {
                        i++;
                    }
                    var end = i;
                    i++;
                    i++;
                    if (!(packet[start] === getCharacterCodePoint("O") && packet[start + 1] !== getCharacterCodePoint("K"))) {
                        continue;
                    }
                    start++;
                    var hexString = packet.toString("ascii", start, end);
                    var hex = new Buffer(hexString, "hex");
                    result += this.utf8StringDecoder.write(hex);
                }
            }
            done(null, result);
        }
        catch (e) {
            done(e);
        }
    };
    return GDBStandardOutputAdapter;
})(stream.Transform);
var GDBSignalWatcher = (function (_super) {
    __extends(GDBSignalWatcher, _super);
    function GDBSignalWatcher(opts) {
        _super.call(this, opts);
    }
    GDBSignalWatcher.prototype._write = function (packet, encoding, callback) {
        try {
            for (var i = 0; i < packet.length - 2; i++) {
                if (packet[i] === getCharacterCodePoint("$") && (packet[i + 1] === getCharacterCodePoint("T") || packet[i + 1] === getCharacterCodePoint("S"))) {
                    if (packet[i + 2] === getCharacterCodePoint("9")) {
                        process.exit(1);
                    }
                }
            }
            callback(null);
        }
        catch (e) {
            callback(e);
        }
    };
    return GDBSignalWatcher;
})(stream.Writable);
var GDBServer = (function () {
    function GDBServer(socket, $injector, $hostInfo, $options, $logger, $errors) {
        var _this = this;
        this.socket = socket;
        this.$injector = $injector;
        this.$hostInfo = $hostInfo;
        this.$options = $options;
        this.$logger = $logger;
        this.$errors = $errors;
        this.okResponse = "$OK#";
        this.isInitilized = false;
        if (this.$hostInfo.isWindows) {
            var winSocket = this.$injector.resolve(WinSocket, { service: this.socket, format: 0 });
            this.socket = {
                write: function (message) {
                    winSocket.sendMessage(message);
                }
            };
        }
        this.socket.on("close", function (hadError) { return _this.$logger.trace("GDB socket get closed. HadError", hadError.toString()); });
    }
    GDBServer.prototype.init = function (argv) {
        var _this = this;
        return (function () {
            if (!_this.isInitilized) {
                _this.awaitResponse("QStartNoAckMode", "+").wait();
                _this.sendCore("+");
                _this.awaitResponse("QEnvironmentHexEncoded:").wait();
                _this.awaitResponse("QSetDisableASLR:1").wait();
                var encodedArguments = _.map(argv, function (arg, index) { return util.format("%d,%d,%s", arg.length * 2, index, _this.toHex(arg)); }).join(",");
                _this.awaitResponse("A" + encodedArguments).wait();
                _this.isInitilized = true;
            }
        }).future()();
    };
    GDBServer.prototype.run = function (argv) {
        var _this = this;
        return (function () {
            _this.init(argv).wait();
            _this.awaitResponse("qLaunchSuccess").wait();
            if (_this.$hostInfo.isWindows) {
                _this.send("vCont;c");
            }
            else {
                if (_this.$options.justlaunch) {
                    if (_this.$options.watch) {
                        _this.sendCore(_this.encodeData("vCont;c"));
                    }
                    else {
                        _this.sendCore(_this.encodeData("D"));
                    }
                }
                else {
                    _this.socket.pipe(new GDBStandardOutputAdapter()).pipe(process.stdout);
                    _this.socket.pipe(new GDBSignalWatcher());
                    _this.sendCore(_this.encodeData("vCont;c"));
                }
            }
        }).future()();
    };
    GDBServer.prototype.kill = function (argv) {
        var _this = this;
        return (function () {
            _this.init(argv).wait();
            _this.awaitResponse("\x03", "thread", function () { return _this.sendx03Message(); }).wait();
            _this.send("k").wait();
        }).future()();
    };
    GDBServer.prototype.destroy = function () {
        this.socket.destroy();
    };
    GDBServer.prototype.awaitResponse = function (packet, expectedResponse, getResponseAction) {
        var _this = this;
        return (function () {
            expectedResponse = expectedResponse || _this.okResponse;
            var actualResponse = getResponseAction ? getResponseAction.apply(_this, []).wait() : _this.send(packet).wait();
            if (actualResponse.indexOf(expectedResponse) === -1 || _.startsWith(actualResponse, "$E")) {
                _this.$logger.trace("GDB: actual response: " + actualResponse + ", expected response: " + expectedResponse);
                _this.$errors.failWithoutHelp("Unable to send " + packet + ".");
            }
        }).future()();
    };
    GDBServer.prototype.send = function (packet) {
        var _this = this;
        var future = new Future();
        var dataCallback = function (data) {
            _this.$logger.trace("GDB: read packet: " + data);
            _this.socket.removeListener("data", dataCallback);
            if (!future.isResolved()) {
                future.return(data.toString());
            }
        };
        this.socket.on("data", dataCallback);
        this.socket.on("error", function (error) {
            if (!future.isResolved()) {
                future.throw(new Error(error));
            }
        });
        this.sendCore(this.encodeData(packet));
        return future;
    };
    GDBServer.prototype.sendCore = function (data) {
        this.$logger.trace("GDB: send packet " + data);
        this.socket.write(data);
    };
    GDBServer.prototype.sendx03Message = function () {
        var _this = this;
        var future = new Future();
        var retryCount = 3;
        var isDataReceived = false;
        var timer = setInterval(function () {
            _this.sendCore("\x03");
            retryCount--;
            var secondTimer = setTimeout(function () {
                if (isDataReceived || !retryCount) {
                    clearTimeout(secondTimer);
                    clearInterval(timer);
                }
                if (!retryCount && !future.isResolved()) {
                    future.throw(new Error("Unable to kill the application."));
                }
            }, 1000);
        }, 1000);
        var dataCallback = function (data) {
            var dataAsString = data.toString();
            if (dataAsString.indexOf("thread") > -1) {
                isDataReceived = true;
                _this.socket.removeListener("data", dataCallback);
                clearInterval(timer);
                if (!future.isResolved()) {
                    future.return(data.toString());
                }
            }
        };
        this.socket.on("data", dataCallback);
        this.sendCore("\x03");
        return future;
    };
    GDBServer.prototype.encodeData = function (packet) {
        var sum = 0;
        for (var i = 0; i < packet.length; i++) {
            sum += getCharacterCodePoint(packet[i]);
        }
        sum = sum & 255;
        var data = util.format("$%s#%s", packet, sum.toString(16));
        return data;
    };
    GDBServer.prototype.toHex = function (value) {
        return new Buffer(value).toString("hex");
    };
    return GDBServer;
})();
exports.GDBServer = GDBServer;
$injector.register("gdbServer", GDBServer);
