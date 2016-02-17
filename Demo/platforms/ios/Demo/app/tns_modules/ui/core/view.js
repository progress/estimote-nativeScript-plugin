var viewCommon = require("./view-common");
var trace = require("trace");
var utils = require("utils/utils");
var types = require("utils/types");
global.moduleMerge(viewCommon, exports);
function onIdPropertyChanged(data) {
    var view = data.object;
    if (!view._nativeView) {
        return;
    }
    view._nativeView.accessibilityIdentifier = data.newValue;
}
viewCommon.View.idProperty.metadata.onSetNativeValue = onIdPropertyChanged;
function onTransfromPropertyChanged(data) {
    var view = data.object;
    view._updateNativeTransform();
}
viewCommon.View.translateXProperty.metadata.onSetNativeValue = onTransfromPropertyChanged;
viewCommon.View.translateYProperty.metadata.onSetNativeValue = onTransfromPropertyChanged;
viewCommon.View.scaleXProperty.metadata.onSetNativeValue = onTransfromPropertyChanged;
viewCommon.View.scaleYProperty.metadata.onSetNativeValue = onTransfromPropertyChanged;
viewCommon.View.rotateProperty.metadata.onSetNativeValue = onTransfromPropertyChanged;
function onOriginPropertyChanged(data) {
    var view = data.object;
    view._updateOriginPoint();
}
viewCommon.View.originXProperty.metadata.onSetNativeValue = onOriginPropertyChanged;
viewCommon.View.originYProperty.metadata.onSetNativeValue = onOriginPropertyChanged;
function onIsEnabledPropertyChanged(data) {
    var view = data.object;
    if (!view._nativeView) {
        return;
    }
    if (view._nativeView instanceof UIControl) {
        view._nativeView.enabled = data.newValue;
    }
}
viewCommon.View.isEnabledProperty.metadata.onSetNativeValue = onIsEnabledPropertyChanged;
function onIsUserInteractionEnabledPropertyChanged(data) {
    var view = data.object;
    if (!view._nativeView) {
        return;
    }
    view._nativeView.userInteractionEnabled = data.newValue;
}
viewCommon.View.isUserInteractionEnabledProperty.metadata.onSetNativeValue = onIsUserInteractionEnabledPropertyChanged;
var PFLAG_FORCE_LAYOUT = 1;
var PFLAG_MEASURED_DIMENSION_SET = 1 << 1;
var PFLAG_LAYOUT_REQUIRED = 1 << 2;
var View = (function (_super) {
    __extends(View, _super);
    function View() {
        _super.call(this);
        this._hasTransfrom = false;
        this._privateFlags = PFLAG_LAYOUT_REQUIRED | PFLAG_FORCE_LAYOUT;
    }
    View.prototype._addViewCore = function (view, atIndex) {
        _super.prototype._addViewCore.call(this, view, atIndex);
        this.requestLayout();
    };
    View.prototype._removeViewCore = function (view) {
        _super.prototype._removeViewCore.call(this, view);
        view._onDetached();
        this.requestLayout();
    };
    View.prototype.onLoaded = function () {
        _super.prototype.onLoaded.call(this);
        utils.copyFrom(this._options, this);
        delete this._options;
    };
    Object.defineProperty(View.prototype, "_nativeView", {
        get: function () {
            return this.ios;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(View.prototype, "isLayoutRequested", {
        get: function () {
            return (this._privateFlags & PFLAG_FORCE_LAYOUT) === PFLAG_FORCE_LAYOUT;
        },
        enumerable: true,
        configurable: true
    });
    View.prototype.requestLayout = function () {
        _super.prototype.requestLayout.call(this);
        this._privateFlags |= PFLAG_FORCE_LAYOUT;
        var parent = this.parent;
        if (parent && !parent.isLayoutRequested) {
            parent.requestLayout();
        }
    };
    View.prototype.measure = function (widthMeasureSpec, heightMeasureSpec) {
        var measureSpecsChanged = this._setCurrentMeasureSpecs(widthMeasureSpec, heightMeasureSpec);
        var forceLayout = (this._privateFlags & PFLAG_FORCE_LAYOUT) === PFLAG_FORCE_LAYOUT;
        if (forceLayout || measureSpecsChanged) {
            this._privateFlags &= ~PFLAG_MEASURED_DIMENSION_SET;
            this.onMeasure(widthMeasureSpec, heightMeasureSpec);
            this._privateFlags |= PFLAG_LAYOUT_REQUIRED;
            if ((this._privateFlags & PFLAG_MEASURED_DIMENSION_SET) !== PFLAG_MEASURED_DIMENSION_SET) {
                throw new Error("onMeasure() did not set the measured dimension by calling setMeasuredDimension()");
            }
        }
    };
    View.prototype.layout = function (left, top, right, bottom) {
        var _a = this._setCurrentLayoutBounds(left, top, right, bottom), boundsChanged = _a.boundsChanged, sizeChanged = _a.sizeChanged;
        this.layoutNativeView(left, top, right, bottom);
        if (boundsChanged || (this._privateFlags & PFLAG_LAYOUT_REQUIRED) === PFLAG_LAYOUT_REQUIRED) {
            this.onLayout(left, top, right, bottom);
            this._privateFlags &= ~PFLAG_LAYOUT_REQUIRED;
        }
        if (sizeChanged) {
            this._onSizeChanged();
        }
        this._privateFlags &= ~PFLAG_FORCE_LAYOUT;
    };
    View.prototype.setMeasuredDimension = function (measuredWidth, measuredHeight) {
        _super.prototype.setMeasuredDimension.call(this, measuredWidth, measuredHeight);
        this._privateFlags |= PFLAG_MEASURED_DIMENSION_SET;
    };
    View.prototype.onMeasure = function (widthMeasureSpec, heightMeasureSpec) {
        var view = this._nativeView;
        var nativeWidth = 0;
        var nativeHeight = 0;
        if (view) {
            var width = utils.layout.getMeasureSpecSize(widthMeasureSpec);
            var widthMode = utils.layout.getMeasureSpecMode(widthMeasureSpec);
            var height = utils.layout.getMeasureSpecSize(heightMeasureSpec);
            var heightMode = utils.layout.getMeasureSpecMode(heightMeasureSpec);
            if (widthMode === utils.layout.UNSPECIFIED) {
                width = Number.POSITIVE_INFINITY;
            }
            if (heightMode === utils.layout.UNSPECIFIED) {
                height = Number.POSITIVE_INFINITY;
            }
            var nativeSize = view.sizeThatFits(CGSizeMake(width, height));
            nativeWidth = nativeSize.width;
            nativeHeight = nativeSize.height;
        }
        var measureWidth = Math.max(nativeWidth, this.minWidth);
        var measureHeight = Math.max(nativeHeight, this.minHeight);
        var widthAndState = View.resolveSizeAndState(measureWidth, width, widthMode, 0);
        var heightAndState = View.resolveSizeAndState(measureHeight, height, heightMode, 0);
        this.setMeasuredDimension(widthAndState, heightAndState);
    };
    View.prototype.onLayout = function (left, top, right, bottom) {
    };
    View.prototype._setNativeViewFrame = function (nativeView, frame) {
        if (!CGRectEqualToRect(nativeView.frame, frame)) {
            trace.write(this + ", Native setFrame: = " + NSStringFromCGRect(frame), trace.categories.Layout);
            this._cachedFrame = frame;
            if (this._hasTransfrom) {
                var transform = nativeView.transform;
                nativeView.transform = CGAffineTransformIdentity;
                nativeView.frame = frame;
                nativeView.transform = transform;
            }
            else {
                nativeView.frame = frame;
            }
            var boundsOrigin = nativeView.bounds.origin;
            nativeView.bounds = CGRectMake(boundsOrigin.x, boundsOrigin.y, frame.size.width, frame.size.height);
        }
    };
    View.prototype.layoutNativeView = function (left, top, right, bottom) {
        if (!this._nativeView) {
            return;
        }
        var nativeView;
        if (!this.parent && this._nativeView.subviews.count > 0 && utils.ios.MajorVersion < 8) {
            trace.write(this + " has no parent. Setting frame to first child instead.", trace.categories.Layout);
            nativeView = this._nativeView.subviews[0];
        }
        else {
            nativeView = this._nativeView;
        }
        var frame = CGRectMake(left, top, right - left, bottom - top);
        this._setNativeViewFrame(nativeView, frame);
    };
    View.prototype._updateLayout = function () {
        var oldBounds = this._getCurrentLayoutBounds();
        this.layoutNativeView(oldBounds.left, oldBounds.top, oldBounds.right, oldBounds.bottom);
    };
    View.prototype.focus = function () {
        if (this.ios) {
            return this.ios.becomeFirstResponder();
        }
        return false;
    };
    View.prototype._onSizeChanged = function () {
        this.style._sizeChanged();
    };
    View.prototype._updateNativeTransform = function () {
        var newTransform = CGAffineTransformIdentity;
        newTransform = CGAffineTransformTranslate(newTransform, this.translateX, this.translateY);
        newTransform = CGAffineTransformRotate(newTransform, this.rotate * Math.PI / 180);
        newTransform = CGAffineTransformScale(newTransform, this.scaleX, this.scaleY);
        if (!CGAffineTransformEqualToTransform(this._nativeView.transform, newTransform)) {
            this._nativeView.transform = newTransform;
            this._hasTransfrom = this._nativeView && !CGAffineTransformEqualToTransform(this._nativeView.transform, CGAffineTransformIdentity);
        }
    };
    View.prototype._updateOriginPoint = function () {
        var newPoint = CGPointMake(this.originX, this.originY);
        this._nativeView.layer.anchorPoint = newPoint;
        if (this._cachedFrame) {
            this._setNativeViewFrame(this._nativeView, this._cachedFrame);
        }
    };
    return View;
})(viewCommon.View);
exports.View = View;
var CustomLayoutView = (function (_super) {
    __extends(CustomLayoutView, _super);
    function CustomLayoutView() {
        _super.call(this);
        this._view = new UIView();
    }
    Object.defineProperty(CustomLayoutView.prototype, "ios", {
        get: function () {
            return this._view;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CustomLayoutView.prototype, "_nativeView", {
        get: function () {
            return this._view;
        },
        enumerable: true,
        configurable: true
    });
    CustomLayoutView.prototype.onMeasure = function (widthMeasureSpec, heightMeasureSpec) {
    };
    CustomLayoutView.prototype._addViewToNativeVisualTree = function (child, atIndex) {
        _super.prototype._addViewToNativeVisualTree.call(this, child);
        if (this._nativeView && child._nativeView) {
            if (types.isNullOrUndefined(atIndex) || atIndex >= this._nativeView.subviews.count) {
                this._nativeView.addSubview(child._nativeView);
            }
            else {
                this._nativeView.insertSubviewAtIndex(child._nativeView, atIndex);
            }
            return true;
        }
        return false;
    };
    CustomLayoutView.prototype._removeViewFromNativeVisualTree = function (child) {
        _super.prototype._removeViewFromNativeVisualTree.call(this, child);
        if (child._nativeView) {
            child._nativeView.removeFromSuperview();
        }
    };
    return CustomLayoutView;
})(View);
exports.CustomLayoutView = CustomLayoutView;
