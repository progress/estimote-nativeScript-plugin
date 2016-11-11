global.ESTIMOTE_PROXIMITY_UUID = java.util.UUID.fromString("B9407F30-F5F8-466E-AFF9-25556B57FE6D");
global.ESTIMOTE_REGION_NAME = "default";

var Estimote = (function(){

    function Estimote(options){
        this._regionName = ESTIMOTE_REGION_NAME;
        this._proximityUUID = options.proximityUUID ? java.util.UUID.fromString(options.proximityUUID) : ESTIMOTE_PROXIMITY_UUID;
        this.callback = options.callback;

        if (typeof options.region !== 'undefined'){
            this._regionName = options.region;
        }
        var app = require("application");

        this.context = app.android.context;

        this.region = new com.estimote.sdk.Region(this._regionName, this._proximityUUID, null, null);

        this.beaconManager = new com.estimote.sdk.BeaconManager(this.context);

        var _this = this;

        this.beaconManager.setRangingListener(new com.estimote.sdk.BeaconManager.RangingListener({
            onBeaconsDiscovered: function(region, list){
                var beacons = [];
                for (var index = 0; index < list.size(); index++){
                    var beacon = list.get(index);
                    beacons.push({
                        proximityUUID : beacon.getProximityUUID().toString(),
                        rssi : beacon.getRssi(),
                        major: beacon.getMajor(),
                        minor: beacon.getMinor(),
                        measuredPower: beacon.getMeasuredPower(),
                        proximity: com.estimote.sdk.Utils.computeAccuracy(beacon)
                    });
                }
                _this.callback(beacons);
            }
        }));
    }

    Estimote.prototype.startRanging = function(data){
        var _this = this;
        com.estimote.sdk.SystemRequirementsChecker.check(this.context, new com.estimote.sdk.SystemRequirementsChecker.Callback({
            onRequirementsMissing: function(requirements){
                console.log("Missing perssion(s) " + requirements);
            }
        }));

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
