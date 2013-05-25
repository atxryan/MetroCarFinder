

(function () {
    var cities = [];

    var page = WinJS.UI.Pages.define("/settings/settings.html", {

        ready: function (element, options) {
            WinJS.Resources.processAll();

            // Register the handlers for dismissal 
            document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keydown", handleAltLeft);
            document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keypress", handleBackspace);


            // populate cities select dropdown
            getCities();

            //document.getElementById("Authenticate").addEventListener("click", MCF.launchCar2GoWebAuth);

            document.getElementById("fuel").value = MCF.options.fuel;

            document.getElementById("fuel").addEventListener("blur", function () {
                MCF.options.fuel = this.value;
                MCF.getAllCars();
            });

            document.getElementById("Settings-Cities").addEventListener("change", function () {
                var select = this;
                MCF.options.city = select.value;


                var localSettings = Windows.Storage.ApplicationData.current.localSettings;
                localSettings.values["userCity"] = select.value;

                document.getElementsByClassName("CurrentCity")[0].innerText = select.value;

                // Set the map center

                cities.forEach(function (city) {
                    if (city.locationName === select.value) {
                        var myLocation = new Microsoft.Maps.Location(city.mapSection.center.latitude, city.mapSection.center.longitude);
                        MCF.map.setView({ center: myLocation });

                        localSettings.values["userLatitude"] = city.mapSection.center.latitude;
                        localSettings.values["userLongitude"] = city.mapSection.center.longitude;
                    }
                });

                MCF.getAllCars();

                // Load resources.
                // loadResources();
                // Enable listener so they get updated when user changes language selection.
                // WinJS.Resources.addEventListener("contextchanged", loadResources);

            });

            var applicationLanguages = Windows.Globalization.ApplicationLanguages.languages;
            //var currentLanguage = document.getElementById("CurrentLanguage");
            //currentLanguage.innerText = "The application language(s) are: " + applicationLanguages;

        },

        unload: function () {
            // Remove the handlers for dismissal 
            document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keydown", handleAltLeft);
            document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keypress", handleBackspace);
        },
    });
    var page = WinJS.UI.Pages.define("/settings/privacy.html", {

        ready: function (element, options) {
            WinJS.Resources.processAll();

            // Register the handlers for dismissal 
            document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keydown", handleAltLeft);
            document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keypress", handleBackspace);
        },
        unload: function () {
            // Remove the handlers for dismissal 
            document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keydown", handleAltLeft);
            document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keypress", handleBackspace);
        }
    });
    var page = WinJS.UI.Pages.define("/settings/about.html", {

        ready: function (element, options) {
            WinJS.Resources.processAll();

            // Register the handlers for dismissal 
            document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keydown", handleAltLeft);
            document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keypress", handleBackspace);
        },
        unload: function () {
            // Remove the handlers for dismissal 
            document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keydown", handleAltLeft);
            document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keypress", handleBackspace);
        }
    });

    function handleAltLeft(evt) {
        // Handles Alt+Left in the control and dismisses it 
        if (evt.altKey && evt.key === 'Left') {
            WinJS.UI.SettingsFlyout.show();
        }
    };

    function handleBackspace(evt) {
        // Handles the backspace key or alt left arrow in the control and dismisses it 
        if (evt.key === 'Backspace') {
            WinJS.UI.SettingsFlyout.show();
        }
    };

    function getCities() {
        // {"countryCode":"DE","defaultLanguage":"de","locationId":1,"locationName":"Ulm","mapSection":{"center":{"latitude":48.3987,"longitude":9.9968},"lowerRight":{"latitude":48.31105789,"longitude":10.06828308},"upperLeft":{"latitude":48.48111472,"longitude":9.8588562}},"timezone":"Europe/Berlin"}
        var cities_url = "https://www.car2go.com/api/v2.1/locations?oauth_consumer_key=" + Config.car2go.OAuth.consumerKey + "&format=json";

        WinJS.xhr({ url: cities_url }).done(
        function fulfilled(result) {
            if (result.status === 200) {
                var cities_json = JSON.parse(result.responseText);
                cities = new WinJS.Binding.List(cities_json.location);

                var select = document.getElementById("Settings-Cities");

                cities.forEach(function (city) {
                    var option = document.createElement("option");
                    option.value = city.locationName;
                    option.innerText = city.locationName;
                    option.setAttribute("data-long", city.mapSection.center.latitude);
                    option.setAttribute("data-lat", city.mapSection.center.longitude);

                    if (city.locationName === MCF.options.city) {
                        option.setAttribute("selected", "selected");
                    }

                    select.appendChild(option);
                });
            }
        });
    }
})();


(function () {
    "use strict";

    var appLanguages = Windows.Globalization.ApplicationLanguages;
    var languages = appLanguages.languages;
    var manifestLanguages = appLanguages.manifestLanguages;
    var override = appLanguages.primaryLanguageOverride;

    // A custom WinJS control for letting users override language
    // Default Option is the text displayed by default in the drop down (defaults to English text)
    var DisplayLanguageOverridePicker = WinJS.Class.define(function (element, options) {
        this.element = element;
        element.winControl = this;

        // Set defaults and then options
        this.defaultOption = 'Use language preferences (recommended)';
        WinJS.UI.setOptions(this, options);

        // First show the default setting
        this._addOption(this.defaultOption, "");

        var that = this;

        // If there are other languages the user speaks that aren't the default show them first before a separator
        if (override !== '' || languages.size > 1) {
            languages.forEach(function (langTag, index) {
                if ((override === '' && index !== 0) || (override !== '' && index !== 1)) {
                    that.addLanguage(langTag);
                }
            });
            this._addOption("——————", "", true);
        }

        // Finally, add the rest of the languages the app supports
        var list = new WinJS.Binding.List(manifestLanguages);
        list.sort(function (a, b) {
            var langA = new Windows.Globalization.Language(a).displayName;
            var langB = new Windows.Globalization.Language(b).displayName;
            return langA - langB;
        });
        list.forEach(function (langTag) {
            that.addLanguage(langTag);
        });

        this.element.addEventListener("change", this._change, false);

    }, {

        addLanguage: function (langTag) {
            var lang = new Windows.Globalization.Language(langTag);
            var text = (lang.nativeName === lang.displayName) ? lang.displayName : lang.displayName + " - " + lang.nativeName;
            this._addOption(text, langTag, false, (langTag && langTag === override));
        },

        _addOption: function (text, value, disabled, selected) {
            var option = document.createElement('option');
            option.value = value;
            option.selected = selected || false;
            option.disabled = disabled || false;
            option.textContent = text;
            this.element.appendChild(option);
        },

        // Sets the primary langauge override so resources, the host and other things attempt to load
        // according to it first.
        _change: function () {
            appLanguages.primaryLanguageOverride = this.value;
            WinJS.Resources.processAll();
        }

    });


    WinJS.Namespace.define("Sample", {
        DisplayLanguageOverridePicker: DisplayLanguageOverridePicker
    });
})();