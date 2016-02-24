/*
  Estimote Nativescript Plugin
*/

global.ESTIMOTE_PROXIMITY_UUID = NSUUID.alloc().initWithUUIDString("B9407F30-F5F8-466E-AFF9-25556B57FE6D");
global.ESTIMOTE_REGION_NAME = "default";

var BeaconManagerDelegateImpl = (function (_super) {
    __extends(BeaconManagerDelegateImpl, _super);
    function BeaconManagerDelegateImpl() {
        _super.apply(this, arguments);
    }
    BeaconManagerDelegateImpl.new = function () {
        return _super.new.call(this);
    };

    BeaconManagerDelegateImpl.prototype.initWithRegion = function (region, callback) {
        this._region = region;
        this._callback = callback;
        return this;
    };

    BeaconManagerDelegateImpl.prototype.beaconManagerDidChangeAuthorizationStatus = function (manager, status){
        if (status === 3){
            manager.startRangingBeaconsInRegion(this._region);
        }
    };

    BeaconManagerDelegateImpl.prototype.beaconManagerDidRangeBeaconsInRegion = function (manager, beacons, region) {
        this._callback(beacons);
    };
    BeaconManagerDelegateImpl.ObjCProtocols = [ESTBeaconManagerDelegate];
    return BeaconManagerDelegateImpl;
})(NSObject);

var Estimote = (function(){

  function Estimote(options){
      this._identifer = ESTIMOTE_REGION_NAME;

      if (typeof options.identifier !== 'undefined'){
            this.__identifer = identifier;
      }

      this.beaconManager = ESTBeaconManager.alloc().init();;
      this.beaconManager.avoidUnknownStateBeacons = true;
      this._region = CLBeaconRegion.alloc().initWithProximityUUIDIdentifier(ESTIMOTE_PROXIMITY_UUID, this._identifer);
      // delegate
      this.beaconManager.delegate = BeaconManagerDelegateImpl.new().initWithRegion(this._region, options.callback);
  }

  Estimote.prototype.startRanging = function(){
    if (ESTBeaconManager.authorizationStatus() === CLAuthorizationStatus.kCLAuthorizationStatusNotDetermined){
        this.beaconManager.requestAlwaysAuthorization();
    }else{
        this.beaconManager.startRangingBeaconsInRegion(this._region);
    }
  };

  Estimote.prototype.stopRanging = function(){
      this.beaconManager.stopRangingBeaconsInRegion(this._region);
  };

  return Estimote;

})();

module.exports = Estimote;
