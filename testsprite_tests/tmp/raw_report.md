
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** AnestEasy WEB
- **Date:** 2025-11-13
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** User Registration Success for Anesthesiologist and Secretary
- **Test Code:** [TC001_User_Registration_Success_for_Anesthesiologist_and_Secretary.py](./TC001_User_Registration_Success_for_Anesthesiologist_and_Secretary.py)
- **Test Error:** The registration process for anesthesiologist was completed up to the email confirmation step. The confirmation email was sent and resent, but the system does not update or confirm the email verification status when clicking 'Verificar Confirmação'. This blocks further progress and profile completion. Due to this issue, testing cannot proceed to secretary registration or profile completion. Please investigate and fix the email confirmation verification functionality.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
[ERROR] Failed to load resource: the server responded with a status of 404 (Not Found) (at http://localhost:3000/api/check-email-confirmation:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/14f9d39c-9f07-4441-9bb7-24a3ce9decf4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** Login and Logout Functionality for Both User Types
- **Test Code:** [TC002_Login_and_Logout_Functionality_for_Both_User_Types.py](./TC002_Login_and_Logout_Functionality_for_Both_User_Types.py)
- **Test Error:** Logout functionality is broken. User remains logged in after clicking logout button. Cannot proceed with further tests for session expiry and secretary user login. Reporting issue and stopping test execution.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/e1a70d6b-d625-4d6f-8b3d-114cbe56a90d
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** Password Reset Flow
- **Test Code:** [TC003_Password_Reset_Flow.py](./TC003_Password_Reset_Flow.py)
- **Test Error:** Testing of forgot password and reset password functionality is stopped due to critical validation issue with unregistered email handling. The system incorrectly sends success messages for unregistered emails, which is a security and usability concern. Further testing should resume after this issue is fixed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/138a5f21-ed52-4709-9ee6-0865dac33a15
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Dashboard Data Rendering and Interactivity
- **Test Code:** [TC004_Dashboard_Data_Rendering_and_Interactivity.py](./TC004_Dashboard_Data_Rendering_and_Interactivity.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/0009bf0f-ef5d-48d0-bdbe-82f5f89af16e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Procedures Management with OCR Data Capture
- **Test Code:** [TC005_Procedures_Management_with_OCR_Data_Capture.py](./TC005_Procedures_Management_with_OCR_Data_Capture.py)
- **Test Error:** Testing stopped due to missing image upload functionality on the procedure creation page, which prevents verifying OCR data extraction and subsequent steps. Issue reported for developer attention.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/2528d5cf-2c5e-4297-ad95-714bfffda83a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Financial Module: Revenue and Expenses Management
- **Test Code:** [TC006_Financial_Module_Revenue_and_Expenses_Management.py](./TC006_Financial_Module_Revenue_and_Expenses_Management.py)
- **Test Error:** Testing stopped due to navigation issue: 'Registrar Pagamento' button redirects to unrelated Procedimentos page, preventing further financial module tests. Issue reported for resolution.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/cf25fc82-fed4-4848-9577-7827c7c339a7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** Reports Generation with Export in PDF and CSV
- **Test Code:** [TC007_Reports_Generation_with_Export_in_PDF_and_CSV.py](./TC007_Reports_Generation_with_Export_in_PDF_and_CSV.py)
- **Test Error:** The task to validate customizable filters for reports, generation of reports with correct data, and exporting functionality in PDF and CSV formats has been partially completed. We successfully logged in, navigated to the reports page, applied date range filters, and generated the 'Relatório de Procedimentos' report with accurate filtered data. The report content was validated in a printable view and matched the expected data. Export functionality was tested for PDF, but the exported PDF showed zero procedures, indicating a possible issue with export data for the applied filter. Export buttons for CSV and PDF are present and clickable, but CSV export testing and export with empty filter criteria for full report export remain unverified. Due to limitations in element interaction and export verification, the task is not fully complete. Further testing is recommended to confirm CSV export accuracy and full report export functionality.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/fe6c57f6-f2dc-4424-913b-e7e619317395
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Secretary Management and Permissions
- **Test Code:** [null](./null)
- **Test Error:** Test execution timed out after 15 minutes
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/965a80df-3d33-4100-9605-2f2aea332503
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Subscription and Payment Integration with Pagar.me
- **Test Code:** [TC009_Subscription_and_Payment_Integration_with_Pagar.me.py](./TC009_Subscription_and_Payment_Integration_with_Pagar.me.py)
- **Test Error:** Testing stopped due to authorization error preventing plan selection and checkout. Reported issue for resolution before further testing.
Browser Console Logs:
[WARNING] ImmutableStateInvariantMiddleware took 33ms, which is more than the warning threshold of 32ms. 
If your state or actions are very large, you may want to disable the middleware as it might cause too much of a slowdown in development mode. See https://redux-toolkit.js.org/api/getDefaultMiddleware for instructions.
It is disabled in production builds, so you don't need to worry about that. (at webpack-internal:///(app-pages-browser)/./node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs:192:16)
[ERROR] Failed to load resource: the server responded with a status of 401 (Unauthorized) (at http://localhost:3000/api/pagarme/subscription/upgrade:0:0)
[ERROR] Erro ao fazer upgrade: Error: Não autorizado
    at handleUpgrade (webpack-internal:///(app-pages-browser)/./app/assinatura/page.tsx:285:23) (at webpack-internal:///(app-pages-browser)/./node_modules/next/dist/next-devtools/userspace/app/errors/intercept-console-error.js:56:31)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/54d9140b-fa0e-4be0-9209-5ec882c46a55
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** Real-time Notifications System
- **Test Code:** [TC010_Real_time_Notifications_System.py](./TC010_Real_time_Notifications_System.py)
- **Test Error:** The test for sending, receiving, and displaying real-time notifications was partially completed. Login, opening the notifications panel, and marking notifications as read were successful. However, triggering a new procedure notification failed because the required field 'Técnica Anestésica' was not filled, blocking the procedure creation and notification sending. Thus, the real-time notification functionality could not be fully validated. Please ensure all required fields are filled to complete the test successfully.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/203a7638-7ac0-4eda-9519-48795b22e069
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** User Profile Settings and Account Deletion
- **Test Code:** [TC011_User_Profile_Settings_and_Account_Deletion.py](./TC011_User_Profile_Settings_and_Account_Deletion.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/c46fde5d-3cad-4e13-89c0-e8c9b1274924
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** Security and Privacy Compliance Tests (LGPD)
- **Test Code:** [TC012_Security_and_Privacy_Compliance_Tests_LGPD.py](./TC012_Security_and_Privacy_Compliance_Tests_LGPD.py)
- **Test Error:** The website has a critical issue: the 'Add Task' button does not open the task creation interface, preventing creation of tasks and categories. This blocks the ability to verify offline data persistence as required. Please fix this issue to proceed with testing.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/883886d6-ebac-4998-a97f-64e2bec30c86
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Performance Testing for Key Routes
- **Test Code:** [TC013_Performance_Testing_for_Key_Routes.py](./TC013_Performance_Testing_for_Key_Routes.py)
- **Test Error:** Reported critical navigation bug in finance module. Testing stopped as further finance stress testing cannot proceed until issue is resolved. All previous steps completed successfully except finance stress test.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/a25bad98-cbf5-4cf1-a72a-c918a5fb76d4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC014
- **Test Name:** OCR Accuracy and Error Handling
- **Test Code:** [TC014_OCR_Accuracy_and_Error_Handling.py](./TC014_OCR_Accuracy_and_Error_Handling.py)
- **Test Error:** Stopped testing due to unresponsive image upload button preventing OCR extraction testing. Reported the issue for developer attention.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/bbc312e1-863b-4564-b252-6291485990c4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015
- **Test Name:** UI Responsiveness and Component Consistency
- **Test Code:** [TC015_UI_Responsiveness_and_Component_Consistency.py](./TC015_UI_Responsiveness_and_Component_Consistency.py)
- **Test Error:** Testing stopped due to navigation failure on tablet viewport. The 'Dashboard' button does not navigate to the dashboard page, preventing further UI verification on tablet and mobile devices. Please fix this issue to continue testing.
Browser Console Logs:
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.e19f005f-188b-421e-a747-7865f1f0079f:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6db87e93-373d-459c-899c-fbe92321eec3:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b370ab93-24e9-4788-97c9-857018935ea4:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.083d60e4-61f2-45e7-8d08-7189291f3811:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.28493020-5685-40c9-a9ef-78b47726a1ac:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.260ec60d-0b44-4663-aaf7-25aaf1f4cb7e:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.5458ac26-1792-4a27-a755-70a664cb4ffe:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.d3c55561-acee-4409-b9e6-eb1ce14735f7:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.a094b80a-37e5-4325-965c-74878b0b7187:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.6c21e1ac-1fd3-4426-9757-2ddefa8cdc18:0:0)
[ERROR] Failed to load resource: the server responded with a status of 406 () (at https://zmtwwajyhusyrugobxur.supabase.co/rest/v1/feedback_links?select=*&procedure_id=eq.b742f7e4-d381-4d13-835e-587bf062ed21:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ce638bf4-f4fc-47a3-9be8-7b28846342bd/dd067b97-01d1-4166-9497-1ba7cd65ba60
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **13.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---