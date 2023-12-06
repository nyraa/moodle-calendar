function main(enableNewEventNotify=true, enableEditEventNotify=true)
{
  const lock = LockService.getScriptLock();
  lock.waitLock(60000);
  const PropertyService = PropertiesService.getScriptProperties();
  let {moodleid: account, moodlekey: password, moodleSession: session, sesskey: sesskey} = PropertyService.getProperties();
  const moodle = new Moodle({account, password, session, sesskey});
  if(!moodle)
  {
    throw new Error("Login failed, please check your username and password in script property settings.");
  }
  PropertyService.setProperties({
    moodleSession: moodle.MoodleSession,
    sesskey: moodle.SessKey
  });
  // Logger.log(`MoodleSession: ${moodle.MoodleSession}`);
  // Logger.log(`sesskey: ${moodle.SessKey}`);


  // enum date
  let currentDate = new Date();
  let dates = [];

  // for(let i = 0; i < 1; ++i) // for debug
  for(let i = -6; i < 6; ++i)
  {
    let enumDate = new Date();
    enumDate.setMonth(currentDate.getMonth() + i);
    dates.push(enumDate);
  }

  // TODO get google calendar events between -6~+6 month
  let calendarId = PropertyService.getProperty("calendarId");
  if(calendarId === null)
  {
    throw new Error("calendarId not found, maybe not initialized?");
  }
  let calendar = CalendarApp.getCalendarById(calendarId);
  if(!calendar)
  {
    throw new Error("Calendar cannot be found. Maybe try clearing the calenderId and re-initialize again.");
  }
  let firstDate = new Date(dates[0]);
  firstDate.setDate(1);
  firstDate.setHours(0, 0, 0, 0);
  let lastDate = new Date(dates.at(-1));
  lastDate.setMonth(lastDate.getMonth() + 1, 0);
  lastDate.setHours(23, 59, 59, 999);
  let googleEventsList = calendar.getEvents(firstDate, lastDate);

  let googleEventsDict = googleEventsList.reduce((dict, event) => {
    dict[event.getTag("moodleEventId")] = event;
    return dict;
  }, {});

  let monthYears = dates.map(date => ({month: date.getMonth() + 1, year: date.getFullYear()}));

  const newEvents = [];
  const updatedEvents = [];
  
  const moodleCalendarData = moodle.getCalendarsMonthly(monthYears);
  const moodleEvents = moodleCalendarData.reduce((eventArray, month) => {
    return eventArray.concat(month.data.weeks.reduce((weekArray, week) => {
      return weekArray.concat(week.days.reduce((dayArray, day) => {
        return dayArray.concat(day.events.filter((event) => event.modulename === "assign"));
      }, []));
    }, []));
  }, []);

  
  moodleEvents.forEach((moodleEvent) => {
    let moodleEventId = moodleEvent.id;

    // check moodle event exists by id in calendar event description
    let moodleEventInstanceId = moodleEvent.instance;
    let moodleAssignment = moodle.getAssignmentInfo(moodleEventInstanceId);


    // prepare event properties
    let endDate = new Date(moodleEvent.timestart * 1000);
    let startDate = new Date(endDate);
    startDate.setHours(0);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    const eventProperty = {
      title: moodleEvent.name,
      startDate: startDate,
      endDate: endDate,
      description: `<a href="${moodleEvent.course.viewurl}">${moodleEvent.course.fullname}</a><br /><a href="${moodleEvent.url}">${moodleAssignment.title}</a>${moodleAssignment.status === "notopened" ? `<br /><i>${moodleAssignment.message}</i>` : ""}<h3>${moodleAssignment.title}</h3>${moodleEvent.description}`,
      location: moodleEvent.location
    };



    if(moodleEventId in googleEventsDict)
    {
      // event exists
      Logger.log(`Event ${moodleEvent.popupname} existed`);

      // get google event
      const googleEvent = googleEventsDict[moodleEventId];

      // remove from googleEventsDict, left events not exists in moodle
      delete googleEventsDict[moodleEventId];


      // if information not match, update it
      const updatedEvent = {};


      // check date
      let googleEventStartDate = googleEvent.getStartTime();
      let googleEventEndDate = googleEvent.getEndTime();
      if(googleEventStartDate - startDate !== 0 || googleEventEndDate - endDate !== 0)
      {
        Logger.log("Datetime updated");
        googleEvent.setTime(startDate, endDate);
        updatedEvent.deadline = {
          from: googleEventEndDate,
          to: endDate
        };
      }


      // TODO check state(color)
      googleEvent.setColor(moodleAssignment.color);


      // check event title
      let googleEventTitle = googleEvent.getTitle();
      if(googleEventTitle !== eventProperty.title)
      {
        // title updated
        Logger.log("Update event title");
        googleEvent.setTitle(eventProperty.title);
        // google calendar event title change is no need to send notification
        updatedEvent.eventTitle = {
          from: googleEventTitle,
          to: eventProperty.title
        }
      }


      // check assignment title
      let assignmentTitle = googleEvent.getTag("title");
      if(assignmentTitle !== moodleAssignment.title)
      {
        Logger.log("Assignment title updated");
        googleEvent.setTag("title", moodleAssignment.title);
        updatedEvent.title = {
          from: assignmentTitle,
          to: moodleAssignment.title
        }
      }


      // TODO check description
      let googleEventDescription = googleEvent.getDescription();
      if(googleEventDescription !== eventProperty.description)
      {
        Logger.log("Update event description");
        googleEvent.setDescription(eventProperty.description);
        updatedEvent.description = {
          from: null,
          to: moodleEvent.description
        }
      }

      // push update to updates
      if(Object.keys(updatedEvent).length > 0)
        updatedEvents.push({updatedEvent, moodleEvent, moodleAssignment});
    }
    else
    {
      // event not exists
      // TODO if not exists, create it
      Logger.log(`Create new event from ${eventProperty.startDate} to ${eventProperty.endDate}: ${moodleEvent.popupname}`);

      // add to notify list
      newEvents.push({moodleEvent, moodleAssignment});

      // create google calendar event
      let googleEvent = calendar.createEvent(eventProperty.title, eventProperty.startDate, eventProperty.endDate, {
        description: eventProperty.description,
        location: eventProperty.location
      });

      // set color to event
      googleEvent.setColor(moodleAssignment.color);

      // update tags
      const tagsToSet = {
        moodleEventId: moodleEvent.id,
        url: moodleEvent.url,
        title: moodleAssignment.title,
      }
      for(let key in tagsToSet)
      {
        googleEvent.setTag(key, tagsToSet[key]);
      }
    }
  });
  lock.releaseLock();

  // remove events not exists in moodle
  for(let moodleEventId in googleEventsDict)
  {
    let googleEvent = googleEventsDict[moodleEventId];
    Logger.log(`Remove event ${googleEvent.getTitle()}`);
    googleEvent.deleteEvent();
  }

  // notify user
  if(enableNewEventNotify)
    notifyNewEvent(newEvents);
  if(enableEditEventNotify)
    notifyEditEvent(updatedEvents);
}