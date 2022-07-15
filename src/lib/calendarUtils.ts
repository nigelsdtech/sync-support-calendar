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

type tNewCalendarEvent = Pick<iCalendarEvent, "summary" | "start" | "end" | "extendedProperties">
export function prepareNewEventDetails ({
    eventDetails,
    syncToken,
    prefixText,
    overriddenSummary
} : {
    eventDetails: iCalendarEvent,
    syncToken: string,
    prefixText: string | null,
    overriddenSummary: string | null
}): tNewCalendarEvent {

    const eventSummary = determineEventSummary({summary: eventDetails.summary, prefixText, overriddenSummary})

    const newEv = {
        summary: eventSummary,
        start: eventDetails.start,
        end: eventDetails.end,
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

    calendar.addEventToGoogle(eventDetails, (err, resp) => {

        if (err) {
            const eventDescString = calendar.getEventString(eventDetails)
            const errMsg = `Problem adding ${eventDescString}: ${err}`
            log.error(`[${hash}] ${errMsg}`)
            throw errMsg
        }
        log.info(`[${hash}] Created event: \n${JSON.stringify(resp)}`)
    });
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

    calendar.deleteEventFromGoogle(event, function (err, resp) {
        if (err) {
            const errMsg = `Problem deleting ${event.id}: ${err}`
            log.error(`${errMsg}`)
            throw errMsg
        }
    })
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
