module.exports = {
  template_key: 'ticket_purchase_confirmation',
  name: 'Ticket Purchase Confirmation',
  subject_template: 'Your Tickets for #{event_title} - Order Confirmation',
  body_template: `<table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td>
          <table width="100%" cellpadding="20" cellspacing="0" border="0" bgcolor="#f8f9fa">
            <tr>
              <td align="center">
                <div style="background: #28a745; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="margin: 0; font-size: 24px;">🎉 Payment Confirmed!</h2>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6;">
          <p>Dear <strong>#{buyer_name}</strong>,</p>
          
          <p>Thank you for your ticket purchase! Your payment has been processed successfully and your tickets are ready.</p>
          
          <table width="100%" cellpadding="15" cellspacing="0" border="1" bgcolor="#ffffff" style="border-collapse: collapse; border: 2px solid #055474; margin: 20px 0;">
            <tr bgcolor="#055474">
              <td colspan="2" style="color: white; font-weight: bold; font-size: 18px; text-align: center;">
                🎪 EVENT DETAILS
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; width: 30%; background: #f8f9fa;">Event:</td>
              <td><strong>#{event_title}</strong></td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8f9fa;">Dates:</td>
              <td>#{event_start_date} - #{event_end_date}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8f9fa;">Venue:</td>
              <td>#{venue_name}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8f9fa;">Location:</td>
              <td>#{venue_address} #{venue_city}, #{venue_state}</td>
            </tr>
          </table>

          <table width="100%" cellpadding="15" cellspacing="0" border="1" bgcolor="#ffffff" style="border-collapse: collapse; border: 2px solid #28a745; margin: 20px 0;">
            <tr bgcolor="#28a745">
              <td colspan="2" style="color: white; font-weight: bold; font-size: 18px; text-align: center;">
                🎫 YOUR TICKETS
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; width: 30%; background: #f8f9fa;">Tickets:</td>
              <td>#{ticket_list}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f8f9fa;">Total Paid:</td>
              <td><strong style="color: #28a745; font-size: 18px;">$#{total_amount}</strong></td>
            </tr>
          </table>

          <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #856404; margin: 0 0 10px 0;">IMPORTANT INSTRUCTIONS:</h3>
            <ul style="color: #856404; margin: 0; padding-left: 20px;">
              <li><strong>Save this email</strong> or take a screenshot of your ticket codes</li>
              <li><strong>Present your codes</strong> at the event entrance for admission</li>
              <li><strong>Each ticket code</strong> is unique and can only be used once</li>
              <li><strong>Arrive early</strong> to allow time for check-in</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="#{event_url}" 
               style="background: #055474; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              📅 View Event Details
            </a>
          </div>

          <p>Questions about this event? Please contact the event organizer through the event page or reply to this email.</p>
          
          <p>Thank you for supporting our artists and events!</p>
          
          <p style="color: #666; font-style: italic;">
            Best regards,<br>
            The Brakebee Team
          </p>
        </td>
      </tr>
    </table>`,
  is_transactional: true,
  priority_level: 2,
  layout_key: 'default'
};
