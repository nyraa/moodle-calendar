function initialize()
{
  Logger.log("Initializing...");
  let PropertyService = PropertiesService.getScriptProperties();
  let calendarId = PropertyService.getProperty("calendarId");
  if(calendarId === null)
  {
    // create calendar
    Logger.log("Creating calendar...");
    const calendar = CalendarApp.createCalendar("Moodle Calendar", {
      summery: "A Calendar imported from NCKU Moodle",
      color: "#e1822c"
    });
    calendarId = calendar.getId();
    PropertyService.setProperty("calendarId", calendarId);
  }
  Logger.log("Importing existed events...");
  main(false);
  Logger.log("Initialization completed");
}