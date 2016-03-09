var frameCommon = require("./frame-common");
var pages = require("ui/page");
var observable_1 = require("data/observable");
var trace = require("trace");
var application = require("application");
var types = require("utils/types");
var utils = require("utils/utils");
var transitionModule = require("ui/transition");
global.moduleMerge(frameCommon, exports);
var TAG = "_fragmentTag";
var OWNER = "_owner";
var HIDDEN = "_hidden";
var INTENT_EXTRA = "com.tns.activity";
var ROOT_VIEW = "_rootView";
var BACKSTACK_TAG = "_backstackTag";
var IS_BACK = "_isBack";
var NAV_DEPTH = "_navDepth";
var CLEARING_HISTORY = "_clearingHistory";
var FRAMEID = "_frameId";
var navDepth = -1;
var activityInitialized = false;
var animationFixed;
function ensureAnimationFixed() {
    if (!animationFixed) {
        animationFixed = android.os.Build.VERSION.SDK_INT >= 19
            ? 1 : -1;
    }
}
var FragmentClass;
function ensureFragmentClass() {
    if (FragmentClass) {
        return;
    }
    FragmentClass = android.app.Fragment.extend({
        onCreate: function (savedInstanceState) {
            trace.write(this.getTag() + ".onCreate(" + savedInstanceState + ")", trace.categories.NativeLifecycle);
            this.super.onCreate(savedInstanceState);
            this.super.setHasOptionsMenu(true);
            if (!this.entry) {
                var frameId = this.getArguments().getInt(FRAMEID);
                var frame = getFrameById(frameId);
                if (frame) {
                    this.frame = frame;
                }
                else {
                    throw new Error("Cannot find Frame for " + this);
                }
                findPageForFragment(this, this.frame);
            }
        },
        onCreateView: function (inflater, container, savedInstanceState) {
            trace.write(this.getTag() + ".onCreateView(inflater, container, " + savedInstanceState + ")", trace.categories.NativeLifecycle);
            var entry = this.entry;
            var page = entry.resolvedPage;
            if (savedInstanceState && savedInstanceState.getBoolean(HIDDEN, false)) {
                this.super.getFragmentManager().beginTransaction().hide(this).commit();
                page._onAttached(this.getActivity());
            }
            else {
                onFragmentShown(this);
            }
            return page._nativeView;
        },
        onHiddenChanged: function (hidden) {
            trace.write(this.getTag() + ".onHiddenChanged(" + hidden + ")", trace.categories.NativeLifecycle);
            this.super.onHiddenChanged(hidden);
            if (hidden) {
                onFragmentHidden(this);
            }
            else {
                onFragmentShown(this);
            }
        },
        onSaveInstanceState: function (outState) {
            trace.write(this.getTag() + ".onSaveInstanceState(" + outState + ")", trace.categories.NativeLifecycle);
            this.super.onSaveInstanceState(outState);
            if (this.isHidden()) {
                outState.putBoolean(HIDDEN, true);
            }
        },
        onDestroyView: function () {
            trace.write(this.getTag() + ".onDestroyView()", trace.categories.NativeLifecycle);
            this.super.onDestroyView();
            onFragmentHidden(this);
            var entry = this.entry;
            var page = entry.resolvedPage;
            if (page._context) {
                page._onDetached(true);
            }
        },
        onDestroy: function () {
            trace.write(this.getTag() + ".onDestroy()", trace.categories.NativeLifecycle);
            this.super.onDestroy();
            utils.GC();
        },
        onCreateAnimator: function (transit, enter, nextAnim) {
            var animator = transitionModule._onFragmentCreateAnimator(this, nextAnim);
            if (!animator) {
                animator = this.super.onCreateAnimator(transit, enter, nextAnim);
            }
            trace.write(this.getTag() + ".onCreateAnimator(" + transit + ", " + enter + ", " + nextAnim + "): " + animator, trace.categories.NativeLifecycle);
            return animator;
        }
    });
}
function onFragmentShown(fragment) {
    trace.write("SHOWN " + fragment.getTag(), trace.categories.NativeLifecycle);
    if (fragment[CLEARING_HISTORY]) {
        trace.write(fragment.getTag() + " has been shown, but we are currently clearing history. Returning.", trace.categories.NativeLifecycle);
        return null;
    }
    var frame = fragment.frame;
    var entry = fragment.entry;
    var page = entry.resolvedPage;
    var currentNavigationContext;
    var navigationQueue = frame._navigationQueue;
    for (var i = 0; i < navigationQueue.length; i++) {
        if (navigationQueue[i].entry === entry) {
            currentNavigationContext = navigationQueue[i];
            break;
        }
    }
    var isBack = currentNavigationContext ? currentNavigationContext.isBackNavigation : false;
    frame._addView(page);
    if (!frame.isLoaded) {
        frame._currentEntry = entry;
        frame.onLoaded();
    }
    transitionModule._onFragmentShown(fragment, isBack);
}
function onFragmentHidden(fragment) {
    trace.write("HIDDEN " + fragment.getTag(), trace.categories.NativeLifecycle);
    if (fragment[CLEARING_HISTORY]) {
        trace.write(fragment.getTag() + " has been hidden, but we are currently clearing history. Returning.", trace.categories.NativeLifecycle);
        return null;
    }
    var isBack = fragment.entry[IS_BACK];
    fragment.entry[IS_BACK] = undefined;
    transitionModule._onFragmentHidden(fragment, isBack);
}
var Frame = (function (_super) {
    __extends(Frame, _super);
    function Frame() {
        _super.call(this);
        this._android = new AndroidFrame(this);
        this._listener = new android.view.View.OnAttachStateChangeListener({
            onViewAttachedToWindow: this.onNativeViewAttachedToWindow.bind(this),
            onViewDetachedFromWindow: this.onNativeViewDetachedToWindow.bind(this)
        });
    }
    Object.defineProperty(Frame, "defaultAnimatedNavigation", {
        get: function () {
            return frameCommon.Frame.defaultAnimatedNavigation;
        },
        set: function (value) {
            frameCommon.Frame.defaultAnimatedNavigation = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Frame, "defaultTransition", {
        get: function () {
            return frameCommon.Frame.defaultTransition;
        },
        set: function (value) {
            frameCommon.Frame.defaultTransition = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Frame.prototype, "containerViewId", {
        get: function () {
            return this._containerViewId;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Frame.prototype, "android", {
        get: function () {
            return this._android;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Frame.prototype, "_nativeView", {
        get: function () {
            return this._android.rootViewGroup;
        },
        enumerable: true,
        configurable: true
    });
    Frame.prototype._navigateCore = function (backstackEntry) {
        trace.write(this + "._navigateCore(page: " + backstackEntry.resolvedPage + ", backstackVisible: " + this._isEntryBackstackVisible(backstackEntry) + ", clearHistory: " + backstackEntry.entry.clearHistory + "), navDepth: " + navDepth, trace.categories.Navigation);
        var activity = this._android.activity;
        if (!activity) {
            var currentActivity = this._android.currentActivity;
            if (currentActivity) {
                startActivity(currentActivity, this._android.frameId);
            }
            this._delayedNavigationEntry = backstackEntry;
            return;
        }
        var manager = activity.getFragmentManager();
        if (backstackEntry.entry.clearHistory) {
            var backStackEntryCount = manager.getBackStackEntryCount();
            var i = backStackEntryCount - 1;
            var fragment;
            while (i >= 0) {
                fragment = manager.findFragmentByTag(manager.getBackStackEntryAt(i--).getName());
                trace.write(fragment.getTag() + "[CLEARING_HISTORY] = true;", trace.categories.NativeLifecycle);
                fragment[CLEARING_HISTORY] = true;
            }
            if (this.currentPage) {
                fragment = manager.findFragmentByTag(this.currentPage[TAG]);
                if (fragment) {
                    fragment[CLEARING_HISTORY] = true;
                    trace.write(fragment.getTag() + "[CLEARING_HISTORY] = true;", trace.categories.NativeLifecycle);
                }
            }
            if (backStackEntryCount) {
                var firstEntryName = manager.getBackStackEntryAt(0).getName();
                trace.write("manager.popBackStack(" + firstEntryName + ", android.app.FragmentManager.POP_BACK_STACK_INCLUSIVE);", trace.categories.NativeLifecycle);
                manager.popBackStack(firstEntryName, android.app.FragmentManager.POP_BACK_STACK_INCLUSIVE);
            }
            this._currentEntry = null;
            navDepth = -1;
        }
        navDepth++;
        var fragmentTransaction = manager.beginTransaction();
        var currentFragmentTag;
        var currentFragment;
        if (this.currentPage) {
            currentFragmentTag = this.currentPage[TAG];
            currentFragment = manager.findFragmentByTag(currentFragmentTag);
        }
        var newFragmentTag = "fragment" + navDepth;
        ensureFragmentClass();
        var newFragment = new FragmentClass();
        var args = new android.os.Bundle();
        args.putInt(FRAMEID, this._android.frameId);
        newFragment.setArguments(args);
        var animated = this._getIsAnimatedNavigation(backstackEntry.entry);
        var navigationTransition = this._getNavigationTransition(backstackEntry.entry);
        if (currentFragment) {
            transitionModule._clearForwardTransitions(currentFragment);
        }
        if (animated && navigationTransition) {
            transitionModule._setAndroidFragmentTransitions(navigationTransition, currentFragment, newFragment, fragmentTransaction);
        }
        newFragment.frame = this;
        newFragment.entry = backstackEntry;
        backstackEntry[BACKSTACK_TAG] = newFragmentTag;
        backstackEntry[NAV_DEPTH] = navDepth;
        backstackEntry.resolvedPage[TAG] = newFragmentTag;
        var isFirstNavigation = types.isNullOrUndefined(this._currentEntry);
        if (isFirstNavigation) {
            fragmentTransaction.add(this.containerViewId, newFragment, newFragmentTag);
            trace.write("fragmentTransaction.add(" + newFragmentTag + ");", trace.categories.NativeLifecycle);
        }
        else {
            if (this.android.cachePagesOnNavigate && !backstackEntry.entry.clearHistory) {
                if (currentFragment) {
                    fragmentTransaction.hide(currentFragment);
                    trace.write("fragmentTransaction.hide(" + currentFragmentTag + ");", trace.categories.NativeLifecycle);
                }
                else {
                    trace.write("Could not find " + currentFragmentTag + " to hide.", trace.categories.NativeLifecycle);
                }
                fragmentTransaction.add(this.containerViewId, newFragment, newFragmentTag);
                trace.write("fragmentTransaction.add(" + newFragmentTag + ");", trace.categories.NativeLifecycle);
            }
            else {
                fragmentTransaction.replace(this.containerViewId, newFragment, newFragmentTag);
                trace.write("fragmentTransaction.replace(" + newFragmentTag + ");", trace.categories.NativeLifecycle);
            }
            if (this.backStack.length > 0 && this._currentEntry) {
                var backstackTag = this._currentEntry[BACKSTACK_TAG];
                fragmentTransaction.addToBackStack(backstackTag);
                trace.write("fragmentTransaction.addToBackStack(" + backstackTag + ");", trace.categories.NativeLifecycle);
            }
        }
        if (!isFirstNavigation) {
            ensureAnimationFixed();
            if (this.android.cachePagesOnNavigate && animationFixed < 0) {
                fragmentTransaction.setTransition(android.app.FragmentTransaction.TRANSIT_NONE);
            }
            else {
                var transit = animated ? android.app.FragmentTransaction.TRANSIT_FRAGMENT_OPEN : android.app.FragmentTransaction.TRANSIT_NONE;
                fragmentTransaction.setTransition(transit);
            }
        }
        fragmentTransaction.commit();
        trace.write("fragmentTransaction.commit();", trace.categories.NativeLifecycle);
    };
    Frame.prototype._goBackCore = function (backstackEntry) {
        navDepth = backstackEntry[NAV_DEPTH];
        if (this._currentEntry) {
            this._currentEntry[IS_BACK] = true;
        }
        trace.write(this + "._goBackCore(pageId: " + backstackEntry.resolvedPage.id + ", backstackVisible: " + this._isEntryBackstackVisible(backstackEntry) + ", clearHistory: " + backstackEntry.entry.clearHistory + "), navDepth: " + navDepth, trace.categories.Navigation);
        var manager = this._android.activity.getFragmentManager();
        if (manager.getBackStackEntryCount() > 0) {
            manager.popBackStack(backstackEntry[BACKSTACK_TAG], android.app.FragmentManager.POP_BACK_STACK_INCLUSIVE);
        }
    };
    Frame.prototype._createUI = function () {
        var root = new org.nativescript.widgets.ContentLayout(this._context);
        this._containerViewId = android.view.View.generateViewId();
        this._android.rootViewGroup = root;
        this._android.rootViewGroup.setId(this._containerViewId);
        this._android.rootViewGroup.addOnAttachStateChangeListener(this._listener);
    };
    Frame.prototype.onNativeViewAttachedToWindow = function (view) {
        if (this._delayedNavigationEntry) {
            this._navigateCore(this._delayedNavigationEntry);
            this._delayedNavigationEntry = undefined;
        }
    };
    Frame.prototype.onNativeViewDetachedToWindow = function (view) {
    };
    Frame.prototype._popFromFrameStack = function () {
        if (!this._isInFrameStack) {
            return;
        }
        _super.prototype._popFromFrameStack.call(this);
        if (this._android.hasOwnActivity) {
            this._android.activity.finish();
        }
    };
    Frame.prototype._clearAndroidReference = function () {
        this._android.rootViewGroup.removeOnAttachStateChangeListener(this._listener);
        this._android.rootViewGroup = null;
    };
    Frame.prototype._printNativeBackStack = function () {
        if (!this._android.activity) {
            return;
        }
        var manager = this._android.activity.getFragmentManager();
        var length = manager.getBackStackEntryCount();
        var i = length - 1;
        console.log("---------------------------");
        console.log("Fragment Manager Back Stack (" + length + ")");
        while (i >= 0) {
            var fragment = manager.findFragmentByTag(manager.getBackStackEntryAt(i--).getName());
            console.log("[ " + fragment.getTag() + " ]");
        }
    };
    Frame.prototype._printFrameBackStack = function () {
        var length = this.backStack.length;
        var i = length - 1;
        console.log("---------------------------");
        console.log("Frame Back Stack (" + length + ")");
        while (i >= 0) {
            var backstackEntry = this.backStack[i--];
            console.log("[ " + backstackEntry.resolvedPage.id + " ]");
        }
    };
    Frame.prototype._getNavBarVisible = function (page) {
        if (types.isDefined(page.actionBarHidden)) {
            return !page.actionBarHidden;
        }
        if (this._android && types.isDefined(this._android.showActionBar)) {
            return this._android.showActionBar;
        }
        return true;
    };
    return Frame;
})(frameCommon.Frame);
exports.Frame = Frame;
var NativeActivity = {
    get rootView() {
        return this[ROOT_VIEW];
    },
    onCreate: function (savedInstanceState) {
        trace.write("NativeScriptActivity.onCreate(" + savedInstanceState + ")", trace.categories.NativeLifecycle);
        var app = application.android;
        var activity = this;
        var intent = activity.getIntent();
        if (application.onLaunch) {
            application.onLaunch(intent);
        }
        var args = { eventName: application.launchEvent, object: app, android: intent };
        application.notify(args);
        var frameId = -1;
        var rootView = args.root;
        var extras = intent.getExtras();
        if (extras) {
            frameId = extras.getInt(INTENT_EXTRA, -1);
        }
        else if (savedInstanceState) {
            frameId = savedInstanceState.getInt(INTENT_EXTRA, -1);
        }
        var frame;
        var navParam;
        if (frameId >= 0) {
            rootView = getFrameById(frameId);
        }
        else if (!rootView) {
            navParam = application.mainEntry;
            if (!navParam) {
                navParam = application.mainModule;
            }
            if (navParam) {
                frame = new Frame();
            }
            else {
                throw new Error("A Frame must be used to navigate to a Page.");
            }
            rootView = frame;
        }
        var isRestart = !!savedInstanceState && activityInitialized;
        this.super.onCreate(isRestart ? savedInstanceState : null);
        this[ROOT_VIEW] = rootView;
        rootView._onAttached(this);
        this.setContentView(rootView._nativeView, new org.nativescript.widgets.CommonLayoutParams());
        if (frame) {
            frame.navigate(navParam);
        }
        activityInitialized = true;
    },
    onSaveInstanceState: function (outState) {
        this.super.onSaveInstanceState(outState);
        var view = this.rootView;
        if (view instanceof Frame) {
            outState.putInt(INTENT_EXTRA, view.android.frameId);
        }
    },
    onActivityResult: function (requestCode, resultCode, data) {
        this.super.onActivityResult(requestCode, resultCode, data);
        trace.write("NativeScriptActivity.onActivityResult(" + requestCode + ", " + resultCode + ", " + data + ")", trace.categories.NativeLifecycle);
        var result = application.android.onActivityResult;
        if (result) {
            result(requestCode, resultCode, data);
        }
        application.android.notify({
            eventName: "activityResult",
            object: application.android,
            activity: this,
            requestCode: requestCode,
            resultCode: resultCode,
            intent: data
        });
    },
    onStart: function () {
        this.super.onStart();
        trace.write("NativeScriptActivity.onStart();", trace.categories.NativeLifecycle);
        var rootView = this.rootView;
        if (rootView && !rootView.isLoaded) {
            rootView.onLoaded();
        }
    },
    onStop: function () {
        this.super.onStop();
        trace.write("NativeScriptActivity.onStop();", trace.categories.NativeLifecycle);
        var rootView = this.rootView;
        if (rootView && rootView.isLoaded) {
            rootView.onUnloaded();
        }
    },
    onDestroy: function () {
        var rootView = this.rootView;
        if (rootView) {
            rootView._onDetached(true);
        }
        this.super.onDestroy();
        trace.write("NativeScriptActivity.onDestroy();", trace.categories.NativeLifecycle);
    },
    onBackPressed: function () {
        trace.write("NativeScriptActivity.onBackPressed;", trace.categories.NativeLifecycle);
        var args = {
            eventName: "activityBackPressed",
            object: application.android,
            activity: this,
            cancel: false,
        };
        application.android.notify(args);
        if (args.cancel) {
            return;
        }
        if (!frameCommon.goBack()) {
            this.super.onBackPressed();
        }
    },
    onLowMemory: function () {
        trace.write("NativeScriptActivity.onLowMemory()", trace.categories.NativeLifecycle);
        gc();
        java.lang.System.gc();
        this.super.onLowMemory();
        application.notify({ eventName: application.lowMemoryEvent, object: this, android: this });
    },
    onTrimMemory: function (level) {
        trace.write("NativeScriptActivity.onTrimMemory(" + level + ")", trace.categories.NativeLifecycle);
        gc();
        java.lang.System.gc();
        this.super.onTrimMemory(level);
    }
};
var framesCounter = 0;
var framesCache = new Array();
var AndroidFrame = (function (_super) {
    __extends(AndroidFrame, _super);
    function AndroidFrame(owner) {
        _super.call(this);
        this.hasOwnActivity = false;
        this._showActionBar = true;
        this._owner = owner;
        this.frameId = framesCounter++;
        framesCache.push(new WeakRef(this));
    }
    Object.defineProperty(AndroidFrame.prototype, "showActionBar", {
        get: function () {
            return this._showActionBar;
        },
        set: function (value) {
            if (this._showActionBar !== value) {
                this._showActionBar = value;
                if (this.owner.currentPage) {
                    this.owner.currentPage.actionBar.update();
                }
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidFrame.prototype, "activity", {
        get: function () {
            var activity = this.owner._context;
            if (activity) {
                return activity;
            }
            var currView = this._owner.parent;
            while (currView) {
                if (currView instanceof Frame) {
                    return currView.android.activity;
                }
                currView = currView.parent;
            }
            return undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidFrame.prototype, "actionBar", {
        get: function () {
            var activity = this.currentActivity;
            if (!activity) {
                return undefined;
            }
            var bar = activity.getActionBar();
            if (!bar) {
                return undefined;
            }
            return bar;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidFrame.prototype, "currentActivity", {
        get: function () {
            var activity = this.activity;
            if (activity) {
                return activity;
            }
            var stack = frameCommon.stack(), length = stack.length, i = length - 1, frame;
            for (i; i >= 0; i--) {
                frame = stack[i];
                activity = frame.android.activity;
                if (activity) {
                    return activity;
                }
            }
            return undefined;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidFrame.prototype, "owner", {
        get: function () {
            return this._owner;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AndroidFrame.prototype, "cachePagesOnNavigate", {
        get: function () {
            return this._cachePagesOnNavigate;
        },
        set: function (value) {
            if (this._cachePagesOnNavigate !== value) {
                if (this._owner.backStack.length > 0) {
                    throw new Error("Cannot set cachePagesOnNavigate if there are items in the back stack.");
                }
                this._cachePagesOnNavigate = value;
            }
        },
        enumerable: true,
        configurable: true
    });
    AndroidFrame.prototype.canGoBack = function () {
        if (!this.activity) {
            return false;
        }
        return this.activity.getIntent().getAction() !== android.content.Intent.ACTION_MAIN;
    };
    return AndroidFrame;
})(observable_1.Observable);
function findPageForFragment(fragment, frame) {
    var fragmentTag = fragment.getTag();
    var page;
    var entry;
    trace.write("Finding page for " + fragmentTag + ".", trace.categories.NativeLifecycle);
    if (fragmentTag === pages.DIALOG_FRAGMENT_TAG) {
        trace.write("No need to find page for dialog fragment.", trace.categories.NativeLifecycle);
        return;
    }
    if (frame.currentPage && frame.currentPage[TAG] === fragmentTag) {
        page = frame.currentPage;
        entry = frame._currentEntry;
        trace.write("Current page matches fragment " + fragmentTag + ".", trace.categories.NativeLifecycle);
    }
    else {
        var backStack = frame.backStack;
        for (var i = 0; i < backStack.length; i++) {
            if (backStack[i].resolvedPage[TAG] === fragmentTag) {
                entry = backStack[i];
                break;
            }
        }
        if (entry) {
            page = entry.resolvedPage;
            trace.write("Found " + page + " for " + fragmentTag, trace.categories.NativeLifecycle);
        }
    }
    if (page) {
        fragment.frame = frame;
        fragment.entry = entry;
        page[TAG] = fragmentTag;
    }
    else {
    }
}
function startActivity(activity, frameId) {
    var intent = new android.content.Intent(activity, com.tns.NativeScriptActivity.class);
    intent.setAction(android.content.Intent.ACTION_DEFAULT);
    intent.putExtra(INTENT_EXTRA, frameId);
    activity.startActivity(intent);
}
function getFrameById(frameId) {
    for (var i = 0; i < framesCache.length; i++) {
        var aliveFrame = framesCache[i].get();
        if (aliveFrame && aliveFrame.frameId === frameId) {
            return aliveFrame.owner;
        }
    }
    return null;
}
function getActivity() {
    return NativeActivity;
}
exports.getActivity = getActivity;
