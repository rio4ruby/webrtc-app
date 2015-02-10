# AT&T Enhanced WebRTC API Java Sample Application

This sample app demonstrates the features of the AT&T Enhanced WebRTC API,
enabling you to quickly test the API, view code snippets, and better understand
the elements of this API.

This file covers basic setup, configuration, and launch of the sample app,
including steps required to register the app, generate the API app key and app
secret, configure the Jetty server with Java, and run the fully functional
sample app. For more detailed information, requirements, and code examples,
see the [AT&T Enhanced WebRTC SDK page](http://developer.att.com/sdks-plugins/enhanced-webrtc)
on the AT&T Developer Program Web site.

 - [Registration](#registration)
 - [Installation](#install)
 - [Configuration](#config)
 - [Running the App](#running)

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

This section describes the steps necessary to install this sample app on a
Jetty server using Java.

Requirements:

 - [Java JRE](http://www.oracle.com/technetwork/java/index.html)
 - [Java JDK](http://www.oracle.com/technetwork/java/index.html)
 - [Apache Maven](https://maven.apache.org/)
 - [A WebRTC-compatible browser](http://developer.att.com/sdks-plugins/enhanced-webrtc#using-webrtc-sdk)

Install the Java JRE, Java JDK, and Apache Maven according to their respective
documentation.

## <a name="config"></a> Configuration

Each sample application contains an application.properties file in the
'src/main/resources/' folder. which contains configurable parameters with
comments to guide you through the configuration process.

Note: _If your app is promoted from the Sandbox environment to the Production
environment, you must update the application.properties file with
Production-specific keys and settings._

The following are short descriptions of commonly used parameters:

**REQUIRED**

1. FQDN: The main server handling requests, ex: https://api.att.com
2. clientId: set the value as per your registered application 'API
key' field value 
3. clientSecret: set the value as per your registered application
'Secret key' field value
4. accountDomain:  set the value as per your organizations domain for webrtc
5. redirectUri: only required for authorization flow (where consent is
redirected after success/failure)

**OPTIONAL**

1. e911Id: set this to a valid e911 identifier that you have generated using
the e911 api
2. vtnNumbers: set this to a list of comma seperated vtn numbers created in
your account

This sample app also uses a config.js file, located in the /js
directory, which you must update with your app-specific details. For assistance
with configuration values, see the
[AT&T Enhanced WebRTC SDK Github repository](https://github.com/attdevsupport/ewebrtc-sdk).

**REQUIRED**

1. dhs: set this to your personal developer hosted server
2. ewebrtc\_domain: set the value as per your organizations domain for webrtc

## <a name="running"></a> Running the App

You can build this project using Apache Maven, and it follows Maven's Standard
Directory Layout. For more information about Apache Maven and detailed
instructions, consult the Apache Maven documentation.

Using a terminal, change the current directory to the sample app's root folder,
which should be the directory containing pom.xml. Run the following command to
build and run the application:

```shell
mvn clean jetty:run
```

This command should run the app on port 8080. Make sure no other
application is running on port 8080. To change the port, consult the
Jetty documentation. To connect to the sample app, open a web
browser and visit 'http://localhost:8080/<appname>' replacing <appname> with
the app's name.

For more information on running the sample app, see the
[AT&T Enhanced WebRTC SDK page](http://developer.att.com/sdks-plugins/enhanced-webrtc)
on the AT&T Developer Program Web site.
