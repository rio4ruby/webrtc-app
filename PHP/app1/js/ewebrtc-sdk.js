/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/

// Define the Global ATT namespace

(function () {
  'use strict';

  var ATT = {
    //private namespace
    private: {
      factories: {
      },
      config: {
      }
    },
    //shared utilities
    utils: {
    },
    logManager: {
    },
    RESTClient: {
    },
    // Public namespace
    rtc: {
    }
  };

  // export ATT namespace
  window.ATT = ATT;

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/

//todo this module does not need to be exposed
if (!ATT) {
  var ATT = {};
}

(function (mainModule) {
  'use strict';

  var module = {},
      instance,
      init;

  var grammar = {
      v: [{
          name: 'version',
          reg: /^(\d*)$/
      }],
      o: [{ //o=- 20518 0 IN IP4 203.0.113.1
          // NB: sessionId will be a String in most cases because it is huge
          name: 'origin',
          reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
          names: ['username', 'sessionId', 'sessionVersion', 'netType', 'ipVer', 'address'],
          format: "%s %s %d %s IP%d %s"
      }],
      // default parsing of these only (though some of these feel outdated)
      s: [{ name: 'name' }],
      i: [{ name: 'description' }],
      u: [{ name: 'uri' }],
      e: [{ name: 'email' }],
      p: [{ name: 'phone' }],
      z: [{ name: 'timezones' }], // TODO: this one can actually be parsed properly..
      r: [{ name: 'repeats' }],   // TODO: this one can also be parsed properly
      //k: [{}], // outdated thing ignored
      t: [{ //t=0 0
          name: 'timing',
          reg: /^(\d*) (\d*)/,
          names: ['start', 'stop'],
          format: "%d %d"
      }],
      c: [{ //c=IN IP4 10.47.197.26
          name: 'connection',
          reg: /^IN IP(\d) (\S*)/,
          names: ['version', 'ip'],
          format: "IN IP%d %s"
      }],
      b: [{ //b=AS:4000
          push: 'bandwidth',
          reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
          names: ['type', 'limit'],
          format: "%s:%s"
      }],
      m: [{ //m=video 51744 RTP/AVP 126 97 98 34 31
          // NB: special - pushes to session
          // TODO: rtp/fmtp should be filtered by the payloads found here?
          reg: /^(\w*) (\d*) ([\w\/]*)(?: (.*))?/,
          names: ['type', 'port', 'protocol', 'payloads'],
          format: "%s %d %s %s"
      }],
      a: [
        { //a=rtpmap:110 opus/48000/2
            push: 'rtp',
            reg: /^rtpmap:(\d*) ([\w\-]*)\/(\d*)(?:\s*\/(\S*))?/,
            names: ['payload', 'codec', 'rate', 'encoding'],
            format: function (o) {
                return (o.encoding) ?
                  "rtpmap:%d %s/%s/%s" :
                  "rtpmap:%d %s/%s";
            }
        },
        { //a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
            push: 'fmtp',
            reg: /^fmtp:(\d*) (\S*)/,
            names: ['payload', 'config'],
            format: "fmtp:%d %s"
        },
        { //a=control:streamid=0
            name: 'control',
            reg: /^control:(.*)/,
            format: "control:%s"
        },
        { //a=rtcp:65179 IN IP4 193.84.77.194
            name: 'rtcp',
            reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
            names: ['port', 'netType', 'ipVer', 'address'],
            format: function (o) {
                return (o.address != null) ?
                  "rtcp:%d %s IP%d %s" :
                  "rtcp:%d";
            }
        },
        { //a=rtcp-fb:98 trr-int 100
            push: 'rtcpFbTrrInt',
            reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
            names: ['payload', 'value'],
            format: "rtcp-fb:%d trr-int %d"
        },
        { //a=rtcp-fb:98 nack rpsi
            push: 'rtcpFb',
            reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
            names: ['payload', 'type', 'subtype'],
            format: function (o) {
                return (o.subtype != null) ?
                  "rtcp-fb:%s %s %s" :
                  "rtcp-fb:%s %s";
            }
        },
        { //a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
            //a=extmap:1/recvonly URI-gps-string
            push: 'ext',
            reg: /^extmap:([\w_\/]*) (\S*)(?: (\S*))?/,
            names: ['value', 'uri', 'config'], // value may include "/direction" suffix
            format: function (o) {
                return (o.config != null) ?
                  "extmap:%s %s %s" :
                  "extmap:%s %s"
            }
        },
        {
            //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
            push: 'crypto',
            reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
            names: ['id', 'suite', 'config', 'sessionConfig'],
            format: function (o) {
                return (o.sessionConfig != null) ?
                  "crypto:%d %s %s %s" :
                  "crypto:%d %s %s";
            }
        },
        { //a=setup:actpass
            name: 'setup',
            reg: /^setup:(\w*)/,
            format: "setup:%s"
        },
        { //a=mid:1
            name: 'mid',
            reg: /^mid:(\w*)/,
            format: "mid:%s"
        },
        { //a=ptime:20
            name: 'ptime',
            reg: /^ptime:(\d*)/,
            format: "ptime:%d"
        },
        { //a=maxptime:60
            name: 'maxptime',
            reg: /^maxptime:(\d*)/,
            format: "maxptime:%d"
        },
        { //a=sendrecv
            name: 'direction',
            reg: /^(sendrecv|recvonly|sendonly|inactive)/,
            format: "%s"
        },
        { //a=ice-ufrag:F7gI
            name: 'iceUfrag',
            reg: /^ice-ufrag:(\S*)/,
            format: "ice-ufrag:%s"
        },
        { //a=ice-pwd:x9cml/YzichV2+XlhiMu8g
            name: 'icePwd',
            reg: /^ice-pwd:(\S*)/,
            format: "ice-pwd:%s"
        },
        { //a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
            name: 'fingerprint',
            reg: /^fingerprint:(\S*) (\S*)/,
            names: ['type', 'hash'],
            format: "fingerprint:%s %s"
        },
        {
            //a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
            //a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0
            //a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0
            push: 'candidates',
            reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: generation (\d*))?/,
            names: ['foundation', 'component', 'transport', 'priority', 'ip', 'port', 'type', 'raddr', 'rport', 'generation'],
            format: function (o) {
                var str = "candidate:%s %d %s %d %s %d typ %s";
                // NB: candidate has two optional chunks, so %void middle one if it's missing
                str += (o.raddr != null) ? " raddr %s rport %d" : "%v%v";
                if (o.generation != null) {
                    str += " generation %d";
                }
                return str;
            }
        },
        { //a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
            name: 'remoteCandidates',
            reg: /^remote-candidates:(.*)/,
            format: "remote-candidates:%s"
        },
        { //a=ice-options:google-ice
            name: 'iceOptions',
            reg: /^ice-options:(\S*)/,
            format: "ice-options:%s"
        },
        { //a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
            push: "ssrcs",
            reg: /^ssrc:(\d*) ([\w_]*):(.*)/,
            names: ['id', 'attribute', 'value'],
            format: "ssrc:%d %s:%s"
        },
        { //a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
            name: "msidSemantic",
            reg: /^msid-semantic: (\w*) (\S*)/,
            names: ['semantic', 'token'],
            format: "msid-semantic: %s %s" // space after ":" is not accidental
        },
        { //a=group:BUNDLE audio video
            push: 'groups',
            reg: /^group:(\w*) (.*)/,
            names: ['type', 'mids'],
            format: "group:%s %s"
        },
        { //a=rtcp-mux
            name: 'rtcpMux',
            reg: /^(rtcp-mux)/
        },
        { // any a= that we don't understand is kepts verbatim on media.invalid
            push: 'invalid',
            names: ["value"]
        }
      ]
  };

    // set sensible defaults to avoid polluting the grammar with boring details
  Object.keys(grammar).forEach(function (key) {
      var objs = grammar[key];
      objs.forEach(function (obj) {
          if (!obj.reg) {
              obj.reg = /(.*)/;
          }
          if (!obj.format) {
              obj.format = "%s";
          }
      });
  });

  var toIntIfInt = function (v) {
      return String(Number(v)) === v ? Number(v) : v;
  };

  var attachProperties = function (match, location, names, rawName) {
      if (rawName && !names) {
          location[rawName] = toIntIfInt(match[1]);
      }
      else {
          for (var i = 0; i < names.length; i += 1) {
              if (match[i + 1] != null) {
                  location[names[i]] = toIntIfInt(match[i + 1]);
              }
          }
      }
  };

  var parseReg = function (obj, location, content) {
      var needsBlank = obj.name && obj.names;
      if (obj.push && !location[obj.push]) {
          location[obj.push] = [];
      }
      else if (needsBlank && !location[obj.name]) {
          location[obj.name] = {};
      }
      var keyLocation = obj.push ?
    {} :  // blank object that will be pushed
        needsBlank ? location[obj.name] : location; // otherwise, named location or root

      attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);

      if (obj.push) {
          location[obj.push].push(keyLocation);
      }
  };

  var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);


    /**
    * Convert sdp string to SDP object
    * @param {String} sdp
    * returns {Object} SDP
    */
  function parse(sdp) {
      var session = {}
        , media = []
        , location = session; // points at where properties go under (one of the above)

      // parse lines we understand
      sdp.split('\r\n').filter(validLine).forEach(function (l) {
          var type = l[0];
          var content = l.slice(2);
          if (type === 'm') {
              media.push({ rtp: [], fmtp: [] });
              location = media[media.length - 1]; // point at latest media line
          }

          for (var j = 0; j < (grammar[type] || []).length; j += 1) {
              var obj = grammar[type][j];
              if (obj.reg.test(content)) {
                  return parseReg(obj, location, content);
              }
          }
      });

      session.media = media; // link it up
      return session;
  };

  var fmtpReducer = function (acc, expr) {
      var s = expr.split('=');
      if (s.length === 2) {
          acc[s[0]] = toIntIfInt(s[1]);
      }
      return acc;
  };

  function parseFmtpConfig(str) {
      return str.split(';').reduce(fmtpReducer, {});
  };

  function parsePayloads(str) {
      return str.split(' ').map(Number);
  };

  function parseRemoteCandidates(str) {
      var candidates = [];
      var parts = str.split(' ').map(toIntIfInt);
      for (var i = 0; i < parts.length; i += 3) {
          candidates.push({
              component: parts[i],
              ip: parts[i + 1],
              port: parts[i + 2]
          });
      }
      return candidates;
  };

    // customized util.format - discards excess arguments and can void middle ones
  var formatRegExp = /%[sdv%]/g;
  var format = function (formatStr) {
      var i = 1;
      var args = arguments;
      var len = args.length;
      return formatStr.replace(formatRegExp, function (x) {
          if (i >= len) {
              return x; // missing argument
          }
          var arg = args[i];
          i += 1;
          switch (x) {
              case '%%':
                  return '%';
              case '%s':
                  return String(arg);
              case '%d':
                  return Number(arg);
              case '%v':
                  return '';
          }
      });
      // NB: we discard excess arguments - they are typically undefined from makeLine
  };

  var makeLine = function (type, obj, location) {
      var str = obj.format instanceof Function ?
        (obj.format(obj.push ? location : location[obj.name])) :
        obj.format;

      var args = [type + '=' + str];
      if (obj.names) {
          for (var i = 0; i < obj.names.length; i += 1) {
              var n = obj.names[i];
              if (obj.name) {
                  args.push(location[obj.name][n]);
              }
              else { // for mLine and push attributes
                  args.push(location[obj.names[i]]);
              }
          }
      }
      else {
          args.push(location[obj.name]);
      }
      return format.apply(null, args);
  };

    // RFC specified order
    // TODO: extend this with all the rest
  var defaultOuterOrder = [
    'v', 'o', 's', 'i',
    'u', 'e', 'p', 'c',
    'b', 't', 'r', 'z', 'a'
  ];
  var defaultInnerOrder = ['i', 'c', 'b', 'a'];

    /**
    * Convert SDP object to string
    * @param {Object} session
    * @param {Object} opts
    * returns {String} sdp
    */
  function write(session, opts) {
      opts = opts || {};
      // ensure certain properties exist
      if (session.version == null) {
          session.version = 0; // "v=0" must be there (only defined version atm)
      }
      if (session.name == null) {
          session.name = " "; // "s= " must be there if no meaningful name set
      }
      session.media.forEach(function (mLine) {
          if (mLine.payloads == null) {
              mLine.payloads = "";
          }
      });

      var outerOrder = opts.outerOrder || defaultOuterOrder;
      var innerOrder = opts.innerOrder || defaultInnerOrder;
      var sdp = [];

      // loop through outerOrder for matching properties on session
      outerOrder.forEach(function (type) {
          grammar[type].forEach(function (obj) {
              if (obj.name in session) {
                  sdp.push(makeLine(type, obj, session));
              }
              else if (obj.push in session) {
                  session[obj.push].forEach(function (el) {
                      sdp.push(makeLine(type, obj, el));
                  });
              }
          });
      });

      // then for each media line, follow the innerOrder
      session.media.forEach(function (mLine) {
          sdp.push(makeLine('m', grammar.m[0], mLine));

          innerOrder.forEach(function (type) {
              grammar[type].forEach(function (obj) {
                  if (obj.name in mLine) {
                      sdp.push(makeLine(type, obj, mLine));
                  }
                  else if (obj.push in mLine) {
                      mLine[obj.push].forEach(function (el) {
                          sdp.push(makeLine(type, obj, el));
                      });
                  }
              });
          });
      });

      return sdp.join('\r\n') + '\r\n';
  };

  init = function () {
    return {
        parse: function (sdp) {
            return parse(sdp);
      },
        write: function (sdp) {
            return write(sdp);
      }
    };
  };

  mainModule.sdpParser = module;
  module.getInstance = function () {
    if (!instance) {
      instance = init();
    }
    return instance;
  };

}(ATT || {}));;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150, unparam:true*/
/*global error:true, ATT:true, define:true */

(function () {
  'use strict';

  var typeofWindow,
    logManager = {},
    instance,
    loggersCollection = [],
    getLogStatementFilePosition,
    moduleLoggers = []; // list of loggers for SDK modules

  // types of loggers
  logManager.LOGGER_TYPE = {
    CONSOLE: 'Console',
    FILE: 'File'
  };
  // levels for logging
  logManager.LOG_LEVEL = {
    ERROR: 0,
    WARNING: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };

  function log(type, toLogMsg, toLog) {
    if (undefined === toLog) {
      if (typeof toLogMsg === 'object') {
        console.log(type, toLogMsg, '[' + getLogStatementFilePosition() + ']');
        return;
      }
      console.log(type + ' ' + toLogMsg + ' [' + getLogStatementFilePosition() + ']');
      return;
    }
    if (typeof toLog === 'object') {
      console.log(type + ' ' + toLogMsg + ': [' + getLogStatementFilePosition() + ']');
      console.log(toLog);
      return;
    }
    console.log(type + ' ' + toLogMsg + ': ' + toLog + ' [' + getLogStatementFilePosition() + ']');
  }

  /**
   * Private method to return the filename and position as <filename>:<position> of log statement.  Does this by throwing
   * an exception and parsing its stack trace.
   * @returns {string} Returns <filename>:<position>
   */
  getLogStatementFilePosition = function () {
    var fileName = '',
      lineNumber,
      stackLocationString = '',
      splitstr = [],
      rawfile = '',
      splitrawfile = [];

    try {
      throw new Error();
    } catch (err) {
      stackLocationString = err.stack.split('\n')[4];
      splitstr = stackLocationString.split(':');
      rawfile = splitstr[2];
      splitrawfile = rawfile === undefined ? [] : rawfile.split('/');
      fileName = splitrawfile[splitrawfile.length - 1];

      // strip off timestamp if it's present.
      if (fileName !== undefined && fileName.indexOf('?') > -1) {
        fileName = fileName.split('?')[0];
      }

      lineNumber = splitstr[3];
      return fileName + ':' + lineNumber;
    }
  };

  function createConsoleLogger(spec) {
    var level = spec.level, type = spec.type;
    return {
      type: function () {
        return type;
      },
      level: function () {
        return level;
      },
      logError: function (msg) {
        if (level >= logManager.LOG_LEVEL.ERROR) {
          log('[ERROR]', msg);
        }
      },
      logWarning: function (msg) {
        if (level >= logManager.LOG_LEVEL.WARNING) {
          log('[WARN]', msg);
        }
      },
      logInfo: function (msg) {
        if (level >= logManager.LOG_LEVEL.INFO) {
          log('[INFO]', msg);
        }
      },
      logDebug: function (msg) {
        if (level >= logManager.LOG_LEVEL.DEBUG) {
          log('[DEBUG]', msg);
        }
      },
      logTrace: function (msg, obj) {
        if (level >= logManager.LOG_LEVEL.TRACE) {
          log('[TRACE]', msg, obj);
        }
      },
      setLevel: function (newLevel) {
        level = newLevel;
      },
      setType: function (newType) {
        type = newType;
      }
    };
  }

    //todo file logger
  function configureLogger(moduleName, type, level) {
    var clogger = loggersCollection[moduleName];
    if (clogger) {
      return;
    }
    if (type === logManager.LOGGER_TYPE.CONSOLE) {
      clogger = createConsoleLogger({ level: level, type: type });
    }
    loggersCollection[moduleName] = clogger;
    return true;
  }

  function getLogger(moduleName, loggerType, logLevel) {
    var type = loggerType || logManager.LOGGER_TYPE.CONSOLE,
      level = logLevel || logManager.LOG_LEVEL.INFO,
      clogger = loggersCollection[moduleName];
    if (!clogger) {
      if (type === logManager.LOGGER_TYPE.CONSOLE) {
        clogger = createConsoleLogger({level: level, type: type});
        loggersCollection[moduleName] = clogger;
      }
    }
    return clogger;
  }

  /**
   * @summary
   * Creates a logger for a given module.
   * @desc Use this function to create a logger by passing a module name.
   *
   * @param {string} moduleName
   *
   * @memberOf ATT.logManager
   *
   * @example
   var logManager = ATT.logManager.getInstance();
   logManager.addLoggerForModule(moduleName);
   */

  function addLoggerForModule(moduleName) {
    var logMgr = ATT.logManager.getInstance(), lgr;
    logMgr.configureLogger(moduleName, logMgr.loggerType.CONSOLE, logMgr.logLevel.TRACE);
    lgr = logMgr.getLogger(moduleName);
    moduleLoggers[moduleName] = lgr;
    return moduleLoggers[moduleName];
  }

  /**
   * @summary
   * Finds or if not available, creates a logger for a given module.
   * @desc Use this function to find a logger by passing a module name.
   *
   * @param {string} moduleName
   *
   * @memberOf ATT.logManager
   *
   * * @returns {Logger} A logger object.
   * @example
   var logManager = ATT.logManager.getInstance();
   logManager.getLoggerByName(moduleName);
   */

  function getLoggerByName(moduleName) {
    var lgr = moduleLoggers[moduleName];
    if (lgr === undefined) {
      return addLoggerForModule(moduleName);
    }
    return lgr;
  }

  /**
   * @summary
   * Updates the passed log level on the given module.
   * @desc Use this function to update a log level for the module passed by user.
   *
   * Pass a module name as a first parameter and pass the value 0 to log Error,
   *
   * 1 for Error and Warning,
   *
   * 2 for all of above and Information,
   *
   * 3 for all of above and Debug, and
   *
   * 4 for all of above and Trace for the specified module.
   *
   * @param {string}  moduleName
   * @param {number} level
   *
   * @memberOf ATT.logManager
   *
   * @example
   var logManager = ATT.logManager.getInstance();
   logManager.updateLogLevel(module,level);
   */
  function updateLogLevel(moduleName, level) {
    var lgr = getLogger(moduleName);
    if (undefined !== lgr) {
      lgr.setLevel(level);
    }
  }

  /**
   * @summary
   * Sets the passed log level for all the modules.
   * @desc Use this function to set a log level for all the modules.
   *
   * Pass the value 0 to log Error,
   *
   * 1 for Error and Warning,
   *
   * 2 for all of above and Information,
   *
   * 3 for all of above and Debug, and
   *
   * 4 for all of above and Trace for all the modules.
   *
   * If none of the above value is passed, then the log level will be set to 3 by default.
   *
   * @param {number} level
   *
   * @memberOf ATT.logManager
   *
   * @example
   var logManager = ATT.logManager.getInstance();
   logManager.setLogLevel(level);
   */

  function setLogLevel(level) {
    if (undefined === level) {
      level = 3;
    }
    var module;
    for (module in moduleLoggers) {
      if (moduleLoggers.hasOwnProperty(module)) {
        this.updateLogLevel(module, level);
      }
    }
  }

  function init() {
    return {
      getLogger: getLogger,
      configureLogger: configureLogger,
      loggerType: logManager.LOGGER_TYPE,
      logLevel: logManager.LOG_LEVEL,
      getLoggerByName: getLoggerByName,
      addLoggerForModule: addLoggerForModule,
      updateLogLevel: updateLogLevel,
      setLogLevel: setLogLevel
    };
  }

  /**
   * @summary
   * Get the current instance of Log manager.
   * @desc Use this function to create a Log manager object to use the functionality provided in the namespace.
   *
   * @memberOf ATT.logManager
   *
   * @returns {LogManager} A LogManager object.
   *
   */

  logManager.getInstance = function () {
    if (!instance) {
      instance = init();
    }
    return instance;
  };

  if (typeof module === "object" && module && typeof module.exports === "object") {
    module.exports = logManager;
  }

  // export to the browser
  typeofWindow = typeof window;
  if ('undefined' !== typeofWindow && ATT) {

    /**
     * LogManager API for Enhanced WebRTC functionality.
     *
     * @desc LogManager object allows users to utilize the functionality provided by the SDK with operations like
     * adding a logger for a module, getting a logger by passing a module name,
     * update a log level on a module and set log level on all modules.
     *
     * @namespace ATT.logManager
     */

    ATT.logManager = logManager;
  }
}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/
/**
 Event Emitter implements Mediator pattern publishes local SDP offers to SignallingChannel - triggered by PeerConnectionService
 Publishes remote SDP answer... to PeerConnectionService - triggered by EventChannel
 Acts as single publishing point for UI callbacks

 Give a call object it will give you callback handle for this call object
 Maintains topic style of pub/sub
 **/

(function () {

  'use strict';
  var typeofATT;

  function createEventEmitter() {
    var topics  =  {};

    function callMethodOnTopic(topicObj, args) {
      topicObj.callback.apply(topicObj.context, args);
    }

    return {
      getTopics : function () {
        return topics;
      },
      unsubscribe : function (topic, callback) {
        var i,
          subscribers;
        if (!topics.hasOwnProperty(topic)) {
          return false;
        }
        if (typeof callback !== 'function') {
          throw new Error('Must pass in the callback you are unsubscribing');
        }

        subscribers = topics[topic];
        for (i = 0; i < subscribers.length; i = i + 1) {
          if (subscribers[i].callback === callback) {
            subscribers.splice(i, 1);
            if (subscribers.length === 0) {
              delete topics[topic];
            }
            return true;
          }
        }
        return false;
      },
      publish : function () {
        var args  =  Array.prototype.slice.call(arguments),
          topic  =  args.shift(),
          i,
          subscribers;
        if (!topics.hasOwnProperty(topic)) {
          return false;
        }
        subscribers = topics[topic];

        for (i = 0; i  <  subscribers.length; i = i + 1) {
          setTimeout(callMethodOnTopic.bind(null, topics[topic][i], args), 0);
        }
        return true;
      },
      /**
       *
       * @param {String} topic The topic name.
       * @param {Function} callback The callback function.
       * @param {Object} context Optional callback context.
       * @returns {boolean}
       */
      subscribe  :  function (topic, callback, context) {
        var subscribers, i, topicObj;
        if ('' === topic
            || null === topic
            || undefined === topic) {
          return false;
        }

        if (typeof callback !== 'function') {
          return false;
        }

        if (undefined !== context
            && (context === null
            || typeof context !== 'object')) {
          return false;
        }

        topicObj = {
          context: context,
          callback: callback
        };

        if (!topics.hasOwnProperty(topic)) {
          topics[topic] =  [];
        }

        subscribers = topics[topic];

        for (i = 0; i < subscribers.length; i = i + 1) {
          if (callback === subscribers[i].callback) {
            return false;
          }
        }

        topics[topic].push(topicObj);
        return true;
      }
    };
  }

  typeofATT = typeof window.ATT;
  if (undefined ===  typeofATT) {
    window.ATT = {
      private: {
        factories : { }
      }
    };
  } else if (undefined === ATT.private) {
    ATT.private = {
      factories : { }
    };
  }
  ATT.private.factories.createEventEmitter = createEventEmitter;

}());;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/

/**
 * Abstraction of the XMLHttpRequest used in the SDK.
 */
//required for nodejs
if (!ATT) {
  var ATT = {};
}
var attUtils = null;
if (typeof module === "object" && module && typeof module.exports === "object") {
  attUtils = {
    utils : require('./att.utils'),
    logManager : require('./att.log-manager.js')
  };
  module.exports = attUtils;
}

var RESTClient = (function (mainModule) {
  'use strict';

  var typeofWindow = typeof window,
    typeofModule = typeof module === "object" && module && typeof module.exports === "object",
    logger = null,
    defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    defaultErrorHandler,
    errorHandler,
    getUtils = function (app) {
      if (typeofModule) {
        return attUtils.utils.utils;
      }
      return app.utils;
    },
    //Inject logger
    setLogger = function (lgr) {
      logger = lgr;
    },
    getLogger = function (app) {
      if (typeofModule) {
        return attUtils.logManager.getInstance();
      }
      return app.logManager.getInstance();
    },
    logMgr = getLogger(mainModule),
    RESTClient =  function (config) {
      // set default logger
      logMgr.configureLogger('RESTClient', logMgr.loggerType.CONSOLE, logMgr.logLevel.DEBUG);
      logger = logMgr.getLogger('RESTClient');

      this.config =  getUtils(mainModule).extend({}, config);
      // default ajax configuration
      this.config.async = this.config.async || true;

      this.config.success = this.config.success || function () { return; };
      this.config.error = this.config.error || defaultErrorHandler;
      this.config.ontimeout = this.config.ontimeout || function (xhr) {
        logger.logDebug(xhr);
        logger.logError("Request timed out");
        return;
      };
      this.config.headers = this.config.headers || defaultHeaders;
    },
    //print request details
    showRequest =  function (method, url, headers, body) {
      var reqLogger, key, reqBody = JSON.stringify(body);
      try {
        reqLogger = logMgr.getLogger('RESTClient');
      } catch (e) {
        console.log("Unable to configure request logger" + e);
      }
      reqLogger.logDebug('---------Request---------------');
      reqLogger.logDebug(method + ' ' + url + ' HTTP/1.1');
      reqLogger.logDebug('=========headers=======');
      for (key in headers) {
        if (headers.hasOwnProperty(key)) {
          reqLogger.logDebug(key + ': ' + headers[key]);
        }
      }
      if (reqBody !== undefined) {
        reqLogger.logDebug('=========body==========');
        reqLogger.logDebug(reqBody);
      }
    },
    //print response details for success
    show_response =  function (response) {
      var resLogger;
      try {
        resLogger = logMgr.getLogger('RESTClient');
      } catch (e) {
        console.log("Unable to configure default logger" + e);
      }

      resLogger.logDebug('---------Response--------------');
      resLogger.logDebug(response.getResponseStatus());
      resLogger.logDebug('=========headers=======');
      resLogger.logDebug(response.headers);
      resLogger.logDebug('=========body==========');
      resLogger.logDebug(response.responseText);
    },
    parseJSON = function (xhr) {
      var contType = xhr.getResponseHeader("Content-Type"),
        json;
      if (contType && contType.indexOf("application/json") === 0) {
        json = JSON.parse(xhr.responseText);
        return typeof json === 'object' ? json : JSON.parse(json); // double parse some JSON responses
      }
      return "";
    },
    buildResponse = function (xhr, config) {
      var responseObject = {
        getJson: function () {
          return parseJSON(xhr);
        },
        getResponseHeader: function (key) {
          return xhr.getResponseHeader(key);
        },
        responseText: xhr.responseText,
        headers: xhr.getAllResponseHeaders(),
        statusText: xhr.statusText,
        getResponseStatus: function () {
          return xhr.status;
        },
        getResourceURL: function () {
          return config.method.toUpperCase() + " " + config.url;
        }
      };
      return responseObject;
    },
    success = function (config) {
      // private methods
      var xhr = this,
        responseObject = buildResponse(xhr, config),
        responseCopy = getUtils(mainModule).extend({}, responseObject);
      show_response(responseCopy);
      if (xhr.status >= 400 && xhr.status <= 599) {
        if (typeof errorHandler === 'function') {
          errorHandler.call(xhr, responseCopy);
        } else {
          defaultErrorHandler.call(xhr, responseCopy);
        }
      } else {
        config.success.call(xhr, responseCopy);
      }
    },
    error = function (config) {
      var xhr = this,
        responseObject = buildResponse(xhr, config),
        responseCopy = getUtils(mainModule).extend({}, responseObject);
      show_response(responseCopy);
      //call the error callback
      config.error.call(this, responseCopy);
    },
    timeout = function (config) {
      var xhr = this,
        responseObject = buildResponse(xhr, config),
        responseCopy = getUtils(mainModule).extend({}, responseObject);
      show_response(responseCopy);
      //call the timeout callback
      logger.logError("Request timeout");
      config.ontimeout.call(this, responseCopy);
    };

  // public methods
  RESTClient.prototype.ajax = function () {
    var config = this.config,  xhr = new XMLHttpRequest(), data = null, header = null, errLogger = null;
    try {
      data = config.data && JSON.stringify(config.data);
      if (!logger) {
        console.log("Using console logger for debugging");
        setLogger(null);
      }
      // timeout
      if (config.timeout !== undefined) {
        xhr.timeout = config.timeout;
      }

      // success callback
      xhr.onload = success.bind(xhr, config);

      // set up passed in error handler to be called if xhr status is in error.
      errorHandler = config.error;

      // error callback
      xhr.onerror = function () {
        if (config.error !== 'undefined') {
          error.call(this, config);
        } else {
          throw new Error('Network error occurred in REST client.');
        }
      };
      // This should address request cancel events for CORS or any other issues
      xhr.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 0 && this.statusText === "") {
          //if there is no timeout handler configured then call the error handler
          if (config.ontimeout === undefined) {
            logger.logError("Failed to complete request for resource:" + config.url);
            error.call(this, config);
          }
        }
      };

      xhr.onabort = error.bind(xhr, config);

      // on timeout callback
      xhr.ontimeout = timeout.bind(xhr, config); //config.ontimeout;

      // open connection
      xhr.open(config.method, config.url, config.async);

      // optional headers from config
      for (header in config.headers) {
        if (config.headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header, config.headers[header]);
        }
      }
      showRequest(config.method, config.url, config.headers, data);
      xhr.send(data);

    } catch (ex) {
      errLogger = logMgr.getLogger('RESTClient');
      errLogger.logError("XHR request failed, " + ex);
      if (typeof errorHandler === 'function') {
        errorHandler.call(xhr, ex);
      } else {
        defaultErrorHandler.call(xhr, ex);
      }
    }
  };

  /**
   * Default ajax error handler.
   */
  defaultErrorHandler = function (obj) {
    throw new Error('RESTClient error handler triggered!' + obj);
  };

  function addHttpMethodsToPrototype(methods) {
    methods.forEach(function (method) {
      RESTClient.prototype[method] = function (config) {
        config.method = method;
        config.headers = getUtils(mainModule).extend(this.config.headers, config.headers);
        this.ajax(config);
      };
    });
  }

  addHttpMethodsToPrototype(['get', 'post', 'delete']);

  RESTClient.prototype.getConfig = function () {
    return this.config;
  };

  // export to the browser
  if ('undefined' !== typeofWindow && ATT) {
    ATT.RESTClient = RESTClient;
  }
  return RESTClient;
}(ATT));

if (typeof module === "object" && module && typeof module.exports === "object") {
  module.exports = RESTClient;
}
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT*/
/** Will export utilities, therefore nothing in here depends on anything else.
 * Will create `ATT.utils` namespace
 */

var attUtils = (function (mainModule) {
  'use strict';

    /**
     * Extends an existing object using deep copy.
     * Note: It will only deep-copy instances of Object.
     * @param destination
     * @param source
     * @returns {*} destination
     */
  var extend = function (destination, source) {
      var property;
      for (property in source) {
        // if the source has `property` as a `direct property`
        if (source.hasOwnProperty(property)) {
          // if that property is NOT an `Object`
          if (!(source[property] instanceof Object)) {
            // copy the value into the destination object
            destination[property] = source[property];
          } else {// `property` IS an `Object`
            // copy `property` recursively
            destination[property] = extend(source[property]);
          }
        }
      }
      return destination;
    },
    inherits = function (ctor, superCtor) {
      ctor.super = superCtor;
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
    },

    /**
     Places namespaces on root object.  s is dot separated string of names adding to root.
     The namespace created is returned.
     */
    createNamespace = function (root, s) {
      var names = s.split('.'),
        parent = root;

      names.forEach(function (name) {
        if (!parent[name]) { parent[name] = {}; }
        parent = parent[name];
      });
      return parent;
    };

  function createCalledPartyUri(destination) {
    if (destination.match(new RegExp('[^0-9]')) === null) { // Number (MOBILE_NUMBER/VIRTUAL_NUMBER/PSTN)
      if (destination.length === 10) {  // 10 digit number
        return 'tel:+1' + destination;
      }
      if (destination.indexOf('1') === 0) {  // 1 + 10 digit number
        return 'tel:+' + destination;
      }
      if (destination.indexOf('+') === 0) { // '+' + Number
        return 'tel:' + destination;
      }
      return 'sip:' + destination + '@icmn.api.att.net'; // if nothing works this will
    }
    if (destination.indexOf('@') > 0) { // Account ID user (assuming domain supplied to SDK dial)
      return 'sip:' + destination;
    }
    return null;
  }

  // update `utils` namespace under `ATT`
  mainModule.utils = {
    createNamespace: createNamespace,
    extend: extend,
    inherits: inherits,
    createCalledPartyUri: createCalledPartyUri
  };

  if (typeof module === "object" && module && typeof module.exports === "object") {
    module.exports = mainModule;
  }

}(ATT));

;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/

//todo this module does not need to be exposed
if (!ATT) {
  var ATT = {};
}

(function (mainModule) {
  'use strict';

  var module = {},
    instance,
    init,
    logMgr = ATT.logManager.getInstance(),
    logger;

  logger = logMgr.getLoggerByName('SDPFilterModule');

  /**
  * Remove video from sdp
  * @param {String} sdp
  * returns {String} sdp
  */
//  function removeVideoMediaPartFromSdp(sdp) {
//    var indexof = sdp.indexOf("m=video");
//    if (indexof > 0) {
//      sdp = sdp.substr(0, indexof);
//    }
//    return sdp;
//  }

  // fakeing the Video sdp when PSTN phone asnwers with a video Call as audio Call.
  // IIP return only audio sdp
  function fakeVideo(sdp) {
    var sl,
      o_pattern,
      new_sl,
      fake,
      index,
      m;

    o_pattern = "m=video.*";
    sl = sdp.split('\r\n');

    new_sl = [];
    for (index = 0; index < sl.length; index = index + 1) {
      if (sl[index].match(o_pattern)) {
        break;
      }
      new_sl.push(sl[index]);
    }
    fake = [
      "m=video 18396 RTP/SAVPF 100 116 117",
      //"c=IN IP4 12.102.196.108",
      //"a=sendrecv",
      "a=inactive",
      "a=rtpmap:100 VP8/90000",
      "a=rtcp-fb:100 ccm fir",
      "a=rtcp-fb:100 nack",
      "a=rtcp-fb:100 nack pli",
      "a=rtcp-fb:100 goog-remb",
      "a=rtpmap:116 red/90000",
      "a=rtpmap:117 ulpfec/90000",
      "a=fingerprint:SHA-1 47:A7:77:D5:12:9E:B3:EF:BB:E8:B2:FA:17:49:C8:61:D3:9C:3E:7E",
      "a=setup:active",
      //"a=setup:passive",
      "a=candidate:1 1 UDP 2130706431 12.102.196.108 18396 typ host",
      "a=candidate:1 2 UDP 2130706430 12.102.196.108 18397 typ host",
      "a=rtcp:18397",
      "a=ice-ufrag:ZovN",
      "a=ice-pwd:XZ4FRPpHtkdmQ59aGGfcRMGf",
      ""
    ];

    for (m in fake) {
      if (fake.hasOwnProperty(m)) {
        new_sl.push(fake[m]);
      }
    }
    return new_sl.join("\r\n");

    /*
     sl=new_sl+fake;
     return sl.join("\r\n");
     */
  }


  /**
  * Change video port to 0 in sdp
  * @param {String} sdp
  * returns {String} sdp
  */
//  function changeVideoPortToZero(sdp) {
//      var nth = 0;
//      var replaced = sdp.replace(/m=video(.+)RTP/g, function (match, i, original) {
//          nth++;
//          return (nth === 1) ? "m=video 0 RTP" : match;
//      });
//
//      nth = 0;
//      var replaced = replaced.replace(/a=rtcp:(.+)IN/g, function (match, i, original) {
//          nth++;
//          return (nth === 2) ? "a=rtcp:0 IN" : match;
//      });
//
//      return replaced;
//  }

  /**
  * Remote an attribute from SDP
  * @param {String} attributeValue
  * @param {String} sdp
  * returns {String} sdp
  */
  function removeSDPAttribute(attributeValue, sdp) {
    //remove attribute from the middle.
    var attribute = "a=" + attributeValue + "\r\n",
      index = sdp.indexOf(attribute);
    if (index > 0) {
      sdp = sdp.replace(attribute, "");
    }
    return sdp;
  }

  /**
  * Modify SDP
  * @param {String} sdp
  * @param {String} oldString
  * @param {String} newString
  * returns {String} sdp
  */
//  function updateSdp(sdp, oldString, newString) {
//    var regex = new RegExp(oldString, 'g');
//    sdp = sdp.replace(regex, newString);
//    return sdp;
//  }

  /**
  * Function to increment SDP
  * @param {Object} sdp The SDP
  * @returns {Object} sdp
  */
  function incrementSDP(sdp) {
    logger.logTrace('increment sdp', sdp);

    var oIndex = sdp.sdp.indexOf('o='),
      sIndex = sdp.sdp.indexOf('s=-'),
      oLine = sdp.sdp.slice(oIndex, sIndex),
      oLineArray = oLine.split(' '),
      timestamp = new Date().getTime(),
      oLine2 = oLine.replace(' ' + oLineArray[2].toString() + ' ', ' ' + timestamp.toString() + ' ');

    sdp.sdp = sdp.sdp.replace(oLine, oLine2);

    logger.logTrace('modified sdp', sdp);
    return sdp;
  }

  /**
  * Function to get CODEC form SDP
  * @param {Object} sdp The SDP
  * @returns {Object} CODEC
  */
  function getCodecfromSDP(event_sdp) {
    var CODEC = [], idx, media, sdp = ATT.sdpParser.getInstance().parse(event_sdp);
    logger.logDebug('Parsed SDP ' + sdp);
    for (idx = 0; idx < sdp.media.length; idx = idx + 1) {
      media = {
        rtp: sdp.media[idx].rtp,
        type: sdp.media[idx].type
      };
      CODEC.push(media);
    }
    return CODEC;
  }

  /**
   * Function to remove mid & bundle lines from the SDP.
   * @param {String} sdp
   * @returns {*|sdp}
  */
  function jslWorkarounds(sdp) {
    // Remove mid lines
    sdp = sdp.replace(/a=mid:video\r\n/g, "");
    sdp = sdp.replace(/a=mid:audio\r\n/g, "");

    // Remove bundle lines
    sdp = sdp.replace(/a=group:BUNDLE audio video\r\n/g, "");
    sdp = sdp.replace(/a=group:BUNDLE audio\r\n/g, "");

    return sdp;
  }

  function setupActivePassive(description) {
    //setup actpass to accept incoming and outgoing connections
    description = description.replace(/setup:passive/g, 'setup:actpass');
    description = description.replace(/setup:active/g, 'setup:actpass');
    return description;
  }
  /**
   * Function to Opus from SDP generated by Firefox, Chrome and Leif.
   * @param {String} sdp
   * @returns {*|sdp}
  */
  function removeCodec(sdp) {
    if (navigator.mozGetUserMedia) {
      //Remove Opus from Firefox
      sdp = sdp.replace("RTP/SAVPF 109 0", "RTP/SAVPF 0");
      sdp = sdp.replace("\r\na=rtpmap:109 opus/48000/2", "");
    } else {
      //Remove Opus from Chrome and Leif
      sdp = sdp.replace("RTP/SAVPF 111 103 104 0 ", "RTP/SAVPF 0 ");
      sdp = sdp.replace("\r\na=rtpmap:111 opus/48000/2", "");
      sdp = sdp.replace("\r\na=rtpmap:103 ISAC/16000", "");
      sdp = sdp.replace("\r\na=rtpmap:104 ISAC/32000", "");
      sdp = sdp.replace("\r\na=fmtp:111 minptime=10", "");
    }
    return sdp;
  }

  function modifyForHoldCall(localSdp) {
    logger.logDebug('sdpFilter.modifyForHoldCall');

    if (undefined === localSdp) {
      logger.logError('Please pass the correct parameter for modifyForHoldCall');
      throw new Error('parameter `localSdp` is undefined');
    }

    try {
      var sdp = localSdp;

//      sdp.sdp = sdp.sdp.replace(/setup:passive/g, 'setup:actpass');
//      sdp.sdp = sdp.sdp.replace(/setup:active/g, 'setup:actpass');

      sdp.sdp = sdp.sdp.replace(/a=sendrecv/g, 'a=sendonly');
      sdp.sdp = sdp.sdp.replace(/a=recvonly/g, 'a=sendonly');

      sdp.type = 'offer';

      sdp = this.processChromeSDPOffer(sdp);

      return sdp;

    } catch (error) {
      throw error;
    }
  }

  function modifyForResumeCall(localSdp) {

    logger.logDebug('sdpFilter.modifyForResumeCall');

    if (undefined === localSdp) {
      logger.logError('Please pass the correct parameter for modifyForResumeCall');
      throw new Error('parameter `localSdp` is undefined');
    }

    try {
      var sdp = localSdp;

      // adjust SDP for resume request
      sdp.sdp = sdp.sdp.replace(/a=recvonly/g, 'a=sendrecv');
      sdp.sdp = sdp.sdp.replace(/a=sendonly/g, 'a=sendrecv');

//      sdp.sdp = sdp.sdp.replace(/setup:passive/g, 'setup:actpass');
//      sdp.sdp = sdp.sdp.replace(/setup:active/g, 'setup:actpass');

      sdp.type = 'offer';

      sdp = this.processChromeSDPOffer(sdp);

      return sdp;

    } catch (error) {
      throw error;
    }
  }

  init = function () {
    return {
      processChromeSDPOffer : function (description) {
        description.sdp = jslWorkarounds(description.sdp);
        description.sdp = removeCodec(description.sdp);
        description = incrementSDP(description);
        return description;
      },
      removeSDPAttribute : function (attributeValue, sdp) {
        return removeSDPAttribute(attributeValue, sdp);
      },
      getCodecfromSDP : function (sdp) {
        return getCodecfromSDP(sdp);
      },
      setupActivePassive: setupActivePassive,
      modifyForHoldCall: modifyForHoldCall,
      modifyForResumeCall : modifyForResumeCall,
      fakeVideo : fakeVideo
    };
  };

  mainModule.sdpFilter = module;
  module.getInstance = function () {
    if (!instance) {
      instance = init();
    }
    return instance;
  };

}(ATT || {}));
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT, WebSocket, Env*/

(function (ATT) {
  'use strict';
  var logManager = ATT.logManager.getInstance(),
    logger = logManager.getLoggerByName("att.phonenumber"),
    phoneNumber = {
      alphaLookup: {
        'a': 2,
        'b': 2,
        'c': 2,
        'd': 3,
        'e': 3,
        'f': 3,
        'g': 4,
        'h': 4,
        'i': 4,
        'j': 5,
        'k': 5,
        'l': 5,
        'm': 6,
        'n': 6,
        'o': 6,
        'p': 7,
        'q': 7,
        'r': 7,
        's': 7,
        't': 8,
        'u': 8,
        'v': 8,
        'w': 9,
        'x': 9,
        'y': 9,
        'z': 9
      },
      stringify: function (text) {
        logger.logDebug('att.phonenumber: stringify');
        logger.logInfo('removes all the special character ');
        logger.logTrace(text);
        // strip all non numbers
        var cleaned = phoneNumber.translate(text),
          len = cleaned.length,
          countryCode = (cleaned.charAt(0) === '1'),
          arr = cleaned.split(''),
          diff;
        // if it's long just return it unformatted
        if (len > (countryCode ? 11 : 10)) {
          return cleaned;
        }
        // if it's too short to tell
        if (!countryCode && len < 4) {
          return cleaned;
        }
        // remove country code if we have it
        if (countryCode) {
          arr.splice(0, 1);
        }
        // the rules are different enough when we have
        // country codes so we just split it out
        if (countryCode) {
          if (len > 1) {
            diff = 4 - len;
            diff = (diff > 0) ? diff : 0;
            arr.splice(0, 0, " (");
            // back fill with spaces
            arr.splice(4, 0, (new Array(diff + 1).join(' ') + ") "));
            if (len > 7) {
              arr.splice(8, 0, '-');
            }
          }
        } else {
          if (len > 7) {
            arr.splice(0, 0, "(");
            arr.splice(4, 0, ") ");
            arr.splice(8, 0, "-");
          } else if (len > 3) {
            arr.splice(3, 0, "-");
          }
        }
        // join it back when we're done with the CC if it's there
        logger.logTrace('return:' + (countryCode ? '+1' : '') + arr.join(''));
        return (countryCode ? '+1' : '') + arr.join('');
      },
      translate: function (input) {
        logger.logDebug('att.phonenumber: translate');
        logger.logInfo('converts all the alphanumbers to Numbers ');
        logger.logTrace(input);
        var i, digits = '', ch;
        for (i = 0; i < input.length; i = i + 1) {
          ch = input.charAt(i);
          if (isNaN(ch)) {
            if (!(phoneNumber.alphaLookup[ch.toLowerCase()] === undefined)) {
              digits += phoneNumber.alphaLookup[ch.toLowerCase()];
            }
          } else {
            digits += ch;
          }
        }
        if (digits.length >= 11 && digits.charAt(0) === '1') {
          digits = digits.substring(0, 11);
        } else if (digits.length >= 11 && digits.charAt(0) !== '1') {
          digits = digits.substring(0, 10);
        }
        logger.logTrace('return:' + digits);
        return String(digits);
      },
      getCallable: function (input, countryAbr) {
        var country = countryAbr || 'us',
          cleaned = phoneNumber.translate(input);
        if (cleaned.length === 10) {
          if (country === 'us') {
            return '1' + cleaned;
          }
        } else {
          if (country === 'us' && cleaned.length === 11 && cleaned.charAt(0) === '1') {
            return cleaned;
          }
          return false;
        }
      },
      /**
       *  Removes extra characters from the phone number and formats it for
       *  clear display
       *  returns the userID as it is if its a userId With Domain
       */
      cleanPhoneNumber : function (number) {
        logger.logDebug('att.phonenumber: cleanPhoneNumber');
        logger.logInfo('removes special character and convert the number to a callable format');
        logger.logTrace(number);
        var callable, cleaned;
        try {

          if (number.indexOf("@") !== -1) {
            return number;
          }
          //removes the spaces form the number
          callable = number.replace(/\s/g, '');

          if (callable.indexOf('sip:') !== -1 || callable.indexOf('tel:') !== -1) {
            logger.logTrace('return: ' + false);
            return false;
          }
          if (ATT.SpecialNumbers[number]) {
            logger.logTrace('return: ' + number);
            return number;
          }
          callable = ATT.phoneNumber.getCallable(callable);
          if (callable) {
            logger.logTrace('return: ' + callable);
            return callable;
          }
          logger.logWarning('Phone number not callable, will check special numbers list.');
          logger.logInfo('checking number: ' + callable);
          cleaned = ATT.phoneNumber.translate(number);
          console.log('ATT.SpecialNumbers[' + cleaned + '] = ' + cleaned);

          logger.logTrace('return: ' + false);
          return false;
        } catch (err) {
          logger.logTrace(err);
          logger.logError('Error while cleaning the phonenumber');
          throw ATT.errorDictionary.getSDKError(26001);
        }
      },
      formatNumber : function (number) {
        logger.logDebug('att.phonenumber: formatNumber');
        logger.logInfo('converts the given number to a universal format');
        logger.logTrace(number);
        try {
          var callable = this.cleanPhoneNumber(number);
          if (!callable) {
            logger.logWarning('Phone number not formatable .');
            return;
          }
          if (number.length <= 10) {
            logger.logTrace('return: ' + callable);
            return callable;
          }
          logger.logInfo('The formated Number' + callable);
          logger.logTrace('return: ' + ATT.phoneNumber.stringify(callable));
          return ATT.phoneNumber.stringify(callable);
        } catch (err) {
          logger.logTrace(err);
          logger.logError('Error while formating the number ');
          throw ATT.errorDictionary.getSDKError(26001);
        }
      }

    };

  ATT.phoneNumber = phoneNumber;
}(ATT));;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/

//Dependency: None

if (!ATT) {
  var ATT = {};
}

(function (mainModule) {
  'use strict';

  var module = {};

  module.SpecialNumbers = {
    "911": true,
    "411": true,
    "611": true,
    "*69": true,
    "#89": true
  };


  mainModule.SpecialNumbers = Object.freeze(module.SpecialNumbers);

}(ATT || {}));
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/

//Dependency: None

(function () {
  'use strict';

  var enumObj = {},
    USER_TYPE,
    CALL_TYPE,
    API_EVENT;

  USER_TYPE = {
    MOBILE_NUMBER: 'MOBILE_NUMBER',
    VIRTUAL_NUMBER: 'VIRTUAL_NUMBER',
    ACCOUNT_ID: 'ACCOUNT_ID'
  };

  CALL_TYPE = {
    OUTGOING: 'Outgoing',
    INCOMING: 'Incoming'
  };

  API_EVENT = {
    INVITATION_RECEIVED:      'invitation-received',
    SESSION_OPEN:             'session-open',
    SESSION_MODIFIED:         'session-modified',
    SESSION_TERMINATED:       'session-terminated',
    MODIFICATION_RECEIVED:    'mod-received',
    MODIFICATION_TERMINATED:  'mod-terminated'
  };

  if (undefined === ATT.private) {
    throw new Error('Error exporting ATT.private.enum');
  }

  enumObj.USER_TYPE = Object.freeze(USER_TYPE);
  enumObj.CALL_TYPE = Object.freeze(CALL_TYPE);
  enumObj.API_EVENT = Object.freeze(API_EVENT);

  ATT.private.enum = enumObj;
}());;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT:true*/
/**
* @file WebRTC API REST configuration file.
*/

if (!ATT) {
  var ATT = {};
}

(function () {
  'use strict';

  var configAtt,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule("Loading att.private.config.api...");

  function configure(appConfig) {
    logger.logDebug('ATT.private.config.api: configure');
    logger.logInfo('Configuring API...');

    logger.logTrace('appConfig', appConfig);
    /**
     * Property defaults.
     * @type {object}
     */
    var DEFAULTS = {
       /**
        * Developer Hosted Server Resource url.
        * @memberof ATT.DEFAULTS
        */
        dhs_https_url: appConfig.dhs_https_url,
        /**
        * RTC Resource url.
        * @memberof ATT.DEFAULTS
        */
        rtc_endpoint: appConfig.api_endpoint + appConfig.ewebrtc_uri,
        /**
        * Default headers.
        * @memberof ATT.DEFAULTS
        */
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

    return {
      /**
      * Create new user from dhs_https_url
      * @memberof ATT.APIConfigs
      */
      registerUser: {
        method: 'POST',
        url: DEFAULTS.dhs_https_url + '/users',
        headers: DEFAULTS.headers
      },
      /**
       * Delete a user from dhs_https_url
       * @memberof ATT.APIConfigs
       */
      deleteUser: {
        method: 'DELETE',
        formatters: {
          url: function (userId) {
            logger.logDebug('deleteUser:formatter:url');
            logger.logTrace('userId', userId);
            logger.logTrace('url', DEFAULTS.dhs_https_url + '/users/' + userId);

            return DEFAULTS.dhs_https_url + '/users/' + userId;
          }
        },
        headers: DEFAULTS.headers
      },
      /**
      * Get access token from dhs_https_url
      * @memberof ATT.APIConfigs
      */
      oAuthToken: {
        method: 'POST',
        url: DEFAULTS.dhs_https_url + '/tokens',
        headers: DEFAULTS.headers
      },
      /**
      * Authentication to dhs_https_url
      * @memberof ATT.APIConfigs
      */
      authenticateUser: {
        method: 'POST',
        url: DEFAULTS.dhs_https_url + '/user/session',
        headers: DEFAULTS.headers
      },
      /**
      * Logout from dhs_https_url
      * @memberof ATT.APIConfigs
      */
      logoutUser: {
        method: 'DELETE',
        url: DEFAULTS.dhs_https_url + '/user/session',
        headers: DEFAULTS.headers
      },
      /**
       * Create a e911Id using dhs_https_url
       * @memberof ATT.APIConfigs
       */
      createE911Id: {
        method: 'POST',
        url: DEFAULTS.dhs_https_url + '/e911ids',
        headers: DEFAULTS.headers
      },
      /**
       * Associate a token with user id
       * @memberof ATT.APIConfigs
       */
      associateTokenWithUserId: {
        method: 'PUT',
        formatters: {
          url: function (params) {
            logger.logDebug('associateTokenWithUserId:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/userIds/' + params.userId);

            return DEFAULTS.rtc_endpoint + '/userIds/' + params.userId;
          },
          headers: {
            'Authorization': function (oAuthToken) {
              logger.logDebug('associateTokenWithUserId:formatters:headers:Authorization');
              logger.logTrace('oAuthToken', oAuthToken);
              logger.logTrace('Authorization', 'Bearer ' + oAuthToken);

              return 'Bearer ' + oAuthToken;
            }
          }
        },
        headers: {
          'Accept' : 'application/json'
        }
      },
      /**
      * Create WebRTC session from api_endpoint
      * @memberof ATT.APIConfigs
      */
      createWebRTCSession: {
        method: 'POST',
        url: DEFAULTS.rtc_endpoint + '/sessions',
        formatters: {
          headers: {
            'Authorization': function (oAuthToken) {
              logger.logDebug('createWebRTCSession:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + oAuthToken);

              return 'Bearer ' + oAuthToken;
            },
            'x-e911Id': function (e911id) {
              logger.logDebug('createWebRTCSession:formatters:headers:x-e911Id');
              logger.logTrace('x-e911Id', e911id);

              return e911id;
            },
            'x-Arg': function (xArg) {
              logger.logDebug('createWebRTCSession:formatters:headers:x-Arg');
              logger.logTrace('x-Arg', xArg);

              return xArg;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
      * Refresh WebRTC session from api_endpoint
      * @memberof ATT.APIConfigs
      */
      refreshWebRTCSession: {
        method: 'PUT',
        formatters: {
          url: function (sessionId) {
            logger.logDebug('refreshWebRTCSession:formatters:url');
            logger.logTrace('sessionId', sessionId);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + sessionId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + sessionId;
          },
          headers: {
            'Authorization': function (oAuthToken) {
              logger.logDebug('refreshWebRTCSession:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + oAuthToken);

              return 'Bearer ' + oAuthToken;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
      * Delete WebRTC session from api_endpoint
      * @memberof ATT.APIConfigs
      */
      deleteWebRTCSession: {
        method: 'DELETE',
        formatters : {
          url: function (sessionId) {
            logger.logDebug('deleteWebRTCSession:formatters:url');
            logger.logTrace('sessionId', sessionId);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + sessionId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + sessionId;
          },
          headers: {
            'Authorization': function (oAuthToken) {
              logger.logDebug('deleteWebRTCSession:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + oAuthToken);

              return 'Bearer ' + oAuthToken;
            },
            'x-e911Id': function (e911id) {
              logger.logDebug('deleteWebRTCSession:formatters:headers:x-e911Id');
              logger.logTrace('x-e911Id', e911id);

              return e911id;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
       * Refresh WebRTC session with e911Id from api_endpoint
       * @memberof ATT.APIConfigs
       */
      associateE911Id: {
        method: 'PUT',
        formatters: {
          url: function (sessionId) {
            logger.logDebug('associateE911Id:formatters:url');
            logger.logTrace('sessionId', sessionId);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + sessionId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + sessionId;
          },
          headers: {
            'Authorization': function (oAuthToken) {
              logger.logDebug('associateE911Id:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + oAuthToken);

              return 'Bearer ' + oAuthToken;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
      * Get WebRTC events from api_endpoint
      * @memberof ATT.APIConfigs
      */
      getEvents: {
        formatters: {
          method: 'GET', // default is GET
          url: function (params) {
            logger.logDebug('getEvents:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.eventChannelUri);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.eventChannelUri;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('getEvents:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            }
          }
        },
        // Setting timeout for event channel will cause client to miss events
        // Also Firefox will generate false CORS warnings if getEvents() timed out
        //timeout: 30000,
        headers: {
          Accept: 'application/json'
        }
      },
      /**
       * Create Call/Conference via api_endpoint
       * @memberof WebRTC.APIConfigs
       */
      createCall: {
        method: 'POST',
        formatters: {
          url: function (params) {
            logger.logDebug('createCall:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('createCall:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
       * Modify Call/Conference via api_endpoint
       * @memberof WebRTC.APIConfigs
       */
      modifyCall: {
        method: 'PUT',
        formatters: {
          url: function (params) {
            logger.logDebug('modifyCall:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('modifyCall:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            },
            'options' : {
              'x-conference-action': function (action) {
                logger.logDebug('modifyCall:formatters:headers:options:x-conference-action');
                logger.logTrace('x-conference-action', action);

                return action;
              },
              'x-calls-action': function (action) {
                logger.logDebug('modifyCall:formatters:headers:options:x-calls-action');
                logger.logTrace('x-calls-action', action);

                return action;
              }
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
       * Add Participant to conference via api_endpoint
       * @memberof ATT.APIConfigs
       */
      addParticipant: {
        method: 'PUT',
        formatters: {
          url: function (params) {
            logger.logDebug('addParticipant:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params[0] + '/conferences/'
              + params[1] + '/participants/' + params[2]);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params[0] + '/conferences/'
              + params[1] + '/participants/' + params[2];
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('addParticipant:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
       * Add Participant via api_endpoint
       * @memberof ATT.APIConfigs
       */
      removeParticipant: {
        method: 'DELETE',
        formatters: {
          url: function (params) {
            logger.logDebug('removeParticipant:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params[0] + '/conferences/'
              + params[1] + '/participants/' + params[2]);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params[0] + '/conferences/'
              + params[1] + '/participants/' + params[2];
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('removeParticipant:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
       * Accept Modifications via RTCEndpoint
       * @memberof ATT.APIConfigs
       */
      acceptCallModifications: {
        method: 'PUT',
        formatters: {
          url: function (params) {
            logger.logDebug('acceptCallModifications:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('acceptCallModifications:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            },
            'x-modId': function (param) {
              logger.logDebug('acceptCallModifications:formatters:headers:x-modId');
              logger.logTrace('x-modId', param);

              return param;
            }
          }
        },
        headers: ATT.utils.extend({
          'x-calls-action' : 'accept-call-mod'
        }, DEFAULTS.headers)
      },
      /**
       * Accept Modifications via RTCEndpoint
       * @memberof ATT.APIConfigs
       */
      acceptConferenceModifications: {
        method: 'PUT',
        formatters: {
          url: function (params) {
            logger.logDebug('acceptConferenceModifications:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('acceptConferenceModifications:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            },
            'x-mod-Id': function (param) {
              logger.logDebug('acceptConferenceModifications:formatters:headers:x-mod-Id');
              logger.logTrace('x-mod-Id', param);

              return param;
            }
          }
        },
        headers: ATT.utils.extend({
          'x-conference-action' : 'accept-media-mod'
        }, DEFAULTS.headers)
      },
      /**
      * Delete Call/Conference via api_endpoint
      * @memberof WebRTC.APIConfigs
      */
      deleteCall: {
        method: 'DELETE',
        formatters: {
          url: function (params) {
            logger.logDebug('deleteCall:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('deleteCall:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            },
            'x-delete-reason': function (param) {
              logger.logDebug('deleteCall:formatters:headers:x-delete-reason');
              logger.logTrace('x-delete-reason', param);

              return param;
            }
          }
        },
        headers: DEFAULTS.headers
      },
      /**
       * Transfer Call via api_endpoint
       * @memberof WebRTC.APIConfigs
       */
      transferCall: {
        method: 'PUT',
        formatters: {
          url: function (params) {
            logger.logDebug('transferCall:formatters:url');
            logger.logTrace('params', params);
            logger.logTrace('url', DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId);

            return DEFAULTS.rtc_endpoint + '/sessions/' + params.sessionId + '/' + params.type + '/' + params.callId;
          },
          headers: {
            'Authorization': function (param) {
              logger.logDebug('transferCall:formatters:headers:Authorization');
              logger.logTrace('Authorization', 'Bearer ' + param);

              return 'Bearer ' + param;
            },
            'x-transferTargetCallId': function (param) {
              logger.logDebug('transferCall:formatters:headers:x-transferTargetCallId');
              logger.logTrace('x-transferTargetCallId', param);

              return param;
            }
          }
        },
        headers: ATT.utils.extend({
          'x-calls-action': 'initiate-call-transfer'
        }, DEFAULTS.headers)
      }
    };
  }

  function getAPIConfiguration() {
    logger.logDebug('ATT.private.config.api: getAPIConfiguration');

    var currentConfig = configAtt.app.getAppConfiguration();

    logger.logTrace('currentConfig', currentConfig);

    return configure(currentConfig);
  }

  if (undefined === ATT.private || undefined === ATT.private.config) {
    logger.logError('Error exporting ATT.private.config.api');
    throw new Error('Error exporting ATT.private.config.api');
  }

  configAtt = ATT.private.config;

  configAtt.api = {
    getAPIConfiguration: getAPIConfiguration
  };

}());;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT, Env*/

/**
* @file Application configuration file.
*
*/


(function () {
  'use strict';

  // DHS endpoint
  var  appConfig,
    dhs_https_url = '',
    api_endpoint = 'https://api.att.com',
    ewebrtc_uri = '/RTC/v1',
    ewebrtc_domain = '',
    eventChannelTypes = {
      WebSockets: 'WebSockets',
      LongPolling: 'LongPolling'
    },
    eventChannelType = eventChannelTypes.LongPolling, // Default to longpolling
    logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule("Loading att.private.config.api...");

  logger.logDebug('Loading ATT.private.config.app...');

  function setAppConfiguration(options) {
    logger.logDebug('ATT.private.config.app: setAppConfiguration');
    logger.logInfo('Setting app configuration');
    logger.logTrace('options', options);

    dhs_https_url = options.dhs_https_url;
    api_endpoint = options.api_endpoint || api_endpoint;
    ewebrtc_uri = options.ewebrtc_uri || ewebrtc_uri;
    ewebrtc_domain = options.ewebrtc_domain;
  }

  function getAppConfiguration() {
    logger.logDebug('ATT.private.config.app: getAppConfiguration');
    logger.logInfo('Getting app configuration');

    appConfig = {
      api_endpoint : api_endpoint,
      dhs_https_url: dhs_https_url,
      ewebrtc_uri: ewebrtc_uri,
      ewebrtc_domain: ewebrtc_domain,
      eventChannelType : eventChannelType
    };

    logger.logTrace('appConfig', appConfig);

    return appConfig;
  }

  if (undefined === ATT.private || undefined === ATT.private.config) {
    throw new Error('Error exporting ATT.private.config.app');
  }

  ATT.private.config.app = {
    getAppConfiguration: getAppConfiguration,
    setAppConfiguration: setAppConfiguration
  };

}());;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT*/

/** Exports an object to obtain the list of errors specific to the SDK. **/
(function () {
  'use strict';
  var sdkErrors = [
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: "0000",
      ErrorMessage: "Error Code is not defined in error dictionary",
      Cause: "Error Code is not defined in error dictionary",
      Resolution: "Add the error object in error dictionary"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "configure",
      ErrorCode: "0001",
      ErrorMessage: "Unable to configure the endpoint for SDK. Please ensure that correct config key is used to configure the endpoint",
      Cause: "Configuration key is not found",
      Resolution: "Please check appConfig module for correct config key"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: "0002",
      ErrorMessage: "Unable to perform requested operation. Please ensure that the application is hosted on the provisioned domain.",
      Cause: "CORS configuration",
      Resolution: "Please ensure that the application is hosted on the provisioned domain"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: "0003",
      ErrorMessage: "Request timed out",
      Cause: "Network failure",
      Resolution: "Please check the logs, check the network connectivity and try again"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "Phone",
      ErrorCode: "1000",
      ErrorMessage: "Missing input parameter",
      Cause: "One or more of the input parameters are empty",
      Resolution: "Please check the values for input parameters"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "Phone",
      ErrorCode: "1001",
      ErrorMessage: "Missing local video stream",
      Cause: "Input parameter localVideoElementID is missing",
      Resolution: "Please check the values for localVideoElementID"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "Phone",
      ErrorCode: "1002",
      ErrorMessage: "Missing remote video stream",
      Cause: "Input parameter remoteVideoElementID is missing",
      Resolution: "Please check the values for remoteVideoElementID"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "Phone",
      ErrorCode: "1003",
      ErrorMessage: "Invalid media type",
      Cause: "Invalid media constraints",
      Resolution: "Please provide use valid Media constraints attributes"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "Phone",
      ErrorCode: "1004",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: "2000",
      ErrorMessage: "Invalid user type",
      Cause: "Unsupported user type",
      Resolution: "Supported user types are Mobile Number, Virtual Number, Account ID"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: "2001",
      ErrorMessage: "Missing input parameter",
      Cause: "Access token & E911 ID is required",
      Resolution: "User type, Access token, E911 ID are mandatory fields for Mobile Number & Virtual Number user types"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: "2002",
      ErrorMessage: "Mandatory fields can not be empty",
      Cause: "One of the Mandatory Parameters is empty",
      Resolution: "Please check the values for input parameters"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: "2003",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid parameter",
      Resolution: "For Account ID users E911 is not required"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: "2004",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: "2005",
      ErrorMessage: "User already logged in",
      Cause: "Duplicate operation",
      Resolution: "Login should be called only once per session"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "logout",
      ErrorCode: "3000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "logout",
      ErrorCode: "3001",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid Logout operation",
      Resolution: "None"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "logout",

      ErrorCode: "3002",
      ErrorMessage: "User already logged out",
      Cause: "Duplicate operation",
      Resolution: "Logout should be called only once per session"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4000",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid phone number",
      Resolution: "Please provide a valid phone number"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4001",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid SIP URI",
      Resolution: "Please provide valid SIP URI"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4002",
      ErrorMessage: "Invalid media type",
      Cause: "Invalid media constraints",
      Resolution: "Please provide use valid Media constraints attributes"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4003",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4004",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking dial"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4005",
      ErrorMessage: "Can not make second call. Please put the current call on hold before making second call.",
      Cause: "Invalid operation",
      Resolution: "Please ensure that current call is on hold before making second call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4006",
      ErrorMessage: "parameter `localMedia` is not defined",
      Cause: "localMedia is not defined",
      Resolution: "Please include `localMedia` parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4007",
      ErrorMessage: "parameter `remoteMedia` is not defined",
      Cause: "remoteMedia is not defined",
      Resolution: "Please include `remoteMedia` parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4008",
      ErrorMessage: "parameter `destination` is not defined",
      Cause: "destination is not defined",
      Resolution: "Please include `destination` parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4009",
      ErrorMessage: "options are not defined",
      Cause: "options are not defined",
      Resolution: "Please include the required parameters"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "dial",
      ErrorCode: "4010",
      ErrorMessage: "Cannot have more than 2 calls at same time",
      Cause: "Only one foreground call and one background call is supported",
      Resolution: "Please hangup current or background call before making another call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: "5000",
      ErrorMessage: "Answer failed- No incoming call",
      Cause: "No incoming call",
      Resolution: "No incoming call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: "5001",
      ErrorMessage: "Invalid media type",
      Cause: "Invalid media constraints",
      Resolution: "Please provide use valid Media constraints attributes"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: "5002",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: "5003",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking answer"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: "5004",
      ErrorMessage: "Mandatory fields can not be empty",
      Cause: "One of the Mandatory Parameters is empty",
      Resolution: "Please check the values for input parameters"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: "5005",
      ErrorMessage: "Invalid Action parameter",
      Cause: "Action can only be `hold` or `end`",
      Resolution: "Please provide a valid action (hold or end)"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "hangup",
      ErrorCode: "6000",
      ErrorMessage: "Hangup failed- Call is not in progress",
      Cause: "Can not hangup before the call is established",
      Resolution: "Please use cancel call, or allow call to be established before trying to hang-up."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "hangup",
      ErrorCode: "6001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "hold",
      ErrorCode: "7000",
      ErrorMessage: "Hold failed- Call is not in progress",
      Cause: "Cannot hold. There is no active call in progress.",
      Resolution: "Please ensure an active call is in progress before trying to put the call on Hold."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "hold",
      ErrorCode: "7001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "resume",
      ErrorCode: "8000",
      ErrorMessage: "Resume failed- Call is not in progress",
      Cause: "There is no active call in progress.",
      Resolution: "Please ensure an active call is in progress."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "resume",
      ErrorCode: "8001",
      ErrorMessage: "Resume failed- An invalid operation or call is not on hold",
      Cause: "Invalid operation",
      Resolution: "Please confirm that an active call is on Hold before trying to Resume."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "resume",
      ErrorCode: "8002",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "mute",
      ErrorCode: "9000",
      ErrorMessage: "Mute failed- Call is not in progress",
      Cause: "No media stream",
      Resolution: "Please confirm that an active call is in progress."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "mute",
      ErrorCode: "9001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "mute",
      ErrorCode: "9002",
      ErrorMessage: "Mute failed- Already muted",
      Cause: "Duplicate operation",
      Resolution: ""
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "unmute",
      ErrorCode: "10000",
      ErrorMessage: "Unmute failed- No media stream",
      Cause: "No media stream",
      Resolution: "Please confirm that an active call is in progress."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "unmute",
      ErrorCode: "10001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "unmute",
      ErrorCode: "10002",
      ErrorMessage: "Unmute failed- Already Unmuted",
      Cause: "Duplicate operation",
      Resolution: ""
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "cancel",
      ErrorCode: "11000",
      ErrorMessage: "Cancel failed-Call has not been initiated",
      Cause: "No call to cancel in progress",
      Resolution: "Please invoke dial before invoking cancel"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "cancel",
      ErrorCode: "11001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "reject",
      ErrorCode: "12000",
      ErrorMessage: "Reject failed-Call has not been initiated",
      Cause: "No call to reject",
      Resolution: "Reject can be performed only on incoming call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "reject",
      ErrorCode: "12001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "13000",
      ErrorMessage: "Unable to send information about this party",
      Cause: "PeerConnection Create offer failed",
      Resolution: "Please check the logs on the console"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "13001",
      ErrorMessage: "Unable to acknowledge other party",
      Cause: "PeerConnection Create answer failed",
      Resolution: "Please check the logs on the console"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "13002",
      ErrorMessage: "Local media description not accepted by connection",
      Cause: "PeerConnection setLocalDescription failed",
      Resolution: "Please check the logs on the console"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "13003",
      ErrorMessage: "Other party media description not accepted by connection",
      Cause: "PeerConnection setRemoteDescription failed",
      Resolution: "Please check the logs on the console"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "13004",
      ErrorMessage: "Negotiation for connectivity failed",
      Cause: "PeerConnection addIceCandidate failed",
      Resolution: "Please check the logs on the console"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "13005",
      ErrorMessage: "onUserMediaError",
      Cause: "Failed to get the UserMedia",
      Resolution: "Please enable Media for the browser "
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "14000",
      ErrorMessage: "Permission denied to access audio/video",
      Cause: "User denied permission",
      Resolution: "User may intentionally have denied permission, please retry the requested operation"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "14001",
      ErrorMessage: "Unsupported browser-unable to get audio/video",
      Cause: "Unsupported browser",
      Resolution: "The browser does not support Enhanced WebRTC, please use Enhanced WebRTC supported browser"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "14002",
      ErrorMessage: "Invalid input for media request",
      Cause: "Invalid media constraints",
      Resolution: "Please check the media constraints"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "15000",
      ErrorMessage: "Cannot interpret other party's state",
      Cause: "Unable to Setup Event Interceptor. Please contact support.",
      Resolution: "Please contact support"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "15001",
      ErrorMessage: "Event Channel unable to shutdown gracefully",
      Cause: "Unable to shut down event channel. Please logout and login again.",
      Resolution: "Please login again"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: "15002",
      ErrorMessage: "Event Channel got shutdown unexpectedly",
      Cause: "Event Channel stopped. Please logout and login again.",
      Resolution: "Please login again"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "associateE911Id",
      ErrorCode: "17000",
      ErrorMessage: "e911Id parameter missing",
      Cause: "Once or more required input parameter(s) are missing",
      Resolution: "Please pass E911Id as a parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "associateE911Id",
      ErrorCode: "17001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "associateE911Id",
      ErrorCode: "17002",
      ErrorMessage: "Could not update E911 Id, E911 Id could be updated only for ongoing session",
      Cause: "Precondition failed",
      Resolution: "E911 Id can be updated only for ongoing session, Please login and then update E911 Id if necessary"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18000",
      ErrorMessage: "parameters missing",
      Cause: "no parameter passed ",
      Resolution: "Please pass parameters to startConference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18001",
      ErrorMessage: "Invalid localMedia passed ",
      Cause: "localMedia parameter missing",
      Resolution: "Please pass localMedia as a parameter for start conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18002",
      ErrorMessage: "Invalid remoteMedia passed",
      Cause: "remoteMedia parameter missing",
      Resolution: "Please pass remoteMedia as a parameter for start conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18003",
      ErrorMessage: "Invalid mediatype passed ",
      Cause: "mediatype parameter missing",
      Resolution: "please pass mediatype as a parameter for start conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18004",
      ErrorMessage: "Internal error occurred",
      Cause: "onUserMediaError",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18005",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18006",
      ErrorMessage: "Cannot make second conference when first in progress",
      Cause: "conference already exists",
      Resolution: "Please End your current Conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "startConference",
      ErrorCode: "18007",
      ErrorMessage: "User not login to make conference",
      Cause: "User not logged In",
      Resolution: "Please login before you make a conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipant",
      ErrorCode: "19000",
      ErrorMessage: "participant parameter missing",
      Cause: "One or more required input parameter(s) are missing",
      Resolution: "Please provide participant parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipant",
      ErrorCode: "19001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "joinConference",
      ErrorCode: "20000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "joinConference",
      ErrorCode: "20001",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking join conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "joinConference",
      ErrorCode: "20002",
      ErrorMessage: "No conference invite",
      Cause: "Invalid operation",
      Resolution: "Cannot join conference before receiving an invite"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "rejectConference",
      ErrorCode: "22000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "rejectConference",
      ErrorCode: "22001",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking reject conference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "rejectConference",
      ErrorCode: "22002",
      ErrorMessage: "No conference invite",
      Cause: "Invalid operation",
      Resolution: "Cannot reject conference before receiving an invite"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "getParticipants",
      ErrorCode: "21000",
      ErrorMessage: "Conference not initiated",
      Cause: "Invalid operation",
      Resolution: "Please invoke conference first before invoking getParticipants"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "getParticipants",
      ErrorCode: "21001",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "getParticipants",
      ErrorCode: "21002",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking getParticipants"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "endConference",
      ErrorCode: "23000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "endConference",
      ErrorCode: "23001",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking endConference"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "endConference",
      ErrorCode: "23002",
      ErrorMessage: "endConference failed - Conference is not in progress",
      Cause: "Cannot end Conference before the conference is established",
      Resolution: "Allow conference to be established before trying to end"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24000",
      ErrorMessage: "participants parameter missing",
      Cause: "One or more required input parameter(s) are missing",
      Resolution: "Please provide participants parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24001",
      ErrorMessage: "User is not logged in",
      Cause: "One or more required input parameter(s) are not correct",
      Resolution: "Please provide participants parameter of type array"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24002",
      ErrorMessage: "participants parameter incorrect",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking addParticipants"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24003",
      ErrorMessage: "Conference not initiated",
      Cause: "Invalid operation",
      Resolution: "Please invoke conference first before invoking addParticipants"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24004",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24005",
      ErrorMessage: "Cannot invite existing participant",
      Cause: "Invalid operation",
      Resolution: "Please invite new user"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24006",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid phone number",
      Resolution: "Please provide valid 10 digit phone number"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addParticipants",
      ErrorCode: "24007",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid SIP URI",
      Resolution: "Please provide valid SIP URI"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "removeParticipant",
      ErrorCode: "25000",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking removeParticipant"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "removeParticipant",
      ErrorCode: "25001",
      ErrorMessage: "removeParticipant failed - Conference is not in progress",
      Cause: "Cannot remove participant before the conference is established",
      Resolution: "Allow conference to be established before trying to remove participant"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "removeParticipant",
      ErrorCode: "25002",
      ErrorMessage: "participant parameter missing",
      Cause: "One or more required input parameter(s) are missing",
      Resolution: "Please provide participant parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "removeParticipant",
      ErrorCode: "25003",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "CleanNumber",
      ErrorCode: "26001",
      ErrorMessage: "Number Invalid",
      Cause: "Invalid PhoneNumber passed",
      Resolution: "Please check the logs and pass a valid phone number"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27001",
      ErrorMessage: "Invalid options provided",
      Cause: "Input options are not provided",
      Resolution: "Please include the required parameters"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27002",
      ErrorMessage: "parameter `localMedia` is not defined",
      Cause: "LocalMedia is not defined",
      Resolution: "Please include localMedia parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27003",
      ErrorMessage: "parameter `remoteMedia` is not defined",
      Cause: "remoteMedia is not defined",
      Resolution: "Please include remoteMedia parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27004",
      ErrorMessage: "parameter `destination` is not defined",
      Cause: "destination is not defined",
      Resolution: "Please include destination parameter"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27005",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid phone number",
      Resolution: "Please provide valid phone number"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27006",
      ErrorMessage: "Invalid input parameter",
      Cause: "Invalid SIP URI",
      Resolution: "Please provide valid SIP URI"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27007",
      ErrorMessage: "Invalid media type",
      Cause: "Invalid media constraints",
      Resolution: "Please provide use valid Media constraints attributes"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27008",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking dial"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27009",
      ErrorMessage: "Can not make second call. There is no first call in progress.",
      Cause: "Invalid operation",
      Resolution: "Please ensure that there is an existing call in progress before making second call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "addCall",
      ErrorCode: "27010",
      ErrorMessage: "Cannot make a third call.",
      Cause: "Trying to make a third call.",
      Resolution: "Please end one of the calls."
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "move",
      ErrorCode: "28000",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking move"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "move",
      ErrorCode: "28001",
      ErrorMessage: "Move failed - call is not in progress",
      Cause: "Cannot move. There is no active call in progress.",
      Resolution: "Please ensure an active call is in progress before trying to move the call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "move",
      ErrorCode: "28002",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "transfer",
      ErrorCode: "29000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "transfer",
      ErrorCode: "29001",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking transfer"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "transfer",
      ErrorCode: "29002",
      ErrorMessage: "transfer failed - call is not in progress",
      Cause: "Cannot transfer. There is no active call in progress.",
      Resolution: "Please ensure an active call is in progress before trying to transfer the call"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "transfer",
      ErrorCode: "29003",
      ErrorMessage: "Cannot make a third call",
      Cause: "Trying to make a third call",
      Resolution: "Please end one of the calls"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "switch",
      ErrorCode: "30000",
      ErrorMessage: "Internal error occurred",
      Cause: "Uncaught error",
      Resolution: "Please check the logs and contact support if needed"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "switch",
      ErrorCode: "30001",
      ErrorMessage: "User is not logged in",
      Cause: "Invalid operation",
      Resolution: "Please login first before invoking switch"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "switch",
      ErrorCode: "30002",
      ErrorMessage: "Switch failed - call is not in progress",
      Cause: "Cannot switch. There is no active call in progress.",
      Resolution: "Please ensure an active call is in progress before trying to invoke switch"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "switch",
      ErrorCode: "30003",
      ErrorMessage: "Switch failed - only one call is in progress",
      Cause: "Trying to invoke switch when only one call is established",
      Resolution: "Please create two calls before invoking switch"
    }
  ];

  // freezes a list of objects
  function freezeErrors(list) {

    // errors are now frozen
    Object.freeze(list);

    return list;
  }

  // try to export the Error List
  // This will throw an error if ATT.utils is not defined
  if (window.ATT.utils === undefined) {
    throw new Error('Cannot export SDK Errors into ATT.utils.ErrorStore.SDKErrors, ATT.utils namespace is undefined...'
      + '\n ATT: ' + JSON.stringify(window.ATT));
  }

  window.ATT.utils.ErrorStore = {};
  window.ATT.utils.ErrorStore.SDKErrors = {
    getAllSDKErrors: function () {
      var idx, errors = {}, errorId;
      for (idx = 0; idx < sdkErrors.length; idx = idx + 1) {
        errorId = sdkErrors[idx].ErrorCode;
        errors[errorId] = sdkErrors[idx];
      }
      return freezeErrors(errors);
    }
  };

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT, JSMethod, JSObject, APIError, ResourceMethod*/

/** Exports an object to obtain the list of errors specific to the SDK. **/
(function () {
  'use strict';
  var apiErrors = [
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2500,
      ErrorMessage: "System error occurred",
      PossibleCauses: "System error occurred",
      PossibleResolution: "Use the explanation to find the reason for failure.",
      APIError: "SVC0001: A service error has occurred. Error code is <error_explanation>",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC0001"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2501,
      ErrorMessage: "Mandatory parameter is missing in the Request.",
      PossibleCauses: "Mandatory parameter is missing in the request.",
      PossibleResolution: "The parameter name is suggested in the error text. …message part contains the missing parameter name.",
      APIError: "SVC0002 - Invalid input value for message part <part_name>",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC0002"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2502,
      ErrorMessage: "Invalid values provided for a parameter in the Request.",
      PossibleCauses: "Invalid values are passed in the Request.",
      PossibleResolution: "Pass the valid values as suggested in the error response.",
      APIError: "SVC0003 - Invalid input value for message part <part_name>, valid values are <part_values>",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC0003"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: 2504,
      ErrorMessage: "E911 not supported for non-telephone users",
      PossibleCauses: "E911 Id is not required a parameter for this user type (account id)",
      PossibleResolution: "Please don’t pass E911 id to login for account id users",
      APIError: "SVC8510:E911 not supported for non-telephone users",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC8510"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: 2505,
      ErrorMessage: "Valid e911Id is mandatory for mobile number or virtual number",
      PossibleCauses: "1. x-e911Id is missing in the request. x-e911Id is invalid.",
      PossibleResolution: "e911Id should be retrieved using E911 API and appropriately passed in the Create Session Request.",
      APIError: "SVC8511:Valid e911Id is mandatory for <part_value>",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC8511"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: 2506,
      ErrorMessage: "Unassigned token Associate token to virtual number or account id",
      PossibleCauses: "Access token not assigned to virtual number or account id.",
      PossibleResolution: "Call Associate token operation before Create Session for virtual number or account id scenario.",
      APIError: "SVC8512:Unassigned token Associate token to virtual number or account id",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC8512"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: 2507,
      ErrorMessage: "Token in use.",
      PossibleCauses: "A session was already created with the AT",
      PossibleResolution: "In case user abruptly closed the application, called to expire the token and receive new token.",
      APIError: "SVC8513:Token in use.",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 400,
      MessageId: "SVC8513"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2508,
      ErrorMessage: "Access token is invalid.",
      PossibleCauses: "vAccess Token is incorrect or in valid.Access token is not authorized for the Enhanced WebRTC scope.",
      PossibleResolution: "Re-Authenticate and retrieve the correct access token.",
      APIError: "POL0001:A policy error occurred. For example, rate…it error, authentication and authorization errors",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 401,
      MessageId: "POL0001"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2509,
      ErrorMessage: "Invalid token",
      PossibleCauses: "Access Token is incorrect or in valid.",
      PossibleResolution: "Re-Authenticate and retrieve the correct access token for Enhanced WebRTC",
      APIError: "POL0002:Privacy verification failed for address <address> request is refused",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 403,
      MessageId: "POL0002"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2510,
      ErrorMessage: "Not implemented",
      PossibleCauses: "Reserved for future use",
      PossibleResolution: "Reserved for future use",
      APIError: "POL0003:Too many addresses specified in Message part",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 403,
      MessageId: "POL0003"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "*",
      ErrorCode: 2511,
      ErrorMessage: "User has not been provisioned for Enhanced WebRTC",
      PossibleCauses: "User has not been provisioned for Enhanced WebRTC service",
      PossibleResolution: "End user needs to provide consent to get provisioned.",
      APIError: "POL1009:User has not been provisioned for %1",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 403,
      MessageId: "POL1009"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "login",
      ErrorCode: 2512,
      ErrorMessage: "Number of Session exceeds the allowed limit.",
      PossibleCauses: "For virtual number and account id users: Since virtual number is assigned to a specific user." +
        "Max number of sessions is defined by the network.",
      PossibleResolution: "For virtual number and account id scenario, contact Administrator. …not get this modified as this is network setting.",
      APIError: "POL1100:Max number of session exceeded allowed limit %1",
      ResourceMethod: "POST /RTC/v1/sessions",
      HttpStatusCode: 403,
      MessageId: "POL1100"
    },
    {
      JSObject: "ATT.rtc",
      JSMethod: "logout",
      ErrorCode: 3507,
      ErrorMessage: "Session Id is not associate with the Access Token passed in the request.",
      PossibleCauses: "Access Token that was passed in the Request is not mapped to the Session Id.",
      PossibleResolution: "Use the same Access Token that was initially passe…ne that is active in case refresh token was used.",
      APIError: "POL1102:Session Id not associated with the token",
      ResourceMethod: "DELETE /RTC/v1/sessions/{sessionid}",
      HttpStatusCode: 403,
      MessageId: "POL1102"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "answer",
      ErrorCode: 5504,
      ErrorMessage: "Duplicate Request",
      PossibleCauses: "A media modification is in progress for the callId.",
      PossibleResolution: "Complete the In-Progress Media modification before initiating another request.",
      APIError: "SVC8501: Call <callid> in progress",
      ResourceMethod: "PUT /RTC/v1/sessions/{sessionid}/calls/{callid}",
      HttpStatusCode: 409,
      MessageId: "SVC8501"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "hold",
      ErrorCode: 7508,
      ErrorMessage: "Duplicate Request",
      PossibleCauses: "A media modification is in progress for the callId.",
      PossibleResolution: "Complete the In-Progress Media modification before initiating another request.",
      APIError: "SVC8501: Call <callid> in progress",
      ResourceMethod: "PUT /RTC/v1/sessions/{sessionid}/calls/{callid}",
      HttpStatusCode: 409,
      MessageId: "SVC8501"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "resume",
      ErrorCode: 8508,
      ErrorMessage: "Duplicate request",
      PossibleCauses: "A media modification is in progress for the callId.",
      PossibleResolution: "Complete the In-Progress Media modification before initiating another request.",
      APIError: "SVC8501: Call <callid> in progress",
      ResourceMethod: "PUT /RTC/v1/sessions/{sessionid}/calls/{callid}",
      HttpStatusCode: 409,
      MessageId: "SVC8501"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16503,
      ErrorMessage: "Address provided by the end user is not geo codable.",
      PossibleCauses: "The address provided is unreachable.",
      PossibleResolution: "Correct the portion of address as per the error text and retry.",
      APIError: "SVC0015: Address is not valid address for E911 routing.Reason",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 400,
      MessageId: "SVC0015"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16504,
      ErrorMessage: "The address provided is not present in the System.",
      PossibleCauses: "The address provided is not present in the System.",
      PossibleResolution: "Confirm the address by setting isAddressConfirmed to true and retry.",
      APIError: "SVC0016: Address Confirmation Required ",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 400,
      MessageId: "SVC0016"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16505,
      ErrorMessage: "System is unavailable to process the request.",
      PossibleCauses: "System is unavailable to process the request.",
      PossibleResolution: "Please try again later.",
      APIError: "SVC0017: NENA provider system is not?available.",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 400,
      MessageId: "SVC0017"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16506,
      ErrorMessage: "System is available but could not process the request.",
      PossibleCauses: "System is available but could not process the request.",
      PossibleResolution: "Please contact system administrator.",
      APIError: "SVC0018: NENA provider system error",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 400,
      MessageId: "SVC0018"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16507,
      ErrorMessage: "Access token is invalid.",
      PossibleCauses: "1. Access Token is incorrect or in valid.?2. Access token is not authorized for the Enhanced WebRTC scope.",
      PossibleResolution: "Re-Authenticate and retrieve the correct access token.",
      APIError: "POL0001:A policy error occurred. For example, rate…it error, authentication and authorization errors",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 401,
      MessageId: "POL0001"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16508,
      ErrorMessage: "Invalid token",
      PossibleCauses: "Access Token is incorrect or in valid.",
      PossibleResolution: "Re-Authenticate and retrieve the correct access token for Enhanced WebRTC",
      APIError: "POL0002:Privacy verification failed for address <address> request is refused",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 403,
      MessageId: "POL0002"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16509,
      ErrorMessage: "Not implemented",
      PossibleCauses: "Reserved for future use",
      PossibleResolution: "Reserved for future use",
      APIError: "POL0003:Too many addresses specified in Message part",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 403,
      MessageId: "POL0003"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "createE911Id",
      ErrorCode: 16511,
      ErrorMessage: "System error occurred",
      PossibleCauses: "System error occurred",
      PossibleResolution: "Use the explanation to find the reason for failure.",
      APIError: "SVC0001: A service error has occurred. Error code is <error_explanation>",
      ResourceMethod: "POST emergencyServices/v1/e911Location",
      HttpStatusCode: 400,
      MessageId: "SVC0001"
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: 404,
      ErrorMessage: "<method name> The requested session resource was not found.",
      PossibleCauses: "Service Unavailable",
      PossibleResolution: "Please look into API Error",
      APIError: "The requested session resource was not found.",
      ResourceMethod: "METHOD: Resource URL",
      HttpStatusCode: 404,
      MessageId: ""
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: 500,
      ErrorMessage: "<method name> failed - Unable to complete requested operation",
      PossibleCauses: "System error occurred",
      PossibleResolution: "Use the explanation to find the reason for failure.",
      APIError: "Populated from API response if available",
      ResourceMethod: "METHOD: Resource URL",
      HttpStatusCode: 500,
      MessageId: ""
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: 502,
      ErrorMessage: "<method name> failed - Unable to complete requested operation",
      PossibleCauses: "Please look into API Error",
      PossibleResolution: "Please look into API Error",
      APIError: "Populated from API response if available",
      ResourceMethod: "METHOD: Resource URL",
      HttpStatusCode: 502,
      MessageId: ""
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: 503,
      ErrorMessage: "<method name> failed - Unable to complete requested operation",
      PossibleCauses: "Bad Gateway",
      PossibleResolution: "Please look into API Error",
      APIError: "Populated from API response if available",
      ResourceMethod: "METHOD: Resource URL",
      HttpStatusCode: 503,
      MessageId: ""
    },
    {
      JSObject: "ATT.rtc.Phone",
      JSMethod: "*",
      ErrorCode: 504,
      ErrorMessage: "<method name> failed - Unable to complete requested operation",
      PossibleCauses: "Service Unavailable",
      PossibleResolution: "Please look into API Error",
      APIError: "Populated from API response if available",
      ResourceMethod: "METHOD: Resource URL",
      HttpStatusCode: 504,
      MessageId: ""
    }
  ];

  // freezes a list of objects
//  function freezeErrors(list) {
//    var idx = 0, listCount = list.length;
//    for (idx = 0; idx < listCount; idx = idx + 1) {
//      // make all errors unmutable
//      if (list[idx] !== undefined) {
//        Object.getOwnPropertyDescriptor(list[idx], JSObject).writable = true;
//        Object.getOwnPropertyDescriptor(list[idx], JSMethod).writable = true;
//        Object.getOwnPropertyDescriptor(list[idx], APIError).writable = true;
//        Object.getOwnPropertyDescriptor(list[idx], ResourceMethod).writable = true;
//        Object.freeze(list[idx]);
//      }
//    }
//    // errors are now frozen
//    return list;
//  }

  // try to export the Error List
  // This will throw an error if ATT.utils is not defined
  if (window.ATT.utils.ErrorStore === undefined) {
    throw new Error('Cannot export SDK Errors into ATT.utils.ErrorStore.APIErrors, ATT.utils.ErrorStore namespace is undefined.'
      + '\n ATT: ' + JSON.stringify(window.ATT));
  }

  window.ATT.utils.ErrorStore.APIErrors = {
    getAllAPIErrors: function () {
      return apiErrors;
    }
  };

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT: true,sdkErrorCollection:true */

/** ErrorDictinaryModule will extend ATT.utils with a factory method to create Error Dictionaries.
 *  @warning Assumes ATT.utils is already defined.
 */

(function () {
  "use strict";
  var typeofModule;
  /** Will create an error object using a prototype and will append
   *  all the properties in `spec`
   *  @param spec An object specifying the properties that need to be added to
   *  the error object.
   */
  function createErrorWith(spec, utils) {

    var prototypeAPIError = {
        JSObject: '',           //JS Object
        JSMethod: '',           //JS Method
        ErrorCode: '',          //Error code
        ErrorMessage: '',       //Error Message
        PossibleCauses: '',     //Possible Causes
        PossibleResolution: '', //Possible Resolution
        APIError: '',           //API Error response
        ResourceMethod: '',     //Resource URI
        HttpStatusCode: '',     //HTTP Status Code
        MessageId: ''           //Message ID
      },
      newError;

    // will add a `formatError` method to `error`
    function addFormatter(error) {
      error.formatError = function () {
        var errorString = error.JSObject + '-' +
          error.JSMethod + '-' +
          error.ErrorCode + '-' +
          error.ErrorMessage + '-' +
          error.PossibleCauses + '-' +
          error.PossibleResolution + '-' +
          error.APIError + '-' +
          error.ResourceMethod + '-' +
          error.HttpStatusCode + '-' +
          error.MessageId;
        return errorString;
      };
      return error;
    }

    // will add a `getId` method to `error`
    function addIdGetter(error) {
      error.getId = function () {
        var errorID = error.ErrorCode;
        return errorID;
      };
      return error;
    }
    // second key to lookup using method name, http status code and message id
    function getAPIErrorByMethodStatusMsgId(error) {
      error.getAPIErrorByMethodStatusMsgId = function () {
        var opStatusMsgId = error.JSMethod + error.HttpStatusCode + error.MessageId;
        return opStatusMsgId;
      };
      return error;
    }
    newError = Object.create(prototypeAPIError);
    // extend with the properties in the spec
    newError = utils.extend(newError, spec);
    newError = addFormatter(newError);// add `formatMethod`
    newError = addIdGetter(newError);
    newError = getAPIErrorByMethodStatusMsgId(newError);
    return newError;
  }

  function createErrorDictionary(sdkErrors, apiErrors) {
    var utils = ATT.utils,
      newError = null,
      idx = 0,
      apiErrorContainer = [],
      errorCount = apiErrors.length;

    //Load the API Errors into dictionary
    for (idx = 0; idx < errorCount; idx = idx + 1) {
      // create the error
      newError = createErrorWith(apiErrors[idx], utils);
      // add it to the dictionary
      apiErrorContainer[newError.getId()] = newError;
      apiErrorContainer[newError.getAPIErrorByMethodStatusMsgId()] = newError;
    }

    return { // return the error dictionary
      createError: function (spec) {
        return createErrorWith(spec, utils);
      },
      getSDKError: function (errorId) {
        return sdkErrors[errorId];
      },
      getError: function (errorId) {
        return apiErrorContainer[errorId];
      },
      getAPIError: function (methodName, httpStatusCode, messageId) {
        var errObj = apiErrorContainer[methodName + httpStatusCode + messageId];
        if (!errObj) {
          errObj = apiErrorContainer["*" + httpStatusCode + messageId];
          if (errObj) {
            errObj.JSMethod = methodName;
          }
        }
        return errObj;
      },
      getDefaultError: function (errorSpec) {
        return createErrorWith(errorSpec, utils);
      }
    };
  }

  // Export to NodeJS
  typeofModule = typeof module;
  if ('undefined' !== typeofModule && module.exports) {
    module.exports = createErrorDictionary;
  } else {
    console.debug('Not exporting to NodeJS...');
  }

  // Export to the Browser
  try {
    window.ATT.utils.createErrorDictionary = createErrorDictionary;
  } catch (e) {
    throw new Error('Error while exporting ATT.errorDictionary.'
      + '\n ATT = ', JSON.stringify(window.ATT)
      + 'Original Message: ' + e.message);
  }

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 250*/
/*global ATT*/

(function () {
  'use strict';

  var logManager = ATT.logManager.getInstance(),
    logger = logManager.getLoggerByName("att.private.error");

  function parseAPIErrorResponse(response) {
    logger.logDebug('ATT.private.error: parseAPIErrorResponse');
    logger.logInfo('Parses the error response and checks for Type');
    logger.logTrace(response);
    var errObj = response.getJson(), error = {}, apiError;
    if (!errObj.RequestError) {
      if (response.getResponseStatus() >= 500) {
        if (response.getJson() !== "") {
          apiError = JSON.stringify(response.getJson());
        } else {
          apiError = response.responseText;
        }
        error = ATT.errorDictionary.getAPIError("*", response.getResponseStatus(), "");
        error.APIError =  apiError;
        logger.logError("Service Unavailable");
        logger.logError(response);
        logger.logError(error);
      } else {
        error = {
          APIError: response.responseText
        };
        logger.logError(response);
        logger.logError(error);
      }
      error.ResourceMethod = response.getResourceURL();
      error.HttpStatusCode = response.getResponseStatus();
      logger.logTrace('return:' + error);
      return error;
    }
    if (errObj.RequestError.ServiceException) { // API Service Exceptions
      error = {
        APIError: errObj.RequestError.ServiceException.MessageId + ":" + errObj.RequestError.ServiceException.Text + ",Variables=" +
          errObj.RequestError.ServiceException.Variables,
        MessageId: errObj.RequestError.ServiceException.MessageId
      };
    } else if (errObj.RequestError.PolicyException) { // API Policy Exceptions
      error = {
        APIError: errObj.RequestError.PolicyException.MessageId + ":" + errObj.RequestError.PolicyException.Text + ",Variables=" + errObj.RequestError.PolicyException.Variables,
        MessageId: errObj.RequestError.PolicyException.MessageId
      };
    } else if (errObj.RequestError.Exception) { // API Exceptions
      error = {
        APIError: (errObj.RequestError.Exception.MessageId || "") + ":" + errObj.RequestError.Exception.Text + ",Variables=" + errObj.RequestError.Exception.Variables || "",
        MessageId: errObj.RequestError.Exception.MessageId
      };
    }
    error.ResourceMethod = response.getResourceURL();
    error.HttpStatusCode = response.getResponseStatus();

    if (!error.APIError) {
      error.APIError = response.responseText;
      error.MessageId = "";
      logger.logError("Unable to parse API Error. Response is empty :" + response);
    }
    logger.logTrace('return: ' + error);
    return error;
  }

  function createAPIErrorCode(response, jsObject, methodName, moduleId) {
    logger.logDebug('ATT.private.error: createAPIErrorCode');
    logger.logInfo('Parses the error response and checks for Type');
    logger.logTrace('methodName: ' + methodName);
    logger.logTrace('moduleId: ' + moduleId);
    logger.logTrace('raw error', response);

    var apiError, errorResponse;

    if (undefined !== response.HttpStatusCode) {
      errorResponse = response;
    } else if (undefined !== response.errorDetail.HttpStatusCode) {
      errorResponse = response.errorDetail;
    }
    methodName = methodName || 'GeneralOperation';
    moduleId = moduleId || 'RTC';

    if (errorResponse.HttpStatusCode !== 0) {
      apiError = ATT.errorDictionary.getAPIError(methodName,
        errorResponse.HttpStatusCode, errorResponse.MessageId);
      if (apiError !== undefined) {
        apiError.APIError = errorResponse.APIError;
        apiError.HttpStatusCode = errorResponse.HttpStatusCode;
        apiError.MessageId = errorResponse.MessageId;
        apiError.ResourceMethod = errorResponse.ResourceMethod;
      }
    } else {
      //Network connectivity related errors will not have valid http status code
      apiError = errorResponse;
    }

    if (!apiError) { // Unknown errors
      logger.logError("Error not found in Error dictionary ");
      logger.logError(response);
      apiError = ATT.errorDictionary.getDefaultError({
        JSObject: jsObject,
        ErrorCode: moduleId + "-UNKNOWN",
        JSMethod: methodName,
        HttpStatusCode: response.HttpStatusCode || 'Unknown',
        ErrorMessage: methodName + ' failed',
        APIError:  errorResponse.APIError || response.responseText,
        PossibleCauses: "Please look into APIError",
        PossibleResolution: "Please look into APIError",
        MessageId: errorResponse.MessageId || "",
        ResourceMethod: errorResponse.ResourceMethod || response.getResourceURL()
      });
      logger.logError("Generating Missing error response:" + apiError);
    }
    apiError.JSObject = jsObject;
    apiError.JSMethod = methodName;
    apiError.ModuleId = moduleId;
    apiError.ErrorMessage = methodName + " failed - " + apiError.ErrorMessage;
    logger.logTrace('return: ', apiError);
    return apiError;
  }

  logger.logDebug('Initializing error module');

  if (undefined === ATT.private) {
    throw new Error('Error exporting ATT.private.error');
  }

  ATT.private.error = {
    parseAPIErrorResponse: parseAPIErrorResponse,
    createAPIErrorCode: createAPIErrorCode
  };
}());
;/*jslint browser: true, devel: true, plusplus: true, debug: true, todo: true, indent: 2, maxlen: 150 */
/*global ATT*/

(function () {

  'use strict';

  var logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule('att.rtc');

  logger.logDebug('Loading att.rtc...');

  /**
   * @summary
   * Setup the Enhanced WebRTC API endpoint and Enhanced WebRTC domain.
   *
   * @desc
   * If `options` object is provided, configure method will use the `options.ewebrtc_domain`
   *  and `[options.api_endpoint]` values as the application domain and api endpoint respectively.
   * If no `options` were passed, the configuration will be requested from the built-in DHS and then applied.
   *
   * @memberof ATT.rtc
   * @static
   * @param {Object} [options] - SDK configuration options.
   * @param {String} options.ewebrtc_domain - The Enhanced WebRTC Domain for your application.
   * @param {String} [options.api_endpoint] - The Enhanced WebRTC API URL.
   * @param {Function} [success]
   * @param {Function} [error]
   *
   * @example
   * // Configure using the Node DHS
   * var success = function () {...};
   * ATT.rtc.configure(success);

   * @example
   * // Configure using the Node DHS
   * var success = function () {...};
   * var error = function () {...};
   * ATT.rtc.configure(success, error);

   * @example
   * // Configure using the provided options obtained elsewhere
   * var phone = ATT.rtc.configure({
   *   ewebrtc_domain: 'my.domain.com'
   * });

   * @example
   * // Configure using the provided options obtained elsewhere
   * var phone = ATT.rtc.configure({
   *   ewebrtc_domain: 'my.domain.com',
   *   api_endpoint: 'https://api.att.com'
   * });
   */
  function configure() {
    logger.logDebug('ATT.rtc: configure');

    var options,
      success,
      error,
      rc,
      i;

    if (0 === arguments.length) {
      throw new Error('Invalid parameters: pass `options` or `success` callback.');
    }

    if (0 <= arguments.length) {
      for (i = 0; i < arguments.length; i = i + 1) {
        if ('function' === typeof arguments[i]) {
          if (0 === i) {
            success = arguments[i];
          } else if (1 === i) {
            error = arguments[i];
          }
        } else if ('object' === typeof arguments[i]) {
          if (0 === i) {
            options = arguments[i];
          }
        }
      }
    }

    if (undefined !== options
        && undefined === options.ewebrtc_domain) {
      logger.logError('`ewebrtc_domain` not provided.');
      throw new Error('`ewebrtc_domain` not provided.');
    }

    if (undefined !== options) {
      logger.logInfo('Configuring the Enhanced WebRTC SDK using provided options.');
      ATT.private.config.app.setAppConfiguration(options);
      return;
    }

    if (undefined === success) {
      logger.logError('`success` callback not provided.');
      throw new Error('`success` callback not provided.');
    }

    if (undefined === error) {
      logger.logWarning('`error` callback not provided.');
    }

    if (undefined !== success) {
      logger.logInfo('Configuring the Enhanced WebRTC SDK using DHS');
      rc = new ATT.RESTClient({
        method: 'GET',
        url: '/dhs',
        success: function (response) {
          logger.logDebug('GET /dhs: success');
          logger.logInfo('Successfully got DHS configuration response');

          ATT.private.config.app.setAppConfiguration(response.getJson());
          // user defined handler
          success();
        },
        error: function (err) {
          logger.logDebug('GET /dhs: error');
          logger.logError('Error getting DHS configuration');
          logger.logTrace(err);

          if (undefined !== error
              && 'function' === typeof error) {
            error(err);
          }
        }
      });
      logger.logInfo('Attempting to get DHS configuration');
      rc.ajax();
    }
  }

  /**
   * @summary
   * Associate an access token with a user id.
   *
   * @memberof ATT.rtc
   * @static
   * @param {Object} options - Options
   * @param {String} options.userId - userId to associate the access token with
   * @param {String} options.token - token to associate with the user id
   * @param {String} options.success - success callback function
   * @param {String} options.error - failure callback function
   *
   * @example
   * // Associate user id 'john' with token 'access_token'
   * var success = function () {...},
   *    error = function () {...};
   * ATT.rtc.associateAccessToken({
   *    userId: 'john',
   *    token: 'access_token',
   *    success: success,
   *    error: error
   * });

   */
  function associateAccessToken(options) {
    logger.logDebug('ATT.rtc: associateAccessToken');
    logger.logInfo('Associating access token  Domain');

    if (undefined === options
        || 0 === Object.keys(options).length) {
      throw new Error('No options provided');
    }
    if (undefined === options.userId) {
      throw new Error('No userId provided');
    }
    if (undefined === options.token) {
      throw new Error('No token provided');
    }
    if (undefined === options.success) {
      throw new Error('No success callback provided');
    }
    if (undefined === options.error) {
      throw new Error('No error callback provided');
    }

    var rtcManager = ATT.private.rtcManager.getRTCManager();

    rtcManager.associateToken(options);
  }

  /**
   * @summary
   * Tests the browser for WebRTC support.
   *
   * @memberof ATT.rtc
   * @static
   * @returns {Boolean} `true` if the browser supports WebRTC, `false` otherwise.
   */
  function hasEnhancedWebRTC() {
    logger.logDebug('ATT.rtc: hasEnhancedWebRTC');
    logger.logInfo('Checking if Enhanced WebRTC is supported');

    return typeof navigator.mozGetUserMedia === 'function' ||
      typeof navigator.webkitGetUserMedia === 'function' ||
      typeof navigator.getUserMedia === 'function';
  }

  /**
   * @summary
   * Returns the Enhanced WebRTC Domain for the current application.
   *
   * @memberof ATT.rtc
   * @static
   * @return {String} The Enhanced WebRTC Domain setup for the current application.
   */
  function getEWebRTCDomain() {
    logger.logDebug('ATT.rtc: getEWebRTCDomain');
    logger.logInfo('Get the configured Enhanced WebRTC Domain');

    var appConfig = ATT.private.config.app.getAppConfiguration();

    logger.logTrace(appConfig.ewebrtc_domain);

    return appConfig.ewebrtc_domain;
  }

  if (undefined === ATT.rtc) {
    throw new Error('Error exporting ATT.rtc methods');
  }

  /**
  * This namespace provides the methods necessary to configure the JS client library.
  *
  * - You can use the `configure` method to request environment options from the
  * built-in DHS. Alternatively you can also configure using your own environment options.
  * - You can use the `associateAccessToken` method to associate an access token with
  * a virtual number or account id user id.
  * - Use the `hasEnhancedWebRTC` method to test for browser compatibility
  * - Use `getEWebRTCDomain` to obtain the WebRTC domain setup for the library.
  *
  * @namespace ATT.rtc
  */

  ATT.rtc.configure = configure;
  ATT.rtc.associateAccessToken = associateAccessToken;
  ATT.rtc.hasEnhancedWebRTC = hasEnhancedWebRTC;
  ATT.rtc.getEWebRTCDomain = getEWebRTCDomain;

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT*/

// Dependency:  utils, LogManager, ATT.errorDictionary(loaded by att.main.js) - Dependency att.utils.sdk-error-store

(function () {
  "use strict";

  var errorDictionary,
    utils = ATT.utils,
    errorAtt = ATT.private.error,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule('att.private.resource-manager');

  logger.logDebug('Loading att.private.resource-manager...');

  function createResourceManager(apiConfig) {
    logger.logDebug('ATT.private.factories: createResourceManager');
    logger.logInfo('Creating resource manager...');
    logger.logTrace('apiConfig', apiConfig);

    var apiConfigs;

    if (undefined === apiConfig
        || 0 === Object.keys(apiConfig).length) {
      throw new Error('No API configuration passed');
    }

    if (undefined === apiConfig.getAPIConfiguration) {
      throw new Error('No `getAPIConfiguration` method found.');
    }

    function createRESTConfiguration(operationConfig, options) {
      logger.logDebug('ATT.private.resourceManager: createRESTConfiguration');
      logger.logInfo('Creating REST configuration...');
      logger.logTrace('operationConfig', operationConfig);
      logger.logTrace('options', options);

      var restConfig,
        formatters,
        formattersLength,
        headerType,
        headerObj,
        paramHeader,
        optionKey,
        headersObjectForREST;

      // we have an operation config.
      restConfig = utils.extend({}, operationConfig);
      formatters = operationConfig.formatters || {};
      formattersLength = Object.keys(formatters).length;

      if (formatters && formattersLength > 0) {
        if (undefined === options.params
            || formattersLength !== Object.keys(options.params).length) {
          logger.logError('Params passed in must match number of formatters');
          logger.logTrace('formatters', formatters);
          logger.logTrace('params', options.params);

          throw new Error('Params passed in must match number of formatters.');
        }

        // check that method matches up with passed in method.
        if (formatters.method) {
          if (!options.params.method) {
            logger.logError('Missing method parameter for the method formatter.');

            throw new Error('Missing method parameter for the method formatter.');
          }
        }

        // check that url matches up with passed in url.
        if (formatters.url) {
          if (!options.params.url) {
            logger.logError('Missing URL parameter for the URL formatter.');

            throw new Error('Missing URL parameter for the URL formatter.');
          }
        }

        // check headers.  just check that lengths matches for now.
        if (formatters.headers) {
          if (Object.keys(options.params.headers).length !== Object.keys(operationConfig.formatters.headers).length) {
            logger.logError('Header formatters in APIConfigs do not match header parameters provided.');

            throw new Error('Header formatters in APIConfigs do not match the header parameters being passed in.');
          }
        }

        // Override method parameter with method from method formatter.
        if (typeof formatters.method === 'string') {
          restConfig.method = options.params.method || operationConfig.formatters.method; // default to predefined method

          logger.logInfo('updated restConfig method');
          logger.logTrace('restConfig.method', restConfig.method);
        }

        // Override url parameter with url from url formatter.
        if (typeof formatters.url === 'function') {
          restConfig.url = operationConfig.formatters.url(options.params.url);

          logger.logInfo('updated restConfig url');
          logger.logTrace('restConfig.url', restConfig.url);
        }

        // header formatting.
        // call formatters for each header (by key)
        // need to concat default headers with header data passing in.
        if (typeof formatters.headers === 'object') {
          if (Object.keys(formatters.headers).length > 0) {
            headersObjectForREST = {};

            logger.logInfo('Configuring request headers...');

            for (headerType in options.params.headers) {
              if (options.params.headers.hasOwnProperty(headerType)) {
                if ('options' === headerType && 'object' === typeof operationConfig.formatters.headers[headerType]) {
                  if (Object.keys(options.params.headers[headerType]).length === 0) {
                    logger.logError('Options for header not passed in. Cannot construct request');
                    throw new Error('Options for header not passed in. Cannot construct request');
                  }
                  optionKey = Object.keys(options.params.headers[headerType])[0];
                  headerObj = operationConfig.formatters.headers[headerType][optionKey];
                  paramHeader = options.params.headers[headerType][optionKey];
                  headerType = optionKey;
                } else {
                  headerObj = operationConfig.formatters.headers[headerType];
                  paramHeader = options.params.headers[headerType];
                }
                headersObjectForREST[headerType] = headerObj(paramHeader);

                logger.logTrace(headerType, headersObjectForREST[headerType]);
              }
            }

            // add this to the restConfig.  These will be in addition to the default headers.
            restConfig.headers = ATT.utils.extend({}, restConfig.headers);
            restConfig.headers = ATT.utils.extend(restConfig.headers, headersObjectForREST);

            logger.logTrace('restConfig.headers', restConfig.headers);
          }
        }
      }

      // data
      if (options.data) {
        restConfig.data = options.data;
      }

      logger.logTrace('restConfig', restConfig);
      return restConfig;
    }


    function createRESTOperation(restConfig) {
      logger.logDebug('ATT.private.resourceManager: createRESTOperation');
      logger.logInfo('Creating REST Operation...');
      logger.logTrace('restConfig', restConfig);

      function restOperation(successCB, errorCB, onTimeout) {
        logger.logDebug('restOperation');

        var restClient;

        errorDictionary = ATT.errorDictionary;

        restConfig.success = successCB;
        restConfig.error = function (errResp) {
          if (errResp.getResponseStatus() === 0 && errResp.responseText === "") {
            errResp.errorDetail = errorDictionary.getSDKError('0003');
            errResp.errorDetail.HttpStatusCode = errResp.getResponseStatus();
            errResp.errorDetail.ResourceMethod = errResp.getResourceURL();
            errorCB.call(this, errResp.errorDetail);
          } else {
            errResp.errorDetail = errorAtt.parseAPIErrorResponse(errResp);
            errorCB.call(this, errResp.errorDetail);
          }
        };
        restConfig.ontimeout = function () {
          var error = {};
          error.errorDetail = errorDictionary.getSDKError('0003');
          error.errorDetail.HttpStatusCode = 0;
          error.errorDetail.ResourceMethod = restConfig.url;
          if (!onTimeout) {
            errorCB.call(this, error.errorDetail);
          } else {
            onTimeout.call(this, error.errorDetail);
          }
        };

        restClient = new ATT.RESTClient(restConfig);

        // make request
        restClient.ajax();
      }

      return restOperation;
    }
    /**
     * Method to return a configured rest operation configured in the
     * att.config.api.js file.
     * @param operationName
     * @param operationOpts
     * @returns {Function}
     */
    function getOperation(operationName, operationOpts) {
      logger.logDebug('ATT.private.resourceManager: getOperation');
      logger.logTrace('operationName', operationName);
      logger.logTrace('operationOpts', operationOpts);

      var operationConfig,
        restConfig,
        configuredRESTOperation,
        currentConfiguration;

      currentConfiguration = apiConfigs.getAPIConfiguration();
      operationConfig = currentConfiguration[operationName];

      if (undefined === operationConfig) {
        throw new Error('Operation not found.');
      }

      if (undefined === operationOpts) {
        throw new Error('No options found.');
      }

      restConfig = createRESTConfiguration(operationConfig, operationOpts);
      configuredRESTOperation = createRESTOperation(restConfig);

      return configuredRESTOperation;
    }

    /**
     This will return a configured rest operation call.
     config = {
      data: {data},
      params: {
        url: [urldata1, urldata2],
        headers: {    // key corresponds to the header name.
          'Accept': 'abc',
          'Authorization': 'xyz'
        }
      }
    }

     Example:
     resourceManager.doOperation('createCall', params, function (response) {

        // handle success and error

      });

     */

    /**
     * Method that will perform the actual operation call on the configured
     * rest operation.
     * @param operationName
     * @param operationConfig
     */
    function doOperation(operationName, operationConfig) {
      logger.logDebug('ATT.private.resourceManager: doOperation');
      logger.logTrace('operationName', operationName);
      logger.logTrace('operationConfig', operationConfig);

      if (undefined === operationName
          || operationName.length === 0) {
        logger.logError('no operation name provided');
        throw new Error('Must specify an operation name.');
      }

      if (undefined === operationConfig
           || Object.keys(operationConfig).length === 0) {
        throw new Error('No options found.');
      }

      if (undefined === operationConfig.success) {
        throw new Error('No `success` callback passed.');
      }

      if (typeof operationConfig.success !== 'function') {
        throw new Error('`success` callback has to be a function.');
      }

      if (undefined === operationConfig.error) {
        throw new Error('No `error` callback passed.');
      }

      if (typeof operationConfig.error !== 'function') {
        throw new Error('`error` callback has to be a function.');
      }

      try {
        var operation = getOperation(operationName, operationConfig);

        logger.logInfo('About to perform operation ' + operationName);

        operation(operationConfig.success, operationConfig.error, operationConfig.ontimeout);
      } catch (err) {
        logger.logError('Error performing operation: ' + operationName);
        logger.logTrace(err);

        throw err;
      }
    }

    function getRestOperationsConfig() {
      logger.logDebug('ATT.private.resourceManager: getRestOperationsConfig');

      return apiConfigs.getAPIConfiguration();
    }

    apiConfigs = apiConfig;

    return {
      doOperation : doOperation,
      getRestOperationsConfig : getRestOperationsConfig
    };
  }

  if (undefined === ATT.private.factories) {
    throw new Error('Error exporting `createResourceManager`');
  }
  ATT.private.factories.createResourceManager = createResourceManager;

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT, WebSocket, Env*/

/** WebRTC Event Channel Module: Will export method `ATT.utils.createEventChannel`
 * Extends the global object `ATT` with a method to create Event Channels
 * Event channel objects can be used to listen to a given `channel` continuously.
 */

(function () {
  'use strict';

  var logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule("ATT.utils.event-channel"),
    factories = ATT.private.factories,
    errorAtt = ATT.private.error;

  /**
   * Creates an Event Channel with the given configuration:
   * @returns The configured event channel.
   * @channelConfig {object} An object specifier with the properties of the channel.
   * * WebSockets:
   *   * params {
   *       url: {Array},
   *       headers: {Object}
   *     }
   * * Long Polling:
   *   * method: {String}
   *   * timeout: {integer}
   *   * headers: {Object}
   */
  function createEventChannel(channelConfig) {
    logger.logDebug('ATT.utils.event-channel: createEventChannel');
    logger.logInfo('Creating event channel...');

    logger.logTrace('channelConfig', channelConfig);

    var channel, // the channel to be configured and returned.
      operationConfig = {},
      isListening = false,
      bLongPolling = true,
      ws, // socket to use in case we're using WebSockets
      locationForSocket,
      eventData,
      onSuccess,
      onError,
      onTimeOut,
      interval = 2000,
      maxPollingTime = 5 * 60 * 1000,
      operationName = 'getEvents',
      emitter;

    if (undefined === channelConfig
        || 0 === Object.keys(channelConfig).length) {
      logger.logError('No options');
      throw new Error('No options');
    }
    if (undefined === channelConfig.accessToken) {
      logger.logError('No Access Token');
      throw new Error('No Access Token');
    }
    if (undefined === channelConfig.sessionId) {
      logger.logError('NO Session Id');
      throw new Error('No Session Id');
    }
    if (undefined === channelConfig.resourceManager) {
      logger.logError('No Resource Manager');
      throw new Error('No Resource Manager');
    }

    if (undefined !== channelConfig.interval) {
      logger.logInfo('Configuring interval');

      logger.logTrace('interval', channelConfig.interval);

      interval = channelConfig.interval;
    }

    if (undefined !== channelConfig.maxPollingTime) {
      logger.logInfo('Configuring maximum polling time');

      logger.logTrace('maxPollingTime', channelConfig.maxPollingTime);

      maxPollingTime = channelConfig.maxPollingTime;
    }

    if ('WebSockets' === channelConfig.channelType) {
      logger.logInfo('Setting long polling to false for WebSockets');

      logger.logTrace('channelType', channelConfig.channelType);

      bLongPolling = false;
    }

    emitter = factories.createEventEmitter();

    logger.logTrace('event-channel / operationConfig: ');
    logger.logTrace(operationConfig);

    /**
     * Process Events
     * @param {Object} messages The messages
     **/
    function processMessages(messages) {
      logger.logDebug('ATT.utils.event-channel: processMessages');
      logger.logInfo('Processing events...');

      logger.logTrace('messages', messages);

      // Using Long Polling
      if (bLongPolling) {
        eventData = JSON.parse(messages.responseText);
      } else { // using WebSockets
        eventData = JSON.parse(messages.data);
      }

      logger.logTrace('eventData', eventData);

      if (eventData.events) {
        logger.logInfo('Publish events individually');

        var events = eventData.events.eventList,
          evt;

        // publish events individuall
        for (evt in events) {
          if (events.hasOwnProperty(evt)) {
            logger.logTrace('eventObject', events[evt].eventObject);

            emitter.publish('api-event', events[evt].eventObject);
          }
        }
      }
    }

    function stopListening() {
      logger.logDebug('ATT.utils.event-channel: stopListening');
      logger.logInfo("Stop listening to event channel");

      isListening = false;
    }

    function on(event, handler) {
      logger.logDebug('ATT.utils.event-channel: on');
      logger.logInfo('Subscribing to event-channel event ' + event);

      if (event !== 'api-event' && event !== 'channel-error') {
        logger.logError('Event not defined');
        throw new Error('Event not defined');
      }

      if (typeof handler !== 'function') {
        logger.logError('Handler is not a function');
        throw new Error('Handler is not a function');
      }

      emitter.unsubscribe(event, handler);
      emitter.subscribe(event, handler, this);
    }

    function retry(config, error) {
      logger.logDebug('ATT.utils.event-channel: retry');
      logger.logInfo('Retry polling ...');

      logger.logTrace('config', config);
      logger.logTrace('error', error);

      if ((error.HttpStatusCode !== 204)) { //&& error.errorDetail.HttpStatusCode > 0)) {
        logger.logInfo('[FATAL] Response code was: ');
        logger.logInfo('Re-polling...');
        //stopListening();
        //emitter.publish('channel-error',ATT.Error.createAPIErrorCode(error,"ATT.rtc.Phone","events","RTC"));
        //return;
      } else if (0 === error.HttpStatusCode) {
        logger.logInfo('Request timed out');
        logger.logInfo('Re-polling...');
      } else {
        logger.logInfo('Response code was: ' + error.HttpStatusCode);
        logger.logInfo('Re-polling...');
      }

      setTimeout(function () {
        // continue polling
        logger.logInfo('Continue polling...');

        channelConfig.resourceManager.doOperation(operationName, operationConfig);
      }, 0);
    }

    // setup success and error callbacks
    onSuccess =  function (config, response) {
      logger.logDebug('createEventChannel: onSuccess');
      logger.logInfo('Successfully created event channel');

      logger.logTrace('response', response);

      if (typeof config.success === 'function') {
        logger.logInfo('Successfully got response from event channel');

        config.success('Successfully got response from event channel');
      }

      if (!isListening) {
        logger.logInfo("Not processing response because event channel is not running");

        return;
      }

      if (bLongPolling) { // long-polling
        logger.logInfo('Processing messages...');

        if (response.getResponseStatus() === 200) {
          processMessages(response);

          logger.logInfo('Messages processed, Re-polling...');
          logger.logTrace('response', response);
        }

        setTimeout(function () {
          // continue polling
          logger.logInfo('Continue polling...');

          channelConfig.resourceManager.doOperation(operationName, operationConfig);
        }, 0);

        return;
      }

      // if the channel uses sockets
      locationForSocket = response.getResponseHeader('location');

      logger.logInfo('Channel sockets');
      logger.logTrace('locationForSocket', locationForSocket);
      // create a new socket if this channel doesn't have one already
      if (undefined === ws && locationForSocket) {
        ws = new WebSocket(locationForSocket);

        ws.onmessage = function (message) {
          logger.logDebug('createEventChannel: onMessage');
          logger.logInfo('Message received');
          logger.logTrace('message', message);

          processMessages(message);
        };
      }
    };

    onError =  function (config, error) { // only used for Long Polling
      if (isListening) {
        logger.logDebug('createEventChannel: onError');
        logger.logError('Error creating event channel');
        logger.logTrace('config', config);
        logger.logInfo('Re-polling...');

        //Increment by 2 times
        interval = interval * 2;
        if (interval > maxPollingTime) {
          logger.logInfo('Stopping event channel, maximum polling time reached');
          logger.logTrace('interval', interval);
          logger.logTrace('maxPollingTime', maxPollingTime);

          stopListening();
          emitter.publish('channel-error', errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'events', 'RTC'));
          return;
        }
        retry(config, error);
      } else {
        logger.logError('Error running event channel');
        logger.logTrace('error', error);
      }
    };

    onTimeOut = function (config, error) {
      logger.logDebug('createEventChannel: onTimeOut');
      logger.logTrace('config', config);
      logger.logTrace('error', error);

      if (isListening) {
        logger.logError('Request timed out');

        retry(config, error);
      }
    };

    function startListening(config) {
      logger.logDebug('ATT.utils.event-channel: startListening');
      logger.logInfo('Start listening to event channel...');

      logger.logTrace('config', config);

      isListening = true;
      //setup httpConfig for REST call
      operationConfig = {
        params: {
          method: (bLongPolling ? 'GET' : 'POST'),
          url: {
            sessionId: channelConfig.sessionId,
            eventChannelUri: (bLongPolling ? 'events' : 'websockets')
          },
          headers: {
            'Authorization' : channelConfig.accessToken
          }
        },
        success: onSuccess.bind(this, config),
        error: onError.bind(this, config),
        ontimeout: onTimeOut.bind(this, config)
      };
      channelConfig.resourceManager.doOperation(operationName, operationConfig);
    }

    channel = {
      isListening: function () {
        return isListening;
      },
      startListening: startListening,
      stopListening: stopListening,
      on: on
    };

    return channel;
  }

  if (undefined === ATT.private.factories) {
    logger.logError('Error exporting `createEventChannel`');
    throw new Error('Error exporting `createEventChannel`');
  }

  ATT.private.factories.createEventChannel = createEventChannel;
}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT*/

//Dependency: ATT.logManager

(function () {
  'use strict';

  var factories = ATT.private.factories,
    enumAtt = ATT.private.enum,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.getLoggerByName("att.event-manager");

  function createEventManager(options) {
    logger.logDebug('ATT.event-manager: createEventManager');
    logger.logTrace(options);

    var eventChannelType,
      eventChannel,
      resourceManager,
      emitter;

    /*
     * Gives a friendly name to Event Channel events
     * @param {Object} event The event object
     */
    function processEvent(event) {
      logger.logDebug('ATT.event-manager: processEvent');
      logger.logInfo('Processing the events coming from event channel');
      logger.logTrace(event);

      var codec,
        type,
        sessionId,
        callId,
        sdpFilter = ATT.sdpFilter.getInstance();

      if (!event) {
        logger.logError('Not able to consume null event...');
        return;
      }

      logger.logDebug('Consumed event from event channel', JSON.stringify(event));

      type = event.type === 'calls' ? 'call' : 'conference';

      sessionId = event.resourceURL.split('/')[4];
      callId = event.resourceURL.split('/')[6];

      //For faking video for PSTN numbers
      if (event.sdp && event.sdp.indexOf('m=video 0') !== -1) {
        // the remote sdp has Audio Call
        event.sdp = sdpFilter.fakeVideo(event.sdp);
      }

      logger.logTrace('Event state', event.state);
      switch (event.state) {
      case enumAtt.API_EVENT.INVITATION_RECEIVED:
        codec = ATT.sdpFilter.getInstance().getCodecfromSDP(event.sdp);

        emitter.publish(enumAtt.API_EVENT.INVITATION_RECEIVED + ':' + sessionId, {
          type: type,
          id: callId,
          from: event.from.split('@')[0].split(':')[1],
          mediaType: (codec.length === 1) ? 'audio' : 'video',
          sdp: event.sdp
        });
        break;
      case enumAtt.API_EVENT.MODIFICATION_RECEIVED:
        emitter.publish(enumAtt.API_EVENT.MODIFICATION_RECEIVED + ':' + callId, {
          id : callId,
          remoteSdp: event.sdp,
          modificationId: event.modId
        });
        break;
      case enumAtt.API_EVENT.MODIFICATION_TERMINATED:
        emitter.publish(enumAtt.API_EVENT.MODIFICATION_TERMINATED + ':' + callId, {
          id : callId,
          type: type,
          remoteSdp: event.sdp,
          modificationId: event.modId,
          reason: event.reason,
          from: event.from
        });
        break;
      case enumAtt.API_EVENT.SESSION_OPEN:
        emitter.publish(enumAtt.API_EVENT.SESSION_OPEN + ':' + callId, {
          type: type,
          id: callId,
          remoteSdp: event.sdp,
          provisionalSdp: event.provisionalSDP
        });
        break;
      case enumAtt.API_EVENT.SESSION_MODIFIED:
        emitter.publish(enumAtt.API_EVENT.SESSION_MODIFIED + ':' + callId, {
          type: type,
          id: callId,
          remoteSdp: event.sdp
        });
        break;
      case enumAtt.API_EVENT.SESSION_TERMINATED:
        emitter.publish(enumAtt.API_EVENT.SESSION_TERMINATED + ':' + callId, {
          type: type,
          id: callId,
          from: event.from.split('@')[0].split(':')[1],
          reason: event.reason
        });
        break;
      default:
        logger.logError('Unrecognized event state: ' + event.state);
        break;
      }

    }

    function setupEventChannel(options) {
      logger.logDebug('ATT.event-manager: setupEventChannel');
      logger.logInfo('Setting up the event channel');
      logger.logTrace(options);

      // Set event channel configuration
      // All parameters are required
      // Also, see appConfigModule
      var channelOptions = {
        accessToken: options.token,
        sessionId: options.sessionId,
        publisher: emitter,
        resourceManager: resourceManager,
        channelType: eventChannelType
      };

      eventChannel = factories.createEventChannel(channelOptions);

      if (eventChannel) {
        logger.logInfo('Event channel up and running');

        eventChannel.on('api-event', function (event) {
          processEvent(event);
        });

        eventChannel.on('channel-error', function (event) {
          options.onError(event);
        });

        logger.logInfo('Subscribed to api-event from event channel');

        eventChannel.startListening({
          success: function (msg) {
            logger.logDebug('startListening: success');
            logger.logInfo('successfully started listening');
            logger.logTrace(msg);
          },
          error: options.onError
        });
      }
      emitter.publish('listening');
    }

    function stop() {
      logger.logDebug('ATT.event-manager: stop');
      logger.logInfo('stop listening');

      if (eventChannel) {
        eventChannel.stopListening();
        logger.logInfo('Event channel shutdown successfully');
      }
      emitter.publish('stop-listening');
    }

    function off(event, handler) {
      logger.logDebug('ATT.event-manager: off');
      logger.logInfo('Unsubscribing from event-manager event: ' + event);

      emitter.unsubscribe(event, handler);
    }

    function on(event, handler) {
      logger.logDebug('ATT.rtc.RTCManager: on');
      logger.logInfo('Subscribing to event-manager event: ' + event);

      if ('listening' !== event
          && 'stop-listening' !== event
          && event.indexOf(enumAtt.API_EVENT.INVITATION_RECEIVED + ':') < 0
          && event.indexOf(enumAtt.API_EVENT.SESSION_OPEN + ':') < 0
          && event.indexOf(enumAtt.API_EVENT.SESSION_MODIFIED + ':') < 0
          && event.indexOf(enumAtt.API_EVENT.MODIFICATION_RECEIVED + ':') < 0
          && event.indexOf(enumAtt.API_EVENT.MODIFICATION_TERMINATED + ':') < 0
          && event.indexOf(enumAtt.API_EVENT.SESSION_TERMINATED + ':') < 0) {
        logger.logError('Event ' + event + ' not found');
        throw new Error('Event ' + event + ' not found');
      }

      emitter.unsubscribe(event, handler);
      emitter.subscribe(event, handler);
    }

    function setup(options) {
      logger.logDebug('ATT.event-manager: setup');
      logger.logInfo('Setting up the event channel');
      logger.logTrace(options);

      if (undefined === options) {
        logger.logError('Options not defined');
        throw new Error('Options not defined');
      }
      if (undefined === options.sessionId) {
        logger.logError('Session id is not defined');
        throw new Error('Session id is not defined');
      }
      if (undefined === options.token) {
        logger.logError('Token not defined');
        throw new Error('Token not defined');
      }

      setupEventChannel(options);
    }

    logger.logDebug('createEventManager');

    if (undefined === options
        || 0 === Object.keys(options).length) {
      logger.logError('Invalid options');
      throw new Error('Invalid options');
    }
    if (undefined === options.resourceManager) {
      logger.logError('Must pass `options.resourceManager`');
      throw new Error('Must pass `options.resourceManager`');
    }
    if (undefined === options.eventChannelType) {
      logger.logError('Must pass `options.eventChannelType`');
      throw new Error('Must pass `options.eventChannelType`');
    }

    eventChannelType = options.eventChannelType;
    resourceManager = options.resourceManager;

    emitter = factories.createEventEmitter();

    return {
      on: on,
      off: off,
      setup: setup,
      stop: stop
    };
  }

  if (undefined === ATT.private.factories) {
    throw new Error('Error exporting createEventManager');
  }
  ATT.private.factories.createEventManager = createEventManager;
}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT*/

//Dependency: ATT.logManager

(function () {
  'use strict';

  var factories = ATT.private.factories,
    errorAtt = ATT.private.error,

    // TODO: Review if this is the right place to define ATT.APIConfigs
    // define ATT.APIConfigs: this seems to be the logical
    // point where this object should be first defined since
    // only ResourceManager, EventChannel will use it
    // and those three modules are `managed` by RTCManager, so
    // RTCManager can pass in the configured ResourceManager created with
    //   var apiConfigs = ATT.APIConfigs
    //   resourceManager = factories.createResourceManger(apiConfigs);

    apiConfigs = ATT.private.config.api,
    appConfig = ATT.private.config.app,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.getLoggerByName("att.rtc-manager"),
    utils = ATT.utils;

  /**
  * Create a new RTC Manager
  * @param {Object} options The options
  * })
  */
  function RTCManager(options) {

    var appConfiguration,
      eventManager,
      resourceManager;

    resourceManager = options.resourceManager;

    logger.logDebug('ATT.private.RTCManager: Constructor');
    logger.logTrace('options', options);

    appConfiguration = appConfig.getAppConfiguration();

    eventManager = factories.createEventManager({
      resourceManager: resourceManager,
      eventChannelType: appConfiguration.eventChannelType
    });

    function extractSessionInformation(responseObject) {
      logger.logDebug('ATT.private.RTCManager: extractSessionInformation');
      logger.logTrace('responseObject', responseObject);

      var sessionId = null,
        timeout = null;

      if (responseObject) {
        if (responseObject.getResponseHeader('Location')) {
          sessionId = responseObject.getResponseHeader('Location').split('/')[4];
        }
        if (responseObject.getResponseHeader('x-expires')) {
          timeout = responseObject.getResponseHeader('x-expires');
          timeout = Number(timeout);
          timeout = isNaN(timeout) ? 0 : timeout * 1000; // convert to ms
        }
      }

      if (!sessionId) {
        throw 'Failed to retrieve session id';
      }

      return {
        sessionId: sessionId,
        timeout: timeout
      };
    }

    function on(event, handler) {
      logger.logDebug('ATT.private.RTCManager: on');
      logger.logInfo('Subscribing to RTCmanager event: ' + event);
      eventManager.on(event, handler);
    }

    function off(event, handler) {
      logger.logDebug('ATT.private.RTCManager: off');
      logger.logInfo('Unsubscribing from RTCmanager event: ' + event);
      eventManager.off(event, handler);
    }

    function refreshSession(refreshSessionOpts) {
      logger.logDebug('ATT.private.RTCManager: refreshSession');
      logger.logTrace('refreshSessionOpts', refreshSessionOpts);

      if (undefined === refreshSessionOpts
          || Object.keys(refreshSessionOpts).length === 0) {
        throw new Error('Invalid options');
      }

      if (undefined === refreshSessionOpts.sessionId) {
        throw new Error('No session ID passed');
      }

      if (undefined === refreshSessionOpts.token) {
        throw new Error('No token passed');
      }

      if (undefined === refreshSessionOpts.success) {
        throw new Error('No `success` callback passed');
      }

      if (typeof refreshSessionOpts.success !== 'function') {
        throw new Error('`success` callback has to be a function');
      }

      if (undefined === refreshSessionOpts.error) {
        throw new Error('No `error` callback passed');
      }

      if (typeof refreshSessionOpts.error !== 'function') {
        throw new Error('`error` callback has to be a function');
      }

      logger.logInfo('Calling operation refreshWebRTCSession to refresh session...');
      resourceManager.doOperation('refreshWebRTCSession', {
        success : function (response) {
          logger.logDebug('doOperation(refreshWebRTCSession): success');
          logger.logInfo('Successfully completed operation refreshWebRTCSession');

          var timeout = parseInt(response.getResponseHeader('x-expires'), 10);

          logger.logTrace('Session timeout', timeout);
          refreshSessionOpts.success({
            timeout: (timeout * 1000).toString()
          });
        },
        error: function (error) {
          logger.logDebug('doOperation(refreshWebRTCSession): error');
          logger.logError('Error during operation refreshWebRTCSession');
          logger.logTrace(error);

          refreshSessionOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'refreshSession', 'RTC'));
        },
        params: {
          url: [refreshSessionOpts.sessionId],
          headers: {'Authorization': refreshSessionOpts.token}
        }
      });
    }

    function connectSession(connectSessionOpts) {
      logger.logDebug('ATT.private.RTCManager: connectSession');
      logger.logTrace('connectSessionOpts', connectSessionOpts);

      if (undefined === connectSessionOpts) {
        throw new Error('No options defined.');
      }
      if (undefined === connectSessionOpts.token) {
        throw new Error('No token defined.');
      }
      if (undefined === connectSessionOpts.onSessionConnected) {
        throw new Error('Callback onSessionConnected not defined.');
      }
      if (undefined === connectSessionOpts.onSessionReady) {
        throw new Error('Callback onSessionReady not defined.');
      }
      if (undefined === connectSessionOpts.onError) {
        throw new Error('Callback onError not defined.');
      }

      var doOperationSuccess = function (response) {
        var onListening,
          sessionInfo;
        try {
          logger.logDebug('doOperation(createWebRTCSession): success');
          logger.logInfo('Successfully created web rtc session');

          sessionInfo = extractSessionInformation(response);

          connectSessionOpts.onSessionConnected(sessionInfo);

          onListening = function () {
            logger.logInfo('listening@eventManager');

            connectSessionOpts.onSessionReady({
              sessionId: sessionInfo.sessionId
            });

            eventManager.off('listening', onListening);
          };

          eventManager.on('listening', onListening);

          logger.logInfo('Trying to setup the event manager...');
          eventManager.setup({
            sessionId: sessionInfo.sessionId,
            token: connectSessionOpts.token,
            onError: function (error) {
              logger.logDebug('eventManager.setup: onError');
              logger.logError('There was an error setting up the eventManager');

              logger.logTrace(error);

              // TODO: test this
              connectSessionOpts.onError(error);
            }
          });

        } catch (err) {
          logger.logError('Error during connectionSession');
          logger.logTrace(err);

          connectSessionOpts.onError({
            error: ATT.errorDictionary.getSDKError('2004')
          });
        }
      };

      logger.logInfo('Attempting to create enhanced webrtc session');
      resourceManager.doOperation('createWebRTCSession', {
        data: {
          'session': {
            'mediaType': 'dtls-srtp',
            'ice': 'true',
            'services': [
              'ip_voice_call',
              'ip_video_call'
            ]
          }
        },
        params: {
          headers: {
            'Authorization': connectSessionOpts.token,
            'x-e911Id': connectSessionOpts.e911Id || '',
            'x-Arg': 'ClientSDK=WebRTCTestAppJavascript1'
          }
        },
        success: doOperationSuccess,
        error: function (error) {
          logger.logError('createWebRTCSession: error');
          logger.logTrace(error);

          connectSessionOpts.onError(errorAtt.createAPIErrorCode(error, "ATT.rtc.Phone", "login", "RTC"));
        }
      });

    }

    function disconnectSession(disconnectSessionOpts) {
      logger.logDebug('ATT.private.RTCManager: disconnectSession');
      logger.logTrace('disconnectSessionOpts', disconnectSessionOpts);

      if (undefined === disconnectSessionOpts) {
        throw new Error('No options defined.');
      }
      if (undefined === disconnectSessionOpts.sessionId) {
        throw new Error('No session id defined.');
      }
      if (undefined === disconnectSessionOpts.token) {
        throw new Error('No token defined.');
      }
      if (undefined === disconnectSessionOpts.onSessionDisconnected) {
        throw new Error('Callback onSessionDisconnected not defined.');
      }

      logger.logInfo('Attempting to stop event manager...');
      eventManager.stop();

      logger.logInfo('Attempting to delete enhanced webrtc session');
      // Call BF to delete WebRTC Session.
      resourceManager.doOperation('deleteWebRTCSession', {
        params: {
          url: [disconnectSessionOpts.sessionId],
          headers: {
            'Authorization': disconnectSessionOpts.token,
            'x-e911Id': disconnectSessionOpts.e911Id
          }
        },
        success: function () {
          logger.logDebug('doOperation(deleteWebRTCSession): error');
          logger.logInfo('Successfully deleted enhanced webrtc session');

          disconnectSessionOpts.onSessionDisconnected();
        },
        error: function (error) {
          logger.logDebug('doOperation(deleteWebRTCSession): error');
          logger.logError('Error during deleteWebRTCSession');
          logger.logTrace(error);

          disconnectSessionOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'logout', 'RTC'));
        }
      });
    }

    function connectCall(connectCallOpts) {
      logger.logDebug('ATT.private.RTCManager: connectCall');
      logger.logTrace('connectCallOpts', connectCallOpts);

      var responseData,
        connectConfig,
        createConfig,
        headers,
        data;

      if (undefined === connectCallOpts) {
        throw new Error('No options provided');
      }

      if (undefined === connectCallOpts.breed) {
        throw new Error('No call breed provided');
      }

      if ('call' === connectCallOpts.breed
          && undefined === connectCallOpts.peer) {
        throw new Error('No peer provided');
      }

      if (undefined === connectCallOpts.sessionId) {
        throw new Error('No session id provided');
      }

      if (undefined === connectCallOpts.token) {
        throw new Error('No token provided');
      }

      if (undefined === connectCallOpts.description) {
        throw new Error('No description provided');
      }

      if (undefined === connectCallOpts.onSuccess
          && 'function' !== typeof connectCallOpts.onSuccess) {
        throw new Error('No success callback provided');
      }

      if (undefined === connectCallOpts.onError
          && 'function' !== typeof connectCallOpts.onError) {
        throw new Error('No error callback provided');
      }

      // If you DON'T have a callId ID, then create the call
      if (undefined === connectCallOpts.callId) {

        if ('call' === connectCallOpts.breed) {
          data = {
            call: {
              calledParty: utils.createCalledPartyUri(connectCallOpts.peer),
              sdp: connectCallOpts.description.sdp
            }
          };
        } else {
          data = {
            conference: {
              sdp: connectCallOpts.description.sdp
            }
          };
        }

        createConfig = {
          params: {
            url: {
              sessionId : connectCallOpts.sessionId,
              type: connectCallOpts.breed + 's'
            },
            headers: {
              'Authorization': connectCallOpts.token
            }
          },
          data: data,
          success: function (response) {
            logger.logDebug('doOperation(createCall): success');
            logger.logInfo('Success during creating call/conference');
            logger.logTrace('response', response);

            responseData = {
              id: response.getResponseHeader('Location').split('/')[6],
              state: response.getResponseHeader('x-state')
            };
            connectCallOpts.onSuccess(responseData);
          },
          error: connectCallOpts.onError
        };

        logger.logInfo('Attempting to create the call...');
        resourceManager.doOperation('createCall', createConfig);
        return;
      }

      // If you DO have a call ID, then connect
      headers = {
        'Authorization': connectCallOpts.token,
        'options': {}
      };

      if ('call' === connectCallOpts.breed) {
        headers.options['x-calls-action'] = 'call-answer';
        data = {
          callsMediaModifications: {
            sdp: connectCallOpts.description.sdp
          }
        };
      } else {
        headers.options['x-conference-action'] = 'call-answer';
        data = {
          conferenceModifications: {
            sdp: connectCallOpts.description.sdp
          }
        };
      }

      connectConfig = {
        params: {
          url: {
            sessionId: connectCallOpts.sessionId,
            callId: connectCallOpts.callId,
            type: connectCallOpts.breed + 's'
          },
          headers: headers
        },
        data: data,
        success: function (response) {
          logger.logDebug('doOperation(modifyCall): success');
          logger.logInfo('Success during answering call/conference');
          logger.logTrace('response', response);

          responseData = {
            state: response.getResponseHeader('x-state')
          };
          connectCallOpts.onSuccess(responseData);
        },
        error: connectCallOpts.onError
      };

      logger.logInfo('Attempting to answer the call...');
      resourceManager.doOperation('modifyCall', connectConfig);
    }

    function acceptMediaModifications(acceptMediaModOpts) {
      logger.logDebug('ATT.private.RTCManager: acceptMediaModifications');
      logger.logTrace('acceptMediaModOpts', acceptMediaModOpts);

      var  callRequest,
        conferenceRequest,
        type = ('call' === acceptMediaModOpts.breed ? 'calls' : 'conferences');

      callRequest = {
        params: {
          url: {
            sessionId: acceptMediaModOpts.sessionId,
            type: type,
            callId: acceptMediaModOpts.callId
          },
          headers: {
            'Authorization': acceptMediaModOpts.token,
            'x-modId': acceptMediaModOpts.modId
          }
        },
        data: {
          callsMediaModifications: {
            sdp: acceptMediaModOpts.sdp
          }
        },
        success: function () {
          logger.logDebug('doOperation(acceptMediaModifications): success');
          logger.logInfo('Successfully accepted media modifications for call');
        },
        error: function (error) {
          logger.logDebug('doOperation(acceptMediaModifications): error');
          logger.logError('Error during accepting media modifications for call');
          logger.logTrace(error);
        }
      };

      conferenceRequest = {
        params: {
          url: {
            sessionId: acceptMediaModOpts.sessionId,
            type: type,
            callId: acceptMediaModOpts.callId
          },
          headers: {
            'Authorization': acceptMediaModOpts.token,
            'x-mod-Id': acceptMediaModOpts.modId
          }
        },
        data: {
          conferenceModifications: {
            sdp: acceptMediaModOpts.sdp
          }
        },
        success: function () {
          logger.logDebug('doOperation(acceptConferenceModifications): success');
          logger.logInfo('Successfully accepted media modifications for conference');
        },
        error: function (error) {
          logger.logDebug('doOperation(acceptConferenceModifications): error');
          logger.logError('Error during accepting media modifications for conference');
          logger.logTrace(error);
        }
      };

      logger.logInfo('Attempting to accept media modifications for the ' + acceptMediaModOpts.breed);

      if (type === 'calls') {
        resourceManager.doOperation('acceptCallModifications', callRequest);
      } else {
        resourceManager.doOperation('acceptConferenceModifications', conferenceRequest);
      }
    }


    function addParticipant(addParticipantOpts) {
      logger.logDebug('ATT.private.RTCManager: addParticipant');
      logger.logTrace('addParticipantOpts', addParticipantOpts);

      var invitee,
        modId;

      if (undefined === addParticipantOpts) {
        throw new Error('No `options` passed');
      }

      if (undefined === addParticipantOpts.sessionInfo) {
        throw new Error('No `sessionInfo` passed');
      }

      if (undefined === addParticipantOpts.confId) {
        throw new Error('No `confId` passed');
      }

      if (typeof addParticipantOpts.onSuccess !== 'function') {
        throw new Error('No `onSuccess` callback passed');
      }

      invitee = addParticipantOpts.invitee.toString();

      if (invitee.indexOf('@') > -1) {
        invitee = 'sip:' + invitee;
      } else {
        invitee = 'tel:+' + invitee;
      }

      logger.logInfo('Attempting to add a participant to the conference');

      resourceManager.doOperation('addParticipant', {
        params: {
          url: [
            addParticipantOpts.sessionInfo.sessionId,
            addParticipantOpts.confId,
            invitee
          ],
          headers: {
            'Authorization': addParticipantOpts.sessionInfo.token
          }
        },
        success: function (response) {
          logger.logDebug('doOperation(addParticipant): success');
          logger.logInfo('Successfully added participant to the conference');
          logger.logTrace('response', response);

          if ('add-pending' === response.getResponseHeader('x-state')) {
            modId = response.getResponseHeader('x-modId');
            addParticipantOpts.onSuccess(modId);
          }
        },
        error: function (error) {
          logger.logDebug('doOperation(addParticipant): error');
          logger.logError('Error during adding a participant to the conference');
          logger.logTrace(error);

          addParticipantOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'addParticipant', 'RTC'));
        }
      });
    }

    function removeParticipant(removeParticipantOpts) {
      logger.logDebug('ATT.private.RTCManager: removeParticipant');
      logger.logTrace('removeParticipantOpts', removeParticipantOpts);

      var participant;

      if (undefined === removeParticipantOpts) {
        throw new Error('No `options` passed');
      }

      if (undefined === removeParticipantOpts.sessionInfo) {
        throw new Error('No `sessionInfo` passed');
      }

      if (undefined === removeParticipantOpts.confId) {
        throw new Error('No `confId` passed');
      }

      if (typeof removeParticipantOpts.onSuccess !== 'function') {
        throw new Error('No `onSuccess` callback passed');
      }

      participant = removeParticipantOpts.participant.toString();

      if (participant.indexOf('@') > -1) {
        participant = 'sip:' + participant;
      } else {
        participant = 'tel:+' + participant;
      }

      logger.logInfo('Attempting to remove a participant from the the conference');

      resourceManager.doOperation('removeParticipant', {
        params: {
          url: [
            removeParticipantOpts.sessionInfo.sessionId,
            removeParticipantOpts.confId,
            participant
          ],
          headers: {
            'Authorization': removeParticipantOpts.sessionInfo.token
          }
        },
        success: function (response) {
          logger.logDebug('doOperation(removeParticipant): success');
          logger.logInfo('Successfully removed participant from the conference');
          logger.logTrace('response', response);

          if ('remove-pending' === response.getResponseHeader('x-state')) {
            removeParticipantOpts.onSuccess();
          }
        },
        error: function (error) {
          logger.logDebug('doOperation(removeParticipant): error');
          logger.logError('Error during removing participant from the conference');
          logger.logTrace(error);

          removeParticipantOpts.onError(error);
        }
      });

    }

    // Reused for call & conference
    function disconnectCall(disconnectCallOpts) {
      logger.logDebug('ATT.private.RTCManager: disconnectCall');
      logger.logTrace('disconnectCallOpts', disconnectCallOpts);

      if (undefined === disconnectCallOpts) {
        throw new Error('No options provided');
      }
      if (undefined === disconnectCallOpts.callId) {
        throw new Error('No CallId provided');
      }
      if (undefined === disconnectCallOpts.breed) {
        throw new Error('No call breed provided');
      }
      if (undefined === disconnectCallOpts.sessionId) {
        throw new Error('No sessionId provided');
      }
      if (undefined === disconnectCallOpts.token) {
        throw new Error('No token provided');
      }
      if (undefined === disconnectCallOpts.onSuccess) {
        throw new Error('No success callback provided');
      }
      if (undefined === disconnectCallOpts.onError) {
        throw new Error('No error callback provided');
      }

      var operation = (disconnectCallOpts.breed === 'call' ? 'hangup' : 'endConference');

      logger.logInfo('Attempting to delete the ' + disconnectCallOpts.breed);

      resourceManager.doOperation('deleteCall', {
        params: {
          url: {
            sessionId: disconnectCallOpts.sessionId,
            type: disconnectCallOpts.breed + 's',
            callId: disconnectCallOpts.callId
          },
          headers: {
            'Authorization': disconnectCallOpts.token,
            'x-delete-reason': 'terminate'
          }
        },
        success: function () {
          logger.logDebug('doOperation(deleteCall): success');
          logger.logInfo('Successfully deleted the ' + disconnectCallOpts.breed);
        },
        error: function (error) {
          logger.logDebug('doOperation(deleteCall): error');
          logger.logError('Error deleting the ' + disconnectCallOpts.breed);
          logger.logTrace(error);

          disconnectCallOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', operation, 'RTC'));
        }
      });
    }

    function cancelCall(cancelCallOpts) {
      logger.logDebug('ATT.private.RTCManager: cancelCall');
      logger.logTrace('cancelCallOpts', cancelCallOpts);

      if (undefined === cancelCallOpts) {
        throw new Error('No options provided');
      }
      if (undefined === cancelCallOpts.callId) {
        throw new Error('No callId provided');
      }
      if (undefined === cancelCallOpts.breed) {
        throw new Error('No call breed provided');
      }
      if (undefined === cancelCallOpts.sessionId) {
        throw new Error('No sessionId provided');
      }
      if (undefined === cancelCallOpts.token) {
        throw new Error('No token provided');
      }
      if (undefined === cancelCallOpts.onSuccess) {
        throw new Error('No success callback provided');
      }
      if (undefined === cancelCallOpts.onError) {
        throw new Error('No error callback provided');
      }

      if (cancelCallOpts.callId.length > 0) {
        logger.logInfo('Attempting to cancel the ' + cancelCallOpts.breed);

        resourceManager.doOperation('deleteCall', {
          params: {
            url: {
              sessionId: cancelCallOpts.sessionId,
              type: cancelCallOpts.breed + 's',
              callId: cancelCallOpts.callId
            },
            headers: {
              'Authorization': cancelCallOpts.token,
              'x-delete-reason': 'cancel'
            }
          },
          success: function () {
            logger.logDebug('doOperation(deleteCall): success');
            logger.logInfo('Successfully deleted the ' + cancelCallOpts.breed);

            cancelCallOpts.onSuccess();
          },
          error: function (error) {
            logger.logDebug('doOperation(deleteCall): error');
            logger.logError('Error canceling the ' + cancelCallOpts.breed);
            logger.logTrace(error);

            cancelCallOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'cancel', 'RTC'));
          }
        });
      }
    }

    function holdOrMoveCall(holdOrMoveCallOpts, action) {
      logger.logDebug('ATT.private.RTCManager: holdOrMoveCall');
      logger.logTrace('holdOrMoveCallOpts', holdOrMoveCallOpts);
      logger.logTrace('action', action);

      var data,
        headers,
        type;

      if (undefined !== holdOrMoveCallOpts) {
        type = ('move' === action ? 'move' : 'hold');
      }

      if (undefined === holdOrMoveCallOpts) {
        throw new Error('No options provided');
      }
      if (undefined === holdOrMoveCallOpts.callId) {
        throw new Error('No callId provided');
      }
      if (undefined === holdOrMoveCallOpts.sessionId) {
        throw new Error('No sessionId provided');
      }
      if (undefined === holdOrMoveCallOpts.token) {
        throw new Error('No token provided');
      }
      if (undefined === holdOrMoveCallOpts.description) {
        throw new Error('No sdp provided');
      }
      if (undefined === holdOrMoveCallOpts.breed) {
        throw new Error('No breed provided');
      }
      if (undefined === holdOrMoveCallOpts.onSuccess) {
        throw new Error('No success callback provided');
      }
      if (undefined === holdOrMoveCallOpts.onError) {
        throw new Error('No error callback provided');
      }

      headers = {
        Authorization: holdOrMoveCallOpts.token,
        options: {}
      };

      logger.logDebug('Modification data:');
      if ('conference' === holdOrMoveCallOpts.breed) {
        data = {
          conferenceModifications: {
            sdp: holdOrMoveCallOpts.description.sdp,
            type: holdOrMoveCallOpts.description.type
          }
        };
        headers.options['x-conference-action'] = 'initiate-hold';

        logger.logTrace('sdp', data.conferenceModifications.sdp);
        logger.logTrace('type', data.conferenceModifications.type);

      } else {
        data = {
          callsMediaModifications: {
            sdp: holdOrMoveCallOpts.description.sdp,
            type: holdOrMoveCallOpts.description.type
          }
        };
        headers.options['x-calls-action'] = 'initiate-call-' + type;

        logger.logTrace('sdp', data.callsMediaModifications.sdp);
        logger.logTrace('type', data.callsMediaModifications.type);
      }

      logger.logInfo('Attempting to ' + type + ' the ' + holdOrMoveCallOpts.breed);

      resourceManager.doOperation('modifyCall', {
        params: {
          url: {
            sessionId: holdOrMoveCallOpts.sessionId,
            type: holdOrMoveCallOpts.breed + 's',
            callId: holdOrMoveCallOpts.callId
          },
          headers: headers
        },
        data: data,
        success: function (response) {
          logger.logDebug('doOperation(modifyCall): success');
          logger.logInfo('Successfully performed operation ' + type + ' on the ' + holdOrMoveCallOpts.breed);
          logger.logTrace('response', response);

          if (response.getResponseStatus() === 204) {
            logger.logInfo('Response Status 204');

            holdOrMoveCallOpts.onSuccess();
          } else {
            logger.logError('Response Status is not 204');

            holdOrMoveCallOpts.onError();
          }
        },
        error: function (error) {
          logger.logDebug('doOperation(modifyCall): error');
          logger.logError('Error during performing operation' + type + ' on the ' + holdOrMoveCallOpts.breed);
          logger.logTrace(error);

          holdOrMoveCallOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', type, 'RTC'));
        }
      });
    }

    function holdCall(holdCallOpts) {
      logger.logDebug('ATT.private.RTCManager: holdCall');
      logger.logTrace('holdCallOpts', holdCallOpts);

      holdOrMoveCall(holdCallOpts, 'hold');
    }

    function moveCall(moveCallOpts) {
      logger.logDebug('ATT.private.RTCManager: moveCall');
      logger.logTrace('moveCallOpts', moveCallOpts);

      holdOrMoveCall(moveCallOpts, 'move');
    }

    function resumeCall(resumeCallOpts) {
      logger.logDebug('ATT.private.RTCManager: resumeCall');
      logger.logTrace('resumeCallOpts', resumeCallOpts);

      var data,
        headers;

      if (undefined === resumeCallOpts) {
        throw new Error('No options provided');
      }
      if (undefined === resumeCallOpts.callId) {
        throw new Error('No callId provided');
      }
      if (undefined === resumeCallOpts.sessionId) {
        throw new Error('No sessionId provided');
      }
      if (undefined === resumeCallOpts.token) {
        throw new Error('No token provided');
      }
      if (undefined === resumeCallOpts.description) {
        throw new Error('No sdp provided');
      }
      if (undefined === resumeCallOpts.breed) {
        throw new Error('No breed provided');
      }
      if (undefined === resumeCallOpts.onSuccess) {
        throw new Error('No success callback provided');
      }
      if (undefined === resumeCallOpts.onError) {
        throw new Error('No error callback provided');
      }

      headers = {
        Authorization: resumeCallOpts.token,
        options: {}
      };

      if ('conference' === resumeCallOpts.breed) {
        data = {
          conferenceModifications: {
            sdp: resumeCallOpts.description.sdp,
            type: resumeCallOpts.description.type
          }
        };

        headers.options['x-conference-action'] = 'initiate-resume';
      } else {
        data = {
          callsMediaModifications: {
            sdp: resumeCallOpts.description.sdp,
            type: resumeCallOpts.description.type
          }
        };

        headers.options['x-calls-action'] = 'initiate-call-resume';
      }

      logger.logInfo('Attempting to resume the ' + resumeCallOpts.breed);

      resourceManager.doOperation('modifyCall', {
        params: {
          url: {
            sessionId: resumeCallOpts.sessionId,
            type: resumeCallOpts.breed + 's',
            callId: resumeCallOpts.callId
          },
          headers: headers
        },
        data: data,
        success: function (response) {
          logger.logDebug('doOperation(modifyCall): success');
          logger.logInfo('Successfully resuming the ' + resumeCallOpts.breed);
          logger.logTrace('response', response);

          if (response.getResponseStatus() === 204) {
            logger.logTrace('resume request sent...');
            resumeCallOpts.onSuccess();
          } else {
            resumeCallOpts.onError();
          }
        },
        error: function (error) {
          logger.logDebug('doOperation(modifyCall): error');
          logger.logError('Error resuming the ' + resumeCallOpts.breed);
          logger.logTrace(error);

          resumeCallOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'resume', 'RTC'));
        }
      });
    }

    function associateE911Id(associateE911IdOpts) {
      logger.logDebug('ATT.private.RTCManager: associateE911Id');
      logger.logTrace('associateE911IdOpts', associateE911IdOpts);

      var associateE911IdData;

      if (undefined === associateE911IdOpts) {
        throw 'Invalid options';
      }
      if (undefined === associateE911IdOpts.token || '' === associateE911IdOpts.token) {
        throw 'No token passed';
      }
      if (undefined === associateE911IdOpts.e911Id || '' === associateE911IdOpts.e911Id) {
        throw 'No e911Id passed';
      }

      if (undefined === associateE911IdOpts.sessionId || '' === associateE911IdOpts.sessionId) {
        throw 'No session Id passed';
      }

      if (undefined === associateE911IdOpts.onSuccess  || typeof associateE911IdOpts.onSuccess !== 'function') {
        throw 'No success callback passed';
      }

      if (undefined === associateE911IdOpts.onError || typeof associateE911IdOpts.onError !== 'function') {
        throw 'No error callback passed';
      }

      associateE911IdData = {
        data: {
          e911Association: {
            e911Id: associateE911IdOpts.e911Id
          }
        },
        params: {
          url: [associateE911IdOpts.sessionId],
          headers: {
            'Authorization': associateE911IdOpts.token
          }
        },
        success: associateE911IdOpts.onSuccess,
        error: function (error) {
          logger.logDebug('doOperation(associateE911Id): error');
          logger.logError('Error associating e911 id with the session');
          logger.logTrace(error);

          associateE911IdOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', 'associateE911Id', 'RTC'));
        }
      };

      logger.logInfo('Attempting to associate the e911Id with session...');

      resourceManager.doOperation('associateE911Id', associateE911IdData);
    }

    function associateToken(associateTokenOpts) {
      logger.logDebug('ATT.private.RTCManager: associateE911Id');
      logger.logTrace('associateTokenOpts', associateTokenOpts);

      if (undefined === associateTokenOpts) {
        throw new Error('No options provided.');
      }
      if (undefined === associateTokenOpts.userId) {
        throw new Error('No userId provided.');
      }
      if (undefined === associateTokenOpts.token) {
        throw new Error('No token provided.');
      }

      logger.logInfo('Attempting to associate token with the user id...');

      resourceManager.doOperation('associateTokenWithUserId', {
        params: {
          url: {
            userId: associateTokenOpts.userId
          },
          headers: {
            'Authorization': associateTokenOpts.token
          }
        },
        success: function () {
          logger.logDebug('doOperation(associateTokenWithUserId): success');
          logger.logInfo('Successfully associated token with user id');

          associateTokenOpts.success();
        },
        error: function (error) {
          logger.logDebug('doOperation(associateTokenWithUserId): error');
          logger.logError('Error associating token with the user id');
          logger.logTrace(error);

          associateTokenOpts.error(error);
        }
      });
    }

    function rejectCall(rejectCallOpts) {
      logger.logDebug('ATT.private.RTCManager: associateE911Id');
      logger.logTrace('rejectCallOpts', rejectCallOpts);

      if (undefined === rejectCallOpts) {
        throw new Error('Invalid options');
      }
      if (undefined === rejectCallOpts.callId || '' === rejectCallOpts.callId) {
        throw new Error('No callId provided');
      }
      if (undefined === rejectCallOpts.breed || '' === rejectCallOpts.breed) {
        throw new Error('No call breed provided');
      }
      if (undefined === rejectCallOpts.sessionId || '' === rejectCallOpts.sessionId) {
        throw new Error('No session Id provided');
      }
      if (undefined === rejectCallOpts.token || '' === rejectCallOpts.token) {
        throw new Error('No token provided');
      }
      if (undefined === rejectCallOpts.onSuccess  || typeof rejectCallOpts.onSuccess !== 'function') {
        throw new Error('No success callback provided');
      }
      if (undefined === rejectCallOpts.onError || typeof rejectCallOpts.onError !== 'function') {
        throw new Error('No error callback provided');
      }

      var operation = 'call' === rejectCallOpts.breed ? 'reject' : 'rejectConference';

      logger.logInfo('Attempting to reject the ' + rejectCallOpts.breed);

      resourceManager.doOperation('deleteCall', {
        params: {
          url: {
            sessionId: rejectCallOpts.sessionId,
            type: rejectCallOpts.breed + 's',
            callId: rejectCallOpts.callId
          },
          headers: {
            'Authorization': rejectCallOpts.token,
            'x-delete-reason': 'reject'
          }
        },
        success: function () {
          logger.logDebug('doOperation(deleteCall): success');
          logger.logInfo('Successfully deleted the ' + rejectCallOpts.breed);
        },
        error: function (error) {
          logger.logDebug('doOperation(deleteCall): error');
          logger.logError('Error deleting the ' + rejectCallOpts.breed);
          logger.logTrace(error);

          rejectCallOpts.onError(errorAtt.createAPIErrorCode(error, 'ATT.rtc.Phone', operation, 'RTC'));
        }
      });
    }

    function transferCall(transferCallOpts) {
      logger.logDebug('ATT.private.RTCManager: transferCall');
      logger.logTrace('transferCallOpts', transferCallOpts);

      if (undefined === transferCallOpts
          || 0 === Object.keys(transferCallOpts).length) {
        throw new Error('No options provided');
      }
      if (undefined === transferCallOpts.callId) {
        throw new Error('No call id provided');
      }
      if (undefined === transferCallOpts.breed) {
        throw new Error('No call breed provided');
      }
      if (undefined === transferCallOpts.sessionId) {
        throw new Error('No session id provided');
      }
      if (undefined === transferCallOpts.token) {
        throw new Error('No token provided');
      }
      if (undefined === transferCallOpts.targetCallId) {
        throw new Error('No target call id provided');
      }
      if (undefined === transferCallOpts.sdp) {
        throw new Error('No sdp provided');
      }
      if (undefined === transferCallOpts.success) {
        throw new Error('No success callback provided');
      }
      if (undefined === transferCallOpts.error) {
        throw new Error('No error callback provided');
      }

      logger.logInfo('Attempting to transfer the ' + transferCallOpts.breed);

      resourceManager.doOperation('transferCall', {
        data: {
          callsMediaModifications: {
            sdp: transferCallOpts.sdp
          }
        },
        params: {
          url: {
            sessionId: transferCallOpts.sessionId,
            type: transferCallOpts.breed + 's',
            callId: transferCallOpts.callId
          },
          headers: {
            Authorization: transferCallOpts.token,
            'x-transferTargetCallId': transferCallOpts.targetCallId
          }
        },
        success: function () {
          logger.logDebug('doOperation(transferCall): success');
          logger.logInfo('Successfully transferred the ' + transferCallOpts.breed);

          transferCallOpts.success();
        },
        error: function (error) {
          logger.logDebug('doOperation(transferCall): error');
          logger.logError('Error transferring the ' + transferCallOpts.breed);
          logger.logTrace(error);

          transferCallOpts.error(error);
        }
      });

    }


    this.on = on;
    this.off = off;
    this.connectSession = connectSession;
    this.disconnectSession = disconnectSession;
    this.connectCall = connectCall;
    this.acceptMediaModifications = acceptMediaModifications;
    this.addParticipant = addParticipant;
    this.removeParticipant = removeParticipant;
    this.disconnectCall = disconnectCall;
    this.refreshSession = refreshSession;
    this.cancelCall = cancelCall;
    this.holdCall = holdCall;
    this.moveCall = moveCall;
    this.resumeCall = resumeCall;
    this.rejectCall = rejectCall;
    this.transferCall = transferCall;
    this.associateE911Id = associateE911Id;
    this.associateToken = associateToken;
  }

  if (undefined === ATT.private) {
    throw new Error('Error exporting `RTCManager`');
  }

  ATT.private.RTCManager = RTCManager;

  ATT.private.rtcManager = (function () {
    var instance,
      resourceManager;

    return {
      getRTCManager: function () {
        if (undefined === instance) {

          resourceManager = factories.createResourceManager(apiConfigs);

          instance = new RTCManager({
            resourceManager: resourceManager
          });
        }
        return instance;
      }
    };

  }());

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global performance, mozRTCPeerConnection, mozRTCSessionDescription,
mozRTCIceCandidate, mozRTCIceCandidate, MediaStream, webkitRTCPeerConnection,
URL*/
/**
 * Adapter.js.
 * From: https://code.google.com/p/webrtc/source/browse/stable/samples/js/base/adapter.js
 */

'use strict';

var RTCPeerConnection = null,
  RTCSessionDescription,
  RTCIceCandidate = null,
  getUserMedia = null,
  attachMediaStream = null,
  reattachMediaStream = null,
  webrtcDetectedBrowser = null,
  webrtcDetectedVersion = null,
  createIceServer;


function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ': ' + text);
}

if (navigator.mozGetUserMedia) {
  console.log('This appears to be Firefox');

  webrtcDetectedBrowser = 'firefox';

  webrtcDetectedVersion = parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

  // The RTCPeerConnection object.
  RTCPeerConnection = mozRTCPeerConnection;

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);

  // Creates iceServer from the url for FF.
  createIceServer = function (url, username, password) {
    var iceServer = null,
      url_parts = url.split(':'),
      turn_url_parts;

    if (url_parts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = { 'url': url };
      return iceServer;
    }

    // It's not STUN, check for TURN

    if (url_parts[0].indexOf('turn') === 0) {
      // Create iceServer with turn url.

      if (webrtcDetectedVersion >= 27) {
        // FF 27 and above supports transport parameters in TURN url,
        // So passing in the full url to create iceServer.
        iceServer = {
          'url': url,
          'credential': password,
          'username': username
        };
        return iceServer;
      }

      // Ignore the transport parameter from TURN url for FF version <27.
      turn_url_parts = url.split('?');

      if (turn_url_parts[1].indexOf('transport=udp') === 0) {
        iceServer = {
          'url': turn_url_parts[0],
          'credential': password,
          'username': username
        };
        return iceServer;
      }

      // Return null for createIceServer if transport===tcp.
      return null;
    }
  };

  // Attach a media stream to an element.
  attachMediaStream = function (element, stream) {
    console.log('Attaching media stream');
    element.mozSrcObject = stream;
    element.play();
  };

  reattachMediaStream = function (to, from) {
    console.log('Reattaching media stream');
    to.mozSrcObject = from.mozSrcObject;
    to.play();
  };

  // Fake get{Video,Audio}Tracks
  if (!MediaStream.prototype.getVideoTracks) {
    MediaStream.prototype.getVideoTracks = function () {
      return [];
    };
  }

  if (!MediaStream.prototype.getAudioTracks) {
    MediaStream.prototype.getAudioTracks = function () {
      return [];
    };
  }
} else if (navigator.webkitGetUserMedia) {
  console.log('This appears to be Chrome');

  webrtcDetectedBrowser = 'chrome';
  webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);

  // Creates iceServer from the url for Chrome.
  var createIceServer = function (url, username, password) {
    var iceServer = null,
      url_parts = url.split(':');
    if (url_parts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = { 'url': url };
    } else if (url_parts[0].indexOf('turn') === 0) {
      // Chrome M28 & above uses below TURN format.
      iceServer = {
        'url': url,
        'credential': password,
        'username': username
      };
    }
    return iceServer;
  };

  // The RTCPeerConnection object.
  RTCPeerConnection = webkitRTCPeerConnection;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);

  // Attach a media stream to an element.
  attachMediaStream = function (element, stream) {
    if (!(element.srcObject === 'undefined')) {
      element.srcObject = stream;
    } else if (!(element.mozSrcObject === 'undefined')) {
      element.mozSrcObject = stream;
    } else if (!(element.src === 'undefined')) {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }
  };

  reattachMediaStream = function (to, from) {
    to.src = from.src;
  };
} else {
  console.log('Browser does not appear to be WebRTC-capable');
}
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150 */
/*global ATT:true, Env:true, getUserMedia*/

(function (app) {
  'use strict';

  var module,
    logManager = ATT.logManager.getInstance(),
    defaultMediaConstraints = { // default to video call
      audio: true,
      video: true
    },
    logger = logManager.getLoggerByName("att.user-media-service");

  logger.logDebug('Loading att.user-media-service');

  module = {
    localMedia: null,
    remoteMedia: null,
    localStream: null,
    remoteStream: null,
    mediaConstraints: null,
    onUserMedia: null,
    onMediaEstablished: null,
    onUserMediaError: null,

    /**
    * Start Call
    * @param {Object} config The configuration
    * @attribute {String} phoneNumber
    * @attribute {HTMLElement} localVideo
    * @attribute {HTMLElement} remoteVideo
    * @attribute {Object} mediaConstraints
    * @attribute {Object} callbacks UI callbacks. Event object will be passed to these callbacks.
    */
    getUserMedia: function (options) {
      logger.logDebug('ATT.UserMediaService: getUserMedia');
      logger.logInfo('Trying to get the user media');
      logger.logTrace(options);

      var that = this;

      this.localMedia = options.localMedia;
      this.remoteMedia = options.remoteMedia;
      this.mediaConstraints = defaultMediaConstraints;
      this.onUserMedia = options.onUserMedia;
      this.onMediaEstablished = options.onMediaEstablished;
      this.onUserMediaError = options.onUserMediaError;

      if (undefined !== options.mediaType) {
        this.mediaConstraints.video = 'audio' !== options.mediaType;
      }

      // get a local stream, show it in a self-view and add it to be sent
      getUserMedia(this.mediaConstraints, that.getUserMediaSuccess.bind(that), function (mediaError) {
        logger.logDebug('getUserMedia: error');
        logger.logError('error getting user media');
        logger.logTrace('mediaError', mediaError);

        var error = ATT.errorDictionary.getSDKError(14000);
        options.onUserMediaError(error);
        logger.logError(error);
      });
    },

    /**
    * getUserMediaSuccess
    * @param {Object} stream The media stream
    */
    getUserMediaSuccess: function (stream) {
      logger.logDebug('getUserMedia: success');
      logger.logInfo('Got the user media.');
      logger.logTrace('stream', stream);

      // call the user media service to show stream
      this.showStream({
        localOrRemote: 'local',
        stream: stream
      });

      // created user media object
      var userMedia = {
        mediaConstraints: this.mediaConstraints,
        localStream: stream
      };

      this.onUserMedia(userMedia);
    },

    /**
     * Attaches media stream to DOM and plays video.
     * @param localOrRemote  Specify either 'local' or 'remote'
     * @param stream The media stream.
     */
    showStream: function (args) {
      logger.logDebug('ATT.UserMediaService: showStream');
      logger.logTrace(args);

      var videoStreamEl;

      try {
        if (args.localOrRemote === 'remote') {
          this.remoteStream = args.stream;
          videoStreamEl = this.remoteMedia;
        } else {
          this.localStream = args.stream;
          videoStreamEl = this.localMedia;
          videoStreamEl.setAttribute('muted', '');
        }

        if (videoStreamEl) {
          videoStreamEl.src = window.URL.createObjectURL(args.stream);

          logger.logInfo('About to play ' + args.localOrRemote + ' stream...');

          videoStreamEl.play();
          if (args.localOrRemote === 'remote') {
            this.onMediaEstablished();
          }
        }
      } catch (e) {
        //get the sdk error
        logger.logError('Error during showStream');
        logger.logTrace(e);
        if (undefined !== this.onUserMediaError
            && 'function' === typeof this.onUserMediaError) {
          this.onUserMediaError(e);
        }
      }
    },

    stopUserMedia: function () {
      logger.logDebug('ATT.UserMediaService: stopUserMedia');
      try {
        if (this.localStream) {
          logger.logInfo('Stopping the local stream...');
          this.localStream.stop();
          this.localStream = null;
          this.localMedia.src = '';
        }
        if (this.remoteStream) {
          logger.logInfo('Stopping the remote stream...');
          this.remoteStream.stop();
          this.remoteStream = null;
          this.remoteMedia.src = '';
        }
      } catch (e) {
        logger.logError('Error stopping local and remote streams');
        logger.logTrace(e);

        //todo get the sdk error
        this.onUserMediaError(e);
      }
    }
  };

  app.UserMediaService = module;
}(ATT));
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150 */
/*global ATT, RTCPeerConnection, RTCSessionDescription*/
(function () {
  'use strict';
  var logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule('att.peer-connection');

  logger.logDebug('Loading att.peer-connection');

  function createPeerConnection(options) {
    logger.logDebug('ATT.private.factories: createPeerConnection');
    logger.logTrace('createPeerConnection.options', options);

    var pc,
      onSuccess,
      onRemoteStream,
      onError,
      mediaConstraint,
      pcConfig = {
        'iceServers': [
          { 'url': 'STUN:74.125.133.127:19302' }
        ]
      };

    if (undefined === options || Object.keys(options).length === 0) {
      logger.logError('No options passed.');
      throw new Error('No options passed.');
    }
    if (undefined === options.stream) {
      logger.logError('No `stream` passed.');
      throw new Error('No `stream` passed.');
    }
    if (undefined === options.mediaType) {
      logger.logError('No `mediaType` passed.');
      throw new Error('No `mediaType` passed.');
    }
    if ('function' !== typeof options.onSuccess) {
      logger.logError('No `onSuccess` callback passed.');
      throw new Error('No `onSuccess` callback passed.');
    }
    onSuccess = options.onSuccess;

    if ('function' !== typeof options.onRemoteStream) {
      logger.logError('No `onRemoteStream` callback passed.');
      throw new Error('No `onRemoteStream` callback passed.');
    }
    onRemoteStream = options.onRemoteStream;

    if ('function' !== typeof options.onError) {
      logger.logError('No `onError` callback passed.');
      throw new Error('No `onError` callback passed.');
    }
    onError = options.onError;

    function processDescription(description, success) {
      logger.logDebug('ATT.private.peer-connection: processDescription');
      logger.logTrace('description', description);

      logger.logInfo('Trying to set the local description...');

      pc.setLocalDescription(description, function () {
        logger.logDebug('processDescription:setLocalDescription: success');
        logger.logInfo('Successfully set the local description during processDescription');

        if (undefined !== success && 'function' === typeof success) {
          success(description);
        }
      }, function (error) { // ERROR setLocal
        logger.logDebug('processDescription:setLocalDescription: error');
        logger.logError('Error during processDescription:setLocalDescription');
        logger.logTrace(error);

        onError(error);
      });
    }

    function createSdpOffer() {
      logger.logDebug('ATT.private.peer-connection: createSdpOffer');
      logger.logInfo('Trying to create an SDP offer...');

      pc.createOffer(function (description) {
        logger.logDebug('createOffer: success');
        logger.logInfo('Successfully created the sdp offer');
        logger.logTrace('local description', description);

        logger.logInfo('Trying to set the local description...');

        pc.setLocalDescription(description, function () {
          logger.logDebug('createOffer:setLocalDescription: success');
          logger.logInfo('Successfully set the local description during createSdpOffer');
        }, function (error) {
          logger.logDebug('createSdpOffer:setLocalDescription: error');
          logger.logError('Error during createSdpOffer:setLocalDescription');
          logger.logTrace(error);

          onError(error);
        });
      }, function (error) { // ERROR createOffer
        logger.logError('Error during createSdpOffer');
        logger.logTrace(error);

        onError(error);
      }, {
        mandatory: mediaConstraint
      });
    }

    function acceptSdpOffer(options) {
      logger.logDebug('ATT.private.peer-connection: acceptSdpOffer');
      logger.logTrace('acceptSdpOffer.options', options);

      try {
        logger.logInfo('Trying to set the remote description...');
        pc.setRemoteDescription(new RTCSessionDescription({
          sdp: options.remoteSdp,
          type: 'offer'
        }), function () {
          logger.logDebug('acceptSdpOffer:setRemoteDescription: success');
          logger.logInfo('Trying to set the create the SDP answer...');

          try {
            pc.createAnswer(function (description) {// SUCCESS
              logger.logDebug('createAnswer: success');
              logger.logInfo('Successfully created the SDP answer');
              logger.logTrace('description.type', description.type);
              logger.logTrace('description.sdp', description.sdp);

              processDescription(description, options.onSuccess);
            }, function (error) {// ERROR createAnswer
              logger.logDebug('createAnswer: error');
              logger.logInfo('Error creating the SDP answer');
              logger.logTrace(error);

              onError(error);
            }, {
              mandatory: mediaConstraint
            });
          } catch (err) {
            logger.logError('Error during acceptSdpOffer:createAnswer');
            logger.logTrace(err);

            throw err;
          }
        }, function (error) {
          logger.logDebug('acceptSdpOffer:setRemoteDescription: error');
          logger.logInfo('Error during acceptSdpOffer:setRemoteDescription');
          logger.logTrace(error);

          onError(error);
        });
      } catch (err) {
        logger.logError('Error during acceptSdpOffer');
        logger.logTrace(err);

        throw err;
      }
    }

    mediaConstraint =  {
      'OfferToReceiveAudio': true,
      'OfferToReceiveVideo': (options.mediaType === 'video')
    };

    try {
      logger.logInfo('Creating the peer connection');

      pc = new RTCPeerConnection(pcConfig);
    } catch (error) {
      logger.logError('Failed to create PeerConnection.');
      logger.logTrace(error);

      throw new Error('Failed to create PeerConnection.');
    }

    pc.addStream(options.stream);
    pc.onaddstream = function (event) {
      onRemoteStream(event.stream);
    };

    if (undefined === options.remoteSdp) {
      options.remoteSdp = null;
    }

    pc.onicecandidate = function (event) {
      logger.logDebug('createPeerConnection: onIceCandidate');
      if (event.candidate) {
        logger.logInfo('Candidate: ' + event.candidate);
      } else {
        logger.logInfo('End of candidates');
        //TODO for Audio only call change video port to ZERO
        onSuccess(pc.localDescription);
      }
    };

    if (null === options.remoteSdp) {
      createSdpOffer();
    } else {
      acceptSdpOffer({
        remoteSdp: options.remoteSdp
      });
    }

    logger.logInfo('Peer connection created');
    logger.logTrace('Peer connection', pc);

    return {
      getLocalDescription: function () {
        return pc.localDescription;
      },
      setRemoteDescription: function (description) {
        pc.setRemoteDescription(new RTCSessionDescription(description), function () {
          logger.logInfo('setRemoteDescription: success');
        }, function (error) {
          logger.logError('setRemoteDescription: error');
          logger.logTrace('setRemoteDescription: error', error);
          onError(error);
        });
      },
      acceptSdpOffer: acceptSdpOffer,
      getRemoteDescription: function () {
        return pc.remoteDescription;
      },
      close: function () {
        pc.close();
        pc = null;
      }
    };
  }

  if (undefined === ATT.private.factories) {
    throw new Error('Error exporting `ATT.private.factories.createPeerConnection`');
  }

  ATT.private.factories.createPeerConnection = createPeerConnection;

}());;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global ATT*/

(function () {
  'use strict';

  var factories = ATT.private.factories,
    enumAtt = ATT.private.enum,
    rtcManagerAtt = ATT.private.rtcManager,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule('att.rtc.call'),
    sdpFilter = ATT.sdpFilter.getInstance();

  logger.logDebug('Loading att.rtc.call...');

  /**
  * Call Prototype
  */
  function Call(options) {
    logger.logDebug('ATT.rtc.Call: Constructor');

    // ===================
    // private properties
    // ===================
    var that = this,
      id,
      peer,
      peerConnection,
      mediaType,
      type,
      breed,
      invitations = {},
      participants = {},
      sessionInfo,
      remoteSdp = null,
      localStream = null,
      remoteStream = null,
      state = null,
      codec = [],
      canceled = false,
      rejected = false,
      emitter = factories.createEventEmitter(),
      rtcManager = rtcManagerAtt.getRTCManager(),
      lastModID = '';

    // ================
    // Private methods
    // ================
    function createEventData() {
      var data = {
        timestamp: new Date(),
        mediaType: mediaType
      };

      if (undefined !== codec) {
        data.codec = codec;
      }
      if (type === enumAtt.CALL_TYPE.OUTGOING) {
        data.to = peer;
      } else if (type === enumAtt.CALL_TYPE.INCOMING) {
        data.from = peer;
      }
      if (Object.keys(invitations).length > 0) {
        data.invitations = invitations;
      }
      if (Object.keys(participants).length > 0) {
        data.participants = participants;
      }

      return data;
    }

    function getState() {
      return state;
    }

    function setState(newState) {
      state = newState;
      emitter.publish(state, createEventData.call(this));
    }

    function setParticipant(modId, status) {
      var key,
        username,
        participant,
        invites = that.invitations();

      for (key in invites) {
        if (invites.hasOwnProperty(key)) {
          username = invites[key];
          if (modId === username.id) {
            participant = username.invitee;
            participants[participant] = {
              participant: participant,
              status: status
            };
            emitter.publish('invite-accepted', createEventData());
          }
        }
      }
    }

    function setInvitee(invitee, modId, status) {
      invitations[invitee] = {
        invitee: invitee,
        id: modId,
        status: status
      };
    }

    function updateInvitee(modId, status) {
      var key,
        username,
        invite,
        invites = that.invitations();

      for (key in invites) {
        if (invites.hasOwnProperty(key)) {
          username = invites[key];
          if (modId === username.id) {
            invite = username.invitee;
            invitations[invite].status = status;
          }
        }
      }
    }

    function extractUser(username) {

      username.toString();

      if (username.indexOf('tel') > -1) {
        return username.split('+')[1];
      }
      if (username.indexOf('sip') > -1) {
        return username.split(':')[1].split('@')[0];
      }
      return username;
    }

    function onModReceived(data) {

      logger.logTrace('modificationId', data.modificationId);
      logger.logTrace('remoteSdp', data.remoteSdp);

      lastModID = data.modificationId;

      if (undefined !== data.remoteSdp) {

        /** TODO: START - FCD Workaround Pt. 2 -  START **/

        /**
         // TODO: DON'T even try to accept the incoming SDP, instead just
         // accept the Call Modification, see below.

         // TODO: Workaround for DE71395:
         // There is some inconsistency with IIP with stripping
         // these values out before it reaches the other peer
         // for the move operation. This causes Chrome to crash
         // See: tools.ietf.org/html/rfc4585#section-6.2.1
         var modifiedRemoteSDP;
         modifiedRemoteSDP = sdpFilter.removeSDPAttribute('rtcp-fb:100 nack', data.remoteSdp);

         modifiedRemoteSDP = sdpFilter.setupActivePassive(modifiedRemoteSDP);
         peerConnection.acceptSdpOffer({
          remoteSdp: modifiedRemoteSDP,
          onSuccess: function (description) {
            logger.logDebug('acceptSdpOffer: onSuccess');
            logger.logInfo('Successfully accepted SDP offer');
            logger.logTrace('local description', description);

            rtcManager.acceptMediaModifications({
              sessionId: sessionInfo.sessionId,
              token: sessionInfo.token,
              callId: id,
              breed: breed,
              sdp: description.sdp,
              modId: lastModID
            });

            lastModID = '';
          }
        });
         **/

          // TODO: Completely disregard the incoming SDP:
          // `data.remoteSdp` since `RTCPeerConnection.setRemoteDescription`
          // fails to honor the new value `sendrecv` for the `a=` attribute.
          // See: att.session.js:onInvitationReceived for Pt. 1 of the Workaround
          // TODO: This behavior is inconsistent with the Offer/Answer model
          // explained in the RFC for SDP: See http://tools.ietf.org/html/rfc3264)
        rtcManager.acceptMediaModifications({
          sessionId: sessionInfo.sessionId,
          token: sessionInfo.token,
          callId: id,
          breed: breed,
          sdp: peerConnection.getLocalDescription().sdp,
          modId: lastModID
        });
        lastModID = '';
        /** TODO: END - FCD Workaround Pt. 2 - END **/
      }
    }

    function onModTerminated(modifications) {
      logger.logDebug('onModTerminated');
      logger.logTrace('type', modifications.type);
      logger.logTrace('reason', modifications.reason);
      logger.logTrace('remoteSdp', modifications.remoteSdp);

      if ('success' === modifications.reason
          && 'holding' === state) {
        logger.logInfo('Call is on hold.');
        that.setState('held');
      }

      if ('resuming' === state
          && 'success' === modifications.reason) {
        logger.logInfo('Call is resumed.');
        that.setState('resumed');
      }

      if (undefined !== modifications.remoteSdp) {
        logger.logTrace('setRemoteDescription: using SDP', modifications.remoteSdp);

        // This fixes DE71395
        // There is some inconsistency with IIP with stripping
        // these values out before it reaches the other peer
        // for the move operation. This causes Chrome to crash
        // See: tools.ietf.org/html/rfc4585#section-6.2.1
        // modifications.remoteSdp = sdpFilter.removeSDPAttribute('rtcp-fb:100 nack', modifications.remoteSdp);

        if ('connecting' === state) {
          peerConnection.setRemoteDescription({
            sdp: modifications.remoteSdp,
            type: 'answer'
          });
        }
      }

      if ('conference' === modifications.type
          && undefined !== modifications.modificationId) {
        logger.logDebug('onModTerminated:conference');
        if ('success' === modifications.reason) {
          setParticipant(modifications.modificationId, 'active');
        }
        if ('Call rejected' === modifications.reason) {
          updateInvitee(modifications.modificationId, 'rejected');
          emitter.publish('rejected', createEventData());
        }
      }

      if ('success' !== modifications.reason
          && 'Call rejected' !== modifications.reason) {
        emitter.publish('notification', ATT.utils.extend(createEventData(), {
          message: modifications.reason
        }));
      }
    }

    function onSessionOpen(data) {
      logger.logDebug('onSessionOpen');
      logger.logTrace(data);

      if (!data.provisionalSdp) {
        that.setState('connected');
      }

      if (undefined !== data.remoteSdp) {
        that.setRemoteSdp(data.remoteSdp);
        peerConnection.setRemoteDescription({
          sdp: data.remoteSdp,
          type: 'answer'
        });
      }
    }

    function onSessionModified() {
      logger.logDebug('onSessionModified');

      that.setState('connected');

      emitter.publish('stream-added', {
        stream: remoteStream
      });
    }

    function onSessionTerminated(data) {
      logger.logDebug('onSessionTerminated');
      logger.logTrace(data);

      var eventData;

      if (undefined !== data) {
        if ('Call rejected' === data.reason || rejected) {
          setState('rejected');
        } else if ('Call canceled' === data.reason || canceled) {
          setState('canceled');
        } else if (undefined !== data.reason) {
          state = 'disconnected';
          eventData = createEventData();
          eventData.message = data.reason;
          emitter.publish('disconnected', eventData);
        } else {
          if ('created' === state) {
            setState('canceled');
          } else {
            setState('disconnected');
          }
        }
      } else {
        setState('disconnected');
      }

      rtcManager.off(enumAtt.API_EVENT.SESSION_OPEN + ':' + id, onSessionOpen);
      rtcManager.off(enumAtt.API_EVENT.SESSION_MODIFIED + ':' + id, onSessionModified);
      rtcManager.off(enumAtt.API_EVENT.SESSION_TERMINATED + ':' + id, onSessionTerminated);
      rtcManager.off(enumAtt.API_EVENT.MODIFICATION_RECEIVED + ':' + id, onModReceived);
      rtcManager.off(enumAtt.API_EVENT.MODIFICATION_TERMINATED + ':' + id, onModTerminated);

      if (undefined !== peerConnection) {
        peerConnection.close();
        peerConnection = undefined;
      }
    }

    function holdOrMove(flag) {
      var localSdp = that.localSdp(),
        holdOrMoveSdp,
        holdOrMoveOpts;

      logger.logInfo('Modifying SDP for ' + flag);
      holdOrMoveSdp = sdpFilter.modifyForHoldCall(localSdp);
      logger.logTrace(holdOrMoveSdp);

      holdOrMoveOpts = {
        description : holdOrMoveSdp,
        sessionId : sessionInfo.sessionId,
        token : sessionInfo.token,
        breed: breed,
        callId : id,
        onSuccess : function () {
          logger.logDebug(flag + 'Call: onSuccess');
          logger.logInfo('Operation ' + flag + ' on the call was successful');
        },
        onError : function (err) {
          logger.logDebug(flag + 'Call: onError');
          logger.logInfo('Error during ' + flag + ' on the call');
          logger.logTrace(err);

          emitter.publish('error', {
            error: err
          });
        }
      };

      if ('move' === flag) {
        rtcManager.moveCall(holdOrMoveOpts);
        return;
      }
      rtcManager.holdCall(holdOrMoveOpts);
    }

    function registerForRTCEvents() {
      logger.logDebug('ATT.rtc.Call: registerForRTCEvents');
      rtcManager.on(enumAtt.API_EVENT.SESSION_OPEN + ':' + id, onSessionOpen);
      rtcManager.on(enumAtt.API_EVENT.SESSION_MODIFIED + ':' + id, onSessionModified);
      rtcManager.on(enumAtt.API_EVENT.SESSION_TERMINATED + ':' + id, onSessionTerminated);
      rtcManager.on(enumAtt.API_EVENT.MODIFICATION_RECEIVED + ':' + id, onModReceived);
      rtcManager.on(enumAtt.API_EVENT.MODIFICATION_TERMINATED + ':' + id, onModTerminated);
    }

    // ================
    // Public Methods
    // ================
    /**
     *
     * Set the CallId
     * @param {String} callId The callId
     * @param <opt> {Object} data Event data
     */
    function setId(callId) {
      logger.logDebug('ATT.rtc.Call: setId');
      logger.logTrace(callId);

      id  = callId;

      if (id === null) {
        logger.logInfo('disconnecting...');
        setState('disconnected');
      } else {
        logger.logInfo('connecting...');
        setState('connecting');
      }
    }

    function setRemoteSdp(sdp) {
      logger.logDebug('ATT.rtc.Call: setRemoteSdp');
      logger.logTrace('remote sdp', sdp);

      remoteSdp = sdp;
      if (null !== sdp) {
        codec = sdpFilter.getCodecfromSDP(sdp);
        logger.logTrace('codec', codec);
      }
    }

    function on(event, handler) {
      logger.logDebug('ATT.rtc.Call: on');
      logger.logInfo('Subscribing to call event: ' + event);

      if ('connecting' !== event &&
          'response-pending' !== event &&
          'invite-accepted' !== event &&
          'participant-removed' !== event &&
          'canceled' !== event &&
          'rejected' !== event &&
          'connected' !== event &&
          'muted' !== event &&
          'unmuted' !== event &&
          'stream-added' !== event &&
          'error' !== event &&
          'held' !== event &&
          'resumed' !== event &&
          'disconnecting' !== event &&
          'disconnected' !== event &&
          'notification' !== event) {
        throw new Error('Event ' + event + ' not defined');
      }

      emitter.unsubscribe(event, handler);
      emitter.subscribe(event, handler, this);
    }

    function off(event, handler) {
      logger.logDebug('ATT.rtc.Call: off');
      logger.logInfo('Unsubscribing from call event: ' + event);

      emitter.unsubscribe(event, handler);
    }

    function addStream(stream) {
      logger.logDebug('ATT.rtc.Call: addStream');
      logger.logTrace(stream);

      localStream = stream;
    }

    /*
     * Connect the Call
     * Connects the call based on callType(Incoming|Outgoing)
     * @param {Object} The call config
    */
    function connect() {
      logger.logDebug('ATT.rtc.Call: connect');

      var pcOptions;

      function onPeerConnectionSuccess(description) {
        logger.logDebug('createPeerConnection: onSuccess');
        logger.logTrace(description);

        var connectOptions = {
          sessionId: sessionInfo.sessionId,
          token: sessionInfo.token,
          description: description,
          breed : breed,
          onSuccess: function (responsedata) {
            logger.logDebug('connectCall: onSuccess');
            logger.logInfo('Success during connectCall');
            logger.logTrace(responsedata);

            if (enumAtt.CALL_TYPE.INCOMING === type) {
              setState('connecting');
            } else {
              setId(responsedata.id);
              registerForRTCEvents();
            }
          },
          onError: function (err) {
            logger.logDebug('connectCall: onError');
            logger.logError('Error during connectCall');
            logger.logTrace(err);

            emitter.publish('error', {
              error: err
            });
          }
        };

        if (undefined !== id && null !== id) {
          connectOptions.callId = id;
        }

        if (breed === 'call') {
          connectOptions.peer = peer;
        }

        if (canceled) {
          logger.logInfo('Call is being canceled...');
          canceled = false;

          onSessionTerminated({
            reason: 'Call canceled'
          });
          return;
        }

        logger.logInfo('Peer Connection created. Connecting now..');
        rtcManager.connectCall(connectOptions);
      }

      try {
        pcOptions = {
          mediaType: mediaType,
          stream: localStream,
          onSuccess: onPeerConnectionSuccess,
          onError: function (err) {
            logger.logDebug('createPeerConnection: onError');
            logger.logError('Error creating peer connection');
            logger.logTrace(err);

            emitter.publish('error', {
              error: err
            });
          },
          onRemoteStream : function (stream) {
            logger.logDebug('createPeerConnection: onRemoteStream');
            logger.logTrace(stream);

            remoteStream = stream;
            emitter.publish('stream-added', {
              stream: stream
            });
          }
        };

        pcOptions.remoteSdp = remoteSdp;

        logger.logInfo('Trying to create a peer connection...');
        peerConnection = factories.createPeerConnection(pcOptions);

      } catch (err) {
        logger.logError('Error during connectCall');
        logger.logTrace(err);

        emitter.publish('error', {
          error: err
        });
      }
    }

    function addParticipant(invitee) {
      logger.logDebug('ATT.rtc.Call: addParticipant');
      logger.logInfo('adding participant...');
      logger.logTrace(invitee);

      try {
        rtcManager.addParticipant({
          sessionInfo: sessionInfo,
          invitee: invitee,
          confId: id,
          onSuccess: function (modId) {
            logger.logDebug('rtcManager.addParticipant: onSuccess');
            logger.logInfo('Successfully added participant');
            logger.logTrace(modId);

            setInvitee(extractUser(invitee), modId, 'invited');
            emitter.publish('response-pending', createEventData());
          },
          onError: function (err) {
            logger.logDebug('rtcManager.addParticipant: onError');
            logger.logError('Error adding participant');
            logger.logTrace(err);

            emitter.publish('error', err);
          }
        });
      } catch (err) {
        logger.logError('Error adding participant');
        logger.logTrace(err);

        emitter.publish('error', err);
      }
    }

    function removeParticipant(participant) {
      logger.logDebug('ATT.rtc.Call: removeParticipant');
      logger.logTrace(participant);

      try {
        rtcManager.removeParticipant({
          sessionInfo: sessionInfo,
          participant: participant,
          confId: id,
          onSuccess: function () {
            logger.logDebug('rtcManager.removeParticipant: onSuccess');
            logger.logInfo('Successfully removed participant');

            delete that.participants()[participant];
            emitter.publish('participant-removed', createEventData());
          },
          onError: function (err) {
            logger.logDebug('rtcManager.removeParticipant: onError');
            logger.logError('Error removing participant');
            logger.logTrace(err);

            emitter.publish('error', err);
          }
        });
      } catch (err) {
        logger.logError('Error removing participant');
        logger.logTrace(err);

        emitter.publish('error', err);
      }
    }

    function disconnect() {
      logger.logDebug('ATT.rtc.Call: disconnect');

      if ('created' === state ||
          'connecting' === state) {
        logger.logInfo('Canceling...');

        setState('disconnecting');

        canceled = true;

        if (null === id) {
          logger.logInfo('Call connecting not completed yet');
          return;
        }

        logger.logInfo('Call connecting completed. Sending cancel request');
        rtcManager.cancelCall({
          callId: id,
          breed: breed,
          sessionId: sessionInfo.sessionId,
          token: sessionInfo.token,
          onSuccess: function () {
            logger.logDebug('cancelCall: success');
            logger.logInfo('Successfully canceled call');
          },
          onError: function (err) {
            logger.logDebug('cancelCall: onError');
            logger.logError('Error canceling call');
            logger.logTrace(err);

            emitter.publish('error', {
              error: err
            });
          }
        });
      } else if (null !== id) {
        logger.logInfo('Disconnecting...');

        setState('disconnecting');

        rtcManager.disconnectCall({
          sessionId: sessionInfo.sessionId,
          breed: breed,
          token: sessionInfo.token,
          callId: id,
          onSuccess: function () {
            logger.logDebug('disconnectCall: onSuccess');
            logger.logInfo('Successfully disconnected call');
          },
          onError: function (err) {
            logger.logDebug('disconnectCall: onError');
            logger.logError('Error disconnecting call');
            logger.logTrace(err);

            emitter.publish('error', {
              error: err
            });
          }
        });
      }
    }

    function disconnectConference() {
      logger.logDebug('ATT.rtc.Call: disconnectConference');
      logger.logInfo('Disconnecting Conference...');

      setState('disconnecting');

      rtcManager.disconnectCall({
        sessionId: sessionInfo.sessionId,
        token: sessionInfo.token,
        breed: 'conference',
        callId: id,
        onSuccess: function () {
          logger.logDebug('disconnectCall: onSuccess');
          logger.logInfo('Successfully disconnected conference');
        },
        onError: function (err) {
          logger.logDebug('disconnectCall: onError');
          logger.logError('Error disconnecting conference');
          logger.logTrace(err);

          emitter.publish('error', {
            error: err
          });
        }
      });
    }

    function mute() {
      logger.logDebug('ATT.rtc.Call: mute');
      logger.logInfo('Muting call...');

      try {
        if (this.localStream) {
          var audioTracks, i, l;

          audioTracks = this.localStream().getAudioTracks();
          l = audioTracks.length;

          for (i = 0; i < l; i = i + 1) {
            logger.logTrace('audioTracks ' + i, audioTracks[i].enabled);
            audioTracks[i].enabled = false;
          }
          setState('muted');
        }
      } catch (err) {
        logger.logError('Error muting call');
        logger.logTrace(err);

        emitter.publish('error', {
          error: err
        });
      }
    }

    function unmute() {
      logger.logDebug('ATT.rtc.Call: unmute');
      logger.logInfo('Unmuting call...');

      try {
        if (this.localStream) {

          var audioTracks, i, l;
          audioTracks = this.localStream().getAudioTracks();
          l = audioTracks.length;

          for (i = 0; i < l; i = i + 1) {
            logger.logTrace('audioTracks ' + i, audioTracks[i].enabled);
            audioTracks[i].enabled = true;
          }
          setState('unmuted');
        }
      } catch (err) {
        logger.logError('Error unmuting call');
        logger.logTrace(err);

        emitter.publish('error', {
          error: err
        });
      }
    }

    function hold() {
      logger.logDebug('ATT.rtc.Call: hold');
      logger.logInfo('Holding call...');
      state = 'holding';
      holdOrMove('hold');
    }

    function move() {
      logger.logDebug('ATT.rtc.Call: move');
      logger.logInfo('Moving call...');
      holdOrMove('move');
    }

    function resume() {
      logger.logDebug('ATT.rtc.Call: resume');
      logger.logInfo('Resuming call...');

      var localSdp = that.localSdp(),
        resumeSdp;

      resumeSdp = sdpFilter.modifyForResumeCall(localSdp);

      state = 'resuming';

      rtcManager.resumeCall({
        description : resumeSdp,
        sessionId : sessionInfo.sessionId,
        token : sessionInfo.token,
        callId : id,
        breed: breed,
        onSuccess : function () {
          logger.logDebug('resumeCall: onSuccess');
          logger.logInfo('Successfully resumed the call');
        },
        onError : function (err) {
          logger.logDebug('resumeCall: onError');
          logger.logError('Error resuming the call');
          logger.logTrace(err);

          emitter.publish('error', {
            error: err
          });
        }
      });
    }

    function reject() {
      logger.logDebug('ATT.rtc.Call: reject');
      logger.logInfo('Rejecting call...');

      rejected = true;

      rtcManager.rejectCall({
        callId : id,
        sessionId : sessionInfo.sessionId,
        token : sessionInfo.token,
        breed: breed,
        onSuccess : function () {
          logger.logDebug('rejectCall: onSuccess');
          logger.logInfo('Successfully rejected the call');
        },
        onError : function (err) {
          logger.logDebug('rejectCall: onError');
          logger.logError('Error rejecting the call');
          logger.logTrace(err);

          emitter.publish('error', err);
        }
      });
    }

    function transfer(options) {
      logger.logDebug('ATT.rtc.Call: transfer');
      logger.logInfo('Transferring call...');
      logger.logTrace(options);

      rtcManager.transferCall({
        targetCallId: options.targetCallId,
        transfereeSdp: options.transfereeSdp,
        success: function () {
          logger.logDebug('transferCall: success');
          logger.logInfo('Successfully transferred the call');

          options.success();
        },
        error: function (err) {
          logger.logDebug('transferCall: error');
          logger.logError('Error transferring the call');
          logger.logTrace(err);

          options.error(err);
        }
      });
    }

    if (undefined === options
        || 0 === Object.keys(options).length) {
      throw new Error('No input provided');
    }
    if (undefined === options.breed) {
      throw new Error('No breed provided');
    }
    if (options.breed === "call" && undefined === options.peer) {
      throw new Error('No peer provided');
    }
    if (undefined === options.type) {
      throw new Error('No type provided');
    }
    if (undefined === options.mediaType) {
      throw new Error('No mediaType provided');
    }

    // Call attributes
    breed = options.breed;

    if (undefined === options.id) {
      id = null;
    } else {
      id = options.id;
      registerForRTCEvents(); // register for events if the call id is available
    }

    state = 'created';
    peer = options.peer;
    mediaType = options.mediaType;
    type = options.type;
    sessionInfo = options.sessionInfo;

    // ===================
    // public interface
    // ===================
    this.peer = function () {
      return peer;
    };
    this.codec = function () {
      return codec;
    };
    this.mediaType = function () {
      return mediaType;
    };
    this.type = function () {
      return type;
    };
    this.breed = function () {
      return breed;
    };
    this.participants = function () {
      return participants;
    };
    this.invitations = function () {
      return invitations;
    };
    this.sessionInfo = function () {
      return sessionInfo;
    };
    this.id = function () {
      return id;
    };
    this.localSdp = function () {

      if (undefined === peerConnection) {
        return;
      }

      return peerConnection.getLocalDescription();
    };
    this.remoteSdp = function () {
      var description;

      if (undefined === peerConnection) {
        return remoteSdp;
      }
      description = peerConnection.getRemoteDescription();
      return description ? description.sdp : null;
    };
    this.localStream = function () {
      return localStream;
    };
    this.remoteStream = function () {
      return remoteStream;
    };
    this.canceled = function () {
      return canceled;
    };
    this.rejected = function () {
      return rejected;
    };

    this.setRemoteSdp  = setRemoteSdp;
    this.getState = getState;
    this.setState = setState;
    this.setId = setId;
    this.on = on;
    this.off = off;
    this.addStream = addStream;
    this.connect = connect;
    this.disconnect = disconnect;
    this.disconnectConference = disconnectConference;
    this.addParticipant = addParticipant;
    this.removeParticipant = removeParticipant;
    this.mute = mute;
    this.unmute = unmute;
    this.hold = hold;
    this.resume = resume;
    this.move = move;
    this.reject = reject;
    this.transfer = transfer;
  }

  if (undefined === ATT.rtc) {
    throw new Error('Cannot export Call. ATT.rtc is undefined');
  }

  ATT.rtc.Call = Call;

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150*/
/*global cmgmt:true, Logger:true, ATT:true, Env:true*/

//Dependency: ATT.logManager

(function () {
  'use strict';

  var factories = ATT.private.factories,
    enumAtt = ATT.private.enum,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.getLoggerByName("att.rtc.session");

  logger.logDebug('Loading att.rtc.session...');

  /** 
    Creates a new WebRTC Session.
    @class Represents a WebRTC Session.
    @constructor
  */
  function Session() {
    logger.logDebug('ATT.rtc.Session: Constructor');

    var session = this,

      // dependencies
      emitter,
      rtcManager,

      // private attributes
      id = null,
      token = null,
      calls = {};

    // instantiate event emitter
    emitter = factories.createEventEmitter();

    // get the RTC Manager
    rtcManager = ATT.private.rtcManager.getRTCManager();

    function onInvitationReceived(callInfo) {
      logger.logDebug('ATT.rtc.Session: onInvitationReceived');
      logger.logInfo('On getting invitation');
      logger.logTrace('Call information', callInfo);

      var eventName,
        call,
        sendRecvSDP;

      if (null !== session.pendingCall) {
        emitter.publish('notification', {
          from: callInfo.from,
          mediaType: callInfo.mediaType,
          type: callInfo.type,
          timestamp: new Date(),
          message: 'Can only handle one incoming call at a time; ignoring the second incoming call.'
        });
        return;
      }

      if (Object.keys(calls).length >= 2) {
        emitter.publish('notification', {
          from: callInfo.from,
          mediaType: callInfo.mediaType,
          type: callInfo.type,
          timestamp: new Date(),
          message: 'Two calls already in progress, unable to handle a third incoming call.'
        });
        return;
      }

      call = session.createCall({
        breed: callInfo.type,
        id: callInfo.id,
        peer: callInfo.from,
        type: enumAtt.CALL_TYPE.INCOMING,
        mediaType: callInfo.mediaType
      });

      if (undefined !== call) {
        if (callInfo.sdp) {
          /** TODO: START - FCD Workaround Pt. 1: - START **/

          // DON'T set the incoming SDP as-is, see below.
          // call.setRemoteSdp(callInfo.sdp);

          // TODO: Problem: The incoming SDP has `a=sendonly` for FCD devices
          // TODO: Fix: Modify the incoming SDP to have `a=sendrecv`
          // We have to fool the callee into thinking he got `a=sendrecv`
          // for the initial Offer and then we ignore the SDP coming in
          // further Call Modifications. See att.call.js:onModReceived
          // for Pt. 2 of the workaround.
          // TODO: This behavior is inconsistent with the Offer/Answer
          // model explained in the SDP RFC. See: http://tools.ietf.org/html/rfc3264

          sendRecvSDP = callInfo.sdp.replace(/a=sendonly/g, 'a=sendrecv');
          call.setRemoteSdp(sendRecvSDP);

          /** TODO: END - FCD Workaround Pt. 1: the SDP has `a=sendonly` for FCD devices - END **/

        }

        if (call.breed() === 'call') {
          eventName = 'call:incoming';
        } else {
          eventName = 'conference-invite';
        }

        emitter.publish(eventName, {
          from: call.peer(),
          mediaType: call.mediaType(),
          codec: call.codec(),
          timestamp: new Date()
        });
      }
    }

    function off(event, handler) {
      logger.logDebug('ATT.rtc.Session: off');
      logger.logInfo('Unsubscribing the events');
      logger.logTrace('Event', event);

      emitter.unsubscribe(event, handler);
    }

    function on(event, handler) {
      logger.logDebug('ATT.rtc.Session: on');
      logger.logInfo('Subscribing to session event: ' + event);

      if ('ready' !== event &&
          'connecting' !== event &&
          'connected' !== event &&
          'updating' !== event &&
          'needs-refresh' !== event &&
          'notification' !== event &&
          'call:incoming' !== event &&
          'conference-invite' !== event &&
          'call:switched' !== event &&
          'disconnecting' !== event &&
          'disconnected' !== event &&
          'address-updated' !== event &&
          'all-calls-terminated' !== event &&
          'error' !== event) {
        logger.logError('Event ' + event + ' not defined');

        throw new Error('Event ' + event + ' not defined');
      }
      emitter.unsubscribe(event, handler);
      emitter.subscribe(event, handler, this);
    }

    // public attributes
    this.timeout = null;
    this.e911Id = null;
    this.pendingCall = null;
    this.currentCall = null;
    this.timer = null;

    // public methods
    this.on = on.bind(this);

    this.off = off.bind(this);

    this.getToken = function () {
      logger.logDebug('ATT.rtc.Session: getToken');
      logger.logInfo('Getting the token');
      logger.logTrace('Token', token);

      return token;
    };

    this.getId = function () {
      logger.logDebug('ATT.rtc.Session: getId');
      logger.logInfo('Getting the session Id');
      logger.logTrace('getId-Session Id', id);

      return id;
    };

    this.setId = function (sessionId) {
      logger.logDebug('ATT.rtc.Session: setId');
      logger.logInfo('set the session Id');
      logger.logTrace('setId-Session Id', sessionId);

      id = sessionId;

      if (null === sessionId) {
        logger.logDebug('No session Id');

        emitter.publish('disconnected');
        return;
      }

      emitter.publish('connected');
    };

    this.update = function update(options) {
      logger.logDebug('ATT.rtc.Session: update');
      logger.logInfo('Updating the session object');
      logger.logTrace('update-options', options);


      if (options === undefined) {
        logger.logError('No options provided');

        throw new Error('No options provided');
      }

      if (undefined !== options.timeout
          && 'number' !== typeof options.timeout) {
        logger.logError('Error invalid Timeout');

        throw new Error('Timeout is not a number.');
      }

      emitter.publish('updating', options);

      token = options.token || token;
      this.e911Id = options.e911Id || this.e911Id;

      logger.logDebug('Updating the session object successfully');

      if (undefined !== options.timeout) {
        if (options.timeout < 60000) {
          this.timeout = options.timeout;
        } else {
          this.timeout = options.timeout - 60000;
        }

        if (this.timer !== null) {
          clearInterval(this.timer);
        }

        this.timer = setInterval(function () {
          emitter.publish('needs-refresh');

          rtcManager.refreshSession({
            sessionId: id,
            token: token,
            success: function () {
              logger.logDebug('refreshSession: success');
              logger.logInfo('Successfully refreshed the session');
            },
            error: function (error) {
              logger.logDebug('refreshSession: error');
              logger.logInfo('Error refreshing the session');
              logger.logTrace(error);

              emitter.publish('error', {
                error: error
              });
            }
          });
        }, this.timeout);

      }
    };

    this.connect = function connect(options) {
      logger.logDebug('ATT.rtc.Session: connect');
      logger.logTrace('connect-options', options);

      try {
        if (undefined === options) {
          logger.logError('No options passed');

          throw ATT.errorDictionary.getSDKError('2002');
        }
        if (undefined === options.token) {
          logger.logError('No token passed');

          throw ATT.errorDictionary.getSDKError('2001');
        }

        try {
          token = options.token;
          this.e911Id = options.e911Id;

          emitter.publish('connecting');

          session = this;

          logger.logInfo('Connect the session');
          rtcManager.connectSession({
            token: options.token,
            e911Id: options.e911Id,
            onSessionConnected: function (sessionInfo) {
              logger.logDebug('connectSession: onSessionConnected');
              logger.logTrace('Session Information', sessionInfo);

              try {
                session.setId(sessionInfo.sessionId);
                session.update({
                  timeout: sessionInfo.timeout
                });
              } catch (err) {
                logger.logDebug('Error due to rtcManager.connectSession');
                logger.logError(err);

                emitter.publish('error', {
                  error: ATT.errorDictionary.getSDKError('2004')
                });
              }
            },
            onSessionReady: function (data) {
              logger.logDebug('connectSession: onSessionReady');
              logger.logTrace('onSessionReady-data', data);

              emitter.publish('ready', data);

              rtcManager.on('invitation-received:' + id, onInvitationReceived);
            },
            onError: function (error) {
              logger.logDebug('connectSession: onError');
              logger.logError('Error during connectSession');
              logger.logTrace('connectSession: error', error);

              emitter.publish('error', {
                error: error
              });
            }
          });

        } catch (err) {
          logger.logError('Error during connect');
          logger.logTrace('connect: error', err);

          throw ATT.errorDictionary.getSDKError('2004');
        }

      } catch (err) {
        logger.logError('Error during connect');
        logger.logTrace(err);

        emitter.publish('error', {
          error: err
        });
      }
    };

    this.disconnect = function () {
      logger.logDebug('ATT.rtc.Session: disconnect');

      try {
        emitter.publish('disconnecting');

        clearInterval(this.timer);

        logger.logInfo('Disconnect the session');
        rtcManager.disconnectSession({
          sessionId: session.getId(),
          token: session.getToken(),
          e911Id: session.e911Id,
          onSessionDisconnected: function () {
            logger.logDebug('disconnectSession: onSessionDisconnected');

            try {
              session.setId(null);
            } catch (err) {
              emitter.publish('error', {
                error: err
              });
            }
          },
          onError: function (error) {
            logger.logDebug('disconnectSession: onError');
            logger.logError('Error during disconnectSession');
            logger.logTrace('disconnectSession: error', error);

            emitter.publish('error', {
              error: error
            });
          }
        });

      } catch (err) {
        logger.logError('Error during disconnectSession');
        logger.logTrace(err);

        emitter.publish('error', {
          error: err
        });
      }
    };

    this.addCall = function (call) {
      logger.logDebug('ATT.rtc.Session: addCall');
      logger.logInfo('Adding a call in the calls array');
      logger.logTrace('callId', call.id());
      logger.logTrace('Before', calls);

      calls[call.id()] = call;

      logger.logTrace('After', calls);
    };

    this.createCall = function (options) {
      logger.logDebug('ATT.rtc.Session: createCall');
      logger.logInfo('Creating a new call');
      logger.logTrace('CreateCall-options', options);

      var call = new ATT.rtc.Call(ATT.utils.extend(options, {
        sessionInfo: {
          sessionId: this.getId(),
          token: token
        }
      }));

      logger.logTrace('call.peer()', call.peer());
      logger.logTrace('call object', call);

      call.on('connected', function () {
        logger.logDebug('call.on: connected');

        if (null !== session.currentCall) {
          logger.logInfo('Switching the calls...');
          logger.logTrace('From', session.currentCall.peer());
          logger.logTrace('To', session.pendingCall.peer());

          emitter.publish('call:switched', {
            from: session.currentCall.peer(),
            to: session.pendingCall.peer(),
            timestamp: new Date()
          });
        }
        session.currentCall = session.pendingCall;
        session.pendingCall = null;
        session.addCall(session.currentCall);
      });

      call.on('error', function () {
        logger.logDebug('call.on: error');

        if (call === session.pendingCall) {
          logger.logInfo('Deleting pending call');
          logger.logTrace('session.pendingCall.peer', session.pendingCall.peer());
          logger.logTrace('session.pendingCall', session.pendingCall);
          session.pendingCall = null;
        }
      });

      this.pendingCall = call;

      logger.logTrace('call.id', call.id());
      logger.logTrace('call object', call);
      return call;
    };

    this.getCall = function (callId) {
      logger.logDebug('ATT.rtc.Session: getCall');
      logger.logInfo('Getting call by id');
      logger.logTrace('callId', callId);

      return calls[callId];
    };

    this.getCalls = function () {
      logger.logDebug('ATT.rtc.Session: getCalls');
      logger.logInfo('Getting all calls');
      logger.logTrace('calls', calls);

      return calls;
    };

    this.switchTo = function (callId) {
      logger.logDebug('ATT.rtc.Session: switchTo');
      logger.logInfo('Switching to call by callId');
      logger.logTrace('callId', callId);

      if (undefined === callId) {
        logger.logError('You must pass a valid call id');
        throw new Error('You must pass a valid call id');
      }

      if (undefined === calls[callId]) {
        logger.logError('Cannot find call with id ' + callId);
        throw new Error('Cannot find call with id ' + callId);
      }

      emitter.publish('call:switched', {
        from: this.currentCall.peer(),
        to: calls[callId].peer(),
        timestamp: new Date()
      });

      this.currentCall = calls[callId];
      logger.logTrace('currentCall.peer', this.currentCall.peer());
      logger.logTrace('currentCall', this.currentCall);
    };

    this.terminateCalls = function () {
      logger.logDebug('ATT.rtc.Session: terminateCalls');
      logger.logInfo('Terminating all the calls');

      var callId;
      for (callId in calls) {
        if (calls.hasOwnProperty(callId)) {
          logger.logTrace('callId', callId);
          logger.logTrace('call.peer', calls[callId].peer());

          calls[callId].disconnect();
        }
      }
    };

    this.deleteCall = function (callId) {
      logger.logDebug('ATT.rtc.Session: deleteCall');
      logger.logInfo('Deleting a call by callId');
      logger.logTrace('callId', callId);

      if (calls[callId] === undefined) {
        logger.logError('Call not found');
        throw new Error("Call not found");
      }

      logger.logTrace('Call to be deleted', calls[callId]);
      delete calls[callId];

      if (0 === Object.keys(calls).length) {
        emitter.publish('all-calls-terminated');
      }
    };

    this.deletePendingCall = function () {
      logger.logDebug('ATT.rtc.Session: deletePendingCall');
      logger.logInfo('Deleting pending call');

      if (null !== this.pendingCall) {
        logger.logTrace('pendingCall.peer', this.pendingCall.peer());
        logger.logTrace('pendingCall', this.pendingCall);

        this.pendingCall = null;
      }
    };

    this.deleteCurrentCall = function () {
      logger.logDebug('ATT.rtc.Session: deleteCurrentCall');
      logger.logInfo('Deleting current call');

      if (null !== this.currentCall) {
        logger.logTrace('currentCall.peer', this.currentCall.peer());
        logger.logTrace('currentCall', this.currentCall);

        this.deleteCall(this.currentCall.id());
        this.currentCall = null;
      }
    };

    this.associateE911Id = function (options) {
      logger.logDebug('ATT.rtc.Session: associateE911Id');
      logger.logInfo('Associating E911 ID');
      logger.logTrace('associateE911Id.options', options);

      rtcManager.associateE911Id(ATT.utils.extend(options, {
        sessionId: this.getId(),
        token: this.getToken(),
        onSuccess : function () {
          logger.logDebug('associateE911Id: onSuccess');
          logger.logInfo('Successfully associated E911 ID');

          emitter.publish('address-updated');
        },
        onError : function (error) {
          logger.logDebug('associateE911Id: onError');
          logger.logError('Error during associating E911 ID');
          logger.logTrace(error);

          emitter.publish('error', {
            error: error
          });
        }
      }));

    };

  }

  if (undefined === ATT.rtc) {
    throw new Error('Cannot export Session. ATT.rtc is undefined');
  }
  ATT.rtc.Session = Session;

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150 */
/*global ATT:true, RESTClient, Env, cmgmt */
/**
 *  The WebRTC DHS module.
 */

(function () {
  'use strict';

  var logManager = ATT.logManager.getInstance(),
    logger = logManager.getLoggerByName("rtc.dhs");

  /**
   * Simple validator for physical address object.
   * Todo: validator module.
   * @param addressObject
   */
  function validateAddress(addressObject) {
    logger.logDebug('ATT.rtc.dhs: validateAddress');
    logger.logInfo('Validating the address');
    logger.logTrace(addressObject);

    var retVal = true,
      key,
      fields;

    fields = {
      first_name: true,
      last_name: true,
      house_number: true,
      street: true,
      unit: false,
      city: true,
      state: true,
      zip: true,
      is_confirmed: true
    };

    if (typeof addressObject !== 'object') {
      return false;
    }

    if (Object.keys(addressObject).length === 0) {
      return false;
    }

    for (key in fields) {
      if (fields.hasOwnProperty(key)) {
        logger.logTrace('Address Fields', key);

        if (fields[key]
            && undefined === addressObject[key]) {
          return false;
        }

        if (fields[key]
            && 0 === addressObject[key].length) {
          return false;
        }
      }
    }

    logger.logTrace(retVal);
    return retVal;
  }

  /**
   * @summary Create an Access Token using AT&T's OAuth for mobile number, virtual number and account id users.
   * @description
   * This methods accepts a `app_scope` and creates the `access token` for that particular `app_scope`.
   * Accepted values for `app_scope` are:
   *
   * - MOBILE_NUMBER
   *
   * - VIRTUAL_NUMBER
   *
   * - ACCOUNT_ID
   *
   * - E911
   *
   * For mobile number user, the method requires an additional param `auth_code` for the authorization code
   * obtained during the consent flow.
   *
   * @function createAccessToken
   * @static
   * @memberOf ATT.rtc.dhs
   * @param {Object} options
   * @param {String} options.app_scope Application scope for getting access token
   * @param {String} [options.auth_code] Authorization Code from user consent for mobile number user.
   * @param {Function} options.success
   * @param {Function} options.error
   *
   *
   * @example
   * // Create access token using DHS
   * var success = function () {...};
   * var error = function () {...};
   * ATT.rtc.dhs.createAccessToken({
   *   app_scope: 'E911',
   *   success: success,
   *   error: error
   * });
   *
   * @example
   * // Create access token using DHS
   * var success = function () {...};
   * var error = function () {...};
   * ATT.rtc.dhs.createAccessToken({
   *   app_scope: 'MOBILE_NUMBER',
   *   auth_code: 'auth_code_from_consent_flow'
   *   success: success,
   *   error: error
   * });
   *
   */
  function createAccessToken(options) {
    logger.logDebug('ATT.rtc.dhs: createAccessToken');
    logger.logTrace(options);

    if (undefined === options
        || 0 === Object.keys(options).length) {
      logger.logError('No options provided');
      throw new Error('No options provided');
    }
    if (undefined === options.app_scope) {
      logger.logError('No scope provided');
      throw new Error('No scope provided');
    }

    if (options.app_scope !== 'MOBILE_NUMBER'
        && options.app_scope !== 'ACCOUNT_ID'
        && options.app_scope !== 'VIRTUAL_NUMBER'
        && options.app_scope !== 'E911') {

      logger.logError('Invalid scope provided');
      throw new Error('Invalid scope provided');
    }

    if (options.app_scope === 'MOBILE_NUMBER'
        && undefined === options.auth_code) {
      logger.logError('No auth_code provided');
      throw new Error('No auth_code provided');
    }

    var appConfig = ATT.private.config.app.getAppConfiguration(),
      dhs_endpoint = appConfig.dhs_https_url,
      rc;

    if (undefined === dhs_endpoint) {
      logger.logError('Cannot create E911 id. Cannot locate DHS endpoint');
      throw new Error('Cannot create E911 id. Cannot locate DHS endpoint');
    }

    logger.logInfo('Creating the access token using the DHS...');
    rc = new ATT.RESTClient({
      method: 'POST',
      url: dhs_endpoint + '/tokens',
      data: {
        app_scope: options.app_scope,
        auth_code: options.auth_code
      },
      success: function (response) {
        logger.logDebug('POST /tokens:success');
        logger.logInfo('Successfully create the access token');
        logger.logTrace(response);

        options.success(response.getJson());
      },
      error: function (error) {
        logger.logDebug('POST /tokens:error');
        logger.logError('Error creating the access token');
        logger.logTrace(error.getJson());

        options.error(error.getJson());
      }
    });

    rc.ajax();
  }

  /**
   * @summary
   * Creates a new E911 Id using an `e911` scope access token and an address
   * @desc
   * E911 Id is required for mobile number and virtual number user for creating enhanced webrtc session.
   * Use this function to create an E911 Id that can be used for creating the enhanced webrtc session
   * for mobile number and virtual number users.
   * This method requires an access token obtained using `E911` auth_scope and a physical address with
   * these `string` fields:
   *
   * - first_name
   *
   * - last_name
   *
   * - house_number
   *
   * - street
   *
   * - unit (optional)
   *
   * - city
   *
   * - state
   *
   * - zip
   *
   * - is_confirmed (true or false)
   *
   * @memberof ATT.rtc.dhs
   * @static
   * @param {Object} options
   * @param {Object} options.token Access token
   * @param {Object} options.address Address object
   * @param {String} options.first_name First name
   * @param {String} options.last_name Last name
   * @param {String} options.house_number House number
   * @param {String} options.street Street name
   * @param {String} [options.unit] Unit/Apt./Suite number
   * @param {String} options.city City
   * @param {String} options.state State
   * @param {String} options.zip Zip code
   * @param {String} options.is_confirmed Confirm that the address exists (even if not found in the database)
   * @param {Function} options.success Success callback
   * @param {Function} options.error Failure callback
   *
   * @example
   * // Create E911 id using DHS
   * var success = function () {...};
   * var error = function () {...};
   * ATT.rtc.dhs.createAccessToken({
   *   token: 'e911_id_scoped_access_token',
   *   address: {
   *    first_name: 'John',
   *    last_name: 'Doe',
   *    house_number: '1111',
   *    street: 'ABC Street',
   *    city: 'Seattle',
   *    state: 'WA',
   *    zip: '98001'
   *    is_confirmed: 'false'
   *   },
   *   success: success,
   *   error: error
   * });
   *
   */
  function createE911Id(options) {
    logger.logDebug('ATT.rtc.dhs: createE911Id');
    logger.logTrace('options', options);

    if (undefined === options
        || 0 === Object.keys(options).length) {
      logger.logError('No options provided');
      throw new Error('No options provided');
    }
    if (undefined === options.token) {
      logger.logError('No token provided');
      throw new Error('No token provided');
    }
    if (undefined === options.address) {
      logger.logError('No address provided');
      throw new Error('No address provided');
    }
    if (!validateAddress(options.address)) {
      logger.logError('Invalid address provided');
      throw new Error('Invalid address provided');
    }

    var appConfig = ATT.private.config.app.getAppConfiguration(),
      dhs_endpoint = appConfig.dhs_https_url,
      data,
      rc;

    if (undefined === dhs_endpoint) {
      logger.logError('Cannot create E911 id. Cannot locate DHS endpoint');
      throw new Error('Cannot create E911 id. Cannot locate DHS endpoint');
    }

    data = options.address;
    data.access_token = options.token;

    logger.logInfo('Attempting to create the e911 id using the DHS...');

    // Call DHS to create an e911 id linked address for the user
    rc = new ATT.RESTClient({
      method: 'POST',
      url: dhs_endpoint + '/e911ids',
      data: data,
      success: function (response) {
        logger.logDebug('POST /e911ids: success');
        logger.logInfo('Successfully created the e911 id');
        logger.logTrace(response);

        options.success(response.getJson());
      },
      error: function (error) {
        logger.logDebug('POST /e911ids: error');
        logger.logError('Error creating the e911 id');
        logger.logTrace(error.getJson());

        options.error(error.getJson());
      }
    });

    rc.ajax();
  }

  if (undefined === ATT.rtc) {
    throw new Error('Error exporting ATT.rtc.dhs');
  }

  /**
  * **Note: This API is only usable if you use the built-in DHS provided with the SDK.**
  *
  * The `dhs` namespace provides a client API for using our optional DHS RESTful API.
  * The DHS RESTful API allows you to perform the following actions:
  *
  * - Create access tokens using AT&T's OAuth
  * - Create E911 Ids using AT&T's OAuth and API
  * @namespace ATT.rtc.dhs
  */
  ATT.rtc.dhs = {
    createAccessToken: createAccessToken,
    createE911Id: createE911Id
  };

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150 */
/*global ATT*/

(function () {
  'use strict';

  var factories = ATT.private.factories,
    enumAtt = ATT.private.enum,
    logManager = ATT.logManager.getInstance(),
    logger = logManager.addLoggerForModule('ATT.rtc.Phone');

  logger.logDebug('Loading att.rtc.phone...');

  /**
   * @class
   * Represents the private class Phone.
   * @summary
   * Creates a new instance of the private class Phone.
   * @desc
   * The private class `Phone` cannot be accessed directly. To get an instance of the `Phone` use the
   * method `ATT.rtc.Phone.getPhone`.
   * The singleton `Phone` object exposes public methods (listed below) that can be used for performing
   * different call and conference related operations.
   * The `Phone` object fires events that can be subscribed to for taking appropriate action based
   * on the fired event
   *
   * @global
   * @private
   * @constructor
   *
   * @fires Phone#call:incoming
   * @fires Phone#conference:invitation-received
   * @fires Phone#session:call-switched
   * @fires Phone#notification
   * @fires Phone#error
   *
   */
  function Phone() {

    var emitter = factories.createEventEmitter(),
      session = new ATT.rtc.Session(),
      errorDictionary = ATT.errorDictionary,
      userMediaSvc = ATT.UserMediaService;

    logger.logDebug('ATT.rtc.Phone: Constructor');
    logger.logInfo('Creating a new instance of Phone');

    function stopUserMedia() {
      logger.logDebug('ATT.rtc.Phone: stopUserMedia');
      // stops the User Media Stream
      if (0 ===  Object.keys(session.getCalls()).length) {
        userMediaSvc.stopUserMedia();
      }
    }

    function getError(errorNumber) {
      return errorDictionary.getSDKError(errorNumber);
    }

    function publishError(errorNumber, data) {
      logger.logDebug('ATT.rtc.Phone: publishError');

      var error = getError(errorNumber),
        errorInfo = {};

      if (undefined === error) {
        errorInfo.error = 'TODO: Error not in dictionary';
      } else {
        errorInfo.error = error;
      }

      if (undefined !== data) {
        errorInfo.data = JSON.stringify(data);
      }

      logger.logTrace('error', JSON.stringify(errorInfo));
      emitter.publish('error', errorInfo);
    }

    session.on('call:incoming', function (data) {
      logger.logDebug('session.on: call:incoming');
      logger.logInfo('call:incoming event  by ATT.rtc.Phone');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#call:incoming
       * @summary
       * Call incoming event fires when a there is an incoming call
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} from - The phone number/id of the calling party.
       * @property {String} mediaType - The media type of the incoming call (audio/video).
       * @property {Array} codec - The CODECs associated with the incoming call.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('call:incoming', data);

      function onPendingCallCancel(pendingCall) {
        if (null !== session.pendingCall &&
            pendingCall.id() === session.pendingCall.id()) {
          emitter.publish('call:canceled', data);
          pendingCall.off('canceled', onPendingCallCancel);

          logger.logInfo('Deleting canceled pending call');
          logger.logTrace(pendingCall.peer(), pendingCall);
          session.deletePendingCall();
          stopUserMedia();
        }
      }

      function onPendingCallDisconnected(pendingCall) {
        if (null !== session.pendingCall &&
            pendingCall.id() === session.pendingCall.id()) {
          emitter.publish('call:disconnected', data);
          pendingCall.off('disconnected', onPendingCallDisconnected);

          logger.logInfo('Deleting disconnected pending call');
          logger.logTrace(pendingCall.peer(), pendingCall);
          session.deletePendingCall();
          stopUserMedia();
        }
      }

      if (session.pendingCall) {
        logger.logTrace(session.pendingCall.peer(), session.pendingCall);
        session.pendingCall.on('canceled', onPendingCallCancel.bind(null, session.pendingCall));

        session.pendingCall.on('disconnected', onPendingCallDisconnected.bind(null, session.pendingCall));
      }
    });

    session.on('conference-invite', function (data) {
      logger.logDebug('session.on: conference-invite');
      logger.logInfo('conference:invitation-received event by ATT.rtc.Phone');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#conference:invitation-received
       * @summary
       * Conference invitation received event fires when a there is an incoming conference invite
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} from - The phone number/id of the calling party.
       * @property {String} mediaType - The media type of the incoming call (audio/video).
       * @property {Array} codec - The CODECs associated with the incoming call.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('conference:invitation-received', data);
    });

    session.on('call:switched', function (data) {
      logger.logDebug('session.on: call:switched');
      logger.logInfo('session:call-switched event by ATT.rtc.Phone');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#session:call-switched
       * @summary
       * Call switched event fires when the calls are switched
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * There needs to be two calls in context in order to be able to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} from - The phone number/id of the peer of the call switched from.
       * @property {String} to - The phone number/id of the peer of the call switched to.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('session:call-switched', data);
    });

    session.on('notification', function (data) {
      logger.logDebug('session.on: notification');
      logger.logInfo('notification event by ATT.rtc.Phone');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#notification
       * @summary
       * Notification event fires when the SDK is unable to support a behavior that is not an error
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} message - A message for the notification.
       * @property {String} [from] - The phone number/id of the calling party.
       * @property {String} [to] - The phone number/id of the called party.
       * @property {String} [mediaType] - The media type of the call (audio/video).
       * @property {Array} [codec] - The CODECs associated with the call.
       * @property {Date} timestamp - Event fire time.
       * */
      emitter.publish('notification', data);
    });

    session.on('error', function (data) {
      logger.logDebug('session.on: error');
      logger.logError("error event by ATT.rtc.Phone");
      logger.logTrace('data', data);

      /**
       * @event
       * Phone#error
       * @summary
       * Error event fires there is an invalid behavior reported by the `Phone` object
       * @desc
       * The error event can be fired by the `Phone` for different reasons:
       *
       *  - **API Error** - is an error at the platform (RESTful API) level. This may
       *  be due to invalid parameters send in an HTTP request or a request being
       *  send while in an inconsistent state.
       *  - **SDK Error** - is an error most likely due to an inconsistent state in the
       *  client JavaScript library at the browser level.
       *
       * Sometimes different errors can be caused by the same underlying problem
       * in which case a common error code is used. The next is a list of the common
       * API error codes:
       *
       * **Common API Error Codes**
       *
       *   - 2500 - System error occurred
       *   - 2501 - Mandatory parameter is missing in the Request.
       *   - 2502 - Invalid values provided for a parameter in the Request.
       *   - 2508 - Access token is invalid.
       *   - 2509 - Access Token is incorrect or in valid.
       *   - 2510 - Not implemented
       *   - 2511 - User has not been provisioned for Enhanced WebRTC
       *   - 500,502,503,504 - <method name> failed - Unable to complete requested operation
       *
       *
       * The user has to be logged in order to be able to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {Object} error Error object
       * @property {String} error.JSObject Javascipt object associated with the error
       * @property {String} error.JSMethod Javascript method associated with the error
       * @property {String} error.ErrorCode Error code associated with the error
       * @property {String} error.ErrorMessage Message associated with the error
       * @property {String} error.PossibleCauses Possible causes
       * @property {String} error.PossibleResolution Possible resolution
       * @property {String} error.APIError API error associated with the error
       * @property {String} error.ResourceMethod Resouce method associated with the error
       * @property {String} error.HttpStatusCode HTTP status code associated with the error
       * @property {String} error.MessageId API message id associated with the error
       * @property {Object} [data] Additional information associated with the error

       */
      emitter.publish('error', data);
    });

    function validOperation(operationName, callState) {
      var operations,
        i;

      logger.logDebug('ATT.rtc.Phone: validOperation');
      logger.logTrace('Operation', operationName);
      logger.logTrace('State', callState);

      operations = {
        mute: ['connected', 'resumed', 'unmuted'],
        unmute: ['resumed', 'muted'],
        resume: ['held'],
        hold: ['connected', 'resumed', 'muted', 'unmuted']
      };

      for (i = 0; i < operations[operationName].length; i += 1) {
        if (callState === operations[operationName][i]) {
          return true;
        }
      }

      return false;
    }

    function onCallDisconnected(call, data) {
      var calls,
        keys;

      logger.logDebug('ATT.rtc.Phone: onCallDisconnected');
      logger.logInfo('call:disconnected event by ATT.rtc.Phone');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#call:disconnected
       * @summary
       * Call disconnected event fires when a call has been disconnected by the other party
       * or by the API
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * There should be an existing call in progress in order to be able to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} [from] - The phone number/id of the calling party for incoming calls.
       * @property {String} [to] - The phone number/id of the called party for outgoing calls.
       * @property {String} mediaType - The media type of the call (audio/video).
       * @property {Array} codec - The CODECs associated with the call.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('call:disconnected', data);


      if (session.currentCall &&
          call.id() === session.currentCall.id()) {

        logger.logInfo('Deleting current call');

        session.deleteCurrentCall();

        calls = session.getCalls();

        stopUserMedia();

        keys = Object.keys(calls);
        logger.logTrace('Remaining background calls', keys.length);

        if (keys.length > 0) {
          logger.logInfo('Setting background call as current call');

          session.currentCall = calls[keys[0]];
          if ('held' === session.currentCall.getState() &&
              session.currentCall.autoresume) {

            logger.logInfo('Resuming current call');
            logger.logTrace(session.currentCall.peer(), session.currentCall);

            session.currentCall.resume();
          }
        }
        return;
      }

      if (session.pendingCall &&
          call.id() === session.pendingCall.id()) {

        logger.logInfo('Deleting pending call');
        logger.logTrace(session.pendingCall.peer(), session.pendingCall);

        session.deletePendingCall();
        stopUserMedia();
        return;
      }

      logger.logInfo('Deleting background call');
      logger.logTrace(call.peer(), call);

      // Delete the background call
      session.deleteCall(call.id());
      stopUserMedia();
    }

    function onCallCanceled(data) {
      logger.logDebug('call.on: canceled');
      logger.logInfo('call:canceled event by ATT.rtc.Phone');
      logger.logTrace('data', data);

      /**
       * @event
       * Phone#call:canceled
       * @summary
       * Call canceled event fires when an outgoing call is canceled successfully or
       * when an incoming call is canceled by the calling party
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * There should be an unestablished incoming or outgoing call in order to be able
       * to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} [to] - The phone number/id of the called party.
       * @property {String} [from] - The phone number/id of the calling party.
       * @property {String} mediaType - The media type of the call (audio/video).
       * @property {Array} [codec] - The CODECs associated with the call.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('call:canceled', data);
      session.deletePendingCall();
      stopUserMedia();
    }

    function onCallRejected(data) {
      logger.logDebug('call.on: rejected');
      logger.logInfo('call:rejected event by ATT.rtc.Phone');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#call:rejected
       * @summary
       * Call rejected event fires when an outgoing call is rejected by the called party or
       * when an incoming call is rejected by the user successfully
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * There should be an unestablished incoming or outgoing call in order to be able
       * to receive this event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} [to] - The phone number/id of the called party.
       * @property {String} [from] - The phone number/id of the calling party.
       * @property {String} mediaType - The media type of the call (audio/video).
       * @property {Array} [codec] - The CODECs associated with the call.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('call:rejected', data);
      session.deletePendingCall();
      stopUserMedia();
    }

    function onSessionReady(data) {
      logger.logDebug('ATT.rtc.Phone: onSessionReady');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#session:ready
       * @summary
       * Session ready event fires when the user is successfully logged in and the SDK is
       * initialized and ready to make, receive calls
       * @desc
       * The event is fired if the user logs in successfully and an enhanced webrtc session
       * is created successfully
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} sessionId - The id associated with the enhanced webrtc session.
       */
      emitter.publish('session:ready', data);
    }

    function onSessionDisconnected(data) {
      logger.logDebug('ATT.rtc.Phone: onSessionDisconnected');
      logger.logTrace('data', data);
      /**
       * @event
       * Phone#session:disconnected
       * @summary
       * Session disconnected event fires when the session was successfully disconnected.
       * @desc
       * The event is fired if the user logs out successfully and the enhanced webrtc session
       * is deleted successfully. User can no longer make or recieve calls.
       */
      emitter.publish('session:disconnected', data);
      userMediaSvc.stopUserMedia();

      session.off('ready', onSessionReady);
      session.off('disconnected', onSessionDisconnected);

      //TODO: this is an intermediate solution, Need to hangup any existing calls before doing this.
      session.deletePendingCall();
      session.deleteCurrentCall();

      var callId, calls;
      calls = session.getCalls();

      for (callId in calls) {
        if (calls.hasOwnProperty(callId)) {
          session.deleteCall(callId);
        }
      }
    }


    /**
     * @method
     * cleanPhoneNumber
     * @summary
     * Cleans a phone number.
     * @desc
     * A utility method used to convert alphanumeric characters to a valid phone number.
     * Note: Will ignore email formatted input
     * @memberOf Phone
     * @public
     * @instance
     * @param {String} Input phone number
     * @returns {String} Converted number if its valid
     * @returns {Boolean} `false` otherwise.
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.cleanPhoneNumber('1800CALFEDE'); //1 (123) 123-1234
     */
    function cleanPhoneNumber(number) {
      logger.logDebug('ATT.rtc.Phone: cleanPhoneNumber');

      try {
        logger.logInfo('Attempting to clean the phone number ' + number);
        return ATT.phoneNumber.cleanPhoneNumber(number);
      } catch (err) {
        logger.logError('Error during cleanPhoneNumber');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * formatNumber
     * @summary
     * Formats a phone number.
     * @desc
     * A utility method used to to format a valid 10 digit phone number.
     * @memberOf Phone
     * @public
     * @instance
     * @param {String} Input phone number
     * @returns {String} Formatted phone number
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.formatNumber('9234567890'); // 1 (923) 456-7890
     */
    function formatNumber(number) {
      logger.logDebug('ATT.rtc.Phone: formatNumber');

      try {
        logger.logInfo('Attempting to format the phone number ' + number);
        return ATT.phoneNumber.formatNumber(number);
      } catch (err) {
        logger.logError('Error during formatNumber');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * on
     * @summary
     * Subscribe to event on Phone.
     * @desc
     * Method to subscribe to events fired by `Phone` object.
     * @memberOf Phone
     * @public
     * @instance
     * @param {String} event Event name
     * @param {Function} handler Event handler
     * @throws {String} Event 'event_name' not defined
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.on('session:ready', function (data) {
     *    // ... do something
     * });
     */
    function on(event, handler) {
      logger.logDebug('ATT.rtc.Phone: on');
      logger.logInfo('Subscribing to phone event: ' + event);

      if ('session:ready' !== event
          && 'session:disconnected' !== event
          && 'session:call-switched' !== event
          && 'notification' !== event
          && 'dialing' !== event
          && 'answering' !== event
          && 'call:incoming' !== event
          && 'call:connecting' !== event
          && 'call:connected' !== event
          && 'call:disconnecting' !== event
          && 'call:disconnected' !== event
          && 'call:muted' !== event
          && 'call:unmuted' !== event
          && 'call:held' !== event
          && 'call:resumed' !== event
          && 'call:canceled' !== event
          && 'call:rejected' !== event
          && 'address-updated' !== event
          && 'call:ringback-provided' !== event
          && 'media:established' !== event
          && 'conference:invitation-received' !== event
          && 'conference:joining' !== event
          && 'conference:invitation-sending' !== event
          && 'conference:invitation-rejected' !== event
          && 'conference:connecting' !== event
          && 'conference:invitation-sent' !== event
          && 'conference:invitation-accepted' !== event
          && 'conference:participant-removed' !== event
          && 'conference:held' !== event
          && 'conference:resumed' !== event
          && 'conference:disconnecting' !== event
          && 'conference:ended' !== event
          && 'conference:connected' !== event
          && 'warning' !== event
          && 'error' !== event) {
        throw new Error('Event ' + event + ' not defined');
      }

      emitter.unsubscribe(event, handler);
      emitter.subscribe(event, handler, this);
    }

    /**
     * @method
     * getCalls
     * @summary
     * Gets a list of calls.
     * @desc
     * Gets a list of calls currently in progress (foreground or background)
     * @memberOf Phone
     * @public
     * @instance
     * @deprecated
     * @returns {Array} Array of objects representing current calls
     *
     */
    function getCalls() {
      logger.logDebug('ATT.rtc.Phone: getCalls');

      var calls = session.getCalls(),
        key,
        list = [],
        call,
        p,
        participants;

      logger.logInfo('Getting list of calls...');

      for (key in calls) {
        if (calls.hasOwnProperty(key)) {

          logger.logTrace('call id', key);

          call = {
            state: calls[key].getState(),
            type: calls[key].breed(),
            isIncoming: calls[key].type() === enumAtt.CALL_TYPE.INCOMING
          };

          if (calls[key].type() === enumAtt.CALL_TYPE.INCOMING) {
            call.participants = [];
            participants = calls[key].participants();
            logger.logTrace('Participants', Object.keys(participants).length);

            for (p in participants) {
              if (participants.hasOwnProperty(p)) {
                logger.logTrace('participant', p);
                // TODO: Use real participants here
                call.participants.push({
                  id: 'john@domain.com',
                  status: 'invitation-sent'
                });
              }
            }
          } else if (calls[key].type() === enumAtt.CALL_TYPE.OUTGOING) {
            call.peer = calls[key].peer();
          }

          list.push(call);
        }
      }
      logger.logTrace('Call List', list);
      return list;
    }


    //TODO: remove this public method
    function getSession() {
      return session;
    }

    /**
     * @method
     * login
     * @summary
     * Creates a Enhanced WebRTC Session.
     * @desc
     * Use this function to establish Enhanced WebRTC session so that the user can place Enhanced WebRTC calls.
     * The service parameter indicates the desired service such as audio or video call
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     *  **Error Codes**
     *
     *  - 2001 - Missing input parameter
     *  - 2002 - Mandatory fields can not be empty
     *  - 2004 - Internal error occurred
     *  - 2005 - User already logged in
     *  - 2504 - E911 not supported for non-telephone users
     *  - 2505 - Valid e911Id is mandatory for mobile number or virtual number
     *  - 2506 - Unassigned token Associate token to virtual number or account id
     *  - 2507 - A session was already created with the AT
     *  - 2512 - Number of Session exceeds the allowed limit.
     *
     * @memberOf Phone
     * @public
     * @instance
     * @param {Object} options
     * @param {String} options.token OAuth Access Token.
     * @param {String} [options.e911Id] E911 Id. Optional parameter for Account ID users.
     * Required for Mobile Number and Virtual Number users
     * @fires Phone#session:ready
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.login({
     *   token: token,
     *   e911Id: e911Id
     * });
     *
     */
    function login(options) {
      logger.logDebug('ATT.rtc.Phone: login');
      logger.logTrace('options', options);

      try {
        if (undefined === options) {
          publishError('2002');
          return;
        }
        if (undefined === options.token) {
          publishError('2001');
          return;
        }
        if (undefined !== session && null !== session.getId()) {
          publishError('2005');
          return;
        }

        try {
          session.on('ready', onSessionReady);

          logger.logInfo('logging in...');

          session.connect(options);
        } catch (err) {
          logger.logError('Error during login');
          logger.logTrace(err);
          publishError('2004');
          return;
        }
      } catch (err) {
        logger.logError('Error during login');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * associateE911Id
     * @summary
     * Update E911 linked address id for the current user session
     * @desc
     * Use this function to update your E911 linked address id for the current user session
     * The user has to be logged in before `associateE911Id` can be invoked
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 17000 - e911 parameter is missing
     *   - 17001 - Internal error occurred
     *   - 17002 - User is not logged in
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#address-updated
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.associateE911Id({
     *   e911Id: e911AddressId
     * });
     */
    function associateE911Id(options) {
      logger.logDebug('ATT.rtc.Phone: associateE911Id');

      try {
        if (undefined === options) {
          publishError('17000');
          return;
        }

        if (undefined === session || null === session.getId()) {
          publishError('17002');
          return;
        }

        if (undefined === options.e911Id || null === options.e911Id) {
          publishError('17000');
          return;
        }

        try {
          session.on('address-updated', function () {
            logger.logDebug('session.on: address-updated');
            logger.logInfo('address-updated event by ATT.rtc.Phone');
            /**
             * @event
             * Phone#address-updated
             * @summary
             * Address updated event fires after successfully updating the e911 linked address id
             * @desc
             * The user has to be logged in order to be able to receive this event.
             */
            emitter.publish('address-updated');
          });

          logger.logTrace(session.getId(), session);
          logger.logTrace('E911 Id', session.e911Id);


          logger.logInfo('Associating E911 Id...');
          session.associateE911Id(options);
        } catch (err) {
          logger.logInfo('Error during associateE911Id');
          logger.logTrace(err);
          publishError('17001');
          return;
        }

      } catch (err) {
        logger.logInfo('Error during associateE911Id');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * logout
     * @summary
     * Deletes the current Enhanced WebRTC Session
     * @desc
     * Use this function to log out from Enhanced WebRTC session. As a result,
     * enhanced WebRTC session will get deleted and event channel polling will be stopped.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     *  **Error Codes**
     *
     *   - 3000 - Internal error occurred
     *   - 3507 - Session Id is not associated with the Access Token passed in the request.
     *
     * @memberOf Phone
     * @public
     * @instance
     * @fires Phone#session:disconnected
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.logout();
     *
     */
    function logout() {
      logger.logDebug('ATT.rtc.Phone: logout');

      try {

        if (null === session || null === session.getId()) {
          publishError('3001');
          return;
        }

        try {
          session.on('disconnected', onSessionDisconnected);

          logger.logInfo('logging out...');
          session.disconnect();

        } catch (err) {
          logger.logError('Error during logout');
          logger.logTrace(err);
          publishError('3000');
          return;
        }
      } catch (err) {
        logger.logError('Error during logout');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }


    /**
     * @method
     * reject
     * @summary
     * Reject current incoming call.
     * @desc
     * Use this method to reject and incoming call
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     *  **Error Codes**
     *
     *  - 12000 - Reject failed-Call has not been initiated
     *  - 12001 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     * @fires Phone#call:disconnected
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.reject();
     *
     */
    function reject() {
      logger.logDebug('Att.rtc.Phone: reject');

      try {
        var call = session.pendingCall;

        if (null === call || null === call.id()) {
          publishError('12000');
          return;
        }

        try {
          call.off('rejected', onCallRejected);
          call.on('rejected', onCallRejected);

          logger.logInfo('Rejecting...');
          call.reject();
        } catch (err) {
          logger.logError('Error during reject');
          logger.logTrace(err);
          publishError('12001');
          return;
        }

      } catch (err) {
        logger.logError('Error during reject');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    //method used to reject a call or conference while user media fails
    function rejectCallOnMediaError() {
      logger.logDebug('ATT.rtc.Phone: rejectCallOnMediaError');
      logger.logInfo('Rejecting incoming call');

      var id, pendingCall = session.pendingCall;
      id = pendingCall.id();

      if (pendingCall && undefined !== id && null !== id) {
        reject();
      }
    }

    function connectWithMediaStream(connectOpts, call, errorCallback) {
      logger.logDebug('ATT.rtc.Phone: connectWithMediaStream');
      logger.logTrace('connectOpts', connectOpts);

      call.on('stream-added', function (data) {
        logger.logDebug('call.on: stream-added');
        userMediaSvc.showStream({
          stream: data.stream,
          localOrRemote: 'remote'
        });
      });

      if (undefined === connectOpts.mediaType) {
        connectOpts.mediaType = call.mediaType();
      }

      logger.logInfo('Attempting to get user media');

      userMediaSvc.getUserMedia({
        mediaType: connectOpts.mediaType,
        localMedia: connectOpts.localMedia,
        remoteMedia: connectOpts.remoteMedia,
        onUserMedia: function (media) {
          try {
            logger.logDebug('getUserMedia: onUserMedia');
            logger.logInfo('Got user media');
            logger.logTrace('media', media);

            call.addStream(media.localStream);

            logger.logInfo('Connecting...');

            call.connect();
          } catch (error) {
            logger.logError('Error during onUserMedia');
            logger.logTrace(error);
            if (undefined !== errorCallback
                && 'function' === typeof errorCallback) {
              errorCallback(error);
            }
          }
        },
        onMediaEstablished: function () {
          logger.logDebug('getUserMedia: onMediaEstablished');
          logger.logInfo('Remote media established');

          if (null !== session.pendingCall
              && 'connecting' === session.pendingCall.getState()
              && 'call' === session.pendingCall.breed()) {
            logger.logInfo('Got early media');
            /**
             * @event
             * Phone#call:ringback-provided
             * @summary
             * Call ringback provided event fires when early media starts streaming for an outgoing call.
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an unestablished outgoing call in order to be able
             * to receive this event.
             * The called party should be able to provide early media or ringback.
             * The early media or ringback starts playing automatically when this event is fired.
             * The event is fired with an attached event data of the following format:
             * @type {Object}
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:ringback-provided', {
              timestamp: new Date()
            });
            return;
          }

          /**
           * @event
           * Phone#media:established
           * @summary
           * Media established event fires when audio/video media has started for a call.
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an `connected` incoming or outgoing call in order to be able
           * to receive this event.
           * This event is fired after {@link Phone#call:connected} has been fired.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {String} [to] - The phone number/id of the called party.
           * @property {String} [from] - The phone number/id of the calling party.
           * @property {String} mediaType - The media type of the call (audio/video).
           * @property {Array} codec - The CODECs associated with the call.
           * @property {Date} timestamp - Event fire time.
           */
          if (null !== session.currentCall
              && 'connected' === session.currentCall.getState()) {
            var data = {
              mediaType: session.currentCall.mediaType(),
              codec: session.currentCall.codec(),
              timestamp: new Date()
            };
            if (enumAtt.CALL_TYPE.OUTGOING === session.currentCall.type()) {
              data.to = session.currentCall.peer();
            } else {
              data.from = session.currentCall.peer();
            }
            emitter.publish('media:established', data);
          }
        },
        onUserMediaError: function (error) {
          logger.logDebug('getUserMedia: onUserMediaError');
          logger.logTrace(error);
          rejectCallOnMediaError();
          publishError('13005', error);
          return;
        }
      });
    }

    /**
     * @method
     * dial
     * @summary
     * Dials an outgoing call
     * @desc
     * Use this function to dial a call to another user already logged. The call can be dialled out by
     * providing the destination, call media type information and local and remote media resources.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     *  **Error Codes**
     *
     *  - 4000 - Invalid phone number
     *  - 4001 - Invalid SIP URI
     *  - 4002 - Invalid Media Type
     *  - 4003 - Internal error occurred
     *  - 4004 - User is not logged in
     *  - 4005 - onUserMediaError occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     * @param {Object} options
     * @param {String} options.destination The Phone Number or User Id of the called party (without sip or tel URI)
     * @param {HTMLVideoElement} options.localMedia HTML media element for local stream.
     * @param {HTMLVideoElement} options.remoteMedia HTML media element for remote stream.
     * @param {String} [options.mediaType] `audio` or `video`. Defaults to video.
     *
     * @fires Phone#dialing
     * @fires Phone#call:connecting
     * @fires Phone#call:canceled
     * @fires Phone#call:rejected
     * @fires Phone#call:ringback-provided
     * @fires Phone#call:connected
     * @fires Phone#media:established
     * @fires Phone#notification
     * @fires Phone#error
     *
     * @example
     * // Start video call with an Mobile Number/Virtual Number User
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.dial({
     *   destination: '11231231234', //1800CALLFEDX, 1 (123) 123-1234
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo')
     * });
     *
     * @example
     * // Start video call with an Account ID User
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.dial({
     *   destination: 'john@domain.com',
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo'),
     *   mediaType: 'video'
     * });
     *
     * @example
     * // Start audio call with a special number
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.dial({
     *   destination: '911', //411,611,*69,#89
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo'),
     *   mediaType: 'audio'
     *});
     *
     */
    function dial(options) {
      logger.logDebug('ATT.rtc.Phone: dial');
      logger.logTrace('options', options);

      var call;

      try {

        if (null === session.getId()) {
          publishError('4004');
          return;
        }
        if (undefined === options) {
          publishError('4009');
          return;
        }

        if (undefined === options.localMedia ||
            ('VIDEO' !== options.localMedia.tagName &&
            'AUDIO' !== options.localMedia.tagName)) {
          publishError('4006');
          return;
        }

        if (undefined === options.remoteMedia ||
            ('VIDEO' !== options.remoteMedia.tagName &&
            'AUDIO' !== options.remoteMedia.tagName)) {
          publishError('4007');
          return;
        }

        if (undefined === options.destination) {
          publishError('4008');
          return;
        }

        if (undefined !== options.mediaType) {
          if ('audio' !== options.mediaType
              && 'video' !== options.mediaType) {
            publishError('4002');
            return;
          }
        }

        if (options.destination.indexOf('sip:') > -1 || options.destination.indexOf('tel:') > -1) {
          publishError('4000');
          return;
        }

        if (options.destination.indexOf('@') === -1) {
          options.destination = cleanPhoneNumber(options.destination);
          if (false === options.destination) {
            publishError('4000');
            return;
          }
        } else if (options.destination.split('@').length > 2) {
          publishError('4001');
          return;
        }

        try {
          /**
           * @event
           * Phone#dialing
           * @summary
           * Dialing event fires immediately after `dial` for an outgoing call.
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an unestablished outgoing call in order to be able
           * to receive this event.
           * This event is followed by {@link Phone#call:connecting} event.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {String} to - The phone number/id of the called party.
           * @property {String} mediaType - The media type of the call (audio/video).
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('dialing', {
            to: options.destination,
            mediaType: options.mediaType,
            timestamp: new Date()
          });

          call = session.createCall({
            peer: options.destination,
            breed: 'call',
            type: enumAtt.CALL_TYPE.OUTGOING,
            mediaType: options.mediaType,
            localMedia: options.localMedia,
            remoteMedia: options.remoteMedia
          });

          logger.logTrace(call.peer(), call);

          call.on('connecting', function (data) {
            logger.logDebug('call.on: connecting');
            logger.logInfo('call:connecting event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            /**
             * @event
             * Phone#call:connecting
             * @summary
             * Call connecting event fires when an outgoing or incoming call is trying to connect to
             * the other party.
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an unestablished outgoing or incoming call in order to be able
             * to receive this event.
             * The event is fired with an attached event data of the following format:
             * @type {Object}
             * @property {String} [to] - The phone number/id of the called party.
             * @property {String} [from] - The phone number/id of the calling party.
             * @property {String} mediaType - The media type of the call (audio/video).
             * @property {Array} [codec] - The CODECs associated with the call.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:connecting', data);
          });

          call.on('rejected', onCallRejected);

          call.on('connected', function (data) {
            logger.logDebug('call.on: connected');
            logger.logInfo('call:conneceted event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            /**
             * @event
             * Phone#call:connected
             * @summary
             * Call connected event fires when an outgoing or incoming call is connected to
             * the other party.
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an unestablished outgoing or incoming call in order to be able
             * to receive this event.
             * This event is fired after {@link Phone#call:connecting} has been fired.
             * The event is fired with an attached event data of the following format:
             * @type {Object}
             * @property {String} [to] - The phone number/id of the called party.
             * @property {String} [from] - The phone number/id of the calling party.
             * @property {String} mediaType - The media type of the call (audio/video).
             * @property {Array} [codec] - The CODECs associated with the call.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:connected', data);
          });
          // TODO Move registering this event to hold method
          call.on('held', function (data) {
            logger.logDebug('call.on: held');
            logger.logInfo('call:held event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            /**
             * @event
             * Phone#call:held
             * @summary
             * Call held event fires when the user puts an active call on hold
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an established outgoing or incoming call in order to be able
             * to receive this event.
             * This event is fired in response to a successful call to `hold` method.
             * The event is fired with an attached event data of the following format:
             * @type {Object}
             * @property {String} [to] - The phone number/id of the called party.
             * @property {String} [from] - The phone number/id of the calling party.
             * @property {String} mediaType - The media type of the call (audio/video).
             * @property {Array} codec - The CODECs associated with the call.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:held', data);
          });
          // TODO Move registering this event to resume method
          call.on('resumed', function (data) {
            logger.logDebug('call.on: resumed');
            logger.logInfo('call resumed by ATT.rtc.Phone');
            logger.logTrace('data', data);
            /**
             * @event
             * Phone#call:resumed
             * @summary
             * Call resumed event fires when the user resumes a call which was previously put on hold
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an established outgoing or incoming call in order to be able
             * to receive this event.
             * This event is fired in response to a successful call to `resume` method.
             * The event is fired with an attached event data of the following format:
             * @type {Object}
             * @property {String} [to] - The phone number/id of the called party.
             * @property {String} [from] - The phone number/id of the calling party.
             * @property {String} mediaType - The media type of the call (audio/video).
             * @property {Array} codec - The CODECs associated with the call.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:resumed', data);
          });

          call.on('disconnected', function (data) {
            logger.logDebug('call.on: disconnected');
            onCallDisconnected(call, data);
          });

          call.on('notification', function (data) {
            logger.logDebug('call.on: notification');
            logger.logInfo('notification event by ATT.rtc.Phone');
            emitter.publish('notification', data);
            session.deletePendingCall();
            stopUserMedia();
          });

          call.on('error', function (data) {
            logger.logDebug('call.on: error');
            logger.logError('error event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('error', data);
          });

          logger.logInfo('Dialing...');

          connectWithMediaStream(options, call, function (error) {
            logger.logError('Error during connectWthMediaStream');
            logger.logTrace(error);
            emitter.publish('error', {
              error: ATT.errorDictionary.getSDKError('4003'),
              data: error
            });
          });

        } catch (err) {
          logger.logError('Error during dial');
          logger.logTrace(err);
          publishError('4003');
          return;
        }

      } catch (err) {
        logger.logError('Error during dial');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * addCall
     * @summary
     * Add a second call when an active call exists.
     * @desc
     * Use this function to dial a second call, if an active call exists. You may not use this method
     * if there is no existing active call.
     * This method will put the active call on hold (if not already held) and then try to
     * dial out the second call.
     * If the second call fails, the user is switched back to the first call.
     * If the second call connects and is hung-up at a later point, the user is then returned
     * to the first call.
     * The first call will resume automatically, after the second call ends or fails, if it was
     * not put on hold explicitly (using the hold function)
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error codes**
     *
     *  - 27000 - Internal Error Occurred
     *  - 27001 - Input options are not provided
     *  - 27002 - LocalMedia is not defined
     *  - 27003 - remoteMedia is not defined
     *  - 27004 - destination is not defined
     *  - 27005 - Invalid phone number
     *  - 27006 - Invalid SIP URI
     *  - 27007 - Invalid media constraints
     *  - 27008 - User is not logged in
     *  - 27009 - Can not make second call. There is no first call in progress.
     *  - 27010 - Cannot make a third call.
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @param {Object} options
     * @param {String} options.destination The phone number or user id of the called party (without sip or tel URI).
     * @param {HTMLVideoElement} options.localMedia
     * @param {HTMLVideoElement} options.remoteMedia
     * @param {String} [options.mediaType] `audio` or `video`. Defaults to video.
     *
     * @fires Phone#dialing
     * @fires Phone#call:connecting
     * @fires Phone#call:canceled
     * @fires Phone#call:rejected
     * @fires Phone#call:ringback-provided
     * @fires Phone#call:connected
     * @fires Phone#media:established
     * @fires Phone#notification
     * @fires Phone#error
     *
     * @example
     * // Add a video call with an Mobile Number User
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.addCall({
     *   destination: '1231231234', //1800CALLFEDX, 1 (123) 123-1234
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo'),
     *   mediaType: 'video'
     * });
     *
     *
     * @example
     * // Add a video call with an Mobile Number User
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.addCall({
     *   destination: 'john@domain.com',
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo')
     * });
     *
     */
    function addCall(options) {
      logger.logDebug('ATT.rtc.Phone: addCall');
      logger.logTrace('options', options);

      var call;

      if (2 <= getCalls().length) {
        publishError('27010');
        return;
      }

      function dialSecondCall() {
        logger.logDebug('ATT.rtc.Phone: dialSecondCall');

        call.off('held', dialSecondCall);

        logger.logInfo('Dialing second call...');
        dial(options);
      }

      try {
        if (undefined === options) {
          publishError('27001');
          return;
        }
        if (undefined === options.localMedia ||
            ('VIDEO' !== options.localMedia.tagName &&
            'AUDIO' !== options.localMedia.tagName)) {
          publishError('27002');
          return;
        }
        if (undefined === options.remoteMedia ||
            ('VIDEO' !== options.remoteMedia.tagName &&
            'AUDIO' !== options.remoteMedia.tagName)) {
          publishError('27003');
          return;
        }
        if (undefined === options.destination) {
          publishError('27004');
          return;
        }
        if (options.destination.indexOf('@') === -1) {
          options.destination = cleanPhoneNumber(options.destination);
          if (false === options.destination) {
            publishError('27005');
            return;
          }
        } else if (options.destination.split('@').length > 2) {
          publishError('27006');
          return;
        }
        if (undefined !== options.mediaType) {
          if ('audio' !== options.mediaType
              && 'video' !== options.mediaType) {
            publishError('27007');
            return;
          }
        }
        if (null === session.getId()) {
          publishError('27008');
          return;
        }
        if (null === session.currentCall) {
          publishError('27009');
          return;
        }

        try {
          call = session.currentCall;

          logger.logInfo('Putting existing call on hold');

          call.on('held', dialSecondCall);

          call.hold();
          call.autoresume = true;
        } catch (err) {
          logger.logError('Error during hold current call');
          logger.logTrace(err);

          publishError('27000', err);
          return;
        }
      } catch (err) {
        logger.logError('Error during addCall');
        logger.logTrace(err);

        emitter.publish('error', {
          error: err
        });
      }
    }

    function answerCall(call, options) {
      logger.logDebug('ATT.rtc.Phone: answerCall');
      logger.logTrace('options', options);

      /**
       * @event
       * Phone#answering
       * @summary
       * Answering event fires immediately after `answer` for an incoming call.
       * @desc
       * The user has to be logged in order to be able to receive this event.
       * There should be an unestablished incoming call in order to be able
       * to receive this event.
       * This event is followed by {@link Phone#call:connecting} event.
       * The event is fired with an attached event data of the following format:
       * @type {Object}
       * @property {String} from - The phone number/id of the calling party.
       * @property {String} mediaType - The media type of the call (audio/video).
       * @property {Array} codec - The CODECs associated with the call.
       * @property {Date} timestamp - Event fire time.
       */
      emitter.publish('answering', {
        from: call.peer(),
        mediaType: call.mediaType(),
        codec: call.codec(),
        timestamp: new Date()
      });

      call.on('connecting', function (data) {
        logger.logDebug('call.on: connecting');
        logger.logInfo('call:connecting event by ATT.rtc.Phone');
        logger.logTrace('data', data);
        emitter.publish('call:connecting', data);
      });
      call.on('connected', function (data) {
        logger.logDebug('call.on: connected');
        logger.logInfo('call:connecting event by ATT.rtc.Phone');
        logger.logTrace('data', data);
        emitter.publish('call:connected', data);
      });
      // TODO remove this registration
      call.on('held', function (data) {
        logger.logDebug('call.on: held');
        logger.logInfo('call:connecting event by ATT.rtc.Phone');
        logger.logTrace('data', data);
        emitter.publish('call:held', data);
      });
      // TODO remove this registration
      call.on('resumed', function (data) {
        logger.logDebug('call.on: resumed');
        logger.logInfo('call:connecting event by ATT.rtc.Phone');
        logger.logTrace('data', data);
        emitter.publish('call:resumed', data);
      });
      call.on('disconnected', function (data) {
        logger.logDebug('call.on: disconnected');
        onCallDisconnected(call, data);
      });
      call.on('notification', function (data) {
        logger.logDebug('call.on: notification');
        logger.logInfo('call:connecting event by ATT.rtc.Phone');
        logger.logTrace('data', data);
        emitter.publish('notification', data);
        session.deleteCurrentCall();
        stopUserMedia();
      });
      call.on('error', function (data) {
        logger.logDebug('call.on: error');
        logger.logError('error event by ATT.rtc.Phone');
        logger.logTrace('data', data);
        publishError('5002', data);
        return;
      });

      logger.logInfo('Answering...');
      connectWithMediaStream(options, call);
    }

    /**
     * @method
     * answer
     * @summary
     * Answer an incoming call
     * @desc
     * Once a {@link Phone#call:incoming} event is fired, This method can be used this method to
     * answer the incoming call.
     * If there is an existing call in progress, this method can be used to answer the second incoming
     * call by putting on hold or ending the existing call.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 5000 - Answer failed: No incoming call
     *   - 5001 - Invalid media type
     *   - 5002 - Internal error occurred
     *   - 5003 - User is not logged in
     *   - 5004 - Mandatory fields can not be empty
     *   - 5005 - Invalid Action parameter
     *   - 5504 - A media modification is in progress for the callId
     *
     * @memberof Phone
     * @instance
     * @public
     *
     * @param {Object} options
     * @param {HTMLElement} options.localVideo
     * @param {HTMLElement} options.remoteVideo
     * @param {String} [options.action]  Action to perform on the current call (`end` | `hold`).
     *
     * @fires Phone#answering
     * @fires Phone#call:connecting
     * @fires Phone#call:rejected
     * @fires Phone#call:connected
     * @fires Phone#media:established
     * @fires Phone#call:disconnected
     * @fires Phone#notification
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.answer({
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo')
     * });
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.answer({
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo'),
     *   action: 'hold' // or 'end'
     * });
     */
    function answer(options) {
      logger.logDebug('ATT.rtc.Phone: answer');
      logger.logTrace('options', options);

      var event,
        call,
        currentCall;

      function answerSecondCall() {
        logger.logDebug('ATT.rtc.Phone: answerSecondCall');
        logger.logInfo('Answering second call');

        event = options.action === 'end' ? 'disconnected' : 'held';
        currentCall.off(event, answerSecondCall);

        answerCall(call, options);
      }

      try {
        if (undefined === options) {
          publishError('5004');
          return;
        }

        if (undefined === options.localMedia ||
            ('VIDEO' !== options.localMedia.tagName &&
            'AUDIO' !== options.localMedia.tagName)) {
          publishError('5001');
          return;
        }

        if (undefined === options.remoteMedia ||
            ('VIDEO' !== options.remoteMedia.tagName &&
            'AUDIO' !== options.remoteMedia.tagName)) {
          publishError('5001');
          return;
        }

        if (session.getId() === null) {
          publishError('5003');
          return;
        }
        call = session.pendingCall;

        if (call === null) {
          publishError('5000');
          return;
        }

        if (undefined !== options.action) {
          if ('hold' !== options.action && 'end' !== options.action) {
            publishError('5005');
            return;
          }
        }

        currentCall = session.currentCall;

        if (null !== currentCall) {
          logger.logTrace(currentCall.peer(), currentCall);

          logger.logInfo('There is an existing call');
          if (undefined === options.action) {
            publishError('5005');
            return;
          }

          if ('hold' === options.action) {
            if ('held' !== currentCall.getState()) {
              logger.logInfo('Putting the current call on hold');
              currentCall.on('held', answerSecondCall);
              currentCall.hold();
              currentCall.autoresume = true;
              return;
            }
            answerSecondCall(call, options, true);
          }
          if ('end' === options.action) {
            logger.logInfo('Ending the current call');
            currentCall.on('disconnected', answerSecondCall);
            currentCall.disconnect();
          }
          return;
        }

        if (undefined !== options.action) {
          logger.logWarning('There is no current call. Action `' + options.action + '` will be ignored');
        }

        answerCall(call, options);

      } catch (err) {
        logger.logError('Error during answer');
        logger.logTrace(err);
        publishError('5002', err);
        return;
      }

    }

    /**
     * @method
     * hangup
     * @summary
     * Hangup an existing call
     * @desc
     * Use this function to hangup the current call. The other party will get disconnected
     * There should be an existing established call before `hangup` can be called.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error codes**
     *
     *   - 6000 - Call is not in progress
     *   - 6001 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#call:disconnecting
     * @fires Phone#call:disconnected
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.hangup();
     */
    function hangup() {
      logger.logDebug('ATT.rtc.Phone: hangup');

      var call;

      try {

        call = session.currentCall;

        if (null === call || null === call.id()) {
          publishError('6000');
          return;
        }

        try {

          logger.logTrace(call.peer(), call);

          call.on('disconnecting', function (data) {
            logger.logDebug('call.on: disconnecting');
            logger.logInfo('call:disconnecting event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            /**
             * @event
             * Phone#call:disconnecting
             * @summary
             * Call disconnecting event fires immediately after user tries to hangup a call
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an established call in order to be able to receive this event.
             * This event is fired in response to a successful call to `hangup` method
             * The event is fired with an attached event data of the following format:
             *
             * @type {object}
             * @property {String} [to] - The phone number/id of the called party.
             * @property {String} [from] - The phone number/id of the calling party.
             * @property {String} mediaType - The media type of the call or conference (audio/video).
             * @property {Array} codec - The CODECs associated with the call or conference.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:disconnecting', data);
          });

          logger.logInfo('Hanging up...');
          call.disconnect();
        } catch (err) {
          logger.logError('Error during hangup');
          logger.logTrace(err);
          publishError('6001');
          return;
        }

      } catch (err) {
        logger.logError('Error during hangup');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * cancel
     * @summary
     * Cancel current call.
     * @desc
     * Use this function to cancel the call before other party answers it.
     * There should be an unestablished outgoing call before `cancel` can be called.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     *  **Error Code**
     *
     *    - 11000 -Cancel failed - Call has not been initiated
     *    - 11001 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#call:canceled
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.cancel();
     */
    function cancel() {
      logger.logDebug('Att.rtc.Phone: cancel');

      var call = session.pendingCall;

      try {
        if (null === call) {
          publishError('11000');
          return;
        }
        try {
          logger.logTrace(call.peer(), call);

          call.off('canceled', onCallCanceled);
          call.on('canceled', onCallCanceled);

          logger.logInfo('Canceling...');
          call.disconnect();
        } catch (err) {
          logger.logError('Error during cancel');
          logger.logTrace(err);
          publishError('11001');
          return;
        }
      } catch (err) {
        logger.logError('Error during cancel');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * startConference
     * @summary
     * Starts a conference with host and no participants.
     * @desc
     * Use this method to start a conference. The host can invite other users to the conference
     * by adding the participant(s). Participant(s) can accept or reject an invite.
     * Only a host can remove a participant from the conference and end the conference.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 18000 - Parameters missing
     *   - 18001 - Invalid `localMedia` passed
     *   - 18002 - Invalid `remoteMedia` passed
     *   - 18003 - Invalid `mediaType` passed
     *   - 18004 - Failed to get the local user media
     *   - 18005 - Internal error occurred
     *   - 18006 - Cannot make second conference when first in progress
     *   - 18007 - Please login before you make a conference
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @param {Object} options
     * @param {HTMLVideoElement} options.localMedia The host's video element
     * @param {HTMLVideoElement} options.remoteMedia The conference participant's video element
     * @param {String} [options.mediaType] `video` or `audio`. Defaults to video.

     * @fires Phone#conference:connecting
     * @fires Phone#conference:connected
     * @fires Phone#media:established
     * @fires Phone#conference:held
     * @fires Phone#conference:resumed
     * @fires Phone#conference:ended
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.startConference({
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo'),
     *   mediaType: 'audio'
     * });
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.startConference({
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo')
     * });
     */
    function startConference(options) {
      logger.logDebug('ATT.rtc.Phone: startConference');
      logger.logTrace('options', options);

      var conference;

      try {
        if (undefined === options
            || 0 === Object.keys(options).length) {
          logger.logError('No options provided');
          publishError('18000');
          return;
        }
        if (undefined === session || null === session.getId()) {
          logger.logError('Cannot start session. user is not logged in');
          publishError('18007');
          return;
        }

        if (session.currentCall !== null && session.currentCall.breed() === 'conference') {
          logger.logError('Cannot start conference. Another conference already exists');
          publishError('18006');
          return;
        }

        if (undefined === options.localMedia ||
            ('VIDEO' !== options.localMedia.tagName &&
            'AUDIO' !== options.localMedia.tagName)) {
          logger.logError('localMedia not provided');
          publishError('18001');
          return;
        }

        if (undefined === options.remoteMedia ||
            ('VIDEO' !== options.remoteMedia.tagName &&
            'AUDIO' !== options.remoteMedia.tagName)) {
          logger.logError('remoteMedia not provided');
          publishError('18002');
          return;
        }

        if ((undefined === options.mediaType)
            || ('audio' !== options.mediaType
            && 'video' !== options.mediaType)) {
          logger.logError('mediaType not provided');
          publishError('18003');
          return;
        }

        options.breed = 'conference';
        options.type = enumAtt.CALL_TYPE.OUTGOING;

        conference = session.createCall(options);

        logger.logTrace(conference.peer(), conference);

        conference.on('error', function (data) {
          logger.logDebug('conference.on: error');
          logger.logError('error event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          emitter.publish('error', data);
        });

        conference.on('connected', function (data) {
          logger.logDebug('conference.on: connected');
          logger.logInfo('conference:connected event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:connected
           * @summary
           * Conference connected fires when a conference started by a host has connected
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an unestablished conference started by the user in order
           * to be able to receive this event.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:connected', data);
        });

        //TODO: move this registration to resume method
        conference.on('resumed', function (data) {
          logger.logDebug('conference.on: resumed');
          logger.logInfo('conference:resumed event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:resumed
           * @summary
           * Conference resumed fires when a conference has been resumed
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established conference which was previously put on hold by
           * the user in order to be able to receive this event.
           * This event is fired in response to a successful call to `resume` method.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {Object} [invitations] - The invitations list.
           * @property {Object} [participants] - The current participants list.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:resumed', data);
        });

        //TODO: move this registration to hold method
        conference.on('held', function (data) {
          logger.logDebug('conference.on: held');
          logger.logInfo('conference:conference event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:held
           * @summary
           * Conference held fires when a conference has been put on hold
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established conference in order to be able to receive this event.
           * This event is fired in response to a successful call to `hold` method.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {Object} [invitations] - The invitations list.
           * @property {Object} [participants] - The current participants list.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:held', data);
        });

        conference.on('response-pending', function (data) {
          logger.logDebug('conference.on: response-pending');
          logger.logInfo('conference:invitation-sent event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:invitation-sent
           * @summary
           * Conference invitation-sent fires when an invitation has been successfully sent by the host
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established conference in order to be able to receive this event.
           * This event is fired host-side in response to a successful call to `addParticipant(s)` method.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {Object} [invitations] - The invitations list.
           * @property {Object} [participants] - The current participants list.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:invitation-sent', data);
        });

        conference.on('invite-accepted', function (data) {
          logger.logDebug('conference.on: invite-accepted');
          logger.logInfo('conference:invitation-accepted event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:invitation-accepted
           * @summary
           * Conference invitation-accepted fires when an invitation has been accepted
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established conference in order to be able to receive this event.
           * This event is fired host-side  when an invitation has been accepted by the participant.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {Object} [invitations] - The invitations list.
           * @property {Object} [participants] - The current participants list.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:invitation-accepted', data);
        });

        conference.on('rejected', function (data) {
          logger.logDebug('conference.on: rejected');
          logger.logInfo('conference:invitation-rejected event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:invitation-rejected
           * @summary
           * Conference invitation-rejected fires when an invitation has been rejected
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established conference in order to be able to receive this event.
           * This event is fired host-side  when an invitation has been rejected by the participant.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {Object} [invitations] - The invitations list.
           * @property {Object} [participants] - The current participants list.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:invitation-rejected', data);
        });

        conference.on('notification', function (data) {
          logger.logDebug('conference.on: notification');
          logger.logInfo('notification event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          emitter.publish('notification', data);
        });

        conference.on('participant-removed', function (data) {
          logger.logDebug('conference.on: participant-removed');
          logger.logInfo('conference:participant-removed event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:participant-removed
           * @summary
           * Conference participant-removed fires when a host successfully removes a participant
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established conference in order to be able to receive this event.
           * This event is fired host-side in response to a successful call to `removeParticipant` method
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {Object} [invitations] - The invitations list.
           * @property {Object} [participants] - The current participants list.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:participant-removed', data);
        });

        conference.on('disconnected', function (data) {
          logger.logDebug('conference.on: disconnected');
          logger.logInfo('conference:ended event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:ended
           * @summary
           * Conference ended fires when a conference has ended
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an established in conference in order to be able to receive this event.
           * This event is mainly fired host-side or participant side in response to a successful call
           * to `endConference` method.
           * This event can also be fired if the conference ends due to some unexpected reason.
           * The event is fired with an attached event data of the following format:
           * @type {Object}
           * @property {String} [from] - The phone number/user id of the conference initiator for participant side
           * @property {Object} [participants] - The participants list for host side
           * @property {Object} [invitations] - The invitations list for host side.
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:ended', data);
          session.deleteCurrentCall();
          stopUserMedia();
        });

        logger.logInfo('Starting conference...');

        connectWithMediaStream(options, conference);
      } catch (err) {
        publishError('18005', err);
        return;
      }

    }

    /**
     * @method
     * joinConference
     * @summary
     * Join a conference by accepting an incoming invite.
     * @desc
     * Use this method on participant side for joining an incoming conference.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 20000 - Internal error occurred
     *   - 20001 - User is not logged in
     *   - 20002 - No conference invite
     *   - 20003 - `getUserMedia` failed
     *
     * @memberof Phone
     * @public
     * @instance
     *
     * @param {Object} options
     * @param {HTMLElement} options.localVideo
     * @param {HTMLElement} options.remoteVideo
     *
     * @fires Phone#conference:joining
     * @fires Phone#conference:connecting
     * @fires Phone#conference:connected
     * @fires Phone#media:established
     * @fires Phone#conference:held
     * @fires Phone#conference:resumed
     * @fires Phone#conference:ended
     * @fires Phone#notification
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.joinConference({
     *   localMedia: document.getElementById('localVideo'),
     *   remoteMedia: document.getElementById('remoteVideo')
     * });
     */
    function joinConference(options) {
      logger.logDebug('ATT.rtc.Phone: joinConference');
      logger.logTrace('options', options);

      try {

        if (null === session || null === session.getId()) {
          publishError('20001');
          return;
        }
        if (null === session.pendingCall) {
          publishError('20002');
          return;
        }

        try {
          var conference = session.pendingCall;

          logger.logTrace(conference.peer(), conference);

          /**
           * @event
           * Phone#conference:joining
           * @summary
           * Conference joining fires immediately after a participant joins a conference
           * @desc
           * The user has to be logged in order to be able to receive this event.
           * There should be an incoming conference invitation in order to be able to receive this event.
           * This event is fired participant-side in response to a successful call to `joinConference` method
           * This event is followed by {@link Phone#conference:connecting}
           * The event is fired with an attached event data of the following format:
           *
           * @type {Object}
           * @property {Object} from - The conference initiator
           * @property {String} mediaType - The media type of the conference (audio/video).
           * @property {Array} codec - The CODECs associated with the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:joining', {
            from: conference.peer(),
            mediaType: conference.mediaType(),
            codec: conference.codec(),
            timestamp: new Date()
          });

          conference.on('error', function (data) {
            logger.logDebug('conference.on: error');
            logger.logError('error event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('error', data);
          });

          conference.on('connecting', function (data) {
            logger.logDebug('conference.on: connecting');
            logger.logInfo('conference:connecting event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            /**
             * @event
             * Phone#conference:connecting
             * @summary
             * Conference connecting fires when a participant tries to connect to a conference
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an unestablished conference in order to be able to receive this event.
             * This event is fired participant-side in response to a successful call to `joinConference` method
             * The event is fired with an attached event data of the following format:
             *
             * @type {Object}
             * @property {Object} from - The conference initiator
             * @property {String} mediaType - The media type of the conference (audio/video).
             * @property {Array} codec - The CODECs associated with the conference.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('conference:connecting', data);
          });

          conference.on('connected', function (data) {
            logger.logDebug('conference.on: connected');
            logger.logInfo('conference:connected event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('conference:connected', data);
          });

          conference.on('held', function (data) {
            logger.logDebug('conference.on: held');
            logger.logInfo('conference:held event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('conference:held', data);
          });

          conference.on('resumed', function (data) {
            logger.logDebug('conference.on: resumed');
            logger.logInfo('conference:resumed event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('conference:resumed', data);
          });

          conference.on('disconnected', function (data) {
            logger.logDebug('conference.on: disconnected');
            logger.logInfo('conference:ended event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('conference:ended', data);
            session.deleteCurrentCall();
            stopUserMedia();
          });

          conference.on('notification', function (data) {
            logger.logDebug('conference.on: notification');
            logger.logInfo('notification event by ATT.rtc.Phone');
            logger.logTrace('data', data);
            emitter.publish('notification', data);
            session.deleteCurrentCall();
            stopUserMedia();
          });

          logger.logInfo('Joining conference...');

          connectWithMediaStream(options, conference, function (error) {
            logger.logError('Error during connectWithMediaStream');
            logger.logTrace(error);
            emitter.publish('error', {
              error: ATT.errorDictionary.getSDKError('20000'),
              data: error
            });
          });

        } catch (err) {
          logger.logError('Error during joinConference');
          logger.logTrace(err);
          publishError('20000');
          return;
        }

      } catch (err) {
        logger.logError('Error during joinConference');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * addParticipants
     * @summary
     * Add participants to the conference
     * @desc
     * Use this function to add one or more participants to the current conference
     * There should be an established conference before `addParticipant` can be invoked
     * Only a host side can invoke addParticipants
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 24000 - Participants parameter missing
     *   - 24001 - Participants is null or empty
     *   - 24002 - User is not logged in
     *   - 24003 - Conference not initiated
     *   - 24004 - Internal error occurred
     *   - 24005 - Cannot invite existing participant
     *   - 24006 - Invalid phone number
     *   - 24007 - Invalid SIP URI
     *
     * @param {Array} participants List of participant-ids
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#conference:invitation-sending
     * @fires Phone#conference:invitation-sent
     * @fires Phone#conference:invitation-accepted
     * @fires Phone#conference:invitation-rejected
     * @fires Phone#notification
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.addParticipants(['4250000001','4250000002']);
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.addParticipants(['john@domain.com']);
     */
    function addParticipants(participants) {
      logger.logDebug('ATT.rtc.Phone: addParticipants');
      logger.logTrace('participants', participants);

      var conference,
        counter,
        invitee,
        participant,
        currentParticipants,
        addTheParticipant;

      try {
        if (undefined === participants) {
          logger.logError('Parameter missing');
          publishError('24000');
          return;
        }

        if (typeof participants !== 'object'
            || null === participants
            || Object.keys(participants).length === 0) {
          publishError('24001');
          return;
        }

        if (null === session.getId()) {
          publishError('24002');
          return;
        }

        conference = session.currentCall;

        logger.logTrace(conference.peer(), conference);

        if ('conference' !== conference.breed()) {
          logger.logError('Conference not initiated ');
          publishError('24003');
          return;
        }

        logger.logInfo('Getting list of current participants');
        currentParticipants = conference.participants();
        logger.logTrace('currentParticipants', currentParticipants);

        logger.logInfo('Validating list of participants to add');
        for (counter = 0; counter < participants.length; counter += 1) {
          invitee = participants[counter];
          if (invitee.indexOf('sip:') > -1 || invitee.indexOf('tel:') > -1) {
            publishError('24007');
            return;
          }
          if (invitee.indexOf('@') === -1) {
            invitee = cleanPhoneNumber(invitee);
            if (false === invitee) {
              publishError('24006');
              return;
            }
          } else if (invitee.split('@').length > 2) {
            publishError('24007');
            return;
          }
          participants[counter] = invitee;
        }
        logger.logTrace('participants', participants);

        try {
          logger.logInfo('Adding Participant...');

          addTheParticipant = function (invitee) {
            /**
             * @event
             * Phone#conference:invitation-sending
             * @summary
             * Conference invitation-sending fires when an invitation is being sent
             * @desc
             * This event fires immediately when the host invokes `addParticipant(s)`
             * There should be an existing conference before in order to be able to receive this event
             * This event is fired host-side in response to a successful call to `addParticipant(s)` method
             * This event is followed by {@link Phone#conference:invitation-sent}
             * The event is fired with an attached event data of the following format:
             *
             * @type {object}
             * @property {Object} invitee - The invitee.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('conference:invitation-sending', {
              invitee: invitee,
              timestamp: new Date()
            });
            conference.addParticipant(invitee);
          };

          for (counter = 0; counter < participants.length; counter += 1) {
            logger.logInfo(counter);

            invitee = participants[counter];
            logger.logTrace('invitee', invitee);

            if (0 === Object.keys(currentParticipants).length) {
              addTheParticipant(invitee);
            } else {
              for (participant in currentParticipants) {
                if (currentParticipants.hasOwnProperty(participant)) {
                  if (invitee === participant) {
                    publishError('24005', {
                      invitee: invitee,
                      timestamp: new Date()
                    });
                    return;
                  }
                }
              }
              //adding participant when it doesn't matches the currentParticipants
              addTheParticipant(invitee);
            }
          }
        } catch (err) {
          logger.logInfo('Error during addParticipants');
          logger.logTrace(err);
          publishError('24004', err);
          return;
        }

      } catch (err) {
        logger.logInfo('Error during addParticipants');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /* TODO: Removing because this is not part of the public API
     * @summary
     * Add participant
     * @desc
     * Add a participant to a conference
     *
     * **Error Codes**
     *
     *   - 19000 - Participant parameter missing
     *   - 19001 - Internal error occurred
     * @param {String} participant
     *
     * @memberOf Phone
     * @instance
     *
     * @fires Phone#conference:invitation-sending
     * @fires Phone#conference:invitation-sent
     * @fires Phone#conference:invitation-accepted
     * @fires Phone#conference:invitation-rejected
     * @fires Phone#error

     * @example
     var phone = ATT.rtc.Phone.getPhone();
     phone.addParticipant('4250000001');
     */
    function addParticipant(invitee) {
      logger.logDebug('ATT.rtc.Phone: addParticipant');
      logger.logTrace('invitee', invitee);

      try {
        if (undefined === invitee) {
          publishError('19000');
          return;
        }
        try {
          logger.logInfo('Adding Participant...');
          this.addParticipants([invitee]);
        } catch (err) {
          logger.logInfo('Error during addParticipant');
          logger.logTrace(err);
          publishError('19001', err);
          return;
        }
      } catch (err) {
        logger.logInfo('Error during addParticipant');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * getParticipants
     * @summary
     * Get a list participants of the current conference
     * @desc
     * Use this function to get a list of participants active in the current conference.
     * There should be an established conference before `getParticipants` can be invoked
     * Only a host side can invoke `getParticipants`
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 21000 - Conference not initiated
     *   - 21001 - Internal error occurred
     *   - 21002 - User not Logged in
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.getParticipants();
     */
    function getParticipants() {
      logger.logDebug('ATT.rtc.Phone: getParticipants');

      var conference,
        participants;

      try {

        if (null === session.getId()) {
          publishError('21002');
          return;
        }
        conference = session.currentCall;

        if (null === conference
            || 'conference' !== conference.breed()) {
          publishError('21000');
          return;
        }
        try {
          logger.logTrace(conference.peer(), conference);

          logger.logInfo('Getting participants...');

          participants = conference.participants();
          logger.logTrace('participants', participants);

          return participants;
        } catch (err) {
          logger.logError('Error during getParticipants');
          logger.logTrace(err);
          publishError('21001', err);
          return;
        }
      } catch (err) {
        logger.logError('Error during getParticipants');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * removeParticipant
     * @summary
     * Remove a participant from the current conference
     * @desc
     * Use this function to remove a participant from the current conference.
     * There should be an established conference before `removeParticipant` can be invoked
     * Only a host side can invoke `removeParticipant`
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 25000 - User is not logged in
     *   - 25001 - Conference not initiated
     *   - 25002 - Participant parameter missing
     *   - 25003 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.removeParticipant('johnny');
     */
    function removeParticipant(participant) {
      logger.logDebug('ATT.rtc.Phone: removeParticipant');

      var conference;

      try {

        if (null === session.getId()) {
          publishError('25000');
          return;
        }

        conference = session.currentCall;

        if (null === conference
            || 'conference' !== conference.breed()) {
          publishError('25001');
          return;
        }

        if (undefined === participant) {
          publishError('25002');
          return;
        }

        try {
          logger.logTrace(conference.peer(), conference);

          logger.logInfo('Removing participant');
          conference.removeParticipant(participant);
        } catch (err) {
          logger.logError('Error during removeParticipant');
          logger.logTrace(err);
          publishError('25003');
          return;
        }
      } catch (err) {
        logger.logError('Error during removeParticipant');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * endConference
     * @summary
     * End the current conference conference
     * @desc
     * Use this function to end an ongoing conference.
     * There should be an established conference before `endConference` can be invoked.
     * If a participant side invokes `endConference` he is ejected and the host is notified.
     * If the host side invokes endConference all the participants are disconnected and the conference
     * is closed.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 23000 - Internal error occurred
     *   - 23001 - User is not logged in
     *   - 23002 - Conference not initiated
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#conference:disconnecting
     * @fires Phone#conference:ended
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.endConference();
     */
    function endConference() {
      logger.logDebug('ATT.rtc.Phone: endConference');

      var conference;

      try {
        if (null === session.getId()) {
          publishError('23001');
          return;
        }

        conference = session.currentCall;

        if (null === conference || 'conference' !== conference.breed()) {
          publishError('23002');
          return;
        }

        logger.logTrace(conference.peer(), conference);

        conference.on('disconnecting', function (data) {
          logger.logDebug('conference.on: disconnecting');
          logger.logInfo('conference:disconnecting event by ATT.rtc.Phone');
          logger.logTrace('data', data);
          /**
           * @event
           * Phone#conference:disconnecting
           * @summary
           * Conference disconnecting event fires when a conference is in the process of disconnecting.
           * @desc
           * This event fires immediately when the user invokes `endConference`
           * There should be an existing conference in order to be able to receive this event.
           * The event is fired with an attached event data of the following format:
           *
           * @type {object}
           * @property {String} [from] - The phone number/user id of the conference initiator for participant side
           * @property {Object} [participants] - The participants list for host side
           * @property {Object} [invitations] - The invitations list for host side.
           * @property {String} mediaType - The media type of the conference (audio or video).
           * @property {String} codec - The codec used by the conference.
           * @property {Date} timestamp - Event fire time.
           */
          emitter.publish('conference:disconnecting', data);
        });

        try {
          logger.logInfo('Disconnecting conference');
          conference.disconnectConference();
        } catch (err) {
          logger.logError('Error during endConference');
          logger.logTrace(err);
          publishError('23000', err);
          return;
        }
      } catch (err) {
        logger.logError('Error during endConference');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * rejectConference
     * @summary
     * Reject an incoming conference invite
     * @desc
     * Use this method to reject an incoming conference invite
     * There should be an existing un-accepted conference before `rejectConference` can be called.
     * Only the participant side can invoke `rejectConference`
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     *  ** Error Codes **
     *
     *  - 22000 - Internal error occurred
     *  - 22001 - User is not logged in
     *  - 22002 - No conference invite
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#conference:ended
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.rejectConference();
     */
    function rejectConference() {
      logger.logDebug('ATT.rtc.Phone: rejectConference');

      try {

        if (null === session || null === session.getId()) {
          publishError('22001');
          return;
        }
        if (null === session.pendingCall) {
          publishError('22002');
          return;
        }

        try {
          var conference = session.pendingCall;

          logger.logTrace(conference.peer(), conference);

          logger.logInfo('Rejecting conference invite...');
          conference.reject();

        } catch (err) {
          logger.logError('Error during reject conference');
          logger.logTrace(err);
          publishError('22000');
          return;
        }

      } catch (err) {
        logger.logError('Error during reject conference');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * mute
     * @summary
     * Mute the current call or conference.
     * @desc
     * Use this function to mute the local media for current call or conference.
     * The other party(ies) will no longer receive any audio, video (if available) will continue to be received
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 9000 - Mute failed- Call is not in progress
     *   - 9001 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#call:muted
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.mute();
     */
    function mute() {
      logger.logDebug('ATT.rtc.Phone: mute');

      try {
        var call = session.currentCall;

        if (null === call || null === call.id) {
          publishError('9000');
          return;
        }

        try {

          logger.logTrace(call.peer(), call);

          call.on('muted', function (data) {
            logger.logDebug('call.on: muted');
            logger.logInfo('call:muted event by ATT.rtc.Phone');
            /**
             * @event
             * Phone#call:muted
             * @summary
             * Call muted event fires when the media is successfully muted.
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an established call or conference in order to be able to receive this event.
             * This event is fired in response to a successful call to `mute` method
             * The event is fired with an attached event data of the following format:
             *
             * @type {object}
             * @property {String} [to] - The phone number/id of the called party (for an outgoing call).
             * @property {String} [from] - The phone number/id of the calling party or conference initiator.
             * @property {String} mediaType - The media type of the call or conference (audio/video).
             * @property {Array} codec - The CODECs associated with the call or conference.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:muted', data);
          });

          if ('muted' === call.getState()) {
            logger.logWarning('warning event by ATT.rtc.Phone');

            emitter.publish('warning', {
              message : 'Already muted'
            });
            return;
          }
          if (validOperation('mute', call.getState())) {
            logger.logInfo('Muting...');
            call.mute();
            return;
          }
          logger.logWarning('Invalid operation mute. Call state is ' + call.getState());

        } catch (err) {
          logger.logError('Error during mute');
          logger.logTrace(err);
          publishError('9001');
          return;
        }
      } catch (err) {
        logger.logError('Error during mute');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * unmute
     * @summary
     * Unmute the current call or conference
     * @desc
     * Use this function to unmute the local media for current call or conference.
     * The other party(ies) will start receiving audio.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 10000 - Unmute failed- No media stream
     *   - 10001 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#call:unmuted
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.unmute();
     */
    function unmute() {
      logger.logDebug('ATT.rtc.Phone: unmute');

      try {
        var call = session.currentCall;

        if (null === call || null === call.id) {
          publishError('10000');
          return;
        }

        try {

          logger.logTrace(call.peer(), call);

          call.on('unmuted', function (data) {
            logger.logDebug('call.on: unmuted');
            logger.logInfo('call:unmuted event by ATT.rtc.Phone');
            /**
             * @event
             * Phone#call:unmuted
             * @summary
             * Call unmuted event fires when the media is successfully unmuted.
             * @desc
             * The user has to be logged in order to be able to receive this event.
             * There should be an established call or conference in order to be able to receive this event.
             * This event is fired in response to a successful call to `unmute` method
             * The event is fired with an attached event data of the following format:
             *
             * @type {object}
             * @property {String} [to] - The phone number/id of the called party (for an outgoing call).
             * @property {String} [from] - The phone number/id of the calling party or conference initiator.
             * @property {String} mediaType - The media type of the call or conference (audio/video).
             * @property {Array} codec - The CODECs associated with the call or conference.
             * @property {Date} timestamp - Event fire time.
             */
            emitter.publish('call:unmuted', data);
          });

          if ('unmuted' === call.getState()) {
            logger.logWarning('warning event by ATT.rtc.Phone');
            emitter.publish('warning', {
              message : 'Already unmuted'
            });
            return;
          }
          if (validOperation('unmute', call.getState())) {
            logger.logInfo('Unmuting...');
            call.unmute();
            return;
          }
          logger.logWarning('Invalid operation unmute. Call state is ' + call.getState());

        } catch (err) {
          logger.logError('Error during unmute');
          logger.logTrace(err);
          publishError('10001');
          return;
        }

      } catch (err) {
        logger.logError('Error during unmute');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * hold
     * @summary
     * Put the current call or conference on hold
     * @desc
     * Use this function to put the other party(ies) on hold.
     * The other party(ies) will no longer get the media (audio and video)
     * There should be an existing established call or conference before `hold` can be called.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error codes**
     *
     *   - 7000 - Hold failed - Call is not in progress
     *   - 7001 - Internal error occurred
     *   - 7508 - A media modification is in progress for the callId
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#call:held
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.hold();
     */
    function hold() {
      logger.logDebug('ATT.rtc.Phone: hold');

      var call;

      try {
        call = session.currentCall;

        logger.logTrace(call.peer(), call);

        if (null === call || null === call.id()) {
          publishError('7000');
          return;
        }

        if ('held' === call.getState()) {
          logger.logWarning('Call is already on hold');
          emitter.publish('warning', {
            message: 'Call is already on hold',
            timestamp: new Date()
          });
          return;
        }

        try {
          if (validOperation('hold', call.getState())) {
            logger.logInfo('Holding...');

            call.hold();
            return;
          }
          logger.logWarning('Invalid operation hold. Call state is ' + call.getState());

        } catch (err) {
          logger.logError('Error during hold');
          logger.logTrace(err);
          publishError('7001');
          return;
        }
      } catch (err) {
        logger.logError('Error during hold');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * resume
     * @summary
     * Resume the current call or conference
     * @desc
     * Use this function to resume the other party(ies) that was(were) put on hold previously.
     * The other party(ies) will start receiving the media (audio and video).
     * There should be an existing established call or conference on hold before `resume` can be invoked.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 8000 - Resume failed - Call is not in progress
     *   - 8001 - Call is not on hold
     *   - 8002 - Internal error occurred
     *   - 8508 - A media modification is in progress for the callId
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#call:resumed
     * @fires Phone#error
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.resume();
     */
    function resume() {
      logger.logDebug('ATT.rtc.Phone: resume');
      var call;

      try {
        call = session.currentCall;

        logger.logTrace(call.peer(), call);

        if (null === call || null === call.id()) {
          publishError('8000');
          return;
        }

        if (!validOperation('resume', call.getState())) {
          publishError('8001');
          return;
        }

        try {
          logger.logInfo('Holding...');
          call.resume();
        } catch (err) {
          logger.logError('Error during resume');
          logger.logTrace(err);
          publishError('8002');
          return;
        }
      } catch (err) {
        logger.logError('Error during resume');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * move
     * @summary
     * Move the current call to a different endpoint/device
     * @desc
     * Use this function to move the current call to another client.
     * The current user should be logged in to at least two different sessions before a call
     * can be moved.
     * There has to be an established call before `move` can be invoked.
     * All endpoints(devices) with sessions for the current user will start to ring.
     * The user can choose to answer on any of the other endpoints(devices)
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 28000 - Move failed - User is not logged in
     *   - 28001 - Call is not in progress
     *   - 28002 - Internal error occurred
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.move();
     */
    function move() {
      logger.logDebug('ATT.rtc.Phone: move');

      var call;

      try {

        if (null === session || null === session.getId()) {
          publishError('28000');
          return;
        }

        call = session.currentCall;

        if (null === call || null === call.id()) {
          publishError('28001');
          return;
        }

        try {
          logger.logTrace(call.peer(), call);

          logger.logInfo('Moving...');
          call.move();
        } catch (err) {
          logger.logError('Error during move');
          logger.logTrace(err);
          publishError('28002');
          return;
        }

      } catch (err) {
        logger.logError('Error during move');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }
    }

    /**
     * @method
     * switchCall
     * @summary
     * Switches the active call or conference with the one in the background.
     * @desc
     * Use this function to switch between an active call or conference and a background.
     * call or conference.
     *
     * **Pre-conditions**
     * There should be at least two established calls before `switchCall` can be invoked.
     *
     * **Post-conditions**
     * If the call that's being brought to the foreground was put on hold
     * by calling {@link Phone#hold} then the call will be kept on hold,
     * otherwise the call will be resumed automatically.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 30000 - Internal error occurred
     *   - 30001 - User is not logged in
     *   - 30002 - Switch failed - Call is not in progress
     *   - 30003 - Switch failed - only one call is in progress
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @fires Phone#session:call-switched
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.switchCall();
     *
     */
    function switchCall() {
      logger.logDebug('ATT.rtc.Phone: switchCall');

      var currentCall = session.currentCall;

      function switchToCall() {
        logger.logDebug('ATT.rtc.Phone: switchToCall');

        var callId,
          calls,
          switchToCallId;

        currentCall.off('held', switchToCall);

        calls = session.getCalls();

        for (callId in calls) {
          if (calls.hasOwnProperty(callId)) {
            if (callId !== currentCall.id()) {
              switchToCallId = callId;
              break;
            }
          }
        }

        logger.logInfo('Switching calls...');
        logger.logTrace('Switch to call id', switchToCallId);

        session.switchTo(switchToCallId);

        currentCall = session.currentCall;

        if ('held' === currentCall.getState()
            && currentCall.autoresume) {
          logger.logInfo('resuming current call');
          currentCall.resume();
          currentCall.autoresume = false;
        }
      }

      try {
        if (null === session || null === session.getId()) {
          publishError(30001);
          return;
        }

        if (null === session.currentCall || null === session.currentCall.id()) {
          publishError(30002);
          return;
        }

        if (2 > Object.keys(session.getCalls()).length) {
          publishError(30003);
          return;
        }

        logger.logTrace(currentCall.peer(), currentCall);

        if ('held' !== currentCall.getState()) {
          logger.logInfo('Putting current call on hold');

          currentCall.on('held', switchToCall);

          currentCall.hold();
          currentCall.autoresume = true;
          return;
        }

        switchToCall();

      } catch (err) {
        logger.logError('Error during switch');
        logger.logTrace(err);
        publishError(30000);
        return;
      }
    }

    /*
     * --@method
     * transfer
     * --@summary
     * Transfer an established call to a third party
     * --@desc
     * Use this function to transfer an established call between a transferee and a transferer
     * to the transfer-target.
     * There should be an established call that is on hold.
     * There should be a second established call with transfer target
     * `transfer` will transfer the other party of the first call to the other party of the second call
     * and drop the current user from the call.
     * This method can fire {@link Phone#event:error} event with errors that can have these error codes:
     *
     * **Error Codes**
     *
     *   - 29000 - Internal error occurred
     *   - 29001 - User is not logged in
     *   - 29002 - Transfer failed - Call is not in progress
     *   - 29003 - Cannot make a third call
     *
     * --@memberOf Phone
     * --@public
     * --@instance
     *
     * --@example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.transfer();
     */
    function transfer() {
      logger.logDebug('ATT.rtc.Phone: transfer');

      var call;

      try {

        if (null === session || null === session.getId()) {
          publishError('29001');
          return;
        }

        call = session.currentCall;

        if (null === call || null === call.id()) {
          publishError('29002');
          return;
        }

        try {
          logger.logTrace(call.peer(), call);

          logger.logWarning('Transfer not implemented yet');
        } catch (err) {
          logger.logError('Error during transfer call');
          logger.logTrace(err);
          publishError('29000', err);
          return;
        }

      } catch (err) {
        logger.logError('Error during transfer call');
        logger.logTrace(err);
        emitter.publish('error', {
          error: err
        });
      }

    }

    /**
     * @method
     * getMediaType
     * @summary
     * Get the media type of the current call or conference.
     * @desc
     * Use this function to get the media type of the ongoing call.
     * @returns {String} `audio` or `video`. Null if no current call.
     *
     * @memberOf Phone
     * @public
     * @instance
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.getMediaType();
     */
    function getMediaType() {
      logger.logDebug('ATT.rtc.Phone: getMediaType');
      logger.logInfo('Getting current call media type...');

      var call = session.currentCall;

      logger.logTrace(call.peer(), call);
      logger.logTrace('MediaType', call.mediaType());

      return call ? call.mediaType() : null;
    }

    /**
     * @method
     * isCallInProgress
     * @summary
     * Checks if there is a call on conference in progress
     * @desc
     * Returns `true` if there is a call or conference in progress.
     *
     * @memberOf Phone
     * @public
     * @instance
     * @deprecated
     *
     * @returns {Boolean} `true` if there is an active call, `false` otherwise.
     *
     * @example
     * var phone = ATT.rtc.Phone.getPhone();
     * phone.isCallInProgress();
     */
    function isCallInProgress() {
      logger.logDebug('ATT.rtc.Phone: isCallInProgress');
      logger.logInfo('Checking if current call exists...');

      var call = session.currentCall;

      if (null !== call) {
        logger.logTrace('Call in progress', true);
        logger.logTrace(call.peer(), call);
        return true;
      }
      logger.logTrace('Call in progress', false);
      return false;
    }

    // ===================
    // Phone interface
    // ===================
    this.on = on;

    // ===================
    // Session interface
    // ===================
    this.getSession = getSession; //TODO: remove this public method
    this.login = login;
    this.associateE911Id = associateE911Id;
    this.logout = logout;

    // ===================
    // Call interface
    // ===================
    this.dial = dial;
    this.addCall = addCall;
    this.answer = answer;
    this.hangup = hangup;
    this.cancel = cancel;
    this.reject = reject;
    this.move = move;
    this.transfer = transfer;

    // ===================
    // Conference interface
    // ===================
    this.startConference = startConference;
    this.joinConference = joinConference;
    this.endConference = endConference;
    this.rejectConference = rejectConference;
    this.addParticipants = addParticipants;
    this.addParticipant = addParticipant;
    this.getParticipants = getParticipants;
    this.removeParticipant = removeParticipant;

    // ==================
    // Common interface
    // ===================
    this.mute = mute;
    this.unmute = unmute;
    this.hold = hold;
    this.resume = resume;
    this.switchCall = switchCall;

    // ==================
    // Utility methods
    // ===================
    this.getCalls = getCalls;
    this.getMediaType = getMediaType;
    this.isCallInProgress = isCallInProgress;
    this.cleanPhoneNumber = cleanPhoneNumber;
    this.formatNumber = formatNumber;
  }

  if (undefined === ATT.private) {
    throw new Error('Error exporting ATT.private.Phone.');
  }
  ATT.private.Phone = Phone;

  if (undefined === ATT.rtc) {
    throw new Error('Error exporting ATT.rtc.Phone.');
  }

  /**
   * @namespace
   * ATT.rtc.Phone
   *
   * @summary
   * Phone API for AT&T's Enhanced WebRTC functionality.
   *
   * @desc The ATT.rtc.Phone namespace provides the main method to get an instance of the `Phone` Object.
   * A `Phone` object allows users to utilize the functionality provided by AT&T's Enhanced WebRTC SDK
   * with operations like make a conference or call, answer an incoming call and hold or resume
   * an existing call.
   * Adding and removing participants to or from a conference can also be performed using the
   * `Phone` object.
   *
   */

  ATT.rtc.Phone = (function () {
    var instance;

    return {
      /**
       * @function
       * getPhone
       * @summary
       * Get the current instance of Phone.
       * @description
       * The public method is used for getting an instance of the `Phone` object.
       * A `Phone` instance is required before any operation related to AT&T's
       * Enhanced WebRTC can be performed.
       * At any given time, there can one be one `Phone` object and any calls to
       * this function return the same object.
       * @static
       * @memberof ATT.rtc.Phone
       * @returns {Phone} A `Phone` object.
       */
      getPhone: function () {
        logger.logDebug('ATT.rtc.Phone: getPhone');

        if (undefined === instance) {
          instance = new ATT.private.Phone();
        }
        return instance;
      }
    };
  }());

}());
;/*jslint browser: true, devel: true, node: true, debug: true, todo: true, indent: 2, maxlen: 150 */
/*global ATT*/

/** This is going to be the main entry/assembly module for the SDK 
 * By the time this file is loaded, all other modules have already 
 * been loaded, so we can assume the following functions and objects
 * already exist:
 * - ATT
 * - ATT.utils
 * - ATT.utils.createErrorDictionary
*/
(function () {

  'use strict';

  var logMgr = ATT.logManager.getInstance(),
    logger = logMgr.getLogger('att.main');

  logger.logDebug('Loading att.main...');

  logger.logInfo('Attempting to load Enhanced WebRC SDK...');

  // Fail if ATT is not defined. Everything else depends on it.
  if (undefined === window.ATT) {
    logger.logError('Cannot load Enhanced WebRTC SDK. ATT is not defined.');
    return;
  }

  logger.logInfo('Loading error dictionary...');

  // Create an Error Dictionary
  if (undefined === ATT.utils.createErrorDictionary) {
    logger.logError('Failed to load error dictionary. Missing ATT.utils.createErrorDictionary.');
    return;
  }

  ATT.errorDictionary = ATT.utils.createErrorDictionary(ATT.utils.ErrorStore.SDKErrors.getAllSDKErrors(),
    ATT.utils.ErrorStore.APIErrors.getAllAPIErrors());

  if (undefined === ATT.errorDictionary || null === ATT.errorDictionary) {
    logger.logError("Failed to create error dictionary");
  }

  logger.logInfo("Loading error dictionary complete");

  logger.logInfo("Loading Enhanced WebRC SDK complete");

}());