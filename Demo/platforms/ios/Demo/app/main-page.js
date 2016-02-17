var vmModule = require("./main-view-model");
var view = require("ui/core/view");

var Estimote = require('nativescript-estimote-sdk');

function pageLoaded(args) {
    var page = args.object;
    page.bindingContext = vmModule.mainViewModel;

    var estimote = new Estimote();

    console.log(estimote.beconManager);
}
exports.pageLoaded = pageLoaded;
