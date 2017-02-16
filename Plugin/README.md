# Estimote Plugin for NativeScript

Estimote Beacon is a super small device. It has a powerful 32-bit ARM® Cortex M0 CPU with 256kB flash memory, accelerometer, temperature sensor and most importantly – a 2.4 GHz Bluetooth 4.0 Smart (also known as BLE or Bluetooth low energy) bidirectional radio.

You can think of the beacon as a small lighthouse tower that's installed in a fixed location and broadcasts its presence to all the ships (smartphones) around. They could be as close as 2 inches and as far as 230 feet (approx. 70 metres) away.

The plugin is implemented on top of the Estimote native SDKs that lets you track beacon devices around you. It defines a global estimote object, which defines various operations that are used for tracking a beacon device.

## Prerequisites

NativeScript 1.5+ (tns --version), please upgrade if you need to.

## installation

From the command prompt go to your app's root folder and execute:

```
tns plugin add nativescript-estimote-sdk
```

For Android, add these permissions into app/App_Resources/AndroidManifest.xml
```
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
```

## Methods

- estimote.startRanging
- estimote.stopRanging

You can initialize the plugin for a region in the following way:

### Basic example

```
    var Estimote = require('nativescript-estimote-sdk');

    var options = {
      region : 'Progress', // optional
      callback : function(beacons){
        /* This is called everytime beacons are discovered or proximity changes

          for (var i = 0; i < beacons.length; i++) {
             var beacon = beacons[i];
             if (beacon.major > 0){
                 var distance = "NA";
                 var identifier = "Major:" + beacon.major + " Minor:" + beacon.minor;

                 if (beacon.proximity) {
                   distance = beacon.proximity;
                 }

                 items.push({
                     "proximity" : beacon.proximity,
                     "identifier": identifier,
                     "distance":  "Distance: " + distance,
                     "rssi": "Power: " +  beacon.rssi + "dBm"
                 });

                 console.log(json);
             }
        }
      */
    }

    var estimote = new Estimote(options);
```

### Angular Example
items.component.ts
```
import { Component, OnInit, NgZone } from "@angular/core";

var Estimote = require('nativescript-estimote-sdk');


@Component({
    selector: "ns-items",
    moduleId: module.id,
    templateUrl: "./items.component.html",
})
export class ItemsComponent implements OnInit {
    public items: Array<any>;

    constructor(private zone: NgZone) {
        this.items = [];
     }

    ngOnInit(): void {
        
        let options = {
            region : 'Progress', // optional
            callback : beacons => {
                 this.zone.run(() => {
                    
                    //console.log("My beacons: ", JSON.stringify(beacons));
                    
                    for (var i = 0; i < beacons.length; i++) {
                        var beacon = beacons[i];                       
                        
                        if (beacon.major > 0){
                            var distance = "NA";
                            var identifier = "Major:" + beacon.major + " Minor:" + beacon.minor;

                            if (beacon.proximity) {
                                distance = beacon.proximity;
                            }

                            this.items.push({
                                "proximity" : beacon.proximity,
                                "identifier": identifier,
                                "distance":  "Distance: " + distance,
                                "rssi": "Power: " +  beacon.rssi + "dBm",
                                "id": 0
                            });

                        }
                    }
                });
            }
        }

        var estimote = new Estimote(options);

        estimote.startRanging();

    }

}

```

items.component.html
```
<ActionBar title="My App" class="action-bar"></ActionBar>
<StackLayout class="page">
    <ListView [items]="items" class="list-group">
        <template let-item="item">
            <Label [nsRouterLink]="['/item', item.id]" [text]="item.identifier"
                class="list-group-item"></Label>
        </template>
    </ListView>
</StackLayout>

```

# estimote.startRanging

The method initializes the estimote beacon manager to monitor for beacons for a specified region.

    estimote.startRanging();

If an existing region with the same identifier is already being monitored by the application, the old region is replaced by the new one. The regions you add using this method are shared by all beacon and location manager objects in your application.


# estimote.stopRanging

The method stops the estimote beacon manager for monitoring beacons.

    estimote.stopRanging();

## Platform

- iOS (NativeScript 1.5+)
- Android (NativeScript 1.5+)
