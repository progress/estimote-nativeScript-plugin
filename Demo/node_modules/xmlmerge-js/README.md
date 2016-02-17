xmlmerge-js
===========

**mlmerge-js** is a tool to merge xml file.

It was originally designed to merge the various xml configuration files, such as **AndroidManifest.xml**.

    <?xml version="1.0" encoding="utf-8"?>
    
    <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.heysdk.demo" android:versionCode="1" android:versionName="1.0" android:installLocation="auto">  
      <uses-sdk android:minSdkVersion="14"/>  
      <uses-feature android:glEsVersion="0x00020000"/>  
      <application android:label="@string/app_name" android:icon="@drawable/icon"> 
        <activity android:name=".heysdkdemo" android:label="@string/app_name" android:screenOrientation="landscape" android:theme="@android:style/Theme.NoTitleBar.Fullscreen" android:configChanges="orientation"> 
          <intent-filter> 
            <action android:name="android.intent.action.MAIN"/>  
            <category android:name="android.intent.category.LAUNCHER"/> 
          </intent-filter> 
        </activity> 
      </application>  
      <supports-screens android:largeScreens="true" android:smallScreens="true" android:anyDensity="true" android:normalScreens="true"/>  
      <uses-permission android:name="android.permission.INTERNET"/> 
    </manifest>


This is a simple **AndroidManifest.xml**, we want to add a set of properties

    <?xml version="1.0" encoding="utf-8"?>

    <manifest xmlns:android="http://schemas.android.com/apk/res/android">  
      <application> 
        <activity android:name="com.qvod.pay.ChargeActivity" android:configChanges="keyboardHidden|orientation|screenSize"></activity>  
        <activity android:name="com.unionpay.uppay.PayActivityEx" android:configChanges="orientation|keyboardHidden|screenSize" android:excludeFromRecents="true" android:label="@string/app_name" android:screenOrientation="portrait" android:windowSoftInputMode="adjustResize"/> 
      </application>  
      <uses-permission android:name="android.permission.INTERNET"/>  
      <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>  
      <uses-permission android:name="android.permission.CALL_PHONE"/>  
      <uses-permission android:name="android.permission.READ_PHONE_STATE"/>  
      <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>  
      <uses-permission android:name="android.permission.READ_PHONE_STATE"/> 
    </manifest>
    
In fact, these two xml merge together, in order to facilitate the merger xml, we need a simple configuration, for example, tells **mlmerge-js** that *manifest* and *application* is a direct match, no matches any attribute, and *activity* and *uses-permission* is required to match *android:name*, so add properties to avoid duplication, so we offer a csv profile.

    nodename,attrname
    manifest,*
    application,*
    activity,android:name
    uses-permission,android:name

Thus, **mlmerge-js** will be able to merge two xml correct, the results are as follows:

    <?xml version="1.0" encoding="utf-8"?>

    <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.heysdk.demo" android:versionCode="1" android:versionName="1.0" android:installLocation="auto">  
      <uses-sdk android:minSdkVersion="14"/>  
      <uses-feature android:glEsVersion="0x00020000"/>  
      <application android:label="@string/app_name" android:icon="@drawable/icon"> 
        <activity android:name=".heysdkdemo" android:label="@string/app_name" android:screenOrientation="landscape" android:theme="@android:style/Theme.NoTitleBar.Fullscreen" android:configChanges="orientation"> 
          <intent-filter> 
            <action android:name="android.intent.action.MAIN"/>  
            <category android:name="android.intent.category.LAUNCHER"/> 
          </intent-filter> 
        </activity>  
        <activity android:name="com.qvod.pay.ChargeActivity" android:configChanges="keyboardHidden|orientation|screenSize"/>  
        <activity android:name="com.unionpay.uppay.PayActivityEx" android:configChanges="orientation|keyboardHidden|screenSize" android:excludeFromRecents="true" android:label="@string/app_name" android:screenOrientation="portrait" android:windowSoftInputMode="adjustResize"/>  
        <activity android:name="com.unionpay.uppay.PayActivity" android:configChanges="orientation|keyboardHidden|screenSize" android:excludeFromRecents="true" android:screenOrientation="portrait" android:theme="@style/Theme.UPPay"/> 
      </application>  
      <supports-screens android:largeScreens="true" android:smallScreens="true" android:anyDensity="true" android:normalScreens="true"/>  
      <uses-permission android:name="android.permission.INTERNET"/>  
      <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>  
      <uses-permission android:name="android.permission.CALL_PHONE"/>  
      <uses-permission android:name="android.permission.READ_PHONE_STATE"/>  
      <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/> 
    </manifest>

**mlmerge-js** examples in *samples* of *test.js* next

    var xmlmerge = require('../xmlmerge.js');
    var fs = require('fs');
    var csv2obj = require("../csv2obj");

    fs.readFile('samples/AndroidManifest.xml', function(err, data) {
        var str1 = data.toString();

        fs.readFile('samples/kuaiwan.xml', function(err, data) {
            var str2 = data.toString();

            fs.readFile('samples/AndroidManifest.csv', function(err, data) {

                config = csv2obj.csv2obj(data.toString());

                xmlmerge.merge(str1, str2, config, function (xml) {
                    fs.writeFile('samples/output.xml', xml, function (err) {

                    });
                });
            });
        });
    });
