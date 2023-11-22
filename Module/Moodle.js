class Moodle
{
  constructor({account, password, session, sesskey})
  {
    this.MoodleSession = session;
    this.SessKey = sesskey;

    if(session == undefined || sesskey == undefined || !this.touchSession())
    {
      Logger.log(`Login by password`);
      this.MoodleSession = this.login(account, password);
      this.SessKey = this.getSessionKey();
    }
    else
    {
      Logger.log(`Login by session successfully`);
    }
  }

  login(account, password)
  {
    // get login token
    let loginPageRes = UrlFetchApp.fetch("https://moodle.ncku.edu.tw/login/index.php");
    const $loginPage = Cheerio.load(loginPageRes.getContentText());
    const logintoken = $loginPage('input[name="logintoken"]').attr("value");
    let moodleSession = parseSetCookieHeader(loginPageRes.getAllHeaders()["Set-Cookie"])["MoodleSession"].value;
    // Logger.log(`logintoken: ${logintoken}`);
    // Logger.log(`Moodle Session: ${moodleSession}`);

    // login request
    let loginRes = UrlFetchApp.fetch("https://moodle.ncku.edu.tw/login/index.php", {
      method: "post",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `MoodleSession=${moodleSession}`
      },
      payload: `anchor=&logintoken=${logintoken}&username=${account}&password=${password}`,
      followRedirects: false
    });

    // get moodle session cookie
    let setCookieHeader = loginRes.getAllHeaders()["Set-Cookie"];
    let cookies = parseSetCookieHeader(setCookieHeader);
    moodleSession = cookies?.MoodleSession?.value;
    if(moodleSession === undefined)
    {
      console.error("Login failed!");
      return null;
    }
    else
    {
      Logger.log("Login successfully");
      // Logger.log(`Moodle session: ${moodleSession}`);
      return moodleSession;
    }
  }

  touchSession()
  {
    const res = UrlFetchApp.fetch(`https://moodle.ncku.edu.tw/lib/ajax/service.php?sesskey=${this.SessKey}&info=core_session_touch`, {
      method: "post",
      headers: {
        "Cookie": `MoodleSession=${this.MoodleSession}`,
        "Content-Type": "application/json",
      },
      payload: JSON.stringify([{"index":0,"methodname":"core_session_touch","args":{}}])
    });
    const res_json = JSON.parse(res.getContentText());
    return res_json[0].error === false;
  }

  getSessionKey()
  {
    const calanderRes = UrlFetchApp.fetch("https://moodle.ncku.edu.tw/calendar/view.php", {
      headers: {
        "Cookie": `MoodleSession=${this.MoodleSession}`
      }
    });
    const sesskey = calanderRes.getContentText().match(/"sesskey":"(.*?)"/)?.[1];
    return sesskey;
  }

  getCalendarMonthly(year, month)
  {
    const res = UrlFetchApp.fetch(`https://moodle.ncku.edu.tw/lib/ajax/service.php?sesskey=${this.SessKey}&info=core_calendar_get_calendar_monthly_view`, {
      method: "post",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `MoodleSession=${this.MoodleSession}`
      },
      payload: JSON.stringify([
        {
          index: 0,
          methodname: "core_calendar_get_calendar_monthly_view",
          args: {
            year: year,
            month: month
          }
        }
      ])
    });
    return JSON.parse(res.getContentText());
  }

  getAssignmentInfo(assignmentInstance)
  {
    const res = UrlFetchApp.fetch(`https://moodle.ncku.edu.tw/mod/assign/view.php?id=${assignmentInstance}`, {
      headers: {
        "Cookie": `MoodleSession=${this.MoodleSession}`
      }
    });
    const $ = Cheerio.load(res.getContentText());

    const submissionstatussubmitted = $(".submissionstatussubmitted").length > 0;
    const overdue = $(".overdue").length > 0;
    const notopenmsg = $(".submissionsalloweddates");
    let color, message, status, title = $("h2").text();
    if(notopenmsg.length > 0)
    {
      // assignment not open yet
      color = CalendarApp.EventColor.GRAY;
      message = notopenmsg.text();
      status = "notopened";
    }
    else
    {
      // assignment opened
      if(submissionstatussubmitted)
      {
        // submitted
        color = CalendarApp.EventColor.GREEN;
        status = "submissionstatussubmitted";
      }
      else if(overdue)
      {
        // overdue
        color = CalendarApp.EventColor.RED;
        status = "overdue";
      }
      else
      {
        // no submit yet
        color = CalendarApp.EventColor.YELLOW;
        status = "nosubmit";
      }
    }
    return {
      color,
      message,
      title,
      status
    };
    /*
    const submissionStatusColor = {
      submissionstatus: CalendarApp.EventColor.PALE_BLUE,
      submissionstatusdraft: CalendarApp.EventColor.ORANGE,
      submissionstatussubmitted: CalendarApp.EventColor.GREEN, // row1, 已繳交作業，等待評分
      unsubmit: CalendarApp.EventColor.YELLOW, // row 1, fallback 未繳交
      submissionlocked: CalendarApp.EventColor.ORANGE,
      submissionreopened: CalendarApp.EventColor.CYAN,
      submissiongraded: CalendarApp.EventColor.GREEN, // row 2, 已評分
      submissionnotgraded: CalendarApp.EventColor.GRAY, // row 2, 未評分
      latesubmission: CalendarApp.EventColor.PALE_RED, // row 4, 繳交過期作業
      earlysubmission: CalendarApp.EventColor.PALE_GREEN, // row 4, 提早繳交作業
      gradingreminder: CalendarApp.EventColor.GRAY,
    };*/
  }
}