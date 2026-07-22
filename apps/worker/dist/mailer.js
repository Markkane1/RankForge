"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStatusAlert = sendStatusAlert;
const resend_1 = require("resend");
function getResendClient() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('RESEND_API_KEY is required to send status alerts.');
    }
    return new resend_1.Resend(apiKey);
}
/**
 * Service to send scheduled automated status alerts to clients
 */
async function sendStatusAlert(toEmail, clientName, statusMessage) {
    try {
        console.log(`Preparing to send status alert to ${clientName} (${toEmail})`);
        const data = await getResendClient().emails.send({
            from: 'RankForge <notifications@rankforge.app>',
            to: [toEmail],
            subject: `RankForge Status Update: ${clientName}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #111827;">RankForge Automated Alert</h2>
          <p style="color: #374151; font-size: 16px;">Hello,</p>
          <p style="color: #374151; font-size: 16px;">Here is the latest status update regarding your account (<strong>${clientName}</strong>):</p>
          <div style="background-color: #f4f4f5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <p style="color: #1f2937; margin: 0; font-size: 15px;">${statusMessage}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If you have any questions, please contact your account coordinator directly.
          </p>
        </div>
      `,
        });
        console.log(`Status alert sent successfully. ID: ${data?.data?.id}`);
        return data;
    }
    catch (error) {
        console.error(`Failed to send status alert to ${toEmail}:`, error);
        throw error; // Re-throw to allow BullMQ to handle retries/Sentry logging
    }
}
