# E-mailmeldingen voor catalogusfeedback

Feedback over ontbrekende werken en foutieve werkvermeldingen wordt eerst
opgeslagen in `WorkSuggestion`. Daarna verstuurt de app een melding via Resend.
De ontvanger is `FEEDBACK_TO_EMAIL` (standaard het contactadres
`s.regtuijt@gmail.com`).

Stel in Vercel de volgende omgevingsvariabelen in:

- `RESEND_API_KEY`: API-sleutel van Resend.
- `FEEDBACK_FROM_EMAIL`: afzender op een domein dat in Resend is geverifieerd.
- `FEEDBACK_TO_EMAIL`: optioneel; standaard `s.regtuijt@gmail.com`.

Zonder een API-sleutel en geverifieerd afzenderadres worden meldingen wel in de
database bewaard, maar niet gemaild. De interface meldt dit aan de inzender.
