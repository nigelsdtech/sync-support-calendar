"use strict"

var cfg           = require('config');
var log4js        = require('log4js');

// logs 

log4js.configure(cfg.get('log.log4jsConfigs'));
var log = log4js.getLogger(cfg.get('log.appName'));
log.setLevel(cfg.get('log.level'));


/*
 * Begin main function
 */


var method = SupportShift.prototype

var method.attendees
   ,method.calendar
   ,method.endTime
   ,method.startTime
   ,method.summary
   ,method.type;


/**
 * Creates an instance of a SupportShift.
 *
 * @constructor
 * @this {SupportShift}
 * @param {object} params - An object containing parameters to be passed to the constructor
 * @param {string} params.type - Either "L1" or "L2"
 * @param {date}   params.startTime - The time at which the shift starts
 * @param {date}   params.endTime   - The time at which the shift ends
 */ 
function SupportShift (params) {

  this.attendees  = params.attendees
  this.calendar   = params.calendar
  this.endTime    = params.endTime
  this.startTime  = params.startTime
  this.summary    = params.summary
  this.type       = params.type

}


/**
 * Adds this shift to the google calendar
 *
 * @this {SupportShift}
 * @param {object} params - An object containing input parameters
 * @param {string} params.type - Either "L1" or "L2"
 * @param {date}   params.startTime - The time at which the shift starts
 * @param {date}   params.endTime   - The time at which the shift ends
 */
method.addToCalendar = function (params) {

  var calendar = params.calendar;

  var newEv = {
    attendees: this.attendees,
    end:       this.endTime,
    start:     this.startTime,
    summary:   this.summary
  }

  log.info('========')
  log.info('Creating shift:')
  log.info('Summary:    ' + newEv.summary);
  log.info('Start Time: ' + newEv.start.dateTime);
  log.info('End Time:   ' + newEv.end.dateTime);

  calendar.addEventToGoogle(newEv);

}


/**
 * Removes the shift from the google calendar
 *
 * @this {SupportShift}
 * @param {object} params - An object containing input parameters
 * @param {string} params.type - Either "L1" or "L2"
 * @param {date}   params.startTime - The time at which the shift starts
 * @param {date}   params.endTime   - The time at which the shift ends
 */
method.removeFromCalendar = function (params) {

  var calendar = params.calendar;

  calendar.deleteEventFromGoogle(ev)
}
