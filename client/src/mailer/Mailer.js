const sendEmail = async (to, subject, text, html) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to send email');
    return data;
  } catch (error) {
    console.error('Mailer error:', error.message);
    throw error;
  }
};

export default { sendEmail };