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

// Yay Forms field IDs — Terapeuta 10x (form principal)
const YAY_T10X = {
  NOME: 'f_6977e14dc21e440efc0ae936',
  TELEFONE: 'f_6977e163b8950cf620090daa',
  INSTAGRAM: 'f_6977e1a52f09648070066c33',
};

// Yay Forms field IDs — Calculadora 10x
const YAY_CALC = {
  NOME: 'f_69cbecda6439e1a50c07d119',
  TELEFONE: 'f_69cbed6cdaf74c782001cd1a',
};

// Dropdown option IDs for Fonte
const FONTE_OPTIONS = {
  YAY_FORMS: '2ec13cdf-d6ef-4878-abdd-fb95c546714a',
  LP_CALCULATOR: 'da9d92ab-fe4c-4ce6-adfa-7b07f5e57697',
};

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // Detect which form sent the webhook (Terapeuta 10x or Calculadora 10x)
    const isCalculadora = !!payload[YAY_CALC.NOME];
    const isT10x = !!payload[YAY_T10X.NOME];

    // Extract lead data — try both forms
    const nome = payload[YAY_T10X.NOME] || payload[YAY_CALC.NOME] || payload.name || '';
    const telefone = payload[YAY_T10X.TELEFONE] || payload[YAY_CALC.TELEFONE] || '';
    const instagram = payload[YAY_T10X.INSTAGRAM] || '';
    const responseId = payload.id || payload.responseId || '';
    const status = payload.status || '';

    // Determine source
    const fonte = isCalculadora ? FONTE_OPTIONS.LP_CALCULATOR : FONTE_OPTIONS.YAY_FORMS;
    const fonteLabel = isCalculadora ? 'Calculadora 10x' : 'Terapeuta 10x';

    // Only process if has name
    if (!nome) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'no name' });
    }

    // Build custom fields
    const customFields = [
      { id: CF.FONTE, value: fonte },
      { id: CF.YAY_RESPONSE_ID, value: responseId },
      { id: CF.VALOR_PROPOSTO, value: 300000 }, // R$ 3.000 in cents
    ];

    if (telefone) {
      customFields.push({ id: CF.TELEFONE, value: telefone });
    }

    // Notes with source and extra info
    const notas = [
      `Fonte: ${fonteLabel}`,
      instagram ? `Instagram: ${instagram}` : '',
    ].filter(Boolean).join('\n');

    if (notas) {
      customFields.push({ id: CF.NOTAS, value: notas });
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
