(function () {
    var page = WinJS.UI.Pages.define("/settings/about.html", {

        ready: function (element, options) {
            WinJS.Resources.processAll();

            // Register the handlers for dismissal 
            //document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keydown", handleAltLeft);
           // document.getElementById("programmaticInvocationSettingsFlyout").addEventListener("keypress", handleBackspace);


        },

        unload: function () {
            // Remove the handlers for dismissal 
            //document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keydown", handleAltLeft);
            //document.getElementById("programmaticInvocationSettingsFlyout").removeEventListener("keypress", handleBackspace);
        },
    });

})();