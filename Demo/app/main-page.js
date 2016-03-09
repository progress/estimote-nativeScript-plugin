var observableModule = require("data/observable");
var observableArrayModule = require("data/observable-array");
var frameModule = require('ui/frame');

var Estimote = require('nativescript-estimote-sdk');

var data = new observableModule.Observable();

function pageLoaded(args) {
    var page = args.object;
    if (page.ios) {

      var controller = frameModule.topmost().ios.controller;

      // show the navbar
      frameModule.topmost().ios.navBarVisibility = "always";

      // set the title
      page.ios.title = 'Estimote Beacons';

      var navigationBar = controller.navigationBar;

      // set bar color to system blue constant
      // set bar color to a nice dark blue with RGBA
      navigationBar.barTintColor = UIColor.colorWithRedGreenBlueAlpha(157/255, 182/255, 168/255, 1);
      navigationBar.titleTextAttributes = new NSDictionary([UIColor.whiteColor()], [NSForegroundColorAttributeName]);
      navigationBar.barStyle = 1;
    }
    var items = new observableArrayModule.ObservableArray([]);

    data.set("beacons", items);

    page.bindingContext = data;

    console.log("monitoring beacons");

    var options = {
        callback : function(beacons){
          var items = new observableArrayModule.ObservableArray([]);

          for (var i = 0; i < beacons.count; i++) {
             var beacon = beacons[i];
             if (beacon.major > 0){
                var identifier = "Major:" + beacon.major + " Minor:" + beacon.minor;

                var distance = "Immediate";

                if (beacon.proximity === CLProximity.Near){
                    distance = "Near";
                }
                else if (beacon.proximity === CLProximity.Far){
                   distance = "Far";
                }

                items.push({
                    "proximity" : beacon.proximity,
                    "identifier": identifier,
                    "distance":  "Distance: " + distance,
                    "rssi": "Power: " +  beacon.rssi + "dBm"
                });
             }
          }
          //items.sort(function (a, b) { return parseInt(a.proximity) > parseInt(b.proximity); });

          data.set("beacons", items);
        }
    };
    new Estimote(options).startRanging();
}

exports.pageLoaded = pageLoaded;
