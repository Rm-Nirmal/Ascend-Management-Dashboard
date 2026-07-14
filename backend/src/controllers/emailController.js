import dotenv from 'dotenv';

dotenv.config();

export const sendEmailReceipt = async (req, res) => {
  try {
    const { to, gymName, memberName, amount, sourceName, receiptLink } = req.body;

    if (!to || !memberName || !amount || !sourceName || !receiptLink) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters (to, gymName, memberName, amount, sourceName, receiptLink)' 
      });
    }

    const apiKey = process.env.RESEND_API_KEY || 're_D1NBAZQQ_9hk6VSFEem3bbQNhCWHoqajC';
    const displayGymName = gymName || 'Ascend Fit';
    
    // Construct premium styled HTML content
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${displayGymName}</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0b0c10;
      color: #c5c6c7;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0c10;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #15181f;
      border: 1px solid rgba(69, 243, 255, 0.15);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 40px rgba(69, 243, 255, 0.03);
    }
    .header {
      background: linear-gradient(135deg, #15181f 0%, #0d0f13 100%);
      padding: 35px;
      text-align: center;
      border-bottom: 1px solid rgba(69, 243, 255, 0.2);
      position: relative;
    }
    .header::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 25%;
      width: 50%;
      height: 1px;
      background: linear-gradient(90deg, transparent, #45f3ff, transparent);
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      background: linear-gradient(90deg, #ffffff, #45f3ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header p {
      margin: 8px 0 0 0;
      color: #8b9bb4;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .content {
      padding: 40px 35px;
    }
    .greeting {
      font-size: 18px;
      color: #ffffff;
      margin-bottom: 20px;
      font-weight: 700;
    }
    .intro {
      font-size: 14px;
      line-height: 1.6;
      color: #9ba9b4;
      margin-bottom: 30px;
    }
    .details-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 35px;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
    }
    .details-table th, .details-table td {
      padding: 12px 0;
      text-align: left;
    }
    .details-table th {
      color: #8b9bb4;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-weight: 600;
    }
    .details-table td {
      color: #ffffff;
      font-size: 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
    .details-table tr:last-child td {
      border-bottom: none;
    }
    .details-table td.amount-cell {
      text-align: right;
      font-weight: 700;
      font-family: monospace;
    }
    .details-table th.amount-cell {
      text-align: right;
    }
    .total-row td {
      font-size: 18px;
      font-weight: 800;
      color: #45f3ff !important;
      border-top: 1px solid rgba(69, 243, 255, 0.3) !important;
      padding-top: 18px;
    }
    .btn-container {
      text-align: center;
      margin-top: 25px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #45f3ff 0%, #00cfdf 100%);
      color: #0b0c10 !important;
      text-decoration: none;
      padding: 14px 35px;
      border-radius: 8px;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 15px rgba(69, 243, 255, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .footer {
      background-color: #0d0f13;
      padding: 25px;
      text-align: center;
      font-size: 11px;
      color: #667488;
      border-top: 1px solid rgba(255, 255, 255, 0.03);
      letter-spacing: 0.5px;
      line-height: 1.5;
    }
    .footer a {
      color: #45f3ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${displayGymName}</h1>
        <p>Official Digital Receipt</p>
      </div>
      <div class="content">
        <div class="greeting">Hello ${memberName},</div>
        <div class="intro">
          We have successfully processed your payment. Below are your transaction details. Thank you for your continued support!
        </div>
        
        <div class="details-card">
          <table class="details-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="amount-cell">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${sourceName}</td>
                <td class="amount-cell">LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="total-row">
                <td>Total Paid</td>
                <td class="amount-cell">LKR ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="btn-container">
          <a href="${receiptLink}" class="btn" target="_blank">View Digital Receipt</a>
        </div>
      </div>
      <div class="footer">
        <p>This email was sent on behalf of <strong>${displayGymName}</strong>.</p>
        <p>Should you have any inquiries regarding this payment, please contact us.</p>
        <p>&copy; ${new Date().getFullYear()} ${displayGymName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

    // Make request to Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'fitcore-ascend-server/1.0'
      },
      body: JSON.stringify({
        from: `${displayGymName} <onboarding@resend.dev>`,
        to: [to],
        subject: `Payment Receipt: ${sourceName} - ${displayGymName}`,
        html: htmlContent
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Resend Error Response]', data);
      return res.status(response.status).json({ success: false, error: data });
    }

    console.log(`[Email Dispatched] Receipt sent to ${to} for LKR ${amount}`);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Email Dispatch Exception]', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
