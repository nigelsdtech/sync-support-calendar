var cfg   = require('config');
var defer = require('config/defer').deferConfig;

module.exports = {

  appName: 'sync-calendars',

  auth: {
    credentialsDir:   process.env.HOME+'/.credentials',
    clientSecretFile: defer( function (cfg) { return cfg.auth.credentialsDir+'/client_secret.json' } ),
    tokenFileDir:     defer( function (cfg) { return cfg.auth.credentialsDir } ),
    tokenFile:        defer( function (cfg) {
      return 'access_token_'.concat(
        cfg.appName,
        (process.env.NODE_ENV && process.env.NODE_ENV != "production")? `-${process.env.NODE_ENV}` : "",
        (process.env.NODE_APP_INSTANCE)? `-${process.env.NODE_APP_INSTANCE}`: "",
        ".json"
      )
    }),
    googleScopes:     ['https://www.googleapis.com/auth/calendar']
  },

  log: {
    appName: defer(function (cfg) { return cfg.appName } ),
    level:   'INFO',
    logDir: './logs',
    log4jsConfigs: {
      appenders: [
        {
          type:       'console'
        },
        {
          type:       'file',
          filename:   defer(function (cfg) {
            return cfg.log.logDir.concat(
              "/" + cfg.appName,
              (process.env.NODE_ENV)? `-${process.env.NODE_ENV}` : "",
              (process.env.NODE_APP_INSTANCE)? `-${process.env.NODE_APP_INSTANCE}`: "",
              ".log"
            )
          }),
          category:   defer(function (cfg) { return cfg.log.appName }),
          reloadSecs: 60,
          maxLogSize: 256000
        }
      ]
    }
  },

  useHandoverReminders: false,

  calendars: {
    source: {
      calendarId: "OVERRIDE_ME",
      searchText: "OVERRIDE_ME",
      auth: {
        tokenFile:  defer( function (cfg) { return cfg.auth.tokenFile.replace(".json", "-source.json") } ),
        googleScopes: ['https://www.googleapis.com/auth/calendar.events.readonly']
      }
    },
    satellite: {
      calendarId: "primary",
      prefixText: null,
      syncToken: process.env.NODE_APP_INSTANCE,
      attendees: null,
      overriddenSummary: null,
      auth: {
        tokenFile:  defer( function (cfg) { return cfg.auth.tokenFile.replace(".json", "-satellite.json") } ),
        googleScopes: ['https://www.googleapis.com/auth/calendar.events']
      }
    }
  }
}
