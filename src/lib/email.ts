/**
 * Helper utility to send transactional emails via Brevo (formerly Sendinblue) HTTP API.
 * Falls back to console simulation log if BREVO_API_KEY is not configured in environment variables.
 */
export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
}: {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@quickfix.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'QuickFix';

  if (!apiKey) {
    console.log(`[QuickFix Simulator Fallback] Email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${textContent || 'HTML Content Loaded'}`);
    return { success: true };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
        textContent: textContent,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Brevo API Error:', data);
      return { success: false, error: data.message || 'Failed to send email via Brevo.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Email Send Exception:', error);
    return { success: false, error: error.message || 'Error occurred while sending email.' };
  }
}

/**
 * Generates a premium, styled HTML email template for QuickFix OTP codes.
 */
export function getOtpEmailTemplate(otpCode: string, userName: string, purpose: 'registration' | 'reset') {
  const actionText = purpose === 'registration' ? 'વેરિફિકેશન કોડ' : 'પાસવર્ડ રીસેટ કોડ';
  const titleText = purpose === 'registration' ? 'વેલકમ ટુ QuickFix!' : 'પાસવર્ડ રીસેટ વિનંતી';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titleText}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f9fafb;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          overflow: hidden;
          border: 1px solid #f3f4f6;
        }
        .header {
          background-color: #000000;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 800;
          margin: 0;
          letter-spacing: 2px;
        }
        .content {
          padding: 40px;
          color: #1f2937;
          line-height: 1.6;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .description {
          font-size: 14px;
          color: #4b5563;
          margin-bottom: 30px;
        }
        .otp-container {
          background-color: #f3f4f6;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          margin: 30px 0;
          border: 1px dashed #d1d5db;
        }
        .otp-label {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 1px;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .otp-code {
          font-size: 32px;
          font-weight: 800;
          color: #111827;
          letter-spacing: 6px;
          font-family: monospace;
          margin: 0;
        }
        .warning {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 30px;
          text-align: center;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          border-top: 1px solid #f3f4f6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>QUICKFIX</h1>
        </div>
        <div class="content">
          <div class="greeting">નમસ્તે ${userName || 'યુઝર'},</div>
          <div class="description">
            QuickFix એપમાં તમારા ઈમેલ એડ્રેસને વેરિફાય કરવા માટે નીચેનો ${actionText} ઉપયોગ કરો. આ સુરક્ષા કોડ આગામી ૧૫ મિનિટ સુધી જ માન્ય છે.
          </div>
          
          <div class="otp-container">
            <div class="otp-label">${actionText}</div>
            <div class="otp-code">${otpCode}</div>
          </div>
          
          <p class="description">
            જો તમે આ વિનંતી નથી કરી, તો તમે આ ઈમેલને અવગણી શકો છો. સુરક્ષા ખાતર આ કોડ કોઈની પણ સાથે શેર કરશો નહીં.
          </p>
          
          <div class="warning">
            આ સિસ્ટમ દ્વારા જનરેટ થયેલો ઈમેલ છે. કૃપા કરીને આના પર રીપ્લાય ન કરશો.
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} QuickFix Services. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;
}
