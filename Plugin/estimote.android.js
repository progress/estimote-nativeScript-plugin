global.ESTIMOTE_PROXIMITY_UUID = "B9407F30-F5F8-466E-AFF9-25556B57FE6D";
global.ESTIMOTE_REGION_NAME = "default";


var Estimote = (function(){


  function Estimote(options){
    this._regionName = ESTIMOTE_REGION_NAME;

    if (typeof options.region !== 'undefined'){
          this._regionName = region;
    }
    var app = require("application");
    var context = app.android.context;

    this.beaconManager = new com.estimote.sdk.BeaconManager(context);
    console.log(this.beaconManager);
  }

  Estimote.prototype.startRanging = function(data){

  };

  Estimote.prototype.stopRanging = function(){

  };

  return Estimote;

})();

module.exports = Estimote;
