/**
 * Webhook: Cal.com → ClickUp
 *
 * Quando alguem agenda uma call no Cal.com,
 * cria ou atualiza Lead na lista "Leads" do ClickUp.
 *
 * URL: https://terapeuta10x.vercel.app/api/webhooks/calcom
 * Eventos: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED
 */

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const LEADS_LIST_ID = '901712813291';

// Custom field IDs (Leads)
const CF = {
  FONTE: '0aac9c5b-2c21-4829-a850-2aa59ba14f24',
  TELEFONE: '78b76015-9525-47a2-807a-914e91a12d4a',
  EMAIL: 'af9f4f17-a7a9-46d2-8b69-7789384576af',
  DATA_AGENDAMENTO: 'd92b9499-51a9-40cf-83e6-e1bfaa5f8f67',
  CALCOM_BOOKING_LINK: '6c2aab87-80cc-498a-9102-07fffed65453',
  CALCOM_BOOKING_ID: '65bff654-62f8-45a8-9b10-890bd66c0827',
  VALOR_PROPOSTO: 'ba75d3ac-5cbe-4847-a0f1-88fb1119ee37',
  NOTAS: '8ccf9033-bd4e-408d-80be-d9705194bea9',
};

// Dropdown option for fonte "Indicacao" (Cal.com bookings are usually direct/referral)
const FONTE_INDICACAO = '65091288-4253-401b-9afd-6ffaf4974205';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const triggerEvent = payload.triggerEvent || '';

    // Only process booking created
    if (triggerEvent === 'BOOKING_CANCELLED') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'cancelled booking' });
    }

    // Extract booking data
    const booking = payload.payload || {};
    const attendees = booking.attendees || [];
    const attendee = attendees[0] || {};

    const nome = attendee.name || booking.title || 'Lead Cal.com';
    const email = attendee.email || '';
    const telefone = attendee.phone || '';
    const bookingId = String(booking.bookingId || booking.uid || '');
    const startTime = booking.startTime || '';

    if (!nome || nome === 'Lead Cal.com') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'no attendee name' });
    }

    // Build custom fields
    const customFields = [
      { id: CF.FONTE, value: FONTE_INDICACAO },
      { id: CF.VALOR_PROPOSTO, value: 300000 },
    ];

    if (bookingId) {
      customFields.push({ id: CF.CALCOM_BOOKING_ID, value: bookingId });
    }

    if (email) {
      customFields.push({ id: CF.EMAIL, value: email });
    }

    if (telefone) {
      customFields.push({ id: CF.TELEFONE, value: telefone });
    }

    if (startTime) {
      const timestamp = new Date(startTime).getTime();
      customFields.push({ id: CF.DATA_AGENDAMENTO, value: timestamp });
    }

    const notas = `Fonte: Cal.com (${triggerEvent})\nEvento: ${booking.title || ''}\nHorario: ${startTime}`;
    customFields.push({ id: CF.NOTAS, value: notas });

    // Create Lead in ClickUp
    const clickupRes = await fetch(`https://api.clickup.com/api/v2/list/${LEADS_LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: nome,
        status: 'agendado',  // Already has a booking = Agendado
        custom_fields: customFields,
        notify_all: false,
      }),
    });

    const clickupData = await clickupRes.json();

    if (!clickupRes.ok) {
      console.error('ClickUp error:', clickupData);
      return res.status(500).json({ ok: false, error: clickupData.err || 'ClickUp error' });
    }

    console.log(`Cal.com lead created: ${nome} (${clickupData.id}) [${triggerEvent}]`);

    return res.status(200).json({
      ok: true,
      lead: nome,
      event: triggerEvent,
      taskId: clickupData.id,
    });

  } catch (error) {
    console.error('Cal.com webhook error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
