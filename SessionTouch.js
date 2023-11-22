function touchSession()
{
  const lock = LockService.getScriptLock();
  lock.waitLock(360000);
  const PropertyService = PropertiesService.getScriptProperties();
  let {moodleid: account, moodlekey: password, moodleSession: session, sesskey: sesskey} = PropertyService.getProperties();
  const moodle = new Moodle({account, password, session, sesskey});
  if(!moodle)
  {
    throw new Error("Can't login when touching session. Please check account and password is correct or session and sesskey not missing, otherwise session and sesskey maybe expired, please use account and password to relogin.");
  }
  else
  {
    Logger.log("Touch session successfully");
  }
  PropertyService.setProperties({
    moodleSession: moodle.MoodleSession,
    sesskey: moodle.SessKey
  });
  lock.releaseLock();
}