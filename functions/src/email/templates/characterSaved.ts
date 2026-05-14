import { APP_BASE_URL } from '../resendClient';

export interface CharacterSavedData {
  characterName: string;
  revealSentence: string;
  magicToken: string;
  accessCode: string;
  showName: string;
}

export function renderCharacterSaved(data: CharacterSavedData): {
  subject: string;
  html: string;
  text: string;
} {
  const returnUrl = `${APP_BASE_URL}/return?token=${encodeURIComponent(data.magicToken)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your character is safe.</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#E8E4D4;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E8E4D4;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FEFDF0;border-radius:3px;">

          <!-- Red margin line + left padding -->
          <tr>
            <td width="4" style="background-color:#D94F3D;"></td>
            <td style="padding:40px 40px 0 44px;">

              <!-- Brand -->
              <p style="margin:0 0 28px;font-family:Georgia,serif;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#999999;">The Misadventuring Party</p>

              <!-- Reveal sentence -->
              <p style="margin:0 0 36px;font-family:'Caveat',cursive,Georgia,serif;font-size:30px;line-height:1.4;color:#1a1a1a;">${escapeHtml(data.revealSentence)}</p>

              <!-- Body lines — ruled paper rows -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:16px;border-bottom:1px solid #D8D2BC;">
                    <p style="margin:0;font-size:16px;line-height:1.75;color:#2a2a2a;">Your character is in the books.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 0;border-bottom:1px solid #D8D2BC;">
                    <p style="margin:0;font-size:16px;line-height:1.75;color:#2a2a2a;">We'll keep them ready for the next show. Tap below to come back any time:</p>
                  </td>
                </tr>
              </table>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 40px;">
                <tr>
                  <td style="background-color:#1a1a1a;border-radius:2px;">
                    <a href="${returnUrl}" style="display:inline-block;padding:14px 28px;font-family:Georgia,serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#FEFDF0;text-decoration:none;font-weight:bold;">Come Back to Your Character &rarr;</a>
                  </td>
                </tr>
              </table>

              <!-- Notebook teaser -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #D8D2BC;">
                <tr>
                  <td style="padding:24px 0 0;">
                    <p style="margin:0 0 32px;font-size:13px;line-height:1.75;color:#555555;">The Misadventuring Notebook is coming. Soon every show will send you a personalized page with your character, your Stingers, and a few stickers we drew just for you. Stay tuned.</p>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <p style="margin:0 0 48px;font-family:'Caveat',cursive,Georgia,serif;font-size:26px;color:#1a1a1a;">The Misadventuring Party</p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${data.revealSentence}

Your character is in the books.

We'll keep them ready for the next show. Come back any time:

${returnUrl}

---

The Misadventuring Notebook is coming. Soon every show will send you a personalized page with your character, your Stingers, and a few stickers we drew just for you. Stay tuned.

The Misadventuring Party`;

  return {
    subject: 'Your character is safe.',
    html,
    text,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
