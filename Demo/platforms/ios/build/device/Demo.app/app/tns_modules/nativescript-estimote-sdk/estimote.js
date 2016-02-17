var Estimote = (function(){

  var app = require("application");

  (function(){

  })();

  function Estimote(){
      this.beconManager = ESTBeaconManager.alloc().init();;
      this.beconManager.avoidUnknownStateBeacons = true;
  }

  Estimote.prototype.startRanging = function(data){

  };

  Estimote.prototype.stopRanging = function(){

  };

  return Estimote;

})();

module.exports = Estimote;
