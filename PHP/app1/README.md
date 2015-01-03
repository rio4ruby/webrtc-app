# AT&T Enhanced WebRTC API PHP Sample Application

This sample app demonstrates the features of the AT&T Enhanced WebRTC API,
enabling you to quickly test the API, view code snippets, and better understand
the elements of this API.

This file covers basic setup, configuration, and launch of the sample app,
including steps required to register the app, generate the API app key and app
secret, configure the Apache server with PHP, and run the fully functional
sample app. For more detailed information, requirements, and code examples, see
the [AT&T Enhanced WebRTC SDK page](http://developer.att.com/sdks-plugins/enhanced-webrtc)
on the AT&T Developer Program Web site.

 - [Registration](#registration)
 - [Installation](#install)
 - [Configuration](#config)
 - [Running the Application](#running)

## <a name="registration"></a> Registration

This section describes the necessary steps to register an app with
the proper services and endpoints.

To register an app and obtain the appropriate keys for AT&T APIs, you must
enroll in the AT&T Developer Program at the
[AT&T Developer Program Web site](http://developer.att.com/). If you don't have
an existing account, you can create one by clicking "Get Started Free." Your
account must have premium access in order to use the WebRTC API.

To register an app:

1. Sign in to your AT&T Developer Program account
2. Select _My Apps_
3. Click _Set Up New App_ and enter the required information.
4. Choose _Enhanced WebRTC_ from the list of APIs.
5. Complete the information necessary to use Enhanced WebRTC.

**Note:** the **OAuth Redirect URL** field must contain
the URL where you want the OAuth provider to redirect users when they
successfully authenticate and authorize your application.

Once your application is registered, you will receive
an App Key and App Secret, which enable your app to communicate
with AT&T Enhanced WebRTC API.

A newly registered application is restricted to the Sandbox environment. When
you're ready to move it to the Production environment, click **Promote to
production**. The Production environment uses a different App Key and App
Secret, which you must replace in the appropriate locations in your app.

Depending on the type of authentication you configure, your app may use either
the Autonomous Client or the Web-Server Client OAuth flow. For more
information, see the [OAuth page](https://developer.att.com/apis/oauth-2/docs)
on the AT&T Developer Program Web site.

## <a name="install"></a> Installation

This section describes the steps necessary to install this sample app on an
Apache Web server using PHP.

Requirements:

 - [Apache Web Server](https://httpd.apache.org/)
 - [PHP 5.4+](https://php.net/)
 - [PHP cURL Extension](https://php.net/manual/en/book.curl.php)
 - [A WebRTC-compatible browser](http://developer.att.com/sdks-plugins/enhanced-webrtc#using-webrtc-sdk)

Install Apache, PHP, and the PHP cURL extension according to their respective
documentation. Copy the sample app folder to your Apache Web root folder,
for example /var/www/html.

## <a name="config"></a> Configuration

The sample app contains a config.php file, which contains configurable
parameters with comments to guide you through the configuration process.

Note: If your app is promoted from the Sandbox environment to the Production
environment, you must update the config.php file with Production-specific keys and settings.

This sample app also uses a config.js file, located in the /js directory, which
you must update with your app-specific details. For assistance with
configuration values, see the
[AT&T Enhanced WebRTC SDK Github repository](https://github.com/attdevsupport/ewebrtc-sdk).

## <a name="running"></a> Running the App

After you copy the sample app folder to the Apache Web root folder, start
Apache and use a WebRTC-compatible Web browser to browse to where you copied
the sample application folder.

For example, if you're using a local server you might use the URL
*http://localhost/app1/index.php*. For more information on running the sample
app, see the
[AT&T Enhanced WebRTC SDK page](http://developer.att.com/sdks-plugins/enhanced-webrtc)
on the AT&T Developer Program Web site.
