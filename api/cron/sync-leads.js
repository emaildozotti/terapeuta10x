/**
 * Worker: Supabase staging -> ClickUp
 *
 * V1 — 2026-04-14 — Dara (data-engineer)
 *
 * Cron rodando a cada 1 minuto via Vercel Cron Jobs.
 * Pega lote de leads pending/failed do Supabase staging e sincroniza
 * com ClickUp (retry automatico + backoff + dead_letter).
 *
 * Logica de retry:
 * - attempt 1 → falha → espera 2min
 * - attempt 2 → falha → espera 4min
 * - attempt 3 → falha → espera 8min
 * - attempt 4 → falha → espera 16min
 * - attempt 5 → falha → dead_letter (alerta Discord)
 *
 * Com dual write (webhook v6), este worker fica em standby:
 * leads entrando ja vao pra ClickUp direto, entao worker so
 * processa os que FALHAREM no dual write (rate limit, downtime, etc).
 *
 * Proxima iteracao (v7 staging-only): webhook para de escrever direto
 * no ClickUp e este worker vira o UNICO caminho.
 */

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const LEADS_LIST_ID = '901712860975';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DISCORD_ALERT_WEBHOOK_URL = process.env.DISCORD_ALERT_WEBHOOK_URL;

// ============================================================
// CLICKUP CUSTOM FIELD IDs (V5 — 2026-04-13)
// ============================================================
const F = {
  NOME:         '27ff6483-635b-4625-be67-7ec2d06cba50',
  WHATSAPP:     '979753b5-9247-4b19-9bb3-ab2525426c57',
  INSTAGRAM:    'f31893eb-a6d2-4664-88e0-0f28009aa8bb',
  EMAIL:        'af9f4f17-a7a9-46d2-8b69-7789384576af',
  CIDADE:       'f9e68477-ef95-40ed-81f9-96aecf36fe35',
  ESPECIALIDADE:        'b04e6551-7f30-4fa2-b6c7-479a39706e42',
  MOMENTO_ATUAL:        'b2f0d0d9-025b-47d8-8d3d-70aaf2224f0c',
  FATURAMENTO:          'e6c46326-2360-4e0e-bd9f-de3e018e841a',
  VALOR_SESSAO:         '82313e73-dfce-4f1d-85e0-28f397cf04c3',
  OBJETIVO_FATURAMENTO: '65dabec6-e0c9-4970-9cad-516ac171db40',
  DOR_PRINCIPAL:        '731dbf86-f527-4406-bd17-91ad80d2b069',
  CAPITAL_INVESTIR:     'cf4c4cff-0606-405a-9557-0e4371608fe7',
  PITCH_LEAD:           'cdace080-7c48-4c70-ae0e-0bccd03d4195',
  COMPROMISSO_12H:      '3a77b4a5-3e81-469e-8b62-a2544fda0cac',
  CAPACIDADE_SEMANAL:   '5160af7f-43de-4739-aec2-000bccff935c',
  ATENDE_HOJE:          '8c179f1c-02c2-4c4b-bc47-5773f1a817c5',
  VALOR_SESSAO_FAIXA:   'c1b80544-4341-4535-a79f-976d8e5688db',
  POTENCIAL_PERDIDO:    '886a38ea-b59f-4f4f-be63-d2cc0b500de1',
  FONTE:        'cc53057d-b6a3-42dd-94d9-b56a4c897744',
  UTM_SOURCE:   '649db4fe-209d-4fd3-b2f6-b789cf2010c3',
  UTM_MEDIUM:   'aba841b4-348e-488b-bb55-c1df1a7b006f',
  UTM_CAMPAIGN: '963efeec-9285-4d91-8a1a-1033895c6341',
};

const OPT = {
  fonte: {
    'Terapeuta 10x (Yay)': 'f2df75a4-9f8d-4f0d-81e5-69f024f6826d',
    'Calculadora 10x':     'e37bbc91-25c0-40b9-b023-d632a91e90e5',
  },
  especialidade: {
    'Psicologo(a)':  'ce7df774-db56-4824-9f68-94f89585db26',
    'Psicanalista':  'c1135955-546d-4f87-ab27-6b0a336de26b',
    'Terapeuta':     '6d7122ae-8893-45de-9561-1a2901551e11',
    'Psicologa':     '2082c707-065a-42f7-817c-6126ba1ef268',
    'Outro':         'dbdee38b-1870-48f5-8625-9593088702b9',
  },
  momento: {
    'Comecando do zero':              '1d6cd240-c666-43f9-8836-0de0fac1801b',
    'Pacientes mas convenio/social':  '51962f12-c55b-4f6f-97d7-1e1cfecd3a77',
    'Particular oscilante':           'cdbd4edf-3722-44d7-9d65-30371e02a62b',
    'Agenda cheia, quer cobrar mais': '9a204f7a-4cbb-4a9c-8b1e-bca0407cb50b',
  },
  faturamento: {
    'Ate R$ 2.000':         'c37d8f31-1cb8-4c38-bf2c-b181e650ec04',
    'R$ 2.000 a R$ 5.000':  '1e8d8414-c6bf-40ac-995d-342e6c8a6570',
    'R$ 5.000 a R$ 10.000': 'c553d271-228d-4266-b3bb-661469be67cf',
    'Acima de R$ 10.000':   'fc8505e6-731c-4dad-8260-4803f4068753',
  },
  dor: {
    'Nao chegam pessoas interessadas': '8d152199-9100-410c-aa78-4b91568310aa',
    'Perguntam preco e somem':         '4ab49f52-6d86-4f5c-b5fc-a79aa9912e94',
    'Vergonha de vender/cobrar':       'd7f69409-b1c7-40c9-8d76-4f97e756d4fe',
    'Cobro pouco':                     'e381306d-ba67-40d8-b246-7911c7466abf',
    'Outro':                           '6a63d959-91b2-4cd5-9103-f561b38905a1',
  },
  capital: {
    'Sim, ciente':           '4adb7a0d-24ee-4048-b35c-0c0e311164e8',
    'Sim, precisa parcelar': '11545d2f-25f8-4f2f-9191-b56ca7261fd0',
    'Nao consigo investir':  'fe28cf88-eb31-4a17-9cf7-53dc45f50b9a',
  },
  compromisso: {
    'Sim, comprometido': 'bf339715-82d2-4759-8ee3-e3dfaa14d74b',
    'Nao':               '41b81872-327f-4c44-bf20-7eb234926365',
  },
  capacidade: {
    '1 a 5':      '3ea71c9d-9643-4324-af8e-379f1021c865',
    '6 a 10':     'a5812761-b92e-4fd4-b911-a6f577cd1222',
    '11 a 20':    '2875cf33-4c82-460b-a06e-8d2bdaf74418',
    'Mais de 20': 'aec9a163-d21f-427b-a96f-f0c55b867fc1',
  },
  atende: {
    '0 a 2':      '27969d23-200b-4237-b696-533d7ab2fdbe',
    '3 a 5':      'c819bd04-4107-4d31-8377-0f48a11ce04e',
    '6 a 10':     '423c4caf-13f3-41a2-9596-5bd4cadd988d',
    '11 a 20':    '814d5bec-d761-423b-ab18-3ab693fc30c2',
    'Mais de 20': 'ac4f53ea-833f-45df-88dc-5364a8f014bd',
  },
  valorFaixa: {
    'Ate R$ 100':       '9aca7972-c376-4a0e-9d88-f642895c7850',
    'R$ 100 a R$ 200':  '949ac886-69a3-4f9f-9691-9844d5013060',
    'R$ 200 a R$ 350':  'c935d123-efac-4710-82ff-6ace29796aa8',
    'R$ 350 a R$ 500':  'bf7994d1-5e95-4550-9da6-61979fab1e5c',
    'Acima de R$ 500':  '1d88c45e-c5df-45b4-a6b4-436d5140548f',
    'Vende pacotes':    '04e9855d-8896-4777-87ed-7613632dabf5',
  },
};

const T10X = {
  NOME: '6977e14dc21e440efc0ae936', WHATSAPP: '6977e163b8950cf620090daa',
  INSTAGRAM: '6977e1a52f09648070066c33', ESPECIALIDADE: '6977e1c7091212568f03eb93',
  MOMENTO: '6977e1edb8950cf620090db0', FATURAMENTO: '6977e20a2f09648070066c37',
  VALOR_SESSAO: '6977e249b8950cf620090db3', OBJETIVO: '6977e26fddf83fe24d078f20',
  DOR: '6977e289091212568f03eb98', CAPITAL: '6977e2a7405e1f13e702c471',
  PITCH: '6977e2c936b9bc871e0289fb', COMPROMISSO: '6977e2e9091212568f03eb9a',
};

const CALC = {
  NOME: '69cbecda6439e1a50c07d119', AREA: '69cbecd96439e1a50c07d111',
  VALOR: '69cbecd96439e1a50c07d113', CAPACIDADE: '69cbecda6439e1a50c07d115',
  ATENDE: '69cbecda6439e1a50c07d117', WHATSAPP: '69cbed6cdaf74c782001cd1a',
};

// ============================================================
// HELPERS
// ============================================================
const clean = (s) => !s ? '' : String(s).replace(/<[^>]*>/g, '').trim();
const deaccent = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const norm = (s) => deaccent(clean(s)).toLowerCase();

function mapEspT10x(t) {
  const n = norm(t);
  if (n.startsWith('psicolog')) return OPT.especialidade['Psicologo(a)'];
  if (n.startsWith('psicanal')) return OPT.especialidade['Psicanalista'];
  if (n.startsWith('terapeut')) return OPT.especialidade['Terapeuta'];
  return OPT.especialidade['Outro'];
}
function mapEspCalc(t) {
  const n = norm(t);
  if (n.startsWith('psicolog')) return OPT.especialidade['Psicologa'];
  if (n.startsWith('psicanal')) return OPT.especialidade['Psicanalista'];
  if (n.startsWith('terapeut')) return OPT.especialidade['Terapeuta'];
  return OPT.especialidade['Outro'];
}
function mapMomento(t) {
  const n = norm(t);
  if (n.includes('comecando') || n.includes('zero')) return OPT.momento['Comecando do zero'];
  if (n.includes('convenio') || n.includes('social')) return OPT.momento['Pacientes mas convenio/social'];
  if (n.includes('oscila')) return OPT.momento['Particular oscilante'];
  if (n.includes('cheia') || n.includes('cobrar mais')) return OPT.momento['Agenda cheia, quer cobrar mais'];
  return null;
}
function mapFaturamento(t) {
  const n = norm(t);
  if (n.includes('ate r$ 2') || n.includes('ate 2')) return OPT.faturamento['Ate R$ 2.000'];
  if (n.includes('2.000') && n.includes('5.000')) return OPT.faturamento['R$ 2.000 a R$ 5.000'];
  if (n.includes('5.000') && n.includes('10.000')) return OPT.faturamento['R$ 5.000 a R$ 10.000'];
  if (n.includes('acima') || n.includes('10.000')) return OPT.faturamento['Acima de R$ 10.000'];
  return null;
}
function mapDor(t) {
  const n = norm(t);
  if (n.includes('nao chegam')) return OPT.dor['Nao chegam pessoas interessadas'];
  if (n.includes('perguntam')) return OPT.dor['Perguntam preco e somem'];
  if (n.includes('vergonha')) return OPT.dor['Vergonha de vender/cobrar'];
  if (n.includes('cobro pouco')) return OPT.dor['Cobro pouco'];
  return OPT.dor['Outro'];
}
function mapCapital(t) {
  const n = norm(t);
  if (n.includes('sim') && n.includes('ciente') && n.includes('capital')) return OPT.capital['Sim, ciente'];
  if (n.includes('sim') && n.includes('parcelamento')) return OPT.capital['Sim, precisa parcelar'];
  if (n.startsWith('nao')) return OPT.capital['Nao consigo investir'];
  return null;
}
function mapCompromisso(t) {
  return norm(t).includes('sim') ? OPT.compromisso['Sim, comprometido'] : OPT.compromisso['Nao'];
}
function mapCapacidade(t) {
  const n = norm(t);
  if (n.startsWith('1 a 5')) return OPT.capacidade['1 a 5'];
  if (n.startsWith('6 a 10')) return OPT.capacidade['6 a 10'];
  if (n.startsWith('11 a 20')) return OPT.capacidade['11 a 20'];
  if (n.includes('mais de 20')) return OPT.capacidade['Mais de 20'];
  return null;
}
function mapAtende(t) {
  const n = norm(t);
  if (n.startsWith('0 a 2')) return OPT.atende['0 a 2'];
  if (n.startsWith('3 a 5')) return OPT.atende['3 a 5'];
  if (n.startsWith('6 a 10')) return OPT.atende['6 a 10'];
  if (n.startsWith('11 a 20')) return OPT.atende['11 a 20'];
  if (n.includes('mais de 20')) return OPT.atende['Mais de 20'];
  return null;
}
function mapValorFaixa(t) {
  const n = norm(t);
  if (n.includes('pacote')) return OPT.valorFaixa['Vende pacotes'];
  if (n.includes('acima') || (n.includes('500') && !n.includes('350'))) return OPT.valorFaixa['Acima de R$ 500'];
  if (n.includes('350') && n.includes('500')) return OPT.valorFaixa['R$ 350 a R$ 500'];
  if (n.includes('200') && n.includes('350')) return OPT.valorFaixa['R$ 200 a R$ 350'];
  if (n.includes('100') && n.includes('200')) return OPT.valorFaixa['R$ 100 a R$ 200'];
  if (n.includes('ate') && n.includes('100')) return OPT.valorFaixa['Ate R$ 100'];
  return null;
}

function calcPotencial(capText, atText, valFaixaText) {
  const capMap = { '1 a 5': 5, '6 a 10': 10, '11 a 20': 20, 'mais de 20': 25 };
  const atMap = { '0 a 2': 2, '3 a 5': 5, '6 a 10': 10, '11 a 20': 20, 'mais de 20': 25 };
  const capKey = norm(capText);
  const atKey = norm(atText);
  const cap = capMap[capKey] || Object.entries(capMap).find(([k]) => capKey.includes(k))?.[1] || 0;
  const at = atMap[atKey] || Object.entries(atMap).find(([k]) => atKey.includes(k))?.[1] || 0;
  const valKey = norm(valFaixaText);
  let valor = 200;
  if (valKey.includes('ate') && valKey.includes('100')) valor = 80;
  else if (valKey.includes('100') && valKey.includes('200')) valor = 150;
  else if (valKey.includes('200') && valKey.includes('350')) valor = 275;
  else if (valKey.includes('350') && valKey.includes('500')) valor = 425;
  else if (valKey.includes('acima') || valKey.includes('500')) valor = 600;
  else if (valKey.includes('pacote')) valor = 500;
  const vagas = Math.max(0, cap - at);
  return vagas * 4 * valor;
}

// ============================================================
// Extrai customFields do payload (mesma logica do webhook)
// ============================================================
function extractCustomFieldsFromPayload(rawPayload) {
  // Parse nested → flat
  let payload = {};
  let responseMeta = {};
  if (rawPayload.response && Array.isArray(rawPayload.response.answers)) {
    responseMeta = rawPayload.response;
    for (const a of rawPayload.response.answers) {
      const fid = a.field || a.fieldId;
      if (!fid) continue;
      let content = a.content;
      if (Array.isArray(content)) content = content[0] || '';
      payload[fid] = content;
    }
  } else {
    payload = rawPayload;
  }

  const isCalc = !!payload[CALC.NOME];
  const isT10x = !!payload[T10X.NOME];
  if (!isCalc && !isT10x) return { error: 'unknown form' };

  const customFields = [];
  const push = (id, value) => {
    if (value !== null && value !== undefined && value !== '') {
      customFields.push({ id, value });
    }
  };

  let leadName = '';
  let formLabel = '';

  if (isT10x) {
    formLabel = 'Terapeuta 10x';
    leadName = clean(payload[T10X.NOME]);
    push(F.NOME, leadName);
    push(F.WHATSAPP, clean(payload[T10X.WHATSAPP]));
    push(F.INSTAGRAM, clean(payload[T10X.INSTAGRAM]));
    push(F.FONTE, OPT.fonte['Terapeuta 10x (Yay)']);
    const esp = mapEspT10x(payload[T10X.ESPECIALIDADE]); if (esp) push(F.ESPECIALIDADE, esp);
    const mom = mapMomento(payload[T10X.MOMENTO]); if (mom) push(F.MOMENTO_ATUAL, mom);
    const fat = mapFaturamento(payload[T10X.FATURAMENTO]); if (fat) push(F.FATURAMENTO, fat);
    const vs = parseFloat(payload[T10X.VALOR_SESSAO]) || 0;
    if (vs > 0) push(F.VALOR_SESSAO, vs);
    const obj = parseFloat(payload[T10X.OBJETIVO]) || 0;
    if (obj > 0) push(F.OBJETIVO_FATURAMENTO, obj);
    const dor = mapDor(payload[T10X.DOR]); if (dor) push(F.DOR_PRINCIPAL, dor);
    const cap = mapCapital(payload[T10X.CAPITAL]); if (cap) push(F.CAPITAL_INVESTIR, cap);
    push(F.PITCH_LEAD, clean(payload[T10X.PITCH]));
    const com = mapCompromisso(payload[T10X.COMPROMISSO]); if (com) push(F.COMPROMISSO_12H, com);
  }

  if (isCalc) {
    formLabel = 'Calculadora 10x';
    leadName = clean(payload[CALC.NOME]);
    push(F.NOME, leadName);
    push(F.WHATSAPP, clean(payload[CALC.WHATSAPP]));
    push(F.FONTE, OPT.fonte['Calculadora 10x']);
    const esp = mapEspCalc(payload[CALC.AREA]); if (esp) push(F.ESPECIALIDADE, esp);
    const cap = mapCapacidade(payload[CALC.CAPACIDADE]); if (cap) push(F.CAPACIDADE_SEMANAL, cap);
    const at = mapAtende(payload[CALC.ATENDE]); if (at) push(F.ATENDE_HOJE, at);
    const val = mapValorFaixa(payload[CALC.VALOR]); if (val) push(F.VALOR_SESSAO_FAIXA, val);
    const pot = calcPotencial(payload[CALC.CAPACIDADE], payload[CALC.ATENDE], payload[CALC.VALOR]);
    if (pot > 0) push(F.POTENCIAL_PERDIDO, pot);
  }

  // UTM
  const utmMap = {};
  const hf = responseMeta.hiddenFields;
  if (Array.isArray(hf)) for (const h of hf) { if (h && h.name && h.value != null) utmMap[h.name] = h.value; }
  else if (hf && typeof hf === 'object') Object.assign(utmMap, hf);
  const tr = responseMeta.tracking;
  if (Array.isArray(tr)) for (const t of tr) { if (t && t.name && t.value != null) utmMap[t.name] = t.value; }
  else if (tr && typeof tr === 'object') Object.assign(utmMap, tr);
  if (utmMap.utm_source) push(F.UTM_SOURCE, String(utmMap.utm_source));
  if (utmMap.utm_medium) push(F.UTM_MEDIUM, String(utmMap.utm_medium));
  if (utmMap.utm_campaign) push(F.UTM_CAMPAIGN, String(utmMap.utm_campaign));

  return { leadName, formLabel, customFields };
}

// ============================================================
// DISCORD ALERT
// ============================================================
async function sendDiscordAlert(content) {
  if (!DISCORD_ALERT_WEBHOOK_URL) {
    console.warn('[sync-leads] DISCORD_ALERT_WEBHOOK_URL not set, skipping alert');
    return;
  }
  try {
    await fetch(DISCORD_ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch (e) {
    console.error('[sync-leads] Discord alert failed:', e.message);
  }
}

// ============================================================
// HANDLER (Vercel Cron)
// ============================================================
export default async function handler(req, res) {
  // Vercel Cron sempre chama via GET
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CLICKUP_TOKEN) {
    return res.status(500).json({ ok: false, error: 'missing env vars' });
  }

  const startedAt = Date.now();
  const stats = { picked: 0, synced: 0, failed: 0, deadLettered: 0 };

  try {
    // 1. Pegar lote via RPC pick_leads_for_processing(5)
    const pickRes = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/pick_leads_for_processing`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_limit: 5 }),
      }
    );

    if (!pickRes.ok) {
      const errBody = await pickRes.text();
      console.error(`[sync-leads] pick RPC failed: ${pickRes.status} ${errBody}`);
      return res.status(500).json({ ok: false, error: 'pick_leads_for_processing failed', body: errBody });
    }

    const leads = await pickRes.json();
    stats.picked = Array.isArray(leads) ? leads.length : 0;

    if (stats.picked === 0) {
      console.log('[sync-leads] nothing to process');
      return res.status(200).json({ ok: true, ...stats, elapsedMs: Date.now() - startedAt });
    }

    console.log(`[sync-leads] picked ${stats.picked} leads`);

    // 2. Processar cada lead
    for (const lead of leads) {
      const { id: leadId, payload, attempts } = lead;
      console.log(`[sync-leads] processing ${leadId} (attempt ${attempts})`);

      // Extrair customFields do payload
      const parsed = extractCustomFieldsFromPayload(payload);
      if (parsed.error) {
        await markFailed(leadId, `parse error: ${parsed.error}`);
        stats.failed++;
        continue;
      }

      const { leadName, customFields } = parsed;
      if (!leadName) {
        await markFailed(leadId, 'no name in payload');
        stats.failed++;
        continue;
      }

      // 2a. Cria task no ClickUp
      let taskId = null;
      let taskUrl = null;
      try {
        const createRes = await fetch(
          `https://api.clickup.com/api/v2/list/${LEADS_LIST_ID}/task`,
          {
            method: 'POST',
            headers: { 'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: leadName, status: 'novo', notify_all: false }),
          }
        );
        if (!createRes.ok) {
          const errBody = await createRes.json().catch(() => ({}));
          const wasDeadLetter = await markFailed(leadId, `clickup create failed: ${errBody.err || createRes.status}`);
          if (wasDeadLetter) stats.deadLettered++;
          stats.failed++;
          continue;
        }
        const createData = await createRes.json();
        taskId = createData.id;
        taskUrl = createData.url;
      } catch (e) {
        const wasDeadLetter = await markFailed(leadId, `clickup create exception: ${e.message}`);
        if (wasDeadLetter) stats.deadLettered++;
        stats.failed++;
        continue;
      }

      // 2b. Set custom fields individualmente
      let okCount = 0;
      let failCount = 0;
      for (const cf of customFields) {
        try {
          const r = await fetch(
            `https://api.clickup.com/api/v2/task/${taskId}/field/${cf.id}`,
            {
              method: 'POST',
              headers: { 'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json' },
              body: JSON.stringify({ value: cf.value }),
            }
          );
          if (r.ok) okCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      }

      // 2c. Marca como synced
      await markSynced(leadId, taskId, taskUrl, okCount, failCount);
      stats.synced++;
      console.log(`[sync-leads] ${leadId} -> ${taskId} (${okCount}/${okCount+failCount} fields)`);
    }

    // 3. Alert Discord se teve dead_letter
    if (stats.deadLettered > 0) {
      await sendDiscordAlert(
        `🚨 **Zotti Leads Pipeline — Dead Letter Alert**\n` +
        `${stats.deadLettered} lead(s) falharam 5 vezes e foram movidos para dead_letter.\n` +
        `Verifica o Supabase: https://supabase.com/dashboard/project/vsluswlosaiazhzrrkrp/editor\n` +
        `Query: \`SELECT * FROM leads_staging WHERE status='dead_letter' ORDER BY updated_at DESC;\``
      );
    }

    const elapsedMs = Date.now() - startedAt;
    console.log(`[sync-leads] done: ${JSON.stringify({ ...stats, elapsedMs })}`);
    return res.status(200).json({ ok: true, ...stats, elapsedMs });

  } catch (error) {
    console.error('[sync-leads] uncaught:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}

// ============================================================
// Helpers pra atualizar status no Supabase via RPC
// ============================================================
async function markSynced(leadId, taskId, taskUrl, fieldsSynced, fieldsFailed) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_lead_synced`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_lead_id: leadId,
        p_clickup_task_id: taskId,
        p_clickup_task_url: taskUrl,
        p_fields_synced: fieldsSynced,
        p_fields_failed: fieldsFailed,
      }),
    });
  } catch (e) {
    console.error('[sync-leads] markSynced failed:', e.message);
  }
}

/**
 * Retorna true se o lead virou dead_letter nesta chamada.
 */
async function markFailed(leadId, errorMsg) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/mark_lead_failed`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_lead_id: leadId,
        p_error: errorMsg.slice(0, 500),
      }),
    });
    if (r.ok) {
      const result = await r.json().catch(() => null);
      return result && result.status === 'dead_letter';
    }
  } catch (e) {
    console.error('[sync-leads] markFailed failed:', e.message);
  }
  return false;
}
