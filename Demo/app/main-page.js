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

    this.options = {
        callback : function(beacons){
          var items =[];

          for (var i = 0; i < beacons.length; i++) {
             var beacon = beacons[i];
             if (beacon.major > 0){
                var distance = "NA";
                var identifier = "Major:" + beacon.major + " Minor:" + beacon.minor;

                if (beacon.proximity) {
                  distance = beacon.proximity;
                }

                var item = {
                    "proximity" : beacon.proximity,
                    "identifier": identifier,
                    "distance":  "Distance: " + distance,
                    "rssi": "Power: " +  beacon.rssi + "dBm"
                };

                items.push(item);
             }
          }

          data.set("beacons", new observableArrayModule.ObservableArray(items));
        }
    };

    new Estimote(this.options).startRanging();
}

exports.pageLoaded = pageLoaded;
