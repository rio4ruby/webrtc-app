# AT&T API WebRTC Sample Application

This sample app demonstrates the features of the AT&T Enhanced WebRTC API, enabling you to quickly test the
API, view code snippets, and better understand the elements of this API.

This file covers basic setup, configuration, and launch of the sample app, including steps required to register the app, generate the API app key and app secret, configure Sinatra, and run the fully functional sample
app. For more detailed information, requirements, and code examples, see the [AT&T Enhanced WebRTC SDK page](http://developer.att.com/sdks-plugins/enhanced-webrtc) on the AT&T Developer Program Web site.

 - [Registration](#registration)
 - [Installation](#install)
 - [Configuration](#config)
 - [Running the App](#running)

## <a name="registration"></a> Registration

This section describes the necessary steps to register an app with
the proper services and endpoints.

To register an app and obtain the appropriate keys for AT&T APIs, you must enroll in the AT&T Developer
Program at the
[AT&T Developer Program Web site](http://developer.att.com/). If you don't have an existing account, you can create one by clicking "Get Started Free." Your account must have premium access in order to use the
WebRTC API.

To register an app:

1. Sign in to your AT&T Developer Program account
2. Select _My Apps_
3. Click _Set Up New App_ and enter the required information.
4. Choose _Enhanced WebRTC_ from the list of APIs.
5. Complete the information necessary to use Enhanced WebRTC.

**Note:** the **OAuth Redirect URL** field must contain
the URL where you want the OAuth provider to redirect users when they
successfully authenticate and authorize your app.

Once your app is registered, you will receive
an App Key and App Secret, which enable your app to communicate
with AT&T Enhanced WebRTC API.

A newly registered app is restricted to the Sandbox
environment. When you're ready to move it to the Production environment, click
**Promote to production**. The Production environment uses a different App Key and App Secret, which you must replace in the appropriate locations in your app.

Depending on the type of authentication you configure, your app may use
either the Autonomous Client or the Web-Server Client OAuth flow. For more information, see the
[OAuth page](https://developer.att.com/apis/oauth-2/docs) on the AT&T Developer Program Web site.

## <a name="install"></a> Installing

**Requirements**

To run the sample app, you will need ruby 1.8+ and a few ruby gems that the
apps are built upon:
  
* [sinatra](http://www.sinatrarb.com/) 
* [sinatra-contrib](https://github.com/sinatra/sinatra-contrib)
* [rest-client](https://github.com/rest-client/rest-client)
* [json](http://json.rubyforge.org/)
* [att-codekit](https://github.com/attdevsupport/codekit-ruby)
  
The easiest way to install the required gems is to use Bundler.

To install Bundler, use the following command:

    gem install bundler

Then navigate to the directory where this README.md resides and run:

    bundle install

On a \*nix based system you may need to raise your access privileges, such as 
prefixing the command with sudo or logging in as root by running su.

**Installing the att-codekit library**

**Note:** This is required only if you are **not** using bundler and are using Ruby
1.9+.

You can install the codekit library using our hosted gem file:

    gem sources --add http://lprod.code-api-att.com:8808
    gem install att-codekit

Note that the codekit is under heavy development and is using a semantic
versioning scheme. Non-backwards compatible changes *will* increase the
major version number.

## <a name="config"></a> Configuration

This sample app contains a config.yml file in easy-to-read YAML format, containing configurable parameters with comments to guide you through the configuration process. When you make a change to config.yml, it will not take effect until you restart the app. 

Note: If your app is promoted from the Sandbox environment to the Production
environment, you must update the config.yml file with Production-specific keys and settings.

Commonly used parameters include the following:

**REQUIRED**

1. FQDN: The main server handling requests, such as *https://api.att.com*
2. client_id: The App Key value for your registered app 
3. client_secret: The App Secret value for your registered app
4. account_domain:  The domain you registered as your enhanced WebRTC Org Domain
5. consent_redirect: The destination where the user is redirected after authentication success or failure

**OPTIONAL**

1. e911id: A valid E911 identifier that you have generated using the E911 API
2. vtn_numbers: A list of comma-separated Virtual Numbers generated when you set up your app

This sample app also uses a config.js file, located in the /js
directory, which you must update with your app-specific details. For assistance with configuration values, see the
[AT&T Enhanced WebRTC SDK Github repository](https://github.com/attdevsupport/ewebrtc-sdk).

**REQUIRED**

1. DHS: The URL of your own developer hosted server
2. ewebrtc_domain: The domain you registered as your enhanced WebRTC Org Domain


## <a name="running"></a> Running the App

To run the app, open a terminal window in the app's
directory and type:

    rackup -p 4567 

Use a WebRTC-compatible Web browser to view the app. By default the URL is
[http://localhost:4567/](http://localhost:4567/). If you receive the
error "port already in use" or are running multiple instances, change 4567 to
any available port number and use that port in your localhost URL.

You may interrupt the app at any time by pressing ctrl-C.
