/**
 * Webhook: Yay Forms → ClickUp
 *
 * Quando um lead preenche o formulario no Yay Forms,
 * esse webhook cria automaticamente uma task na lista "Leads" do ClickUp.
 *
 * URL: https://terapeuta10x.vercel.app/api/webhooks/yayforms
 * Metodo: POST
 * Trigger: Yay Forms webhook integration
 */

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const LEADS_LIST_ID = '901712813291';

// Custom field IDs (Leads)
const CF = {
  FONTE: '0aac9c5b-2c21-4829-a850-2aa59ba14f24',
  TELEFONE: '78b76015-9525-47a2-807a-914e91a12d4a',
  EMAIL: 'af9f4f17-a7a9-46d2-8b69-7789384576af',
  YAY_RESPONSE_ID: '97f8c653-5496-49a5-b24e-abaa7f3e6e29',
  VALOR_PROPOSTO: 'ba75d3ac-5cbe-4847-a0f1-88fb1119ee37',
  NOTAS: '8ccf9033-bd4e-408d-80be-d9705194bea9',
};

// Yay Forms field IDs
const YAY_FIELDS = {
  NOME: 'f_6977e14dc21e440efc0ae936',
  TELEFONE: 'f_6977e163b8950cf620090daa',
  INSTAGRAM: 'f_6977e1a52f09648070066c33',
};

// Dropdown option ID for "Yay Forms"
const FONTE_YAY_FORMS = '2ec13cdf-d6ef-4878-abdd-fb95c546714a';

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // Extract lead data from Yay Forms payload
    const nome = payload[YAY_FIELDS.NOME] || payload.name || 'Lead sem nome';
    const telefone = payload[YAY_FIELDS.TELEFONE] || '';
    const instagram = payload[YAY_FIELDS.INSTAGRAM] || '';
    const responseId = payload.id || payload.responseId || '';
    const status = payload.status || '';

    // Only process completed responses
    if (status === 'partial' && !nome) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'partial without name' });
    }

    // Skip if no name
    if (!nome || nome === 'Lead sem nome') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'no name' });
    }

    // Build custom fields
    const customFields = [
      { id: CF.FONTE, value: FONTE_YAY_FORMS },
      { id: CF.YAY_RESPONSE_ID, value: responseId },
      { id: CF.VALOR_PROPOSTO, value: 300000 }, // R$ 3.000 in cents
    ];

    if (telefone) {
      customFields.push({ id: CF.TELEFONE, value: telefone });
    }

    if (instagram) {
      customFields.push({ id: CF.NOTAS, value: `Instagram: ${instagram}` });
    }

    // Create task in ClickUp
    const clickupRes = await fetch(`https://api.clickup.com/api/v2/list/${LEADS_LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: nome,
        status: 'novo',
        custom_fields: customFields,
        notify_all: false,
      }),
    });

    const clickupData = await clickupRes.json();

    if (!clickupRes.ok) {
      console.error('ClickUp error:', clickupData);
      return res.status(500).json({ ok: false, error: clickupData.err || 'ClickUp API error' });
    }

    console.log(`Lead created: ${nome} (${clickupData.id})`);

    return res.status(200).json({
      ok: true,
      lead: nome,
      taskId: clickupData.id,
      taskUrl: clickupData.url,
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
