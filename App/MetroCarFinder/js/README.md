Config file
=
You'll need a Bing Maps developer account and application key.

```
WinJS.Namespace.define("Config.Bing.Maps", {
    credentials: 'YOUR_KEY_HERE'
});
```

You'll need a car2go API key. Leave the user token and token secrets empty. These namespaces will be used to store user acount tokens after oAuth authentication.

```
WinJS.Namespace.define("Config.car2go.OAuth", {
    consumerKey: 'YOUR_CONSUMER KEY',
    consumerSecret: 'YOUR_CONSUMER_SECRET',
    userOAuthToken: '',
    userOAuthTokenSecret: ''
});
```