global.ESTIMOTE_PROXIMITY_UUID = java.util.UUID.fromString("B9407F30-F5F8-466E-AFF9-25556B57FE6D");
global.ESTIMOTE_REGION_NAME = "default";


var Estimote = (function(){

  function Estimote(options){
    this._regionName = ESTIMOTE_REGION_NAME;

    if (typeof options.region !== 'undefined'){
          this._regionName = region;
    }
    var app = require("application");
    var context = app.android.context;

    this.region = new com.estimote.sdk.Region(this._regionName, ESTIMOTE_PROXIMITY_UUID, null, null);

    this.beaconManager = new com.estimote.sdk.BeaconManager(context);
    this.beaconManager.setRangingListener(new com.estimote.sdk.BeaconManager.RangingListener({
        onBeaconsDiscovered: function(region, beacons){
            console.log(this.arguments);
            for (var index = 0; index < beacons.length; index++){
              var beacon = beacons[index];
              console.log(beacon);
            }
        }
    }));
  }

  Estimote.prototype.startRanging = function(data){
      var _this = this;
      _this.beaconManager.connect(new com.estimote.sdk.BeaconManager.ServiceReadyCallback({
          onServiceReady : function(){
              try {
                  _this.beaconManager.startRanging(_this.region);
              }catch(error){
                console.log(error.message);
              }
          }
      }));
  };

  Estimote.prototype.stopRanging = function(){
    if (this.beaconManager != null) {
      this.beaconManager.stopRanging(this.region);
    }
  };

  return Estimote;

})();

module.exports = Estimote;
