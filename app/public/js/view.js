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

var view = {
    button : {
        mobileConsent : "#mobile button[name=consent]",
        mobileToken : "#mobile button[name=token]",
        vtnToken : '#vtnToken',
        vtnAssign : '#vtnAssign',
        accountToken : '#accountToken',
        accountAssign : '#accountAssign',
        startSession : '#startSession',
        stopSession : '#stopSession',
        startCall : '#startCall',
        answerCall : '#answerCall',
        rejectCall : '#rejectCall',
        rejectConf : '#rejectInvite',
        endCall : '#endCall',
        holdCall : '#holdCall',
        resumeCall : '#resumeCall',
        startConf : '#startConf',
        joinConf : '#joinConf',
        endConf : '#endConf',
        addParticipant : '#addParticipant',
        removeParticipant : '#removeParticipant',
    },

    video : {
        local : '#localVideoElement',
        remote : '#remoteVideoElement',
        confLocal : '#confLocalVideoElement',
        confRemote : '#confRemoteVideoElement',
    },

    audio : {
        local: '#localAudioElement',
        remote: '#remoteAudioElement',
        confLocal : '#confLocalAudioElement',
        confRemote : '#confRemoteAudioElement',
    },

    div : {
        callId : '#callId',
        confCall : '#confCall',
        session : '#sessionHandling',
        globalInfo : '#globalInfo',
        vtnAssociate : '#vtnAssociate',
        mobileAssociate : '#mobileAssociate',
        accountAssociate : '#accountAssociate',
        tab : "#oauthCollapse a",
        video : "#video",
        confVideo : "#confVideo",
        uaMsg: "#useragentMsg",
        e911: "#e911",

        success : {
            vtnToken : '#vtnTokenSuccess',
            vtnAssociate : '#vtnAssociateSuccess',
            accountToken : '#accountTokenSuccess',
            accountAssociate : '#accountAssociateSuccess',
            mobileTokenSuccess: '#mobileTokenSuccess',
        },

        error : {
            vtnToken : '#vtnTokenError',
            vtnAssociate : '#vtnAssociateError',
            accountToken : '#accountTokenError',
            mobileConsent: '#mobileConsentError',
            mobileTokenError: '#mobileTokenError',
            accountAssociate :'#accountAssociateError',
        },
    },

    href : {
        confTab : '#callCollapse a[href=#confCall]',
        callTab : '#callCollapse a[href=#regCall]',
    },

    input : {
        vtnNumber : '#vtnNumber option:selected',
        e911 : "#sessionHandling input[name=e911]",
        username : "#accountAssociate input[name=username]",
        callType : "#callId select[name=callType]",
        confType : "#confCall select[name=callType]",
        phoneNumber : "#callId input[name=phoneNumber]",
        authCodeId : "#mobile input[name=auth_code]",
        confParticipant : "#confVideo input[name=participant]",
        confParticipantRemove : "#confVideo input[name=rmParticipant]",
    },

    placeholder : {
        caller: '#caller',
        host: '#host',
        mediaType: '#mediaType',
        confMediaType: '#confMediaType',
        countdown: '#countdown',
        confCountdown: '#confCountdown',
        participants: "#participants",
    },

    popup : {
        incomingCall: '#incomingCall',
        incomingInvite: '#incomingInvite',
    },

    updateParticipants : function(phone) {
        var plist = phone.getParticipants();
        var ul = view.placeholder.participants;
        $(ul).html("");
        for (var name in plist) {
            $('<li></li>').append(name).appendTo(ul);
        }
    },

};

var state = {
    init: function() {
        // Hide elements
        $(view.div.vtnAssociate).addClass('hidden');
        $(view.div.success.vtnToken).addClass('hidden');
        $(view.div.error.vtnToken).addClass('hidden');
        $(view.div.success.vtnAssociate).addClass('hidden');
        $(view.div.error.vtnAssociate).addClass('hidden');
        $(view.div.success.accountToken).addClass('hidden');
        $(view.div.error.accountToken).addClass('hidden');
        $(view.div.accountAssociate).addClass('hidden');
        $(view.div.session).addClass('hidden');
        $(view.div.video).addClass('hidden');

        // Call resets
        state.sessionStopped();
        state.callStopped();

        // Unhide elements
        $(view.div.e911).removeClass('hidden');

        // Reset buttons
        $(view.button.vtnToken).button('reset');
        $(view.button.vtnAssign).button('reset');
        $(view.button.accountToken).button('reset');
        $(view.button.accountAssign).button('reset');
        $(view.button.startSession).button('reset');
        $(view.button.stopSession).button('reset');
        $(view.button.startCall).button('reset');
        $(view.button.holdCall).button('reset');
        $(view.button.mobileConsent).button('reset');

        stateStatus.current = stateStatus.init;
    },

    mobileConsentError: function() {
        $(view.div.error.mobileConsent).removeClass('hidden');
        $(view.button.mobileConsent).button('reset');
    },

    vtnTokenSuccess: function() {
        $(view.div.success.vtnToken).removeClass('hidden');
        $(view.div.vtnAssociate).removeClass('hidden');
        $(view.button.vtnToken).button('reset');
    },

    vtnTokenError: function() {
        $(view.div.success.vtnToken).addClass('hidden');
        $(view.div.error.vtnToken).removeClass('hidden');
        $(view.button.vtnToken).button('reset');
    },

    mobileConsentSuccess: function() {
    },

    mobileTokenSuccess: function() {
        $(view.button.mobileToken).button('reset');
        $(view.div.error.mobileTokenError).addClass('hidden');
        $(view.div.success.mobileTokenSuccess).removeClass('hidden');
        $(view.div.session).removeClass('hidden');
        stateStatus.current = stateStatus.icmn;
    },

    mobileTokenError: function() {
        $(view.button.mobileToken).button('reset');
        $(view.div.error.mobileTokenError).removeClass('hidden');
        $(view.div.success.mobileTokenSuccess).addClass('hidden');
        $(view.div.session).removeClass('hidden');
    },

    vtnAssociateSuccess: function() {
        $(view.div.session).removeClass('hidden');
        $(view.div.success.vtnAssociate).removeClass('hidden');
        $(view.div.error.vtnAssociate).addClass('hidden');
        $(view.button.vtnAssign).button('reset');
        stateStatus.current = stateStatus.vtn;
    }, 

    vtnAssociateError: function() {
        $(view.div.success.vtnAssociate).addClass('hidden');
        $(view.div.error.vtnAssociate).removeClass('hidden');
        $(view.button.vtnAssign).button('reset');
    }, 

    accountTokenSuccess: function () {
        $(view.button.accountToken).button('reset');
        $(view.div.error.accountToken).addClass('hidden');
        $(view.div.success.accountToken).removeClass('hidden');
        $(view.div.accountAssociate).removeClass('hidden');
    },

    accountTokenError: function () {
        $(view.button.accountToken).button('reset');
        $(view.div.accountAssociate).addClass('hidden');
        $(view.div.success.accountToken).addClass('hidden');
        $(view.div.error.accountToken).removeClass('hidden');
    },

    accountAssociateSuccess: function() {
        $(view.button.accountAssign).button('reset');
        $(view.div.e911).addClass('hidden');
        $(view.div.error.accountAssociate).addClass('hidden');
        $(view.div.success.accountAssociate).removeClass('hidden');
        $(view.div.session).removeClass('hidden');
        stateStatus.current = stateStatus.accountId;
    },

    accountAssociateError: function() {
        $(view.button.accountAssign).button('reset');
        $(view.div.error.accountAssociate).removeClass('hidden');
        $(view.div.success.accountAssociate).addClass('hidden');
        $(view.div.session).addClass('hidden');
    },

    sessionStarted: function() {
        // if account else vtn/mobile
        if ($(view.div.e911).is(':hidden')) {
            $(view.button.startSession).data('loading-text', 'Session in progress').button('loading');
            $(view.div.e911).addClass('hidden');
            $(view.button.stopSession).removeClass('hidden');
            $(view.div.callId).removeClass('hidden');
        }
        else {
            $(view.button.startSession).data('loading-text', 'Session in progress').button('loading');
            $(view.button.stopSession).removeClass('hidden');
            $(view.div.callId).removeClass('hidden');
        }
    },

    sessionStopped: function() {
        $(view.button.startSession).button('reset');
        $(view.button.stopSession).addClass('hidden');
        $(view.div.callId).addClass('hidden');
        state.callStopped();
    },

    dialing: function() {
    },

    callIncoming: function(caller, media) {
        $(view.popup.incomingCall).modal();
        $(view.placeholder.caller).html(caller);
        $(view.placeholder.mediaType).html(media);
    },

    callStarted: function(mediaType) {
        $(view.href.callTab).click();
        $(view.button.startCall).addClass('disabled');
        $(view.button.holdCall).removeClass('hidden');
        $(view.button.resumeCall).addClass('hidden');
        $(view.div.video).removeClass('hidden');
        if (mediaType === 'audio') {
            $(view.audio.remote).removeClass('hidden');
            $(view.audio.local).removeClass('hidden');
            $(view.video.remote).addClass('hidden');
            $(view.video.local).addClass('hidden');
        } else {
            $(view.audio.remote).addClass('hidden');
            $(view.audio.local).addClass('hidden');
            $(view.video.remote).removeClass('hidden');
            $(view.video.local).removeClass('hidden');
        }
    },

    callHeld: function() {
        $(view.button.holdCall).addClass('hidden');
        $(view.button.resumeCall).removeClass('hidden');
    },

    callResumed: function() {
        $(view.button.holdCall).removeClass('hidden');
        $(view.button.resumeCall).addClass('hidden');
    },

    callStopped: function() {
        $(view.button.startCall).button('reset');
        $(view.button.startCall).removeClass('disabled');
        $(view.button.holdCall).removeClass('hidden');
        $(view.button.resumeCall).addClass('hidden');
        $(view.div.video).addClass('hidden');
    },

    callRejected: function() {
        this.callStopped();
    },

    confIncoming: function(host, media) {
        $(view.popup.incomingInvite).modal();
        $(view.placeholder.host).html(host);
        $(view.placeholder.confMediaType).html(media);
    },

    confStarted: function() {
        $(view.href.confTab).click();
        $(view.button.startConf).addClass('diabled');
        $(view.button.holdConf).removeClass('hidden');
        $(view.button.resumeConf).addClass('hidden');
        $(view.div.confVideo).removeClass('hidden');
    },

    confEnded: function() {
        $(view.button.startConf).button('reset');
        $(view.button.startConf).removeClass('disabled');
        $(view.button.holdConf).removeClass('hidden');
        $(view.button.resumeConf).addClass('hidden');
        $(view.div.confVideo).addClass('hidden');
    },

    buttonClicked: function(btn) {
        btn.button('loading');
    },

    set: function(s) {
        if (s in state) {
            state[s]();
        }
    },
};

var stateStatus = {
    current : 'init',
    init : 'init',
    accountId : 'account_id',
    vtn : 'vtn',
    icmn : 'icmn',
};

// add initial view setup here
$(document).ready(function() {
    var ua = navigator.userAgent;
    if (ua.indexOf("Chrome") === -1){
        $(view.div.uaMsg).removeClass("hidden");
    }
    else {
        $(view.div.uaMsg).addClass("hidden");
    }
});
