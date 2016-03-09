var appModule = require("./application-common");
var frame = require("ui/frame");
var observable = require("data/observable");
global.moduleMerge(appModule, exports);
var typedExports = exports;
function initEvents() {
    var lifecycleCallbacks = new android.app.Application.ActivityLifecycleCallbacks({
        onActivityCreated: function (activity, bundle) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            if (!androidApp.startActivity) {
                androidApp.startActivity = activity;
                androidApp.notify({ eventName: "activityCreated", object: androidApp, activity: activity, bundle: bundle });
                if (androidApp.onActivityCreated) {
                    androidApp.onActivityCreated(activity, bundle);
                }
            }
            androidApp.currentContext = activity;
        },
        onActivityDestroyed: function (activity) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            if (activity === androidApp.foregroundActivity) {
                androidApp.foregroundActivity = undefined;
            }
            if (activity === androidApp.currentContext) {
                androidApp.currentContext = undefined;
            }
            if (activity === androidApp.startActivity) {
                if (typedExports.onExit) {
                    typedExports.onExit();
                }
                typedExports.notify({ eventName: typedExports.exitEvent, object: androidApp, android: activity });
                androidApp.startActivity = undefined;
            }
            androidApp.notify({ eventName: "activityDestroyed", object: androidApp, activity: activity });
            if (androidApp.onActivityDestroyed) {
                androidApp.onActivityDestroyed(activity);
            }
            gc();
        },
        onActivityPaused: function (activity) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            androidApp.paused = true;
            if (activity === androidApp.foregroundActivity) {
                if (typedExports.onSuspend) {
                    typedExports.onSuspend();
                }
                typedExports.notify({ eventName: typedExports.suspendEvent, object: androidApp, android: activity });
            }
            androidApp.notify({ eventName: "activityPaused", object: androidApp, activity: activity });
            if (androidApp.onActivityPaused) {
                androidApp.onActivityPaused(activity);
            }
        },
        onActivityResumed: function (activity) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            androidApp.paused = false;
            if (activity === androidApp.foregroundActivity) {
                if (typedExports.onResume) {
                    typedExports.onResume();
                }
                typedExports.notify({ eventName: typedExports.resumeEvent, object: androidApp, android: activity });
            }
            androidApp.notify({ eventName: "activityResumed", object: androidApp, activity: activity });
            if (androidApp.onActivityResumed) {
                androidApp.onActivityResumed(activity);
            }
        },
        onActivitySaveInstanceState: function (activity, bundle) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            androidApp.notify({ eventName: "saveActivityState", object: androidApp, activity: activity, bundle: bundle });
            if (androidApp.onSaveActivityState) {
                androidApp.onSaveActivityState(activity, bundle);
            }
        },
        onActivityStarted: function (activity) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            androidApp.foregroundActivity = activity;
            androidApp.notify({ eventName: "activityStarted", object: androidApp, activity: activity });
            if (androidApp.onActivityStarted) {
                androidApp.onActivityStarted(activity);
            }
        },
        onActivityStopped: function (activity) {
            if (!(activity instanceof com.tns.NativeScriptActivity)) {
                return;
            }
            androidApp.notify({ eventName: "activityStopped", object: androidApp, activity: activity });
            if (androidApp.onActivityStopped) {
                androidApp.onActivityStopped(activity);
            }
        }
    });
    return lifecycleCallbacks;
}
var AndroidApplication = (function (_super) {
    __extends(AndroidApplication, _super);
    function AndroidApplication() {
        _super.apply(this, arguments);
        this._registeredReceivers = {};
        this._pendingReceiverRegistrations = new Array();
    }
    AndroidApplication.prototype.getActivity = function (intent) {
        return frame.getActivity();
    };
    AndroidApplication.prototype.init = function (nativeApp) {
        this.nativeApp = nativeApp;
        this.packageName = nativeApp.getPackageName();
        this.context = nativeApp.getApplicationContext();
        this._eventsToken = initEvents();
        this.nativeApp.registerActivityLifecycleCallbacks(this._eventsToken);
        this._registerPendingReceivers();
    };
    AndroidApplication.prototype._registerPendingReceivers = function () {
        if (this._pendingReceiverRegistrations) {
            var i = 0;
            var length = this._pendingReceiverRegistrations.length;
            for (; i < length; i++) {
                var registerFunc = this._pendingReceiverRegistrations[i];
                registerFunc(this.context);
            }
            this._pendingReceiverRegistrations = new Array();
        }
    };
    AndroidApplication.prototype.registerBroadcastReceiver = function (intentFilter, onReceiveCallback) {
        ensureBroadCastReceiverClass();
        var that = this;
        var registerFunc = function (context) {
            var receiver = new BroadcastReceiverClass(onReceiveCallback);
            context.registerReceiver(receiver, new android.content.IntentFilter(intentFilter));
            that._registeredReceivers[intentFilter] = receiver;
        };
        if (this.context) {
            registerFunc(this.context);
        }
        else {
            this._pendingReceiverRegistrations.push(registerFunc);
        }
    };
    AndroidApplication.prototype.unregisterBroadcastReceiver = function (intentFilter) {
        var receiver = this._registeredReceivers[intentFilter];
        if (receiver) {
            this.context.unregisterReceiver(receiver);
            this._registeredReceivers[intentFilter] = undefined;
            delete this._registeredReceivers[intentFilter];
        }
    };
    AndroidApplication.activityCreatedEvent = "activityCreated";
    AndroidApplication.activityDestroyedEvent = "activityDestroyed";
    AndroidApplication.activityStartedEvent = "activityStarted";
    AndroidApplication.activityPausedEvent = "activityPaused";
    AndroidApplication.activityResumedEvent = "activityResumed";
    AndroidApplication.activityStoppedEvent = "activityStopped";
    AndroidApplication.saveActivityStateEvent = "saveActivityState";
    AndroidApplication.activityResultEvent = "activityResult";
    AndroidApplication.activityBackPressedEvent = "activityBackPressed";
    return AndroidApplication;
})(observable.Observable);
exports.AndroidApplication = AndroidApplication;
var BroadcastReceiverClass;
function ensureBroadCastReceiverClass() {
    if (BroadcastReceiverClass) {
        return;
    }
    var BroadcastReceiver = (function (_super) {
        __extends(BroadcastReceiver, _super);
        function BroadcastReceiver(onReceiveCallback) {
            _super.call(this);
            this._onReceiveCallback = onReceiveCallback;
            return global.__native(this);
        }
        BroadcastReceiver.prototype.onReceive = function (context, intent) {
            if (this._onReceiveCallback) {
                this._onReceiveCallback(context, intent);
            }
        };
        return BroadcastReceiver;
    })(android.content.BroadcastReceiver);
    BroadcastReceiverClass = BroadcastReceiver;
}
global.__onUncaughtError = function (error) {
    var types = require("utils/types");
    if (types.isFunction(typedExports.onUncaughtError)) {
        typedExports.onUncaughtError(error);
    }
    typedExports.notify({ eventName: typedExports.uncaughtErrorEvent, object: appModule.android, android: error });
};
function loadCss() {
    typedExports.cssSelectorsCache = typedExports.loadCss(typedExports.cssFile);
}
var started = false;
function start(entry) {
    if (started) {
        throw new Error("Application is already started.");
    }
    started = true;
    if (entry) {
        typedExports.mainEntry = entry;
    }
    app.init({
        getActivity: function (activity) {
            var intent = activity.getIntent();
            return androidApp.getActivity(intent);
        },
        onCreate: function () {
            androidApp.init(this);
            setupOrientationListener(androidApp);
        }
    });
    loadCss();
}
exports.start = start;
var androidApp = new AndroidApplication();
typedExports.android = androidApp;
var currentOrientation;
function setupOrientationListener(androidApp) {
    androidApp.registerBroadcastReceiver(android.content.Intent.ACTION_CONFIGURATION_CHANGED, onConfigurationChanged);
    currentOrientation = androidApp.context.getResources().getConfiguration().orientation;
}
function onConfigurationChanged(context, intent) {
    var orientation = context.getResources().getConfiguration().orientation;
    if (currentOrientation !== orientation) {
        currentOrientation = orientation;
        var enums = require("ui/enums");
        var newValue;
        switch (orientation) {
            case android.content.res.Configuration.ORIENTATION_LANDSCAPE:
                newValue = enums.DeviceOrientation.landscape;
                break;
            case android.content.res.Configuration.ORIENTATION_PORTRAIT:
                newValue = enums.DeviceOrientation.portrait;
                break;
            default:
                newValue = enums.DeviceOrientation.unknown;
                break;
        }
        typedExports.notify({
            eventName: typedExports.orientationChangedEvent,
            android: context,
            newValue: newValue,
            object: typedExports.android,
        });
    }
}
global.__onLiveSync = function () {
    if (typedExports.android && typedExports.android.paused) {
        return;
    }
    var fileResolver = require("file-system/file-name-resolver");
    fileResolver.clearCache();
    loadCss();
    frame.reloadPage();
};
