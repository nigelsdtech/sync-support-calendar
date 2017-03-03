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

log4js.configure(cfg.get('log.log4jsConfigs'));

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

var useHandoverReminders = false;
if (cfg.has('useHandoverReminders')) {
  useHandoverReminders = cfg.get('useHandoverReminders');
}



/*
 * Setup calendars
 */

var calendarParams = {
  name:             "Work Primary",
  calendarId:       cfg.get('calendars.workPrimary.calendarId'),
  googleScopes:     cfg.get('auth.scopes'),
  tokenFile:        cfg.get('auth.tokenFile'),
  tokenDir:         cfg.get('auth.tokenFileDir'),
  clientSecretFile: cfg.get('auth.clientSecretFile'),
  log4js:           log4js,
  logLevel:         cfg.get('log.level')
}
var workPrimary = new calendarModel(calendarParams);

calendarParams.name             = "Support Rota"
calendarParams.calendarId       = cfg.get('calendars.support.calendarId')

var supportRota = new calendarModel(calendarParams);




function addShift (supportRotaEv) {

  var attendees = cfg.get('calendars.workPrimary.attendees');
  
  var newEv = {}
  newEv.summary   = supportRotaEv.summary;
  newEv.start     = supportRotaEv.start;
  newEv.end       = supportRotaEv.end;
  newEv.reminders = supportRotaEv.reminders;
  newEv.attendees = attendees;

  log.info('========')
  log.info('Creating shift:')
  log.info('Summary:    ' + newEv.summary);
  log.info('Start Time: ' + newEv.start.dateTime);
  log.info('End Time:   ' + newEv.end.dateTime);
  
  workPrimary.addEventToGoogle(newEv);
  
  // If it is an L1 event, add a reminder the next morning
  if (useHandoverReminders
      && newEv.summary == cfg.get('calendars.support.usernameSearch')+" L1") {
  
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

    workPrimary.addEventToGoogle(reminderEv);
  }


  log.info('========')


}


function removeShift (ev) {

  workPrimary.deleteEventFromGoogle(ev)

  // If it is an L1 event, delete next morning's reminder
  if (useHandoverReminders
      && ev.summary == cfg.get('calendars.support.usernameSearch')+" (L1)") {
  
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

    workPrimary.loadEventsFromGoogle(params, function (handoverReminderEvs) {

      // There is a possibility we have multiple handover reminders.
      // While this shouldn't have happened, it's not a problem to just nuke all.
      for (var i in handoverReminderEvs) { 

        var hrEv = handoverReminderEvs[i];
        workPrimary.deleteEventFromGoogle(hrEv)
      }

    })

  }

}



// Search time is between 00:00 this morning and 2 months from then
// I.e. you're syncing all events between today and 2 months hence.
var d = new Date();
var timeMin = new Date(d.getFullYear(), d.getMonth(), d.getDate());
var timeMax = new Date(new Date(timeMin).setMonth(timeMin.getMonth()+2))

var params = {
  timeMin: timeMin,
  timeMax: timeMax,
  textSearch: cfg.get('calendars.support.usernameSearch')
}

supportRota.loadEventsFromGoogle(params, function (srEvs) {
 
  log.trace('Support Rota:');
  log.trace(srEvs);

  workPrimary.loadEventsFromGoogle(params, function (wpEvs) {

    log.trace('Work Calendar:');
    log.trace(wpEvs);

    /*
    * Loop through each item comparing the name, start time,
    * and end time. That's what makes them a match.
    */
    for (var i in srEvs) { 

      var srEv = srEvs[i];

      var id        = srEv.id;
      var summary   = srEv.summary;
      var startTime = new Date(srEv.start.dateTime);
      var endTime   = new Date(srEv.end.dateTime);
      var srEvStr   = supportRota.getEventString(srEv)

      log.info('Comparing event: ' + srEvStr);
      log.debug('Event Id:      ' + id);
      log.debug('Event summary: ' + summary);
      log.debug('Start Time:    ' + startTime);
      log.debug('End Time:      ' + endTime);


      var matched = false

      for (var j in wpEvs) {

        var wpEv = wpEvs[j];

        var id2        = wpEv.id;
        var summary2   = wpEv.summary;
        var startTime2 = new Date(wpEv.start.dateTime);
        var endTime2   = new Date(wpEv.end.dateTime);
      
	var wpEvStr = workPrimary.getEventString(wpEv)

	log.debug('+--> Comparison Event: ' + wpEvStr);
        log.debug('Event Id:      ' + id2);
        log.debug('Event summary: ' + summary2);
        log.debug('Start Time:    ' + startTime2);
        log.debug('End Time:      ' + endTime2);

	if (summary == summary2
	    && startTime.getTime() == startTime2.getTime()
	    && endTime.getTime() == endTime2.getTime()
	) {

          log.info('+ Matched event: ' + wpEvStr);
	  matched = true

	  delete wpEvs[j];
	  break

	}

      }

      if (!matched) {
        log.info('No matches found for %s', srEvStr)
	addShift(srEv)
      }
    }

    // Any events left over in the work calendar are unwanted. They
    // were probably shifts that were given away.
    for (var j in wpEvs) {

      var wpEv = wpEvs[j]

      log.info('Deleting extra event in work calendar: ' + workPrimary.getEventString(wpEv))
      removeShift(wpEv);
      delete wpEvs[j];

    }

  });

});
