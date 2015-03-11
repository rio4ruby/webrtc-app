<!DOCTYPE html>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<jsp:useBean id="dateutil" class="com.att.api.util.DateUtil" scope="request">
</jsp:useBean>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AT&amp;T Enhanced WebRTC Sample Application</title>
    <!-- Bootstrap -->
    <link type="text/css" href="css/bootstrap.min.css" rel="stylesheet">
    <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
    <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
    <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
    <![endif]-->

    <!-- jQuery -->
    <script src="js/jquery.min.js"></script>
    <!-- load the sdk which provides access to common webrtc functions -->
    <script src="js/ewebrtc-sdk.min.js"></script>

    <!-- handle our view -->
    <script src="js/view.js"></script>

    <!-- interact with the sdk-->
    <script src="js/config.js"></script>
    <script src="js/example.js"></script>

    <!-- we're using bootstrap for our layout -->
    <script src="js/bootstrap.min.js"></script>
    <!-- enable bootstrap custom tootips -->
    <script>$(function () { $('[data-toggle="tooltip"]').tooltip() });</script>
    <link rel="stylesheet" type="text/css" href="css/custom-styles.css">

    <!-- Google Analytics -->
    <script>
      (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
          m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
      })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
      ga('create', 'UA-33466541-1', 'auto');
      ga('send', 'pageview');
    </script>
    <!-- End Google Analytics -->
  </head>
  <body>
    <!-- Google Tag Manager -->
    <noscript><iframe src="//www.googletagmanager.com/ns.html?id=GTM-TJ6W9F"
          height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            '//www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-TJ6W9F');</script>
    <!-- End Google Tag Manager -->
    <div class="container">
      <div class="row">
        <div class="header">
          <div class="col-lg-12">
            <div class="text-center">
              <div class="row">
                <div class="col-sm-2">
                  <a class="brand" href="index.html">
                    <img src="https://developer.att.com/static-assets/images/logo-developer.png">
                    </a>
                  </div>
                </div>
            </div>
          </div>
        </div><!--./header-->
      </div><!--./row-->
      <h3 class="text-center">AT&amp;T Enhanced WebRTC Sample Application</h3>
      <hr>
      <div class="row inline-row">
        <div class="col-lg-12">
          <div class="col-sm-4"></div>
          <div class="col-sm-2">
            <a class="btn btn-block btn-warning" target="_blank" href="${cfg.sourceLink}">Source</a>
          </div>
          <div class="col-sm-2">
            <a class="btn btn-block btn-warning" target="_blank" href="${cfg.downloadLink}">Download</a>
          </div>
          <div class="col-sm-4"></div>
        </div>
      </div><!--./inline-row-->
      <hr>
      <div class="row">
        <div class="col-lg-12">
          <h4 class="text-center">
            We created this page to help you evaluate the AT&amp;T Enhanced
            WebRTC API, and kick-start your development by giving you:
          </h4>
          <div class="col-sm-1"></div>
          <div class="col-sm-10">
            <ol>
              <li>
                A quick way to test out the API and see how AT&amp;T Mobile Number, 
                Virtual Number or Account ID work—just enter information when
                prompted as you progress down the page
              </li>
              <li>
                Easy access to code snippets that matter to you—just click the
                'View Source' buttons throughout the page
              </li>
              <li>
                An understanding of how the various elements work together—check
                out the 
                <a href="${cfg.githubServerLink}" target="_blank">Server</a>
                and how it interacts with the 
                <a href="${cfg.githubClientLink}" target="_blank">Client side SDK</a>
              </li>
            </ol>
          </div>
        </div>
      </div>
      <hr>
      <div class="row">
        <div class="hidden" id="useragentMsg">
          <div class="col-sm-1"></div>
          <div class="row">
            <div class="col-lg-12">
              <div class="col-lg-1"></div>
              <div class="col-lg-10">
                <div class="alert alert-warning text-center">
                  <strong>This application runs best in chrome</strong>
                </div>
              </div>
              <div class="col-lg-1"></div>
            </div>
          </div>
        </div>
        <div class="col-lg-12">
          <div class="panel panel-default">
            <div class="panel-heading">
              <a data-toggle="collapse" href="#oauthCollapse">
                <h3 class="panel-title"><b>OAuth Authorization</b> - Server side component</h3>
              </a>
            </div>
            <div id="oauthCollapse" class="panel-collapse collapse in">
              <div class="panel-body">
                <ul class="nav nav-tabs" role="tablist">
                  <li class="active"><a href="#mobile" role="tab" data-toggle="tab">AT&amp;T Mobile Number</a></li>
                  <li><a href="#VTN" role="tab" data-toggle="tab">Virtual Number</a></li>
                  <li><a href="#account" role="tab" data-toggle="tab">Account ID</a></li>
                </ul>
                <div class="tab-content">
                  <div class="tab-pane active" id="mobile">
                    <div class="row">
                      <div class="col-lg-12">
                        <p>Authorize using an AT&amp;T mobile number.</p>
                        <div class="col-lg-4">
                          <button name="consent" type="button" 
                              class="btn btn-primary">
                            Consent for authorization code
                          </button>
                          <button class="btn btn-default" data-toggle="modal" 
                              data-target="#consentFlowSource">
                            View source
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div id="mobileAssociate" >
                        <div class="col-lg-12">
                          <hr>
                          <p>Obtain OAuth token via authorization code obtained from consent.</p>
                          <div class="col-lg-4">
                            <label for="auth_code">Authorization code</label>
                            <input id="auth_code" name="auth_code" placeholder="Authorization code" class="form-control" type="text" 
                                <c:if test="${not empty authcode}">
                                  value="<c:out value="${authcode}" />"
                                </c:if>
                            >
                            <button name="token" type="button" 
                                class="btn btn-primary">
                              Get Access Token
                            </button>
                            <button class="btn btn-default" data-toggle="modal" 
                                data-target="#getTokenSnippet">
                              View source
                            </button>
                          </div>
                          <div class="col-lg-4">
                            <div class="hidden" id="mobileTokenSuccess">
                              <div class="alert alert-success" role="alert">
                                Access Token Successfuly Obtained
                              </div>
                            </div>
                            <div class="hidden" id="mobileTokenError">
                              <div class="alert alert-danger" role="alert">
                                Error obtaining token from code
                              </div>
                            </div>
                          </div><!--./col-lg-4-->
                        </div><!--./col-lg-12-->
                      </div><!--./mobileAssociate-->
                    </div><!--./row-->
                  </div><!--./tab-pane #mobile-->
                  <div class="tab-pane" id="VTN">
                    <div class="row">
                      <div class="col-lg-12">
                        <p>Authorize using a Virtual Number.</p>
                        <div class="col-lg-4">
                          <button id="vtnToken" 
                              type="button" class="btn btn-primary"
                              data-loading-text="Getting Token...">
                            Get Access Token
                          </button>
                          <button class="btn btn-default" data-toggle="modal"
                              data-target="#getTokenSnippet">
                            View source
                          </button>
                        </div>
                        <div class="col-lg-4">
                          <div class="hidden" id="vtnTokenSuccess">
                            <div class="alert alert-success" role="alert">
                              Access Token Successfuly Obtained
                            </div>
                          </div>
                          <div class="hidden" id="vtnTokenError">
                            <div class="alert alert-danger" role="alert">
                              Error Obtaining Access Token
                            </div>
                          </div>
                        </div>
                      </div><!--/.col-lg-12-->
                    </div><!--/.row-->
                    <div id="vtnAssociate" class="hidden">
                      <div class="col-lg-12">
                        <hr>
                        <div class="row">
                          <p>Select Virtual Number To Assign To Token:</p>
                          <div class="col-lg-5 form-group">
                            <select id="vtnNumber" class="form-control">
                              <c:forEach var="number" items="${cfg.vtnNumbers}">
                                <option>vtn:<c:out value="${number}" /></option>
                              </c:forEach>
                            </select>
                          </div>
                        </div>
                        <div class="row">
                          <div class="col-lg-4">
                            <button id="vtnAssign" 
                                data-loading-text="Assigning Number..."
                                type="button" class="btn btn-primary">
                              Assign Number
                            </button>
                            <button class="btn btn-default" data-toggle="modal" 
                                data-target="#associateSnippet">
                              View source
                            </button>
                          </div>
                          <div class="col-lg-4">
                            <div class="hidden" id="vtnAssociateSuccess">
                              <div class="alert alert-success" role="alert">
                                Access Token Successfuly Assigned
                              </div>
                            </div>
                            <div class="hidden" id="vtnAssociateError">
                              <div class="alert alert-danger" role="alert">
                                Error assigning number to token
                              </div>
                            </div>
                          </div>
                        </div><!--/.row-->
                      </div><!--/.col-lg-12-->
                    </div><!--/#vtnAssociate-->
                  </div><!--/.tab-pane-->
                <div class="tab-pane" id="account">
                  <div class="row">
                    <div class="col-lg-12">
                      <p>Authorize using an Account ID.</p>
                      <div class="col-lg-4">
                        <button id="accountToken" type="button" 
                            data-loading-text="Getting token..."
                            class="btn btn-primary">
                          Get Access Token
                        </button>
                        <button class="btn btn-default" data-toggle="modal"
                            data-target="#getTokenSnippet">
                          View source
                        </button>
                      </div>
                      <div class="col-lg-4">
                        <div class="hidden" id="accountTokenSuccess">
                          <div class="alert alert-success" role="alert">
                            Access Token Successfuly Obtained
                          </div>
                        </div>
                        <div class="hidden" id="accountTokenError">
                          <div class="alert alert-danger" role="alert">
                            Error Obtaining Access Token
                          </div>
                        </div>
                      </div>
                    </div><!--/.col-lg-12-->
                  </div><!--/.row-->
                  <div id="accountAssociate" class="hidden">
                    <div class="col-lg-12">
                      <hr>
                      <div class="row">
                        <p>Enter Account ID to associate with token:</p>
                        <div class="col-lg-5">
                          <div class="form-group">
                            <label for="username">Account ID:</label>
                            <div class="input-group">
                              <input name="username" type="text" class="form-control" placeholder="Make up a temporary username">
                              <div class="input-group-addon">
                                ${cfg.accountDomain}
                              </div>
                            </div><!--/.input-group-->
                          </div><!--/.form-group-->
                        </div><!--/.col-lg-5-->
                        <div class="col-lg-4">
                          <div class="hidden" id="accountAssociateSuccess">
                            <div class="alert alert-success" role="alert">
                              Access Token Successfuly Assigned
                            </div>
                          </div>
                          <div class="hidden" id="accountAssociateError">
                            <div class="alert alert-danger" role="alert">
                              Error assigning username to token
                            </div>
                          </div>
                        </div><!--/.col-lg-4-->
                      </div>
                      <div class="row">
                        <div class="col-lg-4">
                          <div class="form-group">
                            <button id="accountAssign" 
                                data-loading-text="Assigning username..."
                                type="button" class="btn btn-primary">
                              Assign Username
                            </button>
                            <button class="btn btn-default" data-toggle="modal" 
                                data-target="#associateSnippet">
                              View source
                            </button>
                          </div>
                        </div>
                      </div><!--/.row-->
                    </div><!--/.col-lg-12-->
                  </div><!--/#accountSuccessToken-->
                </div><!--./account-tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div><!--./oauth-collapse-->
        </div><!--./panel-->
      </div><!--./col-lg-12-->
    </div><!--./row-->
    <div class="row">
      <div id="sessionHandling" class="hidden col-lg-12">
        <div class="panel panel-default">
          <div class="panel-heading">
            <a data-toggle="collapse" href="#sessionCollapse">
              <h3 class="panel-title"><b>Session Management</b> - Client side component</h3>
            </a>
          </div>
          <div id="sessionCollapse" class="panel-collapse collapse in">
            <div class="panel-body">
              <p>Start a session and end a session.</p>
              <div class="col-lg-12">
                <div class="form-group">
                  <div id="e911">
                    <label for="e911in">E911 ID:</label>
                    <div class="row">
                      <div class="col-lg-4">
                        <input id="e911in" name="e911" type="text" class="form-control" value="${cfg.e911Id}" placeholder="E911 ID">
                      </div>
                    </div>
                  </div>
                </div>
                <button id="startSession" data-loading-text="Starting Session..." type="button" class="btn btn-primary">
                  Start Session
                </button>
                <button id="stopSession" data-loading-text="Closing Session..." type="button" class="btn btn-danger hidden">
                  End Session
                </button>
                <button class="btn btn-default" data-toggle="modal" 
                    data-target="#sessionSource">
                  View source
                </button>
              </div><!--/.col-lg-12-->
            </div><!--/.panel-body-->
          </div><!--/.panel-->
        </div>
      </div><!--./col-lg-12-->
    </div><!--./row-->
    <div class="row">
      <div id="callId" class="hidden col-lg-12">
        <div class="panel panel-default">
          <div class="panel-heading">
            <a data-toggle="collapse" href="#callCollapse">
              <h3 class="panel-title"><b>Call Management</b> - Client side component</h3>
            </a>
          </div>
          <div id="callCollapse" class="panel-collapse collapse in">
            <div class="col-lg-12">
              <h3><small><strong>Note:</strong> <em>To place a call you may open a new window or tab and setup a second user</em></small></h3>
            </div>
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#regCall" role="tab" data-toggle="tab">Call</a></li>
                <li><a href="#confCall" role="tab" data-toggle="tab">Conference Call</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="regCall">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="row">
                        <div class="col-lg-4">
                          <label>Make a call</label>
                          <input name="phoneNumber" type="text" 
                              class="form-control" placeholder="Enter phone number or user name"
                              data-toggle="tooltip" data-placement="right"
                              data-title="Format must be one of the following: 15555555555 (number with country code), or user@domain.com">
                        </div><!--/.col-lg-4-->
                      </div><!--/.row-->
                      <div class="row">
                        <div class="col-lg-4">
                          <label>Select Media Options:</label>
                          <select name="callType" class="form-control">
                            <option value="audio">Audio Only</option>
                            <option value="video">Audio and Video</option>
                          </select>
                        </div><!--/.col-lg-4-->
                      </div><!--/.row-->
                    </div><!--/.form-group-->
                    <button id="startCall" type="button" class="btn btn-primary"
                        data-loading-text="Dialing...">
                      Start Call
                    </button>
                    <button class="btn btn-default" data-toggle="modal" 
                        data-target="#callMgmtSource">
                      View source
                    </button>
                  </div>
                  <div class="hidden" id="video">
                    <div class="col-lg-12">
                      <hr>
                      <div class="row">
                        <div class="col-lg-4 text-left">
                          <h3>
                            <small>Call time remaining: <b><span id="countdown">3:00</span></b></small>
                          </h3>
                        </div>
                      </div><!--/.row-->
                      <div class="row">
                        <div class="col-lg-12">
                          <div class="row">
                            <div class="col-lg-6 col-sm-12">
                              <div class="row">
                                <div class="col-lg-2 col-sm-2">
                                  <p>Remote:</p>
                                </div>
                                <div class="col-lg-10 col-sm-10">
                                  <div id="remoteAudioElement">
                                    <img width="25" height="25" data-file-height="500" data-file-width="500" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/38px-Speaker_Icon.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/50px-Speaker_Icon.svg.png 2x" src="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/25px-Speaker_Icon.svg.png" alt="Speaker Icon.svg">
                                  </div>
                                </div>
                              </div>
                              <div class="row">
                                <video id="remoteVideoElement">
                              </div>
                            </div>
                          </div>
                          <div class="row">
                            <div class="col-lg-6 col-sm-12">
                              <div class="row">
                                <div class="col-lg-2 col-sm-2">
                                  <p>Local:</p>
                                </div>
                                <div class="col-lg-10 col-sm-10">
                                  <div id="localAudioElement">
                                    <img width="25" height="25" data-file-height="500" data-file-width="500" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/38px-Speaker_Icon.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/50px-Speaker_Icon.svg.png 2x" src="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/25px-Speaker_Icon.svg.png" alt="Speaker Icon.svg">
                                  </div>
                                </div>
                              </div>
                              <div class="row">
                                <video id="localVideoElement">
                              </div>
                            </div>
                          </div><!--/.row-->
                          <div class="row">
                            <div class="col-lg-5">
                              <button id="endCall" type="button" class="btn btn-danger">
                                End Call
                              </button>
                              <button id="holdCall" type="button" class="btn btn-info">
                                Hold
                              </button>
                              <button id="resumeCall" type="button" class="hidden btn btn-info">
                                Resume
                              </button>
                              <button class="btn btn-default" data-toggle="modal" 
                                  data-target="#callInProgSource">
                                View source
                              </button>
                            </div>
                          </div>
                        </div><!--/.col-lg-12-->
                      </div><!--/.row-->
                    </div><!--/.col-lg-12-->
                  </div><!--/#video-->
                </div><!--./tab-pane-->
                <div class="tab-pane" id="confCall">
                  <div class="col-lg-12">
                    <div class="form-group">
                      <div class="row">
                        <div class="col-lg-4">
                          <label>Select Media Options:</label>
                          <select name="callType" class="form-control">
                            <option value="audio">Audio</option>
                            <option value="video">Audio+Video</option>
                          </select>
                        </div><!--/.col-lg-4-->
                      </div><!--/.row-->
                    </div><!--/.form-group-->
                    <button id="startConf" type="button" class="btn btn-primary"
                        data-loading-text="Opening Conference...">
                      Start Conference
                    </button>
                    <button class="btn btn-default" data-toggle="modal" 
                        data-target="#confMgmtSource">
                      View source
                    </button>
                  </div>
                  <div class="hidden" id="confVideo">
                    <div class="col-lg-12">
                      <hr>
                      <div class="row">
                        <div class="col-lg-4 text-left">
                          <h3>
                            <small>Call time remaining: <b><span id="confCountdown">3:00</span></b></small>
                          </h3>
                        </div>
                      </div><!--/.row-->
                      <div class="row">
                        <div class="form-inline">
                          <div class="col-lg-4">
                            <input name="participant" type="text"
                                class="form-control" placeholder="Participant"
                                data-toggle="tooltip" data-placement="left"
                                data-title="Format must be one of the following: 15555555555 (number with country code), or user@domain.com">
                            <button id="addParticipant" type="button" class="btn btn-primary">
                              Add Participant
                            </button>
                          </div>
                          <div class="col-lg-5">
                            <input name="rmParticipant" type="text" class="form-control" placeholder="Participant">
                            <button id="removeParticipant" type="button" class="btn btn-danger">
                              Remove Participant
                            </button>
                          </div>
                        </div><!--/.form-inline-->
                      </div><!--/.row-->
                      <div class="row">
                        <div class="col-lg-12 alert alert-info">
                          <label for="participants">Current Participants:</label>
                          <ul id="participants" class="list-inline"></ul>
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-lg-12">
                          <div class="row">
                            <div class="col-lg-6 col-sm-12">
                              <div class="row">
                                <div class="col-lg-2 col-sm-2">
                                  <p>Remote video:</p>
                                </div>
                                <div class="col-lg-10 col-sm-10">
                                  <div id="confRemoteAudioElement">
                                    <img width="25" height="25" data-file-height="500" data-file-width="500" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/38px-Speaker_Icon.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/50px-Speaker_Icon.svg.png 2x" src="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/25px-Speaker_Icon.svg.png" alt="Speaker Icon.svg">
                                  </div>
                                </div>
                              </div>
                              <div class="row">
                                <video id="confRemoteVideoElement">
                              </div>
                            </div>
                          </div>
                          <div class="row">
                            <div class="col-lg-6 col-sm-12">
                              <div class="row">
                                <div class="col-lg-2 col-sm-2">
                                  <p>Local Video:</p>
                                </div>
                                <div class="col-lg-10 col-sm-10">
                                  <div id="confLocalAudioElement">
                                    <img width="25" height="25" data-file-height="500" data-file-width="500" srcset="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/38px-Speaker_Icon.svg.png 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/50px-Speaker_Icon.svg.png 2x" src="//upload.wikimedia.org/wikipedia/commons/thumb/2/21/Speaker_Icon.svg/25px-Speaker_Icon.svg.png" alt="Speaker Icon.svg">
                                  </div>
                                </div>
                              </div>
                              <div class="row">
                                <video id="confLocalVideoElement">
                              </div>
                            </div>
                            <div class="row">
                              <div class="col-lg-12">
                                <button id="endConf" type="button" class="btn btn-danger">
                                  End Conference
                                </button>
                                <button id="confHoldCall" type="button" class="btn btn-info">
                                  Hold
                                </button>
                                <button id="confResumeCall" type="button" class="hidden btn btn-info">
                                  Resume
                                </button>
                                <button class="btn btn-default" data-toggle="modal" 
                                    data-target="#confCallInProgSource">
                                  View source
                                </button>
                              </div>
                            </div>
                          </div><!--/.row-->
                        </div><!--/.col-lg-12-->
                      </div><!--/.row-->
                    </div><!--/.col-lg-12-->
                  </div><!--/#video-->
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--/.panel-body-->
          </div><!--/.callCollapse-->
        </div><!--/.panel-->
      </div><!--/.col-lg-12-->
    </div><!--/.row-->
    <hr>
    <div class="footer text-muted">
      <div class="row">
        <div class="col-sm-12 text-left">
          <p>
            <small>
              The application hosted on this site is a working example
              intended to be used for reference in creating products to
              consume AT&amp;T Services and not meant to be used as part of
              your product. The data in these pages is for test purposes only
              and intended only for use as a reference in how the services
              perform.
            </small>
          </p>
        </div> <!--./col-->
      </div> <!--./row-->
      <hr>
      <div class="row">
        <div class="text-left col-sm-6">
          <div class="col-sm-1">
            <a class="brand" href="https://developer.att.com" target="_blank">
              <img alt="AT&amp;T Developer" src="https://developer.att.com/static-assets/images/logo-globe.png">
            </a>
          </div>
          <div class="col-sm-11">
            <p>
              <small>
                <a href="https://www.att.com/gen/general?pid=11561" target="_blank">Terms of Use</a>
                <a href="https://www.att.com/gen/privacy-policy?pid=2506" target="_blank">Privacy Policy</a>
                <a href="https://developer.att.com/support" target="_blank">Contact Us</a>
                <br>
                ©2014 AT&amp;T Intellectual Property. All rights reserved.
              </small>
            </p>
          </div>
        </div>
        <div class="col-sm-6 left-border">
          <p class="text-right">
            <small>
              AT&amp;T, the AT&amp;T logo and all other AT&amp;T marks
              contained herein are trademarks of
              <br>
              AT&amp;T Intellectual Property and/or AT&amp;T affiliated
              companies. AT&amp;T 36USC220506
            </small>
          </p>
        </div>
      </div><!--./row-->
    </div><!--./footer-->
  </div><!--./container-->
  <div class="navbar navbar-fixed-bottom" id="notifications">
    <div class="col-lg-8"></div>
    <div class="col-lg-4">
      <div id="globalInfo"></div>
    </div>
  </div>

  <!-- popup to answer incoming call -->
  <div class="modal fade" id="incomingCall" tabindex="-1" role="dialog" data-backdrop="static" aria-labelledby="requestResponseLabel" aria-hidden="true">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">Incoming call</h4>
        </div>
        <div class="modal-body">
          <p>Incoming <b id="mediaType"></b> call from: <b id="caller"></b></p>
          <button id="answerCall" type="button" data-dismiss="modal" class="btn btn-primary">
            Answer Call
          </button>
          <button id="rejectCall" type="button" data-dismiss="modal" class="btn btn-danger">
            Reject Call
          </button>
        </div> <!-- end modal body -->
      </div><!-- end modal content -->
    </div><!-- end modal dialog -->
  </div> <!-- end modal -->

  <!-- popup to answer incoming conference request -->
  <div class="modal fade" id="incomingInvite" tabindex="-1" role="dialog" data-backdrop="static" aria-labelledby="requestResponseLabel" aria-hidden="true">
    <div class="modal-dialog modal-sm">
      <div class="modal-content">
        <div class="modal-header">
          <h4 class="modal-title">Conference invite</h4>
        </div>
        <div class="modal-body">
          <p>Incoming <b id="confMediaType"></b> conference invite from: <b id="host"></b></p>
          <button id="joinConf" type="button" data-dismiss="modal" class="btn btn-primary">
            Accept invite
          </button>
          <button id="rejectInvite" type="button" data-dismiss="modal" class="btn btn-danger">
            Reject invite
          </button>
        </div> <!-- end modal body -->
      </div><!-- end modal content -->
    </div><!-- end modal dialog -->
  </div> <!-- end modal -->

    <!-- popup to hold mobile number source information -->
    <div class="modal fade" id="consentFlowSource" tabindex="-1" role="dialog" aria-labelledby="consentFlowSource" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
            </button> 
            <h4 class="modal-title">Consent Flow</h4>
          </div>
          <div class="modal-body">
            <!-- begin code panel -->
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#ruby_consent" role="tab" data-toggle="tab">Ruby</a></li>
                <li><a href="#php_consent" role="tab" data-toggle="tab">PHP</a></li>
                <li><a href="#java_consent" role="tab" data-toggle="tab">Java</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="ruby_consent">
<pre>
<span class="Comment"># Return the url required for consent to the SDK</span>
post <span class="SpecialChar">'</span><span class="String">/oauth/authorize</span><span class="SpecialChar">'</span> <span class="Statement">do</span>
  url = <span class="Type">AuthCodeService</span>.generateConsentFlowUrl
  {
    <span class="Constant">:consent_url</span> =&gt; url
  }.to_json()
<span class="Statement">end</span>
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="php_consent">
<pre>
$<span class="Identifier">scope</span> = &quot;<span class="Constant">WEBRTCMOBILE</span>&quot;;
$<span class="Identifier">codeUrl</span> = $<span class="Identifier">FQDN</span> . '<span class="Constant">/oauth/v4/authorize</span>';
$<span class="Identifier">codeRequest</span> = <span class="PreProc">new</span> OAuthCodeRequest<span class="Special">(</span>
    $<span class="Identifier">codeUrl</span>, $<span class="Identifier">api_key</span>, $<span class="Identifier">scope</span>, $<span class="Identifier">authorize_redirect_uri</span>
<span class="Special">)</span>;
$<span class="Identifier">url</span> = $<span class="Identifier">codeRequest</span><span class="Type">-&gt;</span>getCodeLocation<span class="Special">()</span>;
$<span class="Identifier">arr</span> = <span class="Type">array</span><span class="Special">(</span>'<span class="Constant">consent_url</span>' =&gt; $<span class="Identifier">url</span><span class="Special">)</span>;
<span class="PreProc">echo</span> <span class="Identifier">json_encode</span><span class="Special">(</span>$<span class="Identifier">arr</span><span class="Special">)</span>;
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="java_consent">
<pre>
<span class="Type">public</span> <span class="Type">void</span> doPost(HttpServletRequest request, HttpServletResponse response)
        <span class="Type">throws</span> ServletException, IOException {
    <span class="Type">final</span> String FQDN = appConfig.getOauthFQDN();
    <span class="Type">final</span> String clientId = appConfig.getClientId();
    <span class="Type">final</span> String redirectUri = appConfig.getProperty(<span class="String">&quot;redirectUri&quot;</span>);
    <span class="Type">final</span> String redirect = FQDN + <span class="String">&quot;/oauth/v4/authorize?client_id=&quot;</span> +
        clientId + <span class="String">&quot;&amp;scope=WEBRTCMOBILE&amp;redirect_uri=&quot;</span> + redirectUri;

    <span class="Statement">try</span> {
        JSONObject json = <span class="Statement">new</span> JSONObject().put(<span class="String">&quot;consent_url&quot;</span>, redirect);
        response.getWriter().write(json.toString());
    } <span class="Statement">catch</span> (Exception e) {
        response.sendError(<span class="Constant">500</span>, e.getMessage());
    }
}

<span class="Type">public</span> <span class="Type">void</span> doGet(HttpServletRequest request, HttpServletResponse response)
        <span class="Type">throws</span> ServletException, IOException {
    request.setAttribute(<span class="String">&quot;cfg&quot;</span>, <span class="Statement">new</span> ConfigBean());
    <span class="Type">final</span> String forward = <span class="String">&quot;/WEB-INF/WebRTC.jsp&quot;</span>;
    RequestDispatcher dispatcher = request.getRequestDispatcher(forward);
    dispatcher.forward(request, response);
}
</pre>
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div> <!-- end modal body -->
        </div><!-- end modal content -->
      </div><!-- end modal dialog -->
    </div> <!-- end modal -->
    <!-- popup to hold get token source information -->
    <div class="modal fade" id="getTokenSnippet" tabindex="-1" role="dialog" aria-labelledby="getTokenSnippet" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
            </button> 
            <h4 class="modal-title">Obtain OAuth token</h4>
          </div>
          <div class="modal-body">
            <!-- begin code panel -->
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#ruby_token" role="tab" data-toggle="tab">Ruby</a></li>
                <li><a href="#php_token" role="tab" data-toggle="tab">PHP</a></li>
                <li><a href="#java_token" role="tab" data-toggle="tab">Java</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="ruby_token">
<pre>
<span class="Comment"># Return a token to the SDK</span>
post <span class="SpecialChar">'</span><span class="String">/oauth/token</span><span class="SpecialChar">'</span> <span class="Statement">do</span>
  <span class="Statement">begin</span>
    token = <span class="Constant">nil</span>
    <span class="Statement">if</span> request[<span class="Constant">:code</span>]
      code = request[<span class="Constant">:code</span>]
      token = <span class="Type">AuthCodeService</span>.createToken(code)
      session[<span class="Constant">:auth_token</span>] = token
    <span class="Statement">else</span>
      token = <span class="Type">CredService</span>.createToken
      session[<span class="Constant">:cred_token</span>] = token
    <span class="Statement">end</span>
    <span class="Comment"># store the most current created token for associate call</span>
    session[<span class="Constant">:token</span>] = token
    {
      <span class="Constant">:access_token</span> =&gt; token.access_token,
      <span class="Constant">:refresh_token</span> =&gt; token.refresh_token,
      <span class="Constant">:expires_in</span> =&gt; token.expires_in
    }.to_json()
  <span class="Statement">rescue</span> <span class="Type">Exception</span> =&gt; e
    puts e.backtrace
    status <span class="Constant">500</span>
    body e.to_s
  <span class="Statement">end</span>
<span class="Statement">end</span>
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="php_token">
<pre>
<span class="Statement">try</span> <span class="Special">{</span>
    $<span class="Identifier">tokenSrvc</span> = <span class="PreProc">new</span> OAuthTokenService<span class="Special">(</span>$<span class="Identifier">FQDN</span>, $<span class="Identifier">api_key</span>, $<span class="Identifier">secret_key</span><span class="Special">)</span>;
    $<span class="Identifier">token</span> = <span class="Type">null</span>;
    <span class="Statement">if</span> <span class="Special">(</span>isset<span class="Special">(</span>$<span class="Identifier">_POST</span><span class="Special">[</span>'<span class="Constant">code</span>'<span class="Special">]))</span> <span class="Special">{</span>
        $<span class="Identifier">code</span> = <span class="PreProc">new</span> OAuthCode<span class="Special">(</span>$<span class="Identifier">_POST</span><span class="Special">[</span>'<span class="Constant">code</span>'<span class="Special">])</span>;
        $<span class="Identifier">token</span> = $<span class="Identifier">tokenSrvc</span><span class="Type">-&gt;</span>getTokenUsingCode<span class="Special">(</span>$<span class="Identifier">code</span><span class="Special">)</span>;
    <span class="Special">}</span> <span class="Statement">else</span> <span class="Special">{</span>
        $<span class="Identifier">token</span> = $<span class="Identifier">tokenSrvc</span><span class="Type">-&gt;</span>getTokenUsingScope<span class="Special">(</span>'<span class="Constant">WEBRTC</span>'<span class="Special">)</span>;
    <span class="Special">}</span>
    $<span class="Identifier">_SESSION</span><span class="Special">[</span>'<span class="Constant">token</span>'<span class="Special">]</span> = <span class="Identifier">serialize</span><span class="Special">(</span>$<span class="Identifier">token</span><span class="Special">)</span>;

    $<span class="Identifier">arr</span> = <span class="Type">array</span><span class="Special">(</span>
        '<span class="Constant">access_token</span>' =&gt; $<span class="Identifier">token</span><span class="Type">-&gt;</span>getAccessToken<span class="Special">()</span>,
        '<span class="Constant">refresh_token</span>' =&gt; $<span class="Identifier">token</span><span class="Type">-&gt;</span>getRefreshToken<span class="Special">()</span>,
        '<span class="Constant">expires_in</span>' =&gt; $<span class="Identifier">token</span><span class="Type">-&gt;</span>getExpiresIn<span class="Special">()</span>,
    <span class="Special">)</span>;
    <span class="PreProc">echo</span> <span class="Identifier">json_encode</span><span class="Special">(</span>$<span class="Identifier">arr</span><span class="Special">)</span>;
<span class="Special">}</span> <span class="Statement">catch</span> <span class="Special">(</span><span class="Identifier">Exception</span> $<span class="Identifier">e</span><span class="Special">)</span> <span class="Special">{</span>
    http_response_code<span class="Special">(</span><span class="Constant">500</span><span class="Special">)</span>;
    <span class="PreProc">echo</span> <span class="Identifier">json_encode</span><span class="Special">(</span>$<span class="Identifier">e</span><span class="Type">-&gt;</span>getMessage<span class="Special">())</span>;
<span class="Special">}</span>
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="java_token">
<pre>
<span class="Type">public</span> <span class="Type">void</span> doPost(HttpServletRequest request,
        HttpServletResponse response) <span class="Type">throws</span> ServletException, IOException{

    <span class="Statement">try</span> {
        <span class="Type">final</span> String FQDN = appConfig.getOauthFQDN();
        <span class="Type">final</span> String APPID = appConfig.getClientId();
        <span class="Type">final</span> String APPSECRET = appConfig.getClientSecret();

        <span class="Type">final</span> OAuthService service = <span class="Statement">new</span> OAuthService(FQDN, APPID, APPSECRET);

        OAuthToken token = <span class="Constant">null</span>;
        <span class="Type">final</span> String code = (String) request.getParameter(<span class="String">&quot;code&quot;</span>);
        <span class="Statement">if</span> (code != <span class="Constant">null</span>) {
            token = service.getTokenUsingCode(code);
        }
        <span class="Statement">else</span> {
            token = service.getToken(<span class="String">&quot;WEBRTC&quot;</span>);
        }

        setSessionToken(request, token);

        JSONObject t = <span class="Statement">new</span> JSONObject()
            .put(<span class="String">&quot;access_token&quot;</span>, token.getAccessToken())
            .put(<span class="String">&quot;refresh_token&quot;</span>, token.getRefreshToken());

        response.getWriter().write(t.toString());
    } <span class="Statement">catch</span> (RESTException e) {
        response.sendError(<span class="Constant">500</span>, e.getMessage());
    }
}

<span class="Type">public</span> <span class="Type">void</span> doGet(HttpServletRequest request, HttpServletResponse response)
        <span class="Type">throws</span> ServletException, IOException {
    request.setAttribute(<span class="String">&quot;cfg&quot;</span>, <span class="Statement">new</span> ConfigBean());
    <span class="Type">final</span> String forward = <span class="String">&quot;/WEB-INF/WebRTC.jsp&quot;</span>;
    RequestDispatcher dispatcher = request.getRequestDispatcher(forward);
    dispatcher.forward(request, response);
}
</pre>
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div><!--./modal-body-->
        </div><!--./modal-content-->
      </div><!--./modal-dialog-->
    </div><!--./modal-fade-->

    <!-- popup to hold associate source information -->
    <div class="modal fade" id="associateSnippet" tabindex="-1" role="dialog" aria-labelledby="requestResponseLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
            </button> 
            <h4 class="modal-title">Associate token</h4>
          </div>
          <div class="modal-body">
            <!-- begin code panel -->
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#ruby_assoc" role="tab" data-toggle="tab">Ruby</a></li>
                <li><a href="#php_assoc" role="tab" data-toggle="tab">PHP</a></li>
                <li><a href="#java_assoc" role="tab" data-toggle="tab">Java</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="ruby_assoc">
<pre>
post <span class="SpecialChar">'</span><span class="String">/oauth/associate</span><span class="SpecialChar">'</span> <span class="Statement">do</span>
  <span class="Statement">begin</span>
    user = request[<span class="Constant">:user</span>]
    url = <span class="SpecialChar">&quot;</span><span class="SpecialChar">&num;span><span class="Type">FQDN</span><span class="SpecialChar">}</span><span class="String">/RTC/v1/userIds/</span><span class="SpecialChar">&num;span>user<span class="SpecialChar">}</span><span class="SpecialChar">&quot;</span>
    token = session[<span class="Constant">:token</span>]

    headers = {
      <span class="Constant">:Accept</span> =&gt; <span class="SpecialChar">&quot;</span><span class="String">application/json</span><span class="SpecialChar">&quot;</span>,
      <span class="Constant">:Content_Type</span> =&gt; <span class="SpecialChar">&quot;</span><span class="String">application/json</span><span class="SpecialChar">&quot;</span>,
      <span class="Constant">:Authorization</span> =&gt; <span class="SpecialChar">&quot;</span><span class="String">Bearer </span><span class="SpecialChar">&num;span>token.access_token<span class="SpecialChar">}</span><span class="SpecialChar">&quot;</span>
    }

    <span class="Type">Transport</span>.put(url, <span class="SpecialChar">&quot;&quot;</span>, headers)
    <span class="Constant">201</span>
  <span class="Statement">rescue</span> <span class="Type">Exception</span> =&gt; e
    puts e.backtrace
    status <span class="Constant">500</span>
    body e.to_s
  <span class="Statement">end</span>
<span class="Statement">end</span>
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="php_assoc">
<pre>
<span class="Statement">try</span> <span class="Special">{</span>
    $<span class="Identifier">user</span> = $<span class="Identifier">_POST</span><span class="Special">[</span>'<span class="Constant">user</span>'<span class="Special">]</span>;
    $<span class="Identifier">token</span> = <span class="Identifier">unserialize</span><span class="Special">(</span>$<span class="Identifier">_SESSION</span><span class="Special">[</span>'<span class="Constant">token</span>'<span class="Special">])</span>;
    $<span class="Identifier">webrtcSrvc</span> = <span class="PreProc">new</span> WebRTCService<span class="Special">(</span>$<span class="Identifier">FQDN</span>, $<span class="Identifier">token</span><span class="Special">)</span>;
    $<span class="Identifier">webrtcSrvc</span><span class="Type">-&gt;</span>associateToken<span class="Special">(</span>$<span class="Identifier">user</span><span class="Special">)</span>;
    http_response_code<span class="Special">(</span><span class="Constant">201</span><span class="Special">)</span>;
<span class="Special">}</span> <span class="Statement">catch</span> <span class="Special">(</span><span class="Identifier">Exception</span> $<span class="Identifier">e</span><span class="Special">)</span> <span class="Special">{</span>
    http_response_code<span class="Special">(</span><span class="Constant">500</span><span class="Special">)</span>;
    <span class="PreProc">echo</span> <span class="Identifier">json_encode</span><span class="Special">(</span>$<span class="Identifier">e</span><span class="Type">-&gt;</span>getMessage<span class="Special">())</span>;
<span class="Special">}</span>
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="java_assoc">
<pre>
<span class="Type">public</span> <span class="Type">void</span> doPost(HttpServletRequest request, HttpServletResponse response)
        <span class="Type">throws</span> ServletException, IOException {
    <span class="Type">final</span> String FQDN = appConfig.getOauthFQDN();
    <span class="Type">final</span> String userName = (String) request.getParameter(<span class="String">&quot;user&quot;</span>);

    <span class="Statement">try</span> {
        <span class="Type">final</span> OAuthToken token = getSessionToken(request, response);
        <span class="Type">final</span> WebRTCService service = <span class="Statement">new</span> WebRTCService(FQDN, token);

        service.associateToken(userName);

        response.getWriter().write(<span class="String">&quot;&quot;</span>);
    } <span class="Statement">catch</span> (RESTException e) {
        response.sendError(<span class="Constant">500</span>, e.getMessage());
    }
}

<span class="Type">public</span> <span class="Type">void</span> doGet(HttpServletRequest request, HttpServletResponse response)
        <span class="Type">throws</span> ServletException, IOException {
    request.setAttribute(<span class="String">&quot;cfg&quot;</span>, <span class="Statement">new</span> ConfigBean());
    <span class="Type">final</span> String forward = <span class="String">&quot;/WEB-INF/WebRTC.jsp&quot;</span>;
    RequestDispatcher dispatcher = request.getRequestDispatcher(forward);
    dispatcher.forward(request, response);
}
</pre>
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div> <!-- end modal body -->
        </div><!-- end modal content -->
      </div><!-- end modal dialog -->
    </div> <!-- end modal -->

    <!-- popup to hold start session source information -->
    <div class="modal fade" id="sessionSource" tabindex="-1" role="dialog" aria-labelledby="sessionSource" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
            </button> 
            <h4 class="modal-title">Session Management</h4>
          </div>
          <div class="modal-body">
            <!-- begin code panel -->
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#startSessionSource" role="tab" data-toggle="tab">Start Session</a></li>
                <li><a href="#endSessionSource" role="tab" data-toggle="tab">End Session</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="startSessionSource">
<pre>
<span class="Identifier">var</span> e911 = $(view.input.e911).val();
phone.login(<span class="Identifier">{</span>
    token: token.access_token,
    e911Id: e911
<span class="Identifier">}</span>);
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="endSessionSource">
<pre>
phone.logout();
</pre>
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div> <!-- end modal body -->
        </div><!-- end modal content -->
      </div><!-- end modal dialog -->
    </div> <!-- end modal -->


    <!-- popup to hold call management source information -->
    <div class="modal fade" id="callMgmtSource" tabindex="-1" role="dialog" aria-labelledby="getTokenSnippet" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
            </button> 
            <h4 class="modal-title">Call Management</h4>
          </div>
          <div class="modal-body">
            <!-- begin code panel -->
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#startCallSource" role="tab" data-toggle="tab">Start Call</a></li>
                <li><a href="#endCallSource" role="tab" data-toggle="tab">End Call</a></li>
                <li><a href="#rejectCallSource" role="tab" data-toggle="tab">Reject Call</a></li>
                <li><a href="#acceptCallSource" role="tab" data-toggle="tab">Accept Call</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="startCallSource">
<pre>
<span class="Identifier">var</span> ctype = $(view.input.callType).val();
<span class="Identifier">var</span> number = $(view.input.phoneNumber).val();

phone.dial(<span class="Identifier">{</span>
        destination: number,
        mediaType: ctype,
        localMedia: $(view.video.local)<span class="Identifier">[</span>0<span class="Identifier">]</span>,
        remoteMedia: $(view.video.remote)<span class="Identifier">[</span>0<span class="Identifier">]</span>
<span class="Identifier">}</span>);
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="endCallSource">
<pre>
phone.hangup();
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="rejectCallSource">
<pre>
phone.reject();
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="acceptCallSource">
<pre>
phone.answer(<span class="Identifier">{</span>
        localMedia: $(view.video.local)<span class="Identifier">[</span>0<span class="Identifier">]</span>,
        remoteMedia: $(view.video.remote)<span class="Identifier">[</span>0<span class="Identifier">]</span>
<span class="Identifier">}</span>);
</pre>
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div> <!-- end modal body -->
        </div><!-- end modal content -->
      </div><!-- end modal dialog -->
    </div> <!-- end modal -->

    <!-- popup to hold call management source information -->
    <div class="modal fade" id="callInProgSource" tabindex="-1" role="dialog" aria-labelledby="getTokenSnippet" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <button type="button" class="close" data-dismiss="modal">
              <span aria-hidden="true">&times;</span><span class="sr-only">Close</span>
            </button> 
            <h4 class="modal-title">Call Management</h4>
          </div>
          <div class="modal-body">
            <!-- begin code panel -->
            <div class="panel-body">
              <ul class="nav nav-tabs" role="tablist">
                <li class="active"><a href="#holdCallSource" role="tab" data-toggle="tab">Hold Call</a></li>
                <li><a href="#resumeCallSource" role="tab" data-toggle="tab">Resume Call</a></li>
              </ul>
              <div class="tab-content">
                <div class="tab-pane active" id="holdCallSource">
<pre>
phone.hold();
</pre>
                </div><!--./tab-pane-->
                <div class="tab-pane" id="resumeCallSource">
<pre>
phone.resume();
</pre>
                </div><!--./tab-pane-->
              </div><!--./tab-content-->
            </div><!--./panel-body-->
          </div> <!-- end modal body -->
        </div><!-- end modal content -->
      </div><!-- end modal dialog -->
    </div> <!-- end modal -->

    <!-- Crazy Egg Code -->
    <script type="text/javascript">
      setTimeout(function(){var a=document.createElement("script");
        var b=document.getElementsByTagName("script")[0];
        a.src=document.location.protocol+"//dnn506yrbagrg.cloudfront.net/pages/scripts/0017/4039.js?"+Math.floor(new Date().getTime()/3600000);
        a.async=true;a.type="text/javascript";b.parentNode.insertBefore(a,b)}, 1);
    </script> 
    <!-- End Crazy Egg Code -->
  </body>
</html>
