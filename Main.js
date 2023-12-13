function main(enableNewEventNotify=true, enableEditEventNotify=true)
{
  // login
  const PropertyService = PropertiesService.getScriptProperties();
  const {moodleid: username, moodlekey: password, wstoken: wstoken} = PropertyService.getProperties();

  Logger.log("Login...");
  const moodle = new Moodle({username, password, wstoken});

  // store wstoken
  PropertyService.setProperty("wstoken", moodle.wstoken);


  // enum date
  const currentDate = new Date();
  const dates = [];

  // for(let i = 0; i < 1; ++i) // for debug
  for(let i = -6; i < 6; ++i)
  {
    let enumDate = new Date();
    enumDate.setMonth(currentDate.getMonth() + i);
    dates.push(enumDate);
  }

  // get google calendar events between -6~+6 month
  const calendarId = PropertyService.getProperty("calendarId");
  if(calendarId === null)
  {
    throw new Error("calendarId not found, maybe not initialized?");
  }
  const calendar = CalendarApp.getCalendarById(calendarId);
  if(!calendar)
  {
    throw new Error("Calendar cannot be found. Maybe try clearing the calenderId and re-initialize again.");
  }
  const firstDate = new Date(dates[0]);
  firstDate.setDate(1);
  firstDate.setHours(0, 0, 0, 0);
  const lastDate = new Date(dates.at(-1));
  lastDate.setMonth(lastDate.getMonth() + 1, 0);
  lastDate.setHours(23, 59, 59, 999);
  const googleEventsList = calendar.getEvents(firstDate, lastDate);

  const googleEventsDict = googleEventsList.reduce((dict, event) => {
    dict[event.getTag("moodleEventId")] = event;
    return dict;
  }, {});

  const monthYears = dates.map(date => ({month: date.getMonth() + 1, year: date.getFullYear()}));


  // get event bundle
  Logger.log("Fetching data...");
  const eventBundles = moodle.getEventBundles(monthYears);
  const newEvents = [];
  const updatedEvents = [];

  const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "narrow",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

  eventBundles.forEach((eventBundle) => {
    const {event: moodleEvent, assignment, submission} = eventBundle;


    const endTime = new Date(moodleEvent.timestart * 1000);
    const startTime = new Date(endTime);
    startTime.setHours(0, 0, 0, 0);

    const moodleEventId = moodleEvent.id;

    const allowsubmissionsfromdate = new Date(assignment.allowsubmissionsfromdate * 1000);

    const description = `<a href="${moodleEvent.course.viewurl}">${moodleEvent.course.fullname}</a><br /><a href="${moodleEvent.url}">${assignment.name}</a>${allowsubmissionsfromdate > new Date() ? `<br /><i>The assignment details and submission form will be available from ${dateFormatter.format(allowsubmissionsfromdate)}</i>` : ""}<h3>${assignment.name}</h3>${assignment.intro}`;

    // color
    let color;
    if(assignment.nosubmissions || allowsubmissionsfromdate > new Date())
    {
      color = CalendarApp.EventColor.GRAY;
    }
    else
    {
      // if submitted, GREEN'
      if(submission.lastattempt.submission.status == "submitted")
      {
        color = CalendarApp.EventColor.GREEN;
      }
      // elif overdue, RED
      else if(endTime < new Date())
      {
        color = CalendarApp.EventColor.RED;
      }
      // else YELLOW
      else
      {
        color = CalendarApp.EventColor.YELLOW;
      }
    }



    if(moodleEventId in googleEventsDict)
    {
      // event already exists in google calendar
      Logger.log(`Event ${moodleEvent.popupname} existed`);

      // get google event
      const googleEvent = googleEventsDict[moodleEventId];

      // remove from googleEventsDict, left events not exists in moodle
      delete googleEventsDict[moodleEventId];

      // if information not match, update it
      const updatedEvent = {};
      
      // check date
      const googleEventStartDate = googleEvent.getStartTime();
      const googleEventEndDate = googleEvent.getEndTime();
      if(googleEventStartDate - startTime !== 0 || googleEventEndDate - endTime !== 0)
      {
        Logger.log("Update datetime");
        googleEvent.setTime(startTime, endTime);
        updatedEvent.deadline = {
          from: googleEventEndDate,
          to: endTime
        };
      }

      // set color
      const googleEventColor = googleEvent.getColor();
      if(googleEventColor !== color)
      {
        Logger.log("Update color");
        googleEvent.setColor(color);
      }

      // check event title
      const googleEventTitle = googleEvent.getTitle();
      if(googleEventTitle !== moodleEvent.name)
      {
        // title updated
        Logger.log("Update event title");
        googleEvent.setTitle(moodleEvent.name);
        // google calendar event title change is no need to send notification
        updatedEvent.eventTitle = {
          from: googleEventTitle,
          to: moodleEvent.name
        };
      }

      
      // check assignment title
      const assignmentTitle = googleEvent.getTag("title");
      if(assignmentTitle !== assignment.name)
      {
        Logger.log("Update assignment title");
        googleEvent.setTag("title", assignment.name);
        updatedEvent.title = {
          from: assignmentTitle,
          to: assignment.name
        };
      }


      // check description
      const googleEventDescription = googleEvent.getDescription();
      if(googleEventDescription !== description)
      {
        Logger.log("Update event description");
        googleEvent.setDescription(description);
        updatedEvent.description = {
          from: null,
          to: assignment.intro
        };
      }

      // push update to updates
      if(Object.keys(updatedEvent).length > 0)
        updatedEvents.push({updatedEvent, eventBundle});
    }
    else
    {
      // event not exists
      // if not exists, create it
      Logger.log(`Create new event from ${startTime} to ${endTime}: ${moodleEvent.popupname}`);

      // add to notify list
      newEvents.push(eventBundle);

      
      // create google calendar event
      const googleEvent = calendar.createEvent(moodleEvent.name, startTime, endTime, {
        description: description,
        location: moodleEvent.location
      });

      // set color
      googleEvent.setColor(color);

      
      // update tags
      const tagsToSet = {
        moodleEventId: moodleEvent.id,
        url: moodleEvent.url,
        title: assignment.name,
      };

      for(let key in tagsToSet)
      {
        googleEvent.setTag(key, tagsToSet[key]);
      }
    }
  });

  
  // remove events not exists in moodle
  for(let moodleEventId in googleEventsDict)
  {
    const googleEvent = googleEventsDict[moodleEventId];
    Logger.log(`Remove event ${googleEvent.getTitle()}`);
    googleEvent.deleteEvent();
  }

  // notify user
  if(enableNewEventNotify)
    notifyNewEvent(newEvents);
  if(enableEditEventNotify);
    notifyEditEvent(updatedEvents);
}