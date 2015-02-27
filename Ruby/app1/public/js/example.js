/*
* Copyright 2014 AT&T
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

$(document).ready(function() {
    var updateNotification = function(klass, msg) {
        $('<div class="row"></div>')
        .addClass("alert "+ klass + " alert-dismissible notification")
        .attr("role", "alert")
        .append('<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>')
        .append("" + msg)
        .appendTo(view.div.globalInfo);
    };

    var webrtcSupport = ('Supported' === ATT.browser.hasWebRTC());
    var noWebrtcSupport = ('Not Supported' === ATT.browser.hasWebRTC());
    var partialWebrtcSupport = ('Not Certified' === ATT.browser.hasWebRTC());
    if (noWebrtcSupport) {
        updateNotification('alert-danger', 
            'Browser does not support webrtc!');
    }
    else if (partialWebrtcSupport) {
        updateNotification('alert-warning', 
            'Browser not certified, cannot guarantee full functionality!');
    }

    ATT.rtc.configure({ 
            ewebrtc_domain: config.ewebrtc_domain,
            api_endpoint: config.fqdn
    });

    var phone = ATT.rtc.Phone.getPhone();
    var dhs = config.dhs;
    var token_endpoint = config.token_endpoint;
    var authorize_endpoint = config.authorize_endpoint;
    var associate_endpoint = config.associate_endpoint;
    var sessionInfo = null;
    var token = null;

    var blockNumber = function(number) {
        number = '' + number;
        // do not block vtn
        if (number.indexOf('vtn:') === 0) {
            return false;
        }
        // do not block domains
        if (number.indexOf('@') != -1){
            return false;
        }
        // block 11 digit numbers that do not start with 1
        if (number.length === 11 && number.indexOf('1') != 0) {
            return true;
        }
        // block toll numbers 1-900
        var toll = number.indexOf('900');
        if (toll != -1) {
            if ((number.length === 11 && toll === 1) || (number.length === 10 && toll === 0)) {
                return true;
            }
        }
        // allow 10 and 11 digit numbers that passed the above
        if (number.length === 10 || number.length === 11) {
            return false;
        }
        // strictly block anything not caught above
        return true;
    };

    var secToStr = function(time) {
        var min = Math.floor(time/60),
        sec = time - (min * 60);
        if (sec < 10)
            sec = '0' + sec;
        return min + ':' + sec;
    };

    function Countdown(opts) {
        var counter,
        instance = this,
        interval = opts.interval || 1000,
        starting_seconds = opts.seconds || 180,
        seconds = starting_seconds,
        onComplete = opts.onComplete || function(){},
        onTick = opts.onTick || function(){};

        function decrement() {
            onTick(seconds);
            if (seconds === 0) {
                onComplete();
                instance.stop();
            }
            --seconds;
        };

        this.start = function() {
            clearInterval(counter);
            seconds = starting_seconds;
            counter = setInterval(decrement, interval);
        };

        this.stop = function(){
            clearInterval(counter);
        };
    };

    var callCounter = new Countdown({
            onTick: function(sec) {
                var timeStr = secToStr(sec);
                $(view.placeholder.countdown).html(timeStr);
            },
            onComplete: function() {
                if (phone.isCallInProgress())
                    phone.hangup();
            }
    });

    var confCounter = new Countdown({
            onTick: function(sec) {
                var timeStr = secToStr(sec);
                $(view.placeholder.confCountdown).html(timeStr);
            },
            onComplete: function() {
                phone.endConference();
            }
    });

    /******************\
    -** Tab handling **-
    \******************/

    // reset state on tab change
    $(view.div.tab).click(function() {
        state.init();
    });

    /********************\
    -** Token handling **-
    \********************/

    $(view.button.mobileConsent).click(function() {
        var url = dhs + authorize_endpoint;
        $.post(url)
        .done(function(response) {
            var data = JSON.parse(response);
            window.location = data.consent_url;
        }) 
        .fail(function() {
            state.mobileConsentError();
        });
    });

    $(view.button.mobileToken).click(function() {
        var auth_code = $(view.input.authCodeId).val();
        var url = dhs + token_endpoint;
        $.post(url, {code: auth_code})
        .done(function(data) {
            token = JSON.parse(data);
            state.mobileTokenSuccess();
        })
        .fail(function(xhr, textStatus) {
            state.mobileTokenError();
        });
    });

    $(view.button.vtnToken).click(function() {
        // reset our divs to hidden
        state.init();
        state.buttonClicked($(this));
        var url = dhs + token_endpoint;

        // post our app to get token
        $.post(url)
        .done(function(data) {
            token = JSON.parse(data);
            state.vtnTokenSuccess();
        })
        .fail(function(xhr, textStatus) {
            state.vtnTokenError();
        });
    });

    $(view.button.vtnAssign).click(function() {
        state.buttonClicked($(this));
        var number = $(view.input.vtnNumber).text();
        var url = dhs + associate_endpoint;

        // post our app to associate token with number
        $.post(url, {user: number})
        .done(function(response) {
            state.vtnAssociateSuccess();
        }) 
        .fail(function() {
            state.vtnAssociateError();
        });
    });

    $(view.button.accountToken).click(function() {
        // reset our divs to hidden
        state.init();
        state.buttonClicked($(this));
        var url = dhs + token_endpoint;

        // post our app to get token
        $.post(url)
        .done(function(data) {
            token = JSON.parse(data);
            state.accountTokenSuccess();
        })
        .fail(function(xhr, textStatus) {
            state.accountTokenError();
        });
    });

    $(view.button.accountAssign).click(function() {
        state.buttonClicked($(this));
        var username = $(view.input.username).val();
        var url = dhs + associate_endpoint;

        $.post(url, {user: username})
        .done(function(data) {
            state.accountAssociateSuccess();
        })
        .fail(function(xhr, textStatus) {
            state.accountAssociateError();
        });
    });

    /**********************\
    -** Session handling **-
    \**********************/

    $(view.button.startSession).click(function() {
        state.buttonClicked($(this));
        var e911 = null;
        if (stateStatus.current != stateStatus.accountId)
            e911 = $(view.input.e911).val();

        phone.login({
                token: token.access_token,
                e911Id: e911
        });
    });

    $(view.button.stopSession).click(function() {
        phone.logout();
    });

    /*******************\
    -** Call handling **-
    \*******************/

    $(view.button.startCall).click(function() {
        state.buttonClicked($(this));
        var ctype = $(view.input.callType).val();
        var number = $(view.input.phoneNumber).val();

        if (blockNumber(number)) {
            updateNotification('alert-danger', 
                'This app does not support calls to that number!');
            state.callStopped();
        }
        else {
            phone.dial({
                    destination: phone.cleanPhoneNumber(number),
                    mediaType: ctype,
                    localMedia: $(view.video.local)[0],
                    remoteMedia: $(view.video.remote)[0]
            });
        }
    });

    $(view.button.answerCall).click(function() {
        phone.answer({
                localMedia: $(view.video.local)[0],
                remoteMedia: $(view.video.remote)[0]
        });
    });

    $(view.button.rejectCall).click(function() {
        phone.reject();
    });

    $(view.button.endCall).click(function() {
        if (phone.isCallInProgress())
            phone.hangup();
    });
    
    $(view.button.holdCall).click(function() {
            phone.hold();
    });

    $(view.button.resumeCall).click(function() {
            phone.resume();
    });


    /*************************\
    -** Conference handling **-
    \*************************/

    $(view.button.startConf).click(function() {
        var ctype = $(view.input.confType).val();
        phone.startConference({
                mediaType: ctype,
                localMedia: $(view.video.confLocal)[0],
                remoteMedia: $(view.video.confRemote)[0]
        });
    });

    $(view.button.addParticipant).click(function() {
        var name = $(view.input.confParticipant).val();
        phone.addParticipants([name]);
    });

    $(view.button.removeParticipant).click(function() {
        var name = $(view.input.confParticipantRemove).val();
        phone.removeParticipant(name);
    });

    $(view.button.endConf).click(function() {
        phone.endConference();
    });

    $(view.button.rejectInvite).click(function() {
        phone.rejectConference();
    });

    $(view.button.joinConf).click(function() {
        phone.joinConference({
                localMedia: $(view.video.confLocal)[0],
                remoteMedia: $(view.video.confRemote)[0]
        });
    });

    /*********************\
    -** Phone callbacks **-
    \*********************/

    phone.on('error', function(err) {
        updateNotification('alert-danger', JSON.stringify(err));
        switch (err.error.JSMethod) {
            case 'dial':
                state.callStopped();
                break;
        }
    });

    phone.on('warning', function(warn) {
        updateNotification('alert-warning', JSON.stringify(warn));
    });

    phone.on('notification', function(info) {
        updateNotification('alert-info', JSON.stringify(info));
    }); 

    phone.on('session:ready', function onSessionReady(data) {
        sessionInfo = data;
        updateNotification('alert-success', "Session started: " + 
                JSON.stringify(data));
        state.sessionStarted();
    });

    phone.on('session:disconnected', function onSessionDisconnect(data) {
        updateNotification('alert-warning', 
            "Session disconnected: " + JSON.stringify(data));
        state.sessionStopped();
    });

    phone.on('call:incoming', function onCallIncoming(data) {
        updateNotification('alert-info', 
            " Received call incoming: "+ JSON.stringify(data));
        state.callIncoming(data.from, data.mediaType);
    });

    phone.on('dialing', function onDialing(data) {
        updateNotification('alert-info', 
            'Dialing: ' + JSON.stringify(data));
        state.dialing();
    });

    phone.on('answering', function onAnswer(data) {
        updateNotification('alert-info', 
            'Answering call: ' + JSON.stringify(data));
        state.callStarted(data.mediaType);
    });

    phone.on('media:established', function onCallConnected(data) {
        updateNotification('alert-success', 
            'Media established: ' + JSON.stringify(data));
    });

    phone.on('call:connected', function onCallConnected(data) {
        updateNotification('alert-success', 
            'Call connected: ' + JSON.stringify(data));
        state.callStarted(data.mediaType);
        callCounter.start();
    });

    phone.on('call:rejected', function onCallRejected(data) {
        updateNotification('alert-warning', 
            'Call rejected: ' + JSON.stringify(data));
        state.callRejected();
    });

    phone.on('call:disconnected', function onDisconnect(data) {
        updateNotification('alert-info', 
            'Call has disconnected: ' + JSON.stringify(data));
        state.callStopped();
        callCounter.stop();
    });

    phone.on('call:held', function onHold(data) {
        updateNotification('alert-info', 
            'Call has been put on hold: ' + JSON.stringify(data));
        state.callHeld();
    });

    phone.on('call:resumed', function onResume(data) {
        updateNotification('alert-info', 
            'Call has been resumed: ' + JSON.stringify(data));
        state.callResumed();
    });

    phone.on('conference:connecting', function onConfConnecting(data) {
        updateNotification('alert-info', 
            'Conference is connecting: ' + JSON.stringify(data));
    });

    phone.on('conference:connected', function onConfConnected(data) {
        updateNotification('alert-success', 
            'Conference has connected: ' + JSON.stringify(data));
        state.confStarted();
        confCounter.start();
        view.updateParticipants(phone);
    });

    phone.on('conference:ended', function onConfEnded(data) {
        updateNotification('alert-info', 
            'Conference has ended: ' + JSON.stringify(data));
        state.confEnded();
        confCounter.stop();
    });

    phone.on('conference:held', function onConfHeld(data) {
        updateNotification('alert-info', 
            'Conference has been put on hold: ' + JSON.stringify(data));
    });

    phone.on('conference:resumed', function onConfResume(data) {
        updateNotification('alert-info', 
            'Conference has been resumed: ' + JSON.stringify(data));
    });

    phone.on('conference:joining', function onConfJoining(data) {
        updateNotification('alert-info', 
            'Joining conference: ' + JSON.stringify(data));
    });

    phone.on('conference:invitation-received', function onConfInvite(data) {
        updateNotification('alert-info', 
            'Invitation received: ' + JSON.stringify(data));
        state.confIncoming(data.from, data.mediaType);
    });

    phone.on('conference:invitation-sent', function onConfInviteSent(data) {
        updateNotification('alert-info', 
            'Invitation sent: ' + JSON.stringify(data));
    });

    phone.on('conference:invitation-accepted', function onConfInviteAccepted(data) {
        updateNotification('alert-info', 
            'Invitation accepted: ' + JSON.stringify(data));
        view.updateParticipants(phone);
    });

    phone.on('conference:invitation-rejected', function onConfInviteRejected(data) {
        updateNotification('alert-info', 
            'Invitation rejected: ' + JSON.stringify(data));
    });

    phone.on('conference:participant-removed', function onConfParticipantRm(data) {
        updateNotification('alert-info', 
            'Participant removed: ' + JSON.stringify(data));
        view.updateParticipants(phone);
    });

});
