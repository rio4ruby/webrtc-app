# AT&T Enhanced WebRTC API Ruby Sample Application

This sample app demonstrates the features of the AT&T Enhanced WebRTC API,
enabling you to quickly test the API, view code snippets, and better understand
the elements of this API.

This file covers basic setup, configuration, and launch of the sample app,
including steps required to register the app, generate the API app key and app
secret, configure the Rack server with Ruby, and run the fully functional
sample app. 

 - [Registration](#registration)
 - [Installation](#install)
 - [Configuration](#config)
 - [Running the App](#running)

## <a name="registration"></a> Registration

This section describes the necessary steps to register an app with
the proper services and endpoints.

To register an app and obtain the appropriate keys for AT&T APIs, you must
enroll in the AT&T Developer Program at the [AT&T Developer Program Web
site](http://developer.att.com/). If you don't have an existing account, you
can create one by clicking "Get Started Free." Your account must have premium
access in order to use the WebRTC API.

To register an app:

1. Sign in to your AT&T Developer Program account
2. Select _My Apps_
3. Click _Set Up New App_ and enter the required information.
4. Choose _Enhanced WebRTC_ from the list of APIs.
5. Complete the information necessary to use Enhanced WebRTC.

**Note:** the **OAuth Redirect URL** field must contain the URL where you want
the OAuth provider to redirect users when they successfully authenticate and
authorize your application. For this application the default should be set to
http://localhost:9292

Once your application is registered, you will receive an App Key and App
Secret, which enable your app to communicate with AT&T Enhanced WebRTC API.

A newly registered application is restricted to the Sandbox environment. When
you're ready to move it to the Production environment, click **Promote to
production**. The Production environment uses a different App Key and App
Secret, which you must replace in the appropriate locations in your app.

Depending on the type of authentication you configure, your app may use either
the Autonomous Client or the Web-Server Client OAuth flow. For more
information, see the [OAuth page](https://developer.att.com/apis/oauth-2/docs)
on the AT&T Developer Program Web site.

## <a name="install"></a> Installing

**Requirements**

To run the examples you will need ruby 1.8+ and a few ruby gems that the
applications are built upon:
  
* [sinatra](http://www.sinatrarb.com/) 
* [sinatra-contrib](https://github.com/sinatra/sinatra-contrib)
* [rest-client](https://github.com/rest-client/rest-client)
* [json](http://json.rubyforge.org/)
* [att-codekit](https://github.com/attdevsupport/codekit-ruby)
* [A WebRTC-compatible browser](http://developer.att.com/sdks-plugins/enhanced-webrtc#using-webrtc-sdk)
  
The easiest way to install the required gems is to use bundler.

First make sure you have bundler installed:

    gem install bundler

Then inside the directory which this README.md resides run:

    bundle install

On a \*nix based system you may need to raise your access privliges, such as
prefixing the command with sudo or logging in as root by running su.

**Installing the att-codekit library**

Note: _this is only required if you are **not** using bundler and are using
ruby 1.9+_

The codekit library can be installed by using our hosted gem file.

    gem sources --add http://lprod.code-api-att.com:8808
    gem install att-codekit

Note that the codekit is under heavy development and is using a semantic
versioning scheme. Non-backwards compatible changes **will** increase the
major version number.

## <a name="config"></a> Configuration

Each application contains a config.yml file. It holds configurable parameters
described in the easy to read format YAML. You are free to adjust these to your
needs. If you introduce a change make sure to restart the application for it to
take effect. 

Note: _If your application is promoted from Sandbox environment to Production
environment and you decide to use production application settings, you must
update parameters as per production application details._

The following are short descriptions of commonly used parameters:

**REQUIRED**

1. FQDN: The main server handling requests, ex: https://api.att.com
2. client\_id: set the value as per your registered application 'API key' field
   value 
3. client\_secret: set the value as per your registered application 'Secret
   key' field value
4. account\_domain:  set the value as per your organizations domain for webrtc
5. consent\_redirect: Required for authorization flow. By default this
   application will use: http://localhost:9292

**OPTIONAL**

1. e911id: set this to a valid e911 identifier that you have generated using
   the e911 api
2. vtn\_numbers: set this to a list of comma seperated vtn numbers created in
   your account
3. proxy: set this to enable a proxy

This sample application also contains WebRTC specific configuration values,
which must be configured by updating the config.js file found in the 'js'
directory.

**REQUIRED**

1. dhs: set this to  the base URL your application is ran under without any
   ending slash (/). For this example the default value is http://localhost:9292
2. ewebrtc\_domain: set the value as per your organizations domain for webrtc


## <a name="running"></a> Running the Application

To run the application, open up a terminal window in the application's
directory and type:

    rackup -p 9292 

Your application by default is accessible in a web browser at the url
[http://localhost:9292/](http://localhost:9292/). Note that if you receive the
error 'port already in use' or are running multiple instances change 4567 to
any available port number of your choosing and use that port to access it via
localhost.

You may interrupt the application at any time by pressing ctrl-C.
