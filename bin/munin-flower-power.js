#!/usr/local/bin/node
var munin = require('munin-plugin');
var async = require('async');
var addTimeout = require("addTimeout");
var debug = false;

var fpData = { complete: false, soilMoisture: 0, batteryLevel: 0, sunlight: 0, tempCelsius: 0 };

var main = function (fpData) {
    if (!fpData.complete) {
        process.exit(0);
    }
    var g = new munin.Graph('flower power data', 'info', 'plants'); // title, vlabel, category
    g.add(new munin.Model.Temperature('temp').setValue(fpData.tempCelsius));
    g.add(new munin.Model.Default('sunlight').setValue(fpData.sunlight));
    g.add(new munin.Model.Default('battery').setValue(fpData.batteryLevel));
    g.add(new munin.Model.Default('moisture').setValue(fpData.soilMoisture));
    g.sortValue();
    munin.create(g);
    process.exit(0);
};


var args = process.argv;
var opt = args[args.length - 1];
if (opt == "config") {
    fpData.complete = true;
    main(fpData);
}


var FlowerPower = require('flower-power');


FlowerPower.discover(function (flowerPower) {
    if (debug) console.log("Got here a flowerpower", flowerPower);

    async.series([
            function (callback) {
                if (debug) console.log("connect...");
                flowerPower.connect(callback);
            },
            function (callback) {
                if (debug) console.log('discoverServicesAndCharacteristics');
                flowerPower.discoverServicesAndCharacteristics(
                    addTimeout(30000,
                        function (data) {
                            if (debug) console.log("Got caracs", data);
                            callback(data);
                        },
                        function (timeout) {
                            if (debug) console.log("Caracs timed out", timeout);
                            main(fpData);
                        }
                    )
                );
            },
            function (callback) {
                if (debug) console.log('readBatteryLevel');
                flowerPower.readBatteryLevel(function (batteryLevel) {
                    fpData.batteryLevel = batteryLevel;
                    if (debug) console.log('battery level = ' + batteryLevel);
                    callback();
                });
            },
            function (callback) {
                if (debug) console.log('readSunlight');
                flowerPower.readSunlight(function (sunlight) {
                    if (debug) console.log('sunlight = ' + sunlight.toFixed(2));
                    fpData.sunlight = sunlight.toFixed(2);
                    callback();
                });
            },
            function (callback) {
                if (debug) console.log('readTemperature');
                flowerPower.readTemperature(function (temperatureC, temperatureF) {
                    if (debug) console.log('temperature = ' + temperatureC + '°C, ' + temperatureF + '°F');
                    fpData.tempCelsius = temperatureC;
                    callback();
                });
            },
            function (callback) {
                if (debug) console.log('readSoilMoisture');
                flowerPower.readSoilMoisture(function (soilMoisture) {
                    if (debug) console.log('soil moisture = ' + soilMoisture + '%');
                    fpData.soilMoisture = soilMoisture;

                    callback();
                });
            },
            function (callback) {
                if (debug) console.log('disconnect');
                flowerPower.disconnect(callback);
            },
            function (callback) {
                if (debug) console.log("A ultima...");
                fpData.complete = true;
                main(fpData);
                callback();
            }
        ]
    );


});


