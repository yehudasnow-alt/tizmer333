# תבניות מייל בעברית ל-Supabase Auth

ב-Supabase: **Authentication → Emails → Templates**. לכל תבנית מעתיקים את הנושא (Subject) ואת התוכן (Message body, לשונית Source).

| תבנית ב-Supabase | נושא | קובץ |
|---|---|---|
| Confirm signup | אישור האימייל לחשבון בתמרה | confirm-signup.html |
| Invite user | הוזמנתם לממשק המארחים של תמרה | invite.html |
| Magic link | קישור הכניסה שלכם לתמרה | magic-link.html |
| Reset password | בחירת סיסמה חדשה בתמרה | reset-password.html |
| Change email address | אישור שינוי האימייל בתמרה | change-email.html |

המיילים יוצאים דרך ה-SMTP שמוגדר ב-**Authentication → Emails → SMTP Settings** (מומלץ Resend, ראו README.md הראשי). בלי SMTP משלכם, Supabase שולח רק כמה מיילים בשעה ורק לכתובות של חברי הצוות בפרויקט.
