
var MCF = MCF || {};

(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;

    app.onactivated = function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                
                Microsoft.Maps.loadModule('Microsoft.Maps.Map', { callback: initMap, culture: "en-us", homeRegion: "US" });

                // Process localization files;
                WinJS.Resources.processAll();
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }
            
            args.setPromise(WinJS.UI.processAll());
        }
    };

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. You might use the
        // WinJS.Application.sessionState object, which is automatically
        // saved and restored across suspension. If you need to complete an
        // asynchronous operation before your application is suspended, call
        // args.setPromise().
    };

    WinJS.Application.onsettings = function (e) {
        var rS = new Windows.ApplicationModel.Resources.ResourceLoader("/resources");

        e.detail.applicationcommands = {
            "settings": { title: rS.getString("Settings"), href: "/settings/settings.html" },
            "about": { title: rS.getString("About"), href: "/settings/about.html" },
            "privacy": { title: rS.getString("Privacy_policy"), href: "/settings/privacy.html" },
            "share": { title: rS.getString("Share_app"), href: "/settings/shareapp.html" }
        };
        WinJS.UI.SettingsFlyout.populateSettings(e);
    };

    app.start();




    var options = {
        city: "Austin",
        mapStyle: "auto",
        unitOfLength: "miles",
        showParking: false,
        fuel: 0,
        latitude: "30.2794",
        longitude: "-97.7434"
    };

    var map;

    var page = WinJS.UI.Pages.define("default.html", {
        ready: function (element, options) {

            document.getElementById("GetLocation")
                .addEventListener("click", getGeolocation, false);
            document.getElementById("GetAllCars")
                .addEventListener("click", getAllCars, false);
            document.getElementById("ShowParkingSpots")
                .addEventListener("click", getParkingSpots, false);
        },
    });

    function initMap() {
        var localSettings = Windows.Storage.ApplicationData.current.localSettings;
        MCF.options.city = localSettings.values["userCity"] || MCF.options.city;
        MCF.options.latitude = localSettings.values["userLatitude"] || MCF.options.latitude;
        MCF.options.longitude = localSettings.values["userLongitude"] || MCF.options.longitude;

        try {
            var mapOptions = {
                credentials: Config.Bing.Maps.credentials,
                center: new Microsoft.Maps.Location(MCF.options.latitude, MCF.options.longitude),
                mapTypeId: Microsoft.Maps.MapTypeId.auto,
                //width: window.innerWidth - 200, height: window.innerHeight,
                zoom: 15
            };
            MCF.map = new Microsoft.Maps.Map(document.getElementById("MapDiv"), mapOptions);

            map = MCF.map;

            //getGeolocation();
            getAllCars();
        }
        catch (e) {
            var md = new Windows.UI.Popups.MessageDialog(e.message);
            md.showAsync();
        }

        document.getElementsByClassName("CurrentCity")[0].innerText = options.city;
    }

    function getGeolocation() {
        var geolocator = Windows.Devices.Geolocation.Geolocator();

        var promise = geolocator.getGeopositionAsync();
        promise.done(
            function (pos) {
                var coord = pos.coordinate;

                // Set the map center
                var myLocation = new Microsoft.Maps.Location(coord.latitude, coord.longitude);
                map.setView({ center: myLocation, zoom: 18 });

                var pin = new Microsoft.Maps.Pushpin(myLocation, { width: 50, height: 50, draggable: false });
                map.entities.push(pin);

            },
            function (err) {
                    var md = new Windows.UI.Popups.MessageDialog("Your location could not be determined. \n\nError Details: " + err.message);
                    md.showAsync();
            }
        );
    }

    function getAllCars() {
        // Clear existing cars/pushpins
        MCF.map.entities.clear();

        var all_cars_url = "http://www.car2go.com/api/v2.1/vehicles?loc=" + encodeURIComponent(options.city) + "&oauth_consumer_key=" + Config.car2go.OAuth.consumerKey + "&format=json";

        WinJS.xhr({ url: all_cars_url }).done(
        function fulfilled(result) {
            if (result.status === 200) {
                addCarsToMap(result.responseText);                
            }
        }); 
    }

    function addCarsToMap(cars_response) {
        /* //Example car
        {
            "placemarks":[{
                "address":"E Dean Keeton St 509, 78705 Austin",
                "coordinates":[-97.73328,30.28911,0],
                "engineType":"CE",
                "exterior":"GOOD",
                "fuel":45,
                "interior":"GOOD",
                "name":"CK9 T356",
                "vin":"WMEEJ3BAXAK416445"
            }]
        }
        */

        var cars_json = JSON.parse(cars_response);
        var cars = new WinJS.Binding.List(cars_json.placemarks);
        var carLocation, pin;

        cars.forEach(function (car) {
            if (car.fuel >= options.fuel) {
                carLocation = new Microsoft.Maps.Location(car.coordinates[1], car.coordinates[0]);

                pin = new Microsoft.Maps.Pushpin(carLocation, {
                    icon: (car.engineType == "CE") ? "/images/pin_car.png" : "/images/pin_car.png", width: 42, height: 56, draggable: false, anchor: new Microsoft.Maps.Point(11, 35),
                });

                pin.title = car.name;
                pin.description = "Address: " + car.address + "<br />"
                                + "Fuel: " + car.fuel + "%<br />"
                                + "Interior: " + car.interior + "<br/>"
                                + "Exterior: " + car.exterior;

                map.entities.push(pin);
                Microsoft.Maps.Events.addHandler(pin, 'click', showCarDetails);

            }

        });

    }

    function addParkingSpotsToMap(parking_response) {    

        var parking_json = JSON.parse(parking_response);
        var spots = new WinJS.Binding.List(parking_json.placemarks);
        var parkingLocation, pin;

        spots.forEach(function (spot) {
            parkingLocation = new Microsoft.Maps.Location(spot.coordinates[1], spot.coordinates[0]);

            pin = new Microsoft.Maps.Pushpin(parkingLocation, { icon: "/images/pin_parking.png",
                width: 50, height: 50, draggable: false, anchor: new Microsoft.Maps.Point(11, 35),
            });

            pin.title = spot.name;
            pin.description = "Address: " + spot.address + "<br />";

            map.entities.push(pin);
           // Microsoft.Maps.Events.addHandler(pin, 'click', showCarDetails);

        });

    }

    function showCarDetails(e) {
        if (e.targetType == "pushpin") {
            showInfobox(e.target);
        }       
    }

    function showInfobox(shape) {
        for (var i = map.entities.getLength() - 1; i >= 0; i--) {
            var pushpin = map.entities.get(i);
            if (pushpin.toString() == '[Infobox]') {
                map.entities.removeAt(i);
            };
        }


        var infoboxOptions = {
            showCloseButton: true,
            zIndex: 10,
            offset: new Microsoft.Maps.Point(50, 50),
            showPointer: false,
            htmlContent: '<div class="infobox" style="">' +
                '<h3 id="infoboxTitle">' + shape.title + '</h3><p id="infoboxDescription">' + shape.description + '</p>' +
                '<div id="infoboxAd" style="width: 250px; height: 125px; z-index: 1" data-win-control="MicrosoftNSJS.Advertising.AdControl"></div></div>'

        };
        var defInfobox = new Microsoft.Maps.Infobox(shape.getLocation(), infoboxOptions);
        map.entities.push(defInfobox);

        var infoboxAd = document.getElementById("infoboxAd");
        var adControl = new MicrosoftNSJS.Advertising.AdControl(infoboxAd,
                        {
                            applicationId: Config.Bing.Ads.applicationId,
                            adUnitId: Config.Bing.Ads.adUnit_250x125
                        });
        adControl.isAutoRefreshEnabled = true;
        


        //A buffer limit to use to specify the infobox must be away from the edges of the map.
        var buffer = 25;

        var infoboxOffset = defInfobox.getOffset();
        var infoboxAnchor = defInfobox.getAnchor();
        var infoboxLocation = map.tryLocationToPixel(shape.getLocation(), Microsoft.Maps.PixelReference.control);

        var dx = infoboxLocation.x + infoboxOffset.x - infoboxAnchor.x;
        var dy = infoboxLocation.y - 25 - infoboxAnchor.y;

        if (dy < buffer) {    //Infobox overlaps with top of map.
            //Offset in opposite direction.
            dy *= -1;

            //add buffer from the top edge of the map.
            dy += buffer;
        } else {
            //If dy is greater than zero than it does not overlap.
            dy = 0;
        }

        if (dx < buffer) {    //Check to see if overlapping with left side of map.
            //Offset in opposite direction.
            dx *= -1;

            //add a buffer from the left edge of the map.
            dx += buffer;
        } else {              //Check to see if overlapping with right side of map.
            dx = map.getWidth() - infoboxLocation.x + infoboxAnchor.x - defInfobox.getWidth();

            //If dx is greater than zero then it does not overlap.
            if (dx > buffer) {
                dx = 0;
            } else {
                //add a buffer from the right edge of the map.
                dx -= buffer;
            }
        }

        //Adjust the map so infobox is in view
        if (dx != 0 || dy != 0) {
            map.setView({ centerOffset: new Microsoft.Maps.Point(dx, dy), center: map.getCenter() });
        }
    }

    function getParkingSpots() {

        var parking_spots_url = "https://www.car2go.com/api/v2.1/parkingspots?loc=" + encodeURIComponent(options.city) + "&oauth_consumer_key=" + Config.car2go.OAuth.consumerKey + "&format=json";

        WinJS.xhr({ url: parking_spots_url }).done(
        function fulfilled(result) {
            if (result.status === 200) {
                addParkingSpotsToMap(result.responseText);
            }
        });
    }

    function getOperatingAreas() {
        var operating_area_coords = "https://www.car2go.com/api/v2.1/operationareas?loc=" + encodeURIComponent(options.city) + "&oauth_consumer_key=" + Config.car2go.OAuth.consumerKey + "&format=json";

        WinJS.xhr({ url: operating_area_coords }).done(
        function fulfilled(result) {
            if (result.status === 200) {
                drawOperatingArea(result.responseText);
            }
        });
    }

    function drawOperatingArea(areas) {
        //var placemarks = JSON.parse(areas);

        var austin = { "coordinates": [-97.803764, 30.247667, 0, -97.80135, 30.243715, 0, -97.79953, 30.244303, 0, -97.79891, 30.243559, 0, -97.79791, 30.244015, 0, -97.797325, 30.242996, 0, -97.79812, 30.241777, 0, -97.796646, 30.239462, 0, -97.7962, 30.23909, 0, -97.79586, 30.238434, 0, -97.79512, 30.238388, 0, -97.791405, 30.241259, 0, -97.788956, 30.24, 0, -97.78828, 30.239416, 0, -97.79142, 30.237114, 0, -97.79046, 30.235912, 0, -97.790306, 30.233915, 0, -97.791885, 30.231901, 0, -97.7902, 30.231138, 0, -97.78656, 30.229366, 0, -97.784256, 30.228405, 0, -97.78194, 30.228064, 0, -97.774925, 30.227793, 0, -97.771706, 30.22775, 0, -97.769295, 30.226713, 0, -97.7637, 30.223124, 0, -97.76112, 30.221622, 0, -97.75652, 30.219439, 0, -97.7545, 30.222763, 0, -97.75254, 30.221148, 0, -97.75335, 30.219566, 0, -97.74993, 30.218092, 0, -97.748276, 30.220882, 0, -97.74464, 30.219244, 0, -97.74521, 30.216824, 0, -97.74348, 30.216429, 0, -97.74105, 30.216225, 0, -97.73236, 30.215136, 0, -97.72625, 30.214287, 0, -97.72203, 30.213863, 0, -97.71211, 30.212427, 0, -97.71027, 30.214928, 0, -97.70926, 30.215664, 0, -97.70659, 30.22005, 0, -97.70603, 30.220646, 0, -97.692924, 30.24112, 0, -97.69069, 30.243412, 0, -97.692, 30.250244, 0, -97.70108, 30.256186, 0, -97.67745, 30.29371, 0, -97.68877, 30.299377, 0, -97.6902, 30.300928, 0, -97.692345, 30.301537, 0, -97.69503, 30.301603, 0, -97.698074, 30.302841, 0, -97.69915, 30.304077, 0, -97.71012, 30.309565, 0, -97.708496, 30.31292, 0, -97.70804, 30.31494, 0, -97.70672, 30.32275, 0, -97.71275, 30.321304, 0, -97.71384, 30.32188, 0, -97.71478, 30.322687, 0, -97.71544, 30.323744, 0, -97.715744, 30.324583, 0, -97.71588, 30.325542, 0, -97.71593, 30.326622, 0, -97.71586, 30.32752, 0, -97.71551, 30.330357, 0, -97.7157, 30.331703, 0, -97.71797, 30.336205, 0, -97.71845, 30.33715, 0, -97.71859, 30.337715, 0, -97.71829, 30.338556, 0, -97.71589, 30.34232, 0, -97.71451, 30.344425, 0, -97.71223, 30.347755, 0, -97.713905, 30.348244, 0, -97.714584, 30.348518, 0, -97.72322, 30.352604, 0, -97.73088, 30.356203, 0, -97.73438, 30.357824, 0, -97.74012, 30.360746, 0, -97.74079, 30.36103, 0, -97.74151, 30.361229, 0, -97.74398, 30.361305, 0, -97.74548, 30.361359, 0, -97.74643, 30.36159, 0, -97.74819, 30.362862, 0, -97.7491, 30.363594, 0, -97.74954, 30.364235, 0, -97.75022, 30.365114, 0, -97.7506, 30.365477, 0, -97.75112, 30.365807, 0, -97.75255, 30.366648, 0, -97.75333, 30.367155, 0, -97.754105, 30.367937, 0, -97.7549, 30.36651, 0, -97.75497, 30.36618, 0, -97.75524, 30.365927, 0, -97.75557, 30.365826, 0, -97.75514, 30.365532, 0, -97.75505, 30.365273, 0, -97.75512, 30.364996, 0, -97.75544, 30.364483, 0, -97.75642, 30.363066, 0, -97.75725, 30.36192, 0, -97.757645, 30.36124, 0, -97.75813, 30.36075, 0, -97.7585, 30.360577, 0, -97.758865, 30.360525, 0, -97.75909, 30.360369, 0, -97.76104, 30.35717, 0, -97.75949, 30.356577, 0, -97.757904, 30.35586, 0, -97.753075, 30.353518, 0, -97.750946, 30.352499, 0, -97.75039, 30.35224, 0, -97.74972, 30.352058, 0, -97.74888, 30.351837, 0, -97.74944, 30.349628, 0, -97.750595, 30.346682, 0, -97.755394, 30.336536, 0, -97.75573, 30.330807, 0, -97.755905, 30.321396, 0, -97.75739, 30.309088, 0, -97.75957, 30.309467, 0, -97.760735, 30.309744, 0, -97.76125, 30.309875, 0, -97.76177, 30.310045, 0, -97.76266, 30.31055, 0, -97.76328, 30.310993, 0, -97.76399, 30.311731, 0, -97.76422, 30.311926, 0, -97.76599, 30.312971, 0, -97.76758, 30.31381, 0, -97.769035, 30.314526, 0, -97.77011, 30.314135, 0, -97.77096, 30.31348, 0, -97.77147, 30.313147, 0, -97.772, 30.312904, 0, -97.77245, 30.31276, 0, -97.77317, 30.312626, 0, -97.77357, 30.312572, 0, -97.77382, 30.31259, 0, -97.77479, 30.312836, 0, -97.775215, 30.312616, 0, -97.775604, 30.312023, 0, -97.77665, 30.308615, 0, -97.776024, 30.307838, 0, -97.77646, 30.307184, 0, -97.77729, 30.305965, 0, -97.7818, 30.301716, 0, -97.78391, 30.29825, 0, -97.78418, 30.297373, 0, -97.78392, 30.296986, 0, -97.78389, 30.296537, 0, -97.78372, 30.294333, 0, -97.78362, 30.292046, 0, -97.780426, 30.287811, 0, -97.77879, 30.285728, 0, -97.776886, 30.28311, 0, -97.776184, 30.282099, 0, -97.775314, 30.280933, 0, -97.77619, 30.280533, 0, -97.77673, 30.280067, 0, -97.776825, 30.27953, 0, -97.77636, 30.279247, 0, -97.774475, 30.27772, 0, -97.77508, 30.277079, 0, -97.771095, 30.27464, 0, -97.77259, 30.2726, 0, -97.77384, 30.271008, 0, -97.774536, 30.27041, 0, -97.77952, 30.267216, 0, -97.78246, 30.265686, 0, -97.785675, 30.264174, 0, -97.7892, 30.262203, 0, -97.794754, 30.259487, 0, -97.798584, 30.25735, 0, -97.79966, 30.256561, 0, -97.80052, 30.255512, 0, -97.80088, 30.254911, 0, -97.80195, 30.251844, 0, -97.80276, 30.249435, 0, -97.803764, 30.247667, 0], "name": "Austin Home Area", "zoneType": "included" };

        //console.log(placemarks);

        var points = [];


        for (var i = 0; i < austin.coordinates.length; i = i+3) {
            points.push(new Microsoft.Maps.Location(austin.coordinates[i], austin.coordinates[i + 1]));
        }

        console.log(points);

        var polygon = new Microsoft.Maps.Polyline(points);

        MCF.map.entities.push(polygon);
    }

    // api to use Rest direction service
    function getDD() {
        Microsoft.Maps.loadModule('Microsoft.Maps.Directions', { callback: createDrivingDirections });
    }

    function createDrivingDirections() {
        document.getElementById("directionsItinerary").style.display = "block";
        document.getElementById("MapDiv").style.width = "75%";
        var directionsManager;
        directionsManager = new Microsoft.Maps.Directions.DirectionsManager(map);
        // Set Route Mode to driving 
        directionsManager.setRequestOptions({ routeMode: Microsoft.Maps.Directions.RouteMode.walking });
        var seattleWaypoint = new Microsoft.Maps.Directions.Waypoint({ address: 'Seattle, WA' });
        directionsManager.addWaypoint(seattleWaypoint);
        var tacomaWaypoint = new Microsoft.Maps.Directions.Waypoint({ address: 'Tacoma, WA', location: new Microsoft.Maps.Location(47.255134, -122.441650) });
        directionsManager.addWaypoint(tacomaWaypoint);
        // Set the element in which the itinerary will be rendered
        directionsManager.setRenderOptions({ itineraryContainer: document.getElementById('directionsItinerary') });
        directionsManager.calculateDirections();
    }



    var authzInProgress = false;

    function launchCar2GoWebAuth() {
        //IMPORTANT: Update twitterConsumerKey, twitterConsumerSecret, userOAuthToken, userOAuthTokenSecret
            //with your info to experiment.  If you don't have the user access tokens you'll get some the first 
            //time through.
            var errMsg,
                dialog,
                accessTokensNode = document.getElementById('access_tokens'),
                twitterResponseNode = document.getElementById('twitter-response'),
                Car2goOAuthInstance;

            //If the user has yet to approve your app then launch the web auth form,
            //do the handshake, and get their approved token info now...
            if (Config.car2go.OAuth.userOAuthToken === '' || Config.car2go.OAuth.userOAuthToken === '') {
                Car2goOAuthInstance = new Car2goOAuth(Config.car2go.OAuth.consumerKey, Config.car2go.OAuth.consumerSecret);

                Car2goOAuthInstance.doTwitterWebAuth(function (usersCar2goOAuthInfo) {
                    if (usersCar2goOAuthInfo) {
                        /* 
                        The OAuth instance is automatically updated with the access token info we were just granted.
                        This allows us to make signed requests on the users behalf.  These keys are
                        permanent unless revoked by the user, so in your app you'll probably want to store them for
                        future requests. 
                        */
                        twitterResponseNode.innerHTML = usersCar2goOAuthInfo;

                        //Output the tokens as well just for reference
                        accessTokensNode.innerHTML = JSON.stringify(usersCar2goOAuthInfo);
                        accessTokensNode.className = ''; //show it

                        getSampleTwitterProfile(Car2goOAuthInstance, function (profile) {
                            twitterResponseNode.innerHTML = JSON.stringify(profile);
                        });
                    } else {
                        errMsg = 'Twitter authentication failed or was cancelled!';
                        dialog = Windows.UI.Popups.MessageDialog(errMsg);
                        dialog.showAsync();
                    }
                });
            } else {
                //With all the neccesary credentials in place we can make signed requests to Twitter on the user's behalf
                Car2goOAuthInstance = new Car2goOAuth(Config.car2go.OAuth.consumerKey, Config.car2go.OAuth.consumerSecret,
                                                            Config.car2go.OAuth.userOAuthToken, Config.car2go.OAuth.userOAuthTokenSecret);

                getSampleTwitterProfile(Car2goOAuthInstance, function (profile) {
                    twitterResponseNode.innerHTML = "Test " + profile;
                });
            }
    }

    //Fetch a sample Twitter profile for demo purposes
    function getSampleTwitterProfile(Car2goOAuthInstance, callback) {
        var queryParams,
            url = 'https://www.car2go.com/api/v2.1/accounts';

        queryParams = {
            'loc': 'Austin'
        };

        Car2goOAuthInstance.sendAuthorizedRequestForUser(url, 'GET', queryParams)
            .then(function (response) {
                callback(response);
            })
            .done();
    }

    // Handle loading of resources.
    function loadResources() {
        WinJS.Resources.processAll();
    }


    // Leak 
    MCF.options = options;
    MCF.getAllCars = getAllCars;
    MCF.launchCar2GoWebAuth = launchCar2GoWebAuth;
    MCF.getDD = getDD;
    //MCF.map = map;

})();


function showSettings() {
    WinJS.UI.SettingsFlyout.showSettings("settings", "/settings/settings.html");
}



WinJS.Utilities.markSupportedForProcessing(
        window.myAdError = function (sender, msg) {
            // place code here for when there is an error serving an ad.
            // e.g. you may opt to show a default experience, or reclaim the div for other purposes.
            console.log(sender);
            console.log(msg);
        });

WinJS.Utilities.markSupportedForProcessing(
window.myAdRefreshed = function (sender) {
    // place code here that you wish to execute when the ad refreshes.
});

WinJS.Utilities.markSupportedForProcessing(
window.myAdEngagedChanged = function (sender) {
    if (true == sender.isEngaged) {
        // code here for when user engaged with ad, e.g. if a game, pause it.
    }
    else {
        // user no longer engaged with ad, include code to unpause.
    }
});