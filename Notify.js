function notifyNewEvent(events)
{
  Logger.log("Send new event notification...");
  if(events.length <= 0)
  {
    Logger.log("No new event to send.");
    return;
  }
  const userEmail = Session.getActiveUser().getEmail();
  const mailSubject = `New Moodle Assignment`;
  MailApp.sendEmail(userEmail, mailSubject, "", {
    htmlBody: `<h2>There are ${events.length} new assignment(s) in your moodle:</h2><hr />` + events.map(({event, assignment}) => `
    <h2>${assignment.name}</h2>
    <a href="${event.course.viewurl}">${event.course.fullname}</a><br />
    Deadline: ${new Intl.DateTimeFormat("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "narrow",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(event.timestart * 1000)} (<a href="${event.url}">Link to assignment</a>)
    <details>
    ${event.description}
    </details>
    `).join("<hr />"),
    noReply: true,
    name: "Moodle Calendar Notification",
  });
  Logger.log("Sent!");
}

function notifyEditEvent(events)
{
  Logger.log("Send update event notification...");
  if(events.length <= 0)
  {
    Logger.log("No update to send.");
    return;
  }
  let updateCount = 0;
  const enabledNotify = ["deadline"];
  let mailBody = "<h2>Your moodle assignment(s) updated:</h2>";

  // for each event
  events.forEach(({updatedEvent, eventBundle}) => {
    const {event, assignment, submission} = eventBundle;
    let acceptedKeys = 0;
    let assignmentBody = "";
    Object.keys(updatedEvent).forEach((key) => {
      // for each key
      if(enabledNotify.includes(key))
      {
        const value = updatedEvent[key];
        switch(key)
        {
          case "deadline":
            const dateformatter = new Intl.DateTimeFormat("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              weekday: "narrow",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });
            assignmentBody += `<h3>Deadline</h3>From ${dateformatter.format(value.from)} updated to ${dateformatter.format(value.to)}`;
            break;
          case "eventTitle":
            break;
          case "title":
            assignmentBody += `<h3>Title</h3>From "${value.from}" updated to "${value.to}"`;
            break;
          case "description":
            assignmentBody += `<h3>Descrition</h3>${value.to}`;
            break;
        }
        ++updateCount;
        ++acceptedKeys;
      }
    });
    if(acceptedKeys > 0)
    {
      mailBody += `<hr /><h2>${assignment.name}</h2><a href="${event.url}">Link to assignment</a>${assignmentBody}`;
    }
  });
  if(updateCount <= 0)
  {
    Logger.log("No update to send after filtering.");
    return;
  }
  const userEmail = Session.getActiveUser().getEmail();
  const mailSubject = `Moodle Assignment Updated`;
  MailApp.sendEmail(userEmail, mailSubject, "", {
    htmlBody: mailBody,
    noReply: true,
    name: "Moodle Calendar Notification"
  });
  Logger.log("Sent!");
}