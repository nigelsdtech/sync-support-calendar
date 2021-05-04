import crypto from 'crypto'

export type eventTimeData = {
    date: string,
    dateTime: string,
    timeZone: string
}

type tAttendee = {
    email: string,
    displayName: string,
    organizer: boolean,
    self: boolean,
    responseStatus: string
}

export interface iCalendarEvent {
    id: string,
    summary: string,
    description: string,
    start: eventTimeData,
    end: eventTimeData,
    attendees: tAttendee[],
    hangoutLink?: string,
    reminders?: {
        useDefault: boolean
    },
    extendedProperties: {
        private: Record<string,any>
    }
}

export function determineEventSummary ({
    summary,
    prefixText,
    overriddenSummary
} :{
    summary: string,
    prefixText: string | null,
    overriddenSummary: string | null
}): string {
    if (overriddenSummary) { return overriddenSummary }
    if (prefixText) { return "" + prefixText + summary }
    return summary
}

type tNewCalendarEvent = Omit<iCalendarEvent, "id">
export function prepareEventDetails ({
    eventDetails,
    syncToken,
    attendees,
    prefixText,
    overriddenSummary
} : {
    eventDetails: iCalendarEvent,
    syncToken: string,
    attendees,
    prefixText: string | null,
    overriddenSummary: string | null
}): tNewCalendarEvent {

    const eventSummary = determineEventSummary({summary: eventDetails.summary, prefixText, overriddenSummary})

    const newEv = {
        description: eventDetails.description,
        summary: eventSummary,
        attendees,
        start: eventDetails.start,
        end: eventDetails.end,
        hangoutLink: eventDetails.hangoutLink,
        extendedProperties: {
            private: {
                syncCalendarToken: syncToken
            }
        }
    }

    return newEv
}

export function addEvent ({
    eventDetails,
    calendar,
    log
}: {
    eventDetails: tNewCalendarEvent,
    calendar,
    log
}): void {

    const eventDescString = calendar.getEventString(eventDetails)
    const hash = crypto.createHash('md5').update(eventDescString).digest('hex')
    log.info('========')
    log.info(`[${hash}] Creating event:`)
    log.info(`[${hash}] Summary:    ${eventDetails.summary}`);
    log.info(`[${hash}] Start Time: ${JSON.stringify(eventDetails.start)}`);
    log.info(`[${hash}] End Time:   ${JSON.stringify(eventDetails.end)}`);

    log.error('Stub add'); return;

    calendar.addEventToGoogle(eventDetails, (err, resp) => {

        if (err) {
            const eventDescString = calendar.getEventString(eventDetails)
            const errMsg = `Problem adding ${eventDescString}: ${err}`
            log.error(`[${hash}] ${errMsg}`)
            throw errMsg
        }
        log.info(`[${hash}] Created event: \n${JSON.stringify(resp)}`)
    });
    
    /*
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

        calendar.addEventToGoogle(reminderEv, function(resp) {});
    }
    */
}


export function deleteEvent ({
    event,
    calendar,
    log
}: {
    event: {
        id: string
    },
    calendar,
    log
}) : void {

    log.error('Stub delete'); return;
    return
    calendar.deleteEventFromGoogle(event, function (err, resp) {
        if (err) {
            const errMsg = `Problem deleting ${event.id}: ${err}`
            log.error(`${errMsg}`)
            throw errMsg
        }
    })

    /*
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
    */

}

export function extractTimeStamp ({
    date,
    dateTime
}: {
    date: string,
    dateTime: string
} ): number {

    if (!date && !dateTime) {throw new Error ('extractTimeStamp: No date or time specified')}

    const relevantTime = (dateTime)? dateTime : date;
    const d = new Date(relevantTime)
    return d.getTime()
}
