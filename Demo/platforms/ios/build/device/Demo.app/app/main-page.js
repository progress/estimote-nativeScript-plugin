var vmModule = require("./main-view-model");
var view = require("ui/core/view");

var Estimote = require('nativescript-estimote-sdk');

function pageLoaded(args) {
    var page = args.object;
    page.bindingContext = vmModule.mainViewModel;

    var options = {
        callback : function(beacons){
          console.log("monitoring beacons");
          for (var i = 0; i < beacons.count; i++) {
             var beacon = beacons[i];
             if (beacon.major > 0){

                // TODO: parent callback
                console.log(beacon.major + ":" + beacon.minor);
             }
          }
        }
    };

    var estimote = new Estimote(options);

    estimote.startRanging();
}

exports.pageLoaded = pageLoaded;
