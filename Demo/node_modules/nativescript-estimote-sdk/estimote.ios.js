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

    BeaconManagerDelegateImpl.prototype.beaconManagerDidRangeBeaconsInRegion = function (manager, nativeBeacons, region) {
        var beacons = [];

        for (var index = 0; index < nativeBeacons.count; index++){
            var beacon = nativeBeacons[index];

            var proximity = "Immediate";

            if (beacon.proximity === CLProximity.Near){
                proximity = "Near";
            }
            else if (beacon.proximity === CLProximity.Far){
                proximity = "Far";
            }

            beacons.push({
                major : beacon.major,
                minor: beacon.minor,
                proximity: proximity,
                rssi : beacon.rssi,
                _beacon : beacon
            });
        }

        this._callback(beacons);
    };
    BeaconManagerDelegateImpl.ObjCProtocols = [ESTBeaconManagerDelegate];
    return BeaconManagerDelegateImpl;
})(NSObject);

var Estimote = (function(){

  function Estimote(options){
      this._regionName = ESTIMOTE_REGION_NAME;

      if (typeof options.region !== 'undefined'){
            this._regionName = region;
      }

      this.beaconManager = ESTBeaconManager.alloc().init();;
      this.beaconManager.avoidUnknownStateBeacons = true;
      this._region = CLBeaconRegion.alloc().initWithProximityUUIDIdentifier(ESTIMOTE_PROXIMITY_UUID, this._regionName);
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
