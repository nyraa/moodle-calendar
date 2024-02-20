# Moodle Calendar

一個自動同步 NCKU Moodle 作業行事曆到 Google 行事曆的 Google App Script (GAS) 專案，也可以在作業更新的時候傳送電子郵件通知。 

English version of README please refer to [here](README.md)

## 功能與特色
- 自動同步作業行事曆到 Google 行事曆
- 在 Google 行事曆用顏色標示作業繳交狀態
- 當有新作業的時候用電子郵件通知
- 當作業截止日期更新的時候用電子郵件通知
- 會儲存帳號 Token，不需儲存帳號密碼

## 安全性
- 這個專案是一個獨立、開放原始碼的 Google Apps Script 專案，所有資料都只會儲存在你的 Google 帳號中，不會傳送到任何其他伺服器。
- 如果對於帳號密碼的安全性仍有疑慮，你可以在程式初始化完成之後從專案移除帳號密碼，除非 Moodle token 意外被回收，才需要重新輸入。

## 部署設定
請務必在實際操作部署設定之前先閱讀[注意事項](#注意事項)。
1. 在瀏覽器中登入你的 Google 帳號（必須是學校的 Google Workspace 帳號）。
2. 前往 [GAS 專案：Moodle Calendar Prototype](https://script.google.com/d/1xTOFyXwG29KlCkZwG-cZkHT3_bvQwJ7Z1epCd0n0BsQwIr7WIPnFIXLt/edit) 並在你的 Google 帳號下建立一份複本。
3. 開啟剛才複製的專案，從 「專案設定」 中新增指令碼屬性 `moodleid` 和 `moodlekey` 並填入你的 Moodle 帳號和密碼。
4. 在 「編輯器」 籤頁中選擇 `Inititalize.gs` 然後按 「執行」 來初始化專案。程式會在你的 Google 帳號下建立一個叫做 `Moodle Calendar` 的行事曆並同步已存在的作業。（首次執行會需要授權專案）
5. （選用）如果你不想在 GAS 專案中留下你的 Moodle 帳號和密碼，你可以在初始化完成之後刪除 `moodleid` 和 `moodlekey` 屬性。（但如果 Moodle token 意外被回收就需要重新手動輸入）
6. 到 「觸發條件」 籤頁中新增一個觸發條件，選擇執行 `main` 函式，設定活動來源為 `時間驅動`、觸發條件類型為 `小時計時器`、間隔為 6 小時，然後儲存。（間隔代表同步的頻繁程度，請勿設定太短的間隔，避免造成 Moodle 伺服器負擔）

## 注意事項
- 請勿在觸發條件設定中設定過短的間隔，避免造成 Moodle 伺服器負擔。
- 請勿在 `Moodle Calendar` 日曆中新增活動，這個日曆其他內容會被程式清空。
- 請使用學校的 Google Workspace 帳號，否則無法檢視和複製 Prototype 專案。
- 授權及設定觸發條件的帳號會是這個專案的**執行者**。
- 行事曆會建立在**執行者**的 Google 帳號下。
- 通知電子郵件會傳送到**執行者**的電子郵件信箱。

## 外觀表現
### Google 行事曆
| 事件顏色       | 代表狀態   |
| ------------- | ---------- |
| &#128994; 綠色 | 已繳交     |
| &#128993; 黃色 | 未繳交     |
| &#128308; 紅色 | 逾期       |
| &#128280; 灰色 | 未開放繳交 / 無需在 Moodle 繳交 |

行事曆中活動會從截止當天 00:00 至截止繳交的時間。

## 權限
這個專案需要以下權限：
| 權限                                                             | 用途                             |
| ---------------------------------------------------------------- | -------------------------------- |
| `查看、編輯、分享和永久刪除您可以使用 Google 日曆存取的所有日曆` | 同步作業活動到 Google 行事曆。 |
| `連線到外部服務`                                                 | 從 Moodle 取得資料。             |
| `以您的身分傳送電子郵件`                                         | 傳送電子郵件通知。               |

## 通知設定
在 `Main.gs` 中的 `main` 函式中有和通知相關的設定，可以透過修改這些設定來開關通知。
| 設定名稱 | 預設值 | 功能 |
|----------|--------|------|
| `enableNewEventNotify` | `true` | 有新的作業時傳送通知。 |
| `enableEditEventNotify` | `true` | 作業截止日期變更時傳送通知。 |

## 故障排除
在觸發條件設定中可以設定錯誤通知的間隔時間，GAS 的執行階段錯誤會定期寄電子郵件通知執行者。

## Summary of failures for Google Apps Script: Moodle Calendar
有可能會在 Email 中收到這個錯誤紀錄。

### Exception: Address unavailable...
### Exception: Request failed returned code 503...
- 這個錯誤是當從 Moodle 取得資料的時候發生例外，可能是 Moodle 的例外，或是網路問題，如果沒有一直連續發生可以無視。

### Login failed
- 檢查在指令碼屬性中填入的 Moodle 帳號和密碼是否正確。
- 如果在初始化完成之後移除了帳號和密碼，請重新填入並執行 `main` 來取得新的 token。
- 如果仍然無法登入，請檢查 Moodle 是否可以正常連線，這可能是暫時的問題，請過一段時間再試一次。

## Change log
請參考英文版為主。