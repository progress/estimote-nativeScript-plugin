xmlmerge-js
===========

**mlmerge-js** 是一个合并xml的工具库。

它的最初目的是用来合并各种xml配置文件的，譬如**AndroidManifest.xml**。

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


这是一个普通的**AndroidManifest.xml**，我们想为它增加一组属性

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
    
其实就是将这2个xml合并在一起，为了方便的合并xml，我们需要一个简单的配置，譬如告诉**mlmerge-js** *manifest* 和 *application* 是直接匹配的，不需要匹配任何属性，而*activity* 和 *uses-permission* 是需要匹配 *android:name* 的，这样避免重复添加属性，那么我们提供了一个csv的配置文件。

    nodename,attrname
    manifest,*
    application,*
    activity,android:name
    uses-permission,android:name

这样，**mlmerge-js**就能正确的合并2个xml了，结果如下：

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

**mlmerge-js**的例子在*samples*的*test.js*下

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
