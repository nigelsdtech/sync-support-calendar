module.exports = {

  calendars: {
    support: {
      calendarId:     process.env.OB_SUPPORT_ROTA_CALENDAR_ID,
      usernameSearch: process.env.OB_USERNAME
    },
    workPrimary: {
      calendarId: "primary",
      attendees: [
        {
          email:          process.env.OB_EMAIL_ADDRESS,
          displayName:    process.env.OB_DISPLAY_NAME,
          responseStatus: "accepted",
          self:           true,
          organizer:      true
        },
        {
          email:       process.env.PERSONAL_EMAIL,
          displayName: process.env.PERSONAL_DISPLAY_NAME
        }
      ]
    }
  },

  useHandoverReminders: true
} 
