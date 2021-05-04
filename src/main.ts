/*
* Sync events from a 'source' calendar to a 'satellite' calendar.
*
* For L1 shifts, create a reminder the next morning to
* send a handover email.
*
*/

const cfg    = require('config');
const log4js = require('log4js')


import calendarModel   from 'calendar-model'
import {addEvent, deleteEvent, determineEventSummary, prepareEventDetails, extractTimeStamp, iCalendarEvent} from './lib/calendarUtils'

/*
* Initialize
*/


// logs 

log4js.configure(cfg.log.log4jsConfigs);

var log = log4js.getLogger(cfg.log.appName);
log.setLevel(cfg.get('log.level'));






function main () {

  /*
  * Main program
  */


  log.info('Begin script');
  log.info('============');


  /*
  * Global configs
  */
  const monthsToLookAhead = (cfg.has('monthsToLookAhead'))? cfg.monthsToLookAhead : 2;

  /*
  * Setup calendars
  */

  const calendarParams = {
    googleScopes:     cfg.auth.googleScopes,
    tokenDir:         cfg.auth.tokenFileDir,
    clientSecretFile: cfg.auth.clientSecretFile,
    log4js:           log4js,
    logLevel:         cfg.log.level
  }

  const sourceCalendar = new calendarModel(Object.assign({},calendarParams,{
    name: "Source",
    calendarId:   cfg.calendars.source.calendarId,
    tokenFile:    cfg.calendars.source.auth.tokenFile,
    googleScopes: cfg.calendars.source.auth.googleScopes,
  }));
  const satelliteCalendar = new calendarModel(Object.assign({},calendarParams,{
    name: "Satellite",
    calendarId:   cfg.calendars.satellite.calendarId,
    tokenFile:    cfg.calendars.satellite.auth.tokenFile,
    googleScopes: cfg.calendars.satellite.auth.googleScopes
  }));


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
      for (var sourceCalendarEvent of sourceCalendarEvents) { 

        const {summary, start, end} = sourceCalendarEvent
        
        const [startTimeStamp, endTimeStamp, comparisonSummary] = 
          [extractTimeStamp(start), extractTimeStamp(end), determineEventSummary(summary)]

        log.info ('Comparing source event -');
        logEventDetails(sourceCalendarEvent)

        var matched = false

        for (var j in satelliteCalendarEvents) {

          var satelliteCalendarEvent = satelliteCalendarEvents[j];
          
          const {summary: summary2, start: start2, end: end2} = satelliteCalendarEvent

          const [startTimeStamp2, endTimeStamp2, comparisonSummary2] = 
            [extractTimeStamp(start2), extractTimeStamp(end2), determineEventSummary(summary2)]

          log.info('+--> Comparing to satellite event -');
          logEventDetails(satelliteCalendarEvent)

          if (comparisonSummary == comparisonSummary2
              && startTimeStamp == startTimeStamp2
              && endTimeStamp == endTimeStamp2
          ) {

            const satelliteCalendarEventString = satelliteCalendar.getEventString(satelliteCalendarEvent)
            log.info('+ Matched event: ' + satelliteCalendarEventString);
            matched = true

            delete satelliteCalendarEvents[j];
            break

          }

        }

        if (!matched) {
          const sourceCalendarEventString = sourceCalendar.getEventString(sourceCalendarEvent)
          log.info('No matches found for %s', sourceCalendarEventString)
          const eventDetails = prepareEventDetails({
            eventDetails: sourceCalendarEvent,
            syncToken: cfg.calendars.satellite.syncToken,
            attendees: cfg.calendars.satellite.attendees,
            prefixText: cfg.calendars.satellite.prefixText,
            overriddenSummary: cfg.calendars.satellite.overriddenSummary
          })
          addEvent({eventDetails, calendar: satelliteCalendar, log})
        }
      }

      // Any events left over in the work calendar are unwanted.
      // They were probably events that have been cancelled.
      for (var j in satelliteCalendarEvents) {

        var satelliteCalendarEvent = satelliteCalendarEvents[j]

        log.info('Deleting extra event in satellite calendar: ' + satelliteCalendar.getEventString(satelliteCalendarEvent))
        deleteEvent({event: satelliteCalendarEvent, calendar: satelliteCalendar, log});
        delete satelliteCalendarEvents[j];

      }

    });

  });
}

function logEventDetails (
  {id, summary, start, end}: Pick<iCalendarEvent, "id" | "summary" | "start" | "end">
): void {

  const comparisonSummary = determineEventSummary({
    summary,
    prefixText: cfg.calendars.satellite.prefixText,
    overriddenSummary: cfg.calendars.satellite.overriddenSummary
  })
  const eventString = calendarModel.prototype.getEventString({id, summary, start, end})

  log.info ('Event Key:          ' + eventString);
  log.debug('Event Id:           ' + id);
  log.debug('Event summary:      ' + summary);
  log.debug('Start Time:         ' + ((start.dateTime)? start.dateTime : start.date));
  log.debug('End Time:           ' + ((end.dateTime)?   end.dateTime   : end.date));
  log.debug('Comparison summary: ' + comparisonSummary);
}


module.exports = main
