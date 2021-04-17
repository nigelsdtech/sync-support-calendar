/*
* Sync the support rota with your personal calendar.
*
* For L1 shifts, create a reminder the next morning to
* send a handover email.
*
*/


var cfg           = require('config');
var log4js        = require('log4js');
var calendarModel = require('calendar-model')


/*
* Initialize
*/


// logs 

log4js.configure(cfg.log.log4jsConfigs);

var log = log4js.getLogger(cfg.get('log.appName'));
log.setLevel(cfg.get('log.level'));





/*
* Main program
*/


log.info('Begin script');
log.info('============');


/*
 * Global configs
 */

const useHandoverReminders = (cfg.has('useHandoverReminders'))? cfg.useHandoverReminders : false;
const monthsToLookAhead = (cfg.has('monthsToLookAhead'))? cfg.monthsToLookAhead : 2;

/*
 * Setup calendars
 */

const calendarParams = {
  googleScopes:     cfg.auth.googleScopes,
  tokenFile:        cfg.auth.tokenFile,
  tokenDir:         cfg.auth.tokenFileDir,
  clientSecretFile: cfg.auth.clientSecretFile,
  log4js:           log4js,
  logLevel:         cfg.log.level
}

const satelliteCalendar = new calendarModel(Object.assign({},calendarParams,{
  name: "Satellite",
  calendarId: cfg.calendars.satellite.calendarId
}));

const sourceCalendar = new calendarModel(Object.assign({},calendarParams,{
  name: "Source",
  calendarId: cfg.calendars.source.calendarId
}));




function addShift (supportRotaEv) {

  const attendees = cfg.calendars.satellite.attendees;

  const satelliteEventSummary = (() => {
    if (cfg.calendars.satellite.prefixText) { return ""+cfg.calendars.satellite.prefixText+supportRotaEv.summary}
    return summary
  })()
  
  const newEv = {
    summary: satelliteEventSummary,
    extendedProperties: {
      private: {
        syncCalendarToken: cfg.calendars.satellite.syncToken
      }
    },
    attendees,
    start: supportRotaEv.start,
    end: supportRotaEv.end,
    hangoutLink: supportRotaEv.hangoutLink
  }

  log.info('========')
  log.info('Creating shift:')
  log.info('Summary:    ' + newEv.summary);
  log.info('Start Time: ' + newEv.start.dateTime);
  log.info('End Time:   ' + newEv.end.dateTime);

  satelliteCalendar.addEventToGoogle(newEv, function(resp) {});
  
  // If it is an L1 event, add a reminder the next morning
  if (useHandoverReminders && newEv.summary == cfg.get('calendars.source.searchText')+" L1") {
  
    log.info('Creating reminder for L1 shift')
  
  
    // The reminder goes off at 9 am the next day
    var d = new Date(newEv.start.dateTime);
    var startTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 9, 0);
    var endTime   = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 9, 1);
  
    var reminderEv = {}
    reminderEv.summary   = "Send handover email"
    reminderEv.reminders = {setDefault: 1}
    reminderEv.start     = {dateTime: startTime}
    reminderEv.end       = {dateTime: endTime}
    reminderEv.attendees = attendees;

    satelliteCalendar.addEventToGoogle(reminderEv, function(resp) {});
  }


  log.info('========')


}


function removeShift (ev) {

  satelliteCalendar.deleteEventFromGoogle(ev, function () {})

  // If it is an L1 event, delete next morning's reminder
  if (useHandoverReminders && ev.summary == cfg.get('calendars.source.searchText')+" (L1)") {
  
    log.info('Removing reminder for L1 shift')
  
  
    // The reminder goes off at 9 am the next day
    var d = new Date(ev.start.dateTime);
    var timeMin = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 9, 0);
    var timeMax = new Date(d.getFullYear(), d.getMonth(), d.getDate()+1, 9, 1);
  
    var params = {
      timeMin: timeMin,
      timeMax: timeMax,
      textSearch: "Send handover email"
    }

    satelliteCalendar.loadEventsFromGoogle(params, function (handoverReminderEvs) {

      // There is a possibility we have multiple handover reminders.
      // While this shouldn't have happened, it's not a problem to just nuke all.
      for (var i in handoverReminderEvs) { 

        var hrEv = handoverReminderEvs[i];
        satelliteCalendar.deleteEventFromGoogle(hrEv)
      }

    })

  }

}



// Search time is between 00:00 this morning and 2 months from then
// I.e. you're syncing all events between today and 2 months hence.
var d = new Date();
var timeMin = new Date(d.getFullYear(), d.getMonth(), d.getDate());
var timeMax = new Date(new Date(timeMin).setMonth(timeMin.getMonth()+monthsToLookAhead))
//var timeMax = new Date(new Date(timeMin).setDate(timeMin.getDate()+7))

const sourceCalendarSearchParams = {
  timeMin: timeMin,
  timeMax: timeMax,
  textSearch: cfg.calendars.source.searchText
}

sourceCalendar.loadEventsFromGoogle(sourceCalendarSearchParams, function (sourceCalendarEvents) {

  log.trace('Source Calendar:');
  log.trace(sourceCalendarEvents);


  const satelliteCalendarSearchParams = {
    timeMin,
    timeMax,
    privateExtendedProperty: `syncCalendarToken=${cfg.calendars.satellite.syncToken}`,
    retFields: "items(id,summary,startTime,endTime)"
  }

  satelliteCalendar.loadEventsFromGoogle(satelliteCalendarSearchParams, function (satelliteCalendarEvents) {

    log.trace('Satellite Calendar:');
    log.trace(satelliteCalendarEvents);

    /*
    * Loop through each item comparing the name, start time,
    * and end time. That's what makes them a match.
    */
    for (var i in sourceCalendarEvents) { 

      var sourceCalendarEvent = sourceCalendarEvents[i];

      var sourceCalendarEventString = sourceCalendar.getEventString(sourceCalendarEvent)
      var id        = sourceCalendarEvent.id;
      var summary   = sourceCalendarEvent.summary;
      var startTime = new Date(sourceCalendarEvent.start.dateTime);
      var endTime   = new Date(sourceCalendarEvent.end.dateTime);

      log.info('Comparing event: ' + sourceCalendarEventString);
      log.debug('Event Id:      ' + id);
      log.debug('Event summary: ' + summary);
      log.debug('Start Time:    ' + startTime);
      log.debug('End Time:      ' + endTime);

      var matched = false

      const satelliteEventComparisonSummary = (() => {
        if (cfg.calendars.satellite.prefixText) { return ""+cfg.calendars.satellite.prefixText+summary}
        return summary
      })()
      log.debug('Comparison:    ' + satelliteEventComparisonSummary);

      for (var j in satelliteCalendarEvents) {

        var satelliteCalendarEvent = satelliteCalendarEvents[j];

        var satelliteCalendarEventString = satelliteCalendar.getEventString(satelliteCalendarEvent)

        var id2        = satelliteCalendarEvent.id;
        var summary2   = satelliteCalendarEvent.summary;
        var startTime2 = new Date(satelliteCalendarEvent.start.dateTime);
        var endTime2   = new Date(satelliteCalendarEvent.end.dateTime);

        // Determine the comparison string

        log.debug('+--> Comparison Event: ' + satelliteCalendarEventString);
        log.debug('Event Id:      ' + id2);
        log.debug('Event summary: ' + summary2);
        log.debug('Start Time:    ' + startTime2);
        log.debug('End Time:      ' + endTime2);

        if (satelliteEventComparisonSummary == summary2
            && startTime.getTime() == startTime2.getTime()
            && endTime.getTime() == endTime2.getTime()
        ) {

          log.info('+ Matched event: ' + satelliteCalendarEventString);
          matched = true

          delete satelliteCalendarEvents[j];
          break

        }

      }

      if (!matched) {
        log.info('No matches found for %s', sourceCalendarEventString)
        addShift(sourceCalendarEvent)
      }
    }

    // Any events left over in the work calendar are unwanted. They
    // were probably shifts that were given away.
    for (var j in satelliteCalendarEvents) {

      var satelliteCalendarEvent = satelliteCalendarEvents[j]

      log.info('Deleting extra event in satellite calendar: ' + satelliteCalendar.getEventString(satelliteCalendarEvent))
      removeShift(satelliteCalendarEvent);
      delete satelliteCalendarEvents[j];

    }

  });

});
