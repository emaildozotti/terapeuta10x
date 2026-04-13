/**
 * Webhook: Yay Forms -> ClickUp Leads V5
 *
 * Recebe submissoes dos forms Yay (Terapeuta 10x e Calculadora 10x)
 * e cria leads automaticamente na lista Leads do ClickUp V5.
 *
 * URL: https://terapeuta10x.vercel.app/api/webhooks/yayforms
 * Metodo: POST
 *
 * Detecta automaticamente qual form via field IDs.
 * Mapeia 100% das perguntas para campos do ClickUp.
 * Calcula Potencial Perdido para leads vindos da Calculadora.
 *
 * Atualizado: 2026-04-13 — V5 alinhado com Yay (30 campos no Lead)
 */

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const LEADS_LIST_ID = '901712860975';

// ============================================================
// CLICKUP CUSTOM FIELD IDs (V5 — 2026-04-13)
// ============================================================
const F = {
  // Identidade
  NOME:         '27ff6483-635b-4625-be67-7ec2d06cba50',
  WHATSAPP:     '979753b5-9247-4b19-9bb3-ab2525426c57',
  INSTAGRAM:    'f31893eb-a6d2-4664-88e0-0f28009aa8bb',
  EMAIL:        'af9f4f17-a7a9-46d2-8b69-7789384576af',
  CIDADE:       'f9e68477-ef95-40ed-81f9-96aecf36fe35',

  // Qualificacao Yay (Terapeuta 10x)
  ESPECIALIDADE:        'b04e6551-7f30-4fa2-b6c7-479a39706e42',
  MOMENTO_ATUAL:        'b2f0d0d9-025b-47d8-8d3d-70aaf2224f0c',
  FATURAMENTO:          'e6c46326-2360-4e0e-bd9f-de3e018e841a',
  VALOR_SESSAO:         '82313e73-dfce-4f1d-85e0-28f397cf04c3',
  OBJETIVO_FATURAMENTO: '65dabec6-e0c9-4970-9cad-516ac171db40',
  DOR_PRINCIPAL:        '731dbf86-f527-4406-bd17-91ad80d2b069',
  CAPITAL_INVESTIR:     'cf4c4cff-0606-405a-9557-0e4371608fe7',
  PITCH_LEAD:           'cdace080-7c48-4c70-ae0e-0bccd03d4195',
  COMPROMISSO_12H:      '3a77b4a5-3e81-469e-8b62-a2544fda0cac',

  // Calculator extras
  CAPACIDADE_SEMANAL:   '5160af7f-43de-4739-aec2-000bccff935c',
  ATENDE_HOJE:          '8c179f1c-02c2-4c4b-bc47-5773f1a817c5',
  VALOR_SESSAO_FAIXA:   'c1b80544-4341-4535-a79f-976d8e5688db',
  POTENCIAL_PERDIDO:    '886a38ea-b59f-4f4f-be63-d2cc0b500de1',

  // Fonte + UTM
  FONTE:        'cc53057d-b6a3-42dd-94d9-b56a4c897744',
  UTM_SOURCE:   '649db4fe-209d-4fd3-b2f6-b789cf2010c3',
  UTM_MEDIUM:   'aba841b4-348e-488b-bb55-c1df1a7b006f',
  UTM_CAMPAIGN: '963efeec-9285-4d91-8a1a-1033895c6341',
};

// ============================================================
// DROPDOWN OPTION IDs
// ============================================================
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

// ============================================================
// YAY FIELD IDs — Terapeuta 10x (12 perguntas)
// ============================================================
const T10X = {
  NOME:           '6977e14dc21e440efc0ae936',
  WHATSAPP:       '6977e163b8950cf620090daa',
  INSTAGRAM:      '6977e1a52f09648070066c33',
  ESPECIALIDADE:  '6977e1c7091212568f03eb93',
  MOMENTO:        '6977e1edb8950cf620090db0',
  FATURAMENTO:    '6977e20a2f09648070066c37',
  VALOR_SESSAO:   '6977e249b8950cf620090db3',
  OBJETIVO:       '6977e26fddf83fe24d078f20',
  DOR:            '6977e289091212568f03eb98',
  CAPITAL:        '6977e2a7405e1f13e702c471',
  PITCH:          '6977e2c936b9bc871e0289fb',
  COMPROMISSO:    '6977e2e9091212568f03eb9a',
};

// ============================================================
// YAY FIELD IDs — Calculadora 10x (6 perguntas)
// ============================================================
const CALC = {
  NOME:        '69cbecda6439e1a50c07d119',
  AREA:        '69cbecd96439e1a50c07d111',
  VALOR:       '69cbecd96439e1a50c07d113',
  CAPACIDADE:  '69cbecda6439e1a50c07d115',
  ATENDE:      '69cbecda6439e1a50c07d117',
  WHATSAPP:    '69cbed6cdaf74c782001cd1a',
};

// ============================================================
// HELPERS
// ============================================================

// Strip HTML tags from Yay multiple-choice answers (vem como "<p>Texto</p>")
function clean(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]*>/g, '').trim();
}

// Remove acentos para matching tolerante
function deaccent(s) {
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Versao lowercase+deaccent pra comparacao
function norm(s) {
  return deaccent(clean(s)).toLowerCase();
}

// Map Yay answer text -> ClickUp option ID (com tolerancia a typos minimos)
function mapOption(yayText, optionMap) {
  const text = clean(yayText);
  if (!text) return null;
  // Match exato
  if (optionMap[text]) return optionMap[text];
  // Match por prefixo (primeiras 15 chars)
  const prefix = text.slice(0, 15).toLowerCase();
  for (const [k, v] of Object.entries(optionMap)) {
    if (k.toLowerCase().startsWith(prefix)) return v;
  }
  return null;
}

// Todos os mapeamentos usam norm() = clean + deaccent + lowercase

function mapFaturamento(yayText) {
  const t = norm(yayText);
  if (t.includes('ate r$ 2') || t.includes('ate 2')) return OPT.faturamento['Ate R$ 2.000'];
  if (t.includes('2.000') && t.includes('5.000')) return OPT.faturamento['R$ 2.000 a R$ 5.000'];
  if (t.includes('5.000') && t.includes('10.000')) return OPT.faturamento['R$ 5.000 a R$ 10.000'];
  if (t.includes('acima') || t.includes('10.000')) return OPT.faturamento['Acima de R$ 10.000'];
  return null;
}

function mapEspecialidadeT10x(yayText) {
  const t = norm(yayText);
  if (t.startsWith('psicolog')) return OPT.especialidade['Psicologo(a)'];
  if (t.startsWith('psicanal')) return OPT.especialidade['Psicanalista'];
  if (t.startsWith('terapeut')) return OPT.especialidade['Terapeuta'];
  return OPT.especialidade['Outro'];
}

function mapEspecialidadeCalc(yayText) {
  const t = norm(yayText);
  if (t.startsWith('psicolog')) return OPT.especialidade['Psicologa'];
  if (t.startsWith('psicanal')) return OPT.especialidade['Psicanalista'];
  if (t.startsWith('terapeut')) return OPT.especialidade['Terapeuta'];
  return OPT.especialidade['Outro'];
}

function mapDor(yayText) {
  const t = norm(yayText);
  if (t.includes('nao chegam')) return OPT.dor['Nao chegam pessoas interessadas'];
  if (t.includes('perguntam')) return OPT.dor['Perguntam preco e somem'];
  if (t.includes('vergonha')) return OPT.dor['Vergonha de vender/cobrar'];
  if (t.includes('cobro pouco')) return OPT.dor['Cobro pouco'];
  return OPT.dor['Outro'];
}

function mapCapital(yayText) {
  const t = norm(yayText);
  if (t.includes('sim') && t.includes('ciente') && t.includes('capital')) return OPT.capital['Sim, ciente'];
  if (t.includes('sim') && t.includes('parcelamento')) return OPT.capital['Sim, precisa parcelar'];
  if (t.startsWith('nao')) return OPT.capital['Nao consigo investir'];
  return null;
}

function mapMomento(yayText) {
  const t = norm(yayText);
  if (t.includes('comecando') || t.includes('zero')) return OPT.momento['Comecando do zero'];
  if (t.includes('convenio') || t.includes('social')) return OPT.momento['Pacientes mas convenio/social'];
  if (t.includes('oscila')) return OPT.momento['Particular oscilante'];
  if (t.includes('cheia') || t.includes('cobrar mais')) return OPT.momento['Agenda cheia, quer cobrar mais'];
  return null;
}

function mapCompromisso(yayText) {
  const t = norm(yayText);
  return t.includes('sim') ? OPT.compromisso['Sim, comprometido'] : OPT.compromisso['Nao'];
}

// Capacidade/Atende vem como "1 a 5", "Mais de 20" etc
function mapCapacidade(yayText) {
  const t = norm(yayText);
  if (t.startsWith('1 a 5')) return OPT.capacidade['1 a 5'];
  if (t.startsWith('6 a 10')) return OPT.capacidade['6 a 10'];
  if (t.startsWith('11 a 20')) return OPT.capacidade['11 a 20'];
  if (t.includes('mais de 20')) return OPT.capacidade['Mais de 20'];
  return null;
}
function mapAtende(yayText) {
  const t = norm(yayText);
  if (t.startsWith('0 a 2')) return OPT.atende['0 a 2'];
  if (t.startsWith('3 a 5')) return OPT.atende['3 a 5'];
  if (t.startsWith('6 a 10')) return OPT.atende['6 a 10'];
  if (t.startsWith('11 a 20')) return OPT.atende['11 a 20'];
  if (t.includes('mais de 20')) return OPT.atende['Mais de 20'];
  return null;
}
function mapValorFaixa(yayText) {
  const t = norm(yayText);
  if (t.includes('pacote')) return OPT.valorFaixa['Vende pacotes'];
  if (t.includes('acima') || (t.includes('500') && !t.includes('350'))) return OPT.valorFaixa['Acima de R$ 500'];
  if (t.includes('350') && t.includes('500')) return OPT.valorFaixa['R$ 350 a R$ 500'];
  if (t.includes('200') && t.includes('350')) return OPT.valorFaixa['R$ 200 a R$ 350'];
  if (t.includes('100') && t.includes('200')) return OPT.valorFaixa['R$ 100 a R$ 200'];
  if (t.includes('ate') && t.includes('100')) return OPT.valorFaixa['Ate R$ 100'];
  return null;
}

// Calcula Potencial Perdido em R$/mes:
// (capacidade_max - atende_max) * 4 semanas * valor_medio_sessao
function calcPotencial(capacidadeText, atendeText, valorFaixaText) {
  const capMap = { '1 a 5': 5, '6 a 10': 10, '11 a 20': 20, 'mais de 20': 25 };
  const atMap  = { '0 a 2': 2, '3 a 5': 5, '6 a 10': 10, '11 a 20': 20, 'mais de 20': 25 };

  const capKey = norm(capacidadeText);
  const atKey  = norm(atendeText);
  const cap = capMap[capKey] || Object.entries(capMap).find(([k]) => capKey.includes(k))?.[1] || 0;
  const at  = atMap[atKey] || Object.entries(atMap).find(([k]) => atKey.includes(k))?.[1] || 0;

  // Valor medio da faixa
  const valKey = norm(valorFaixaText);
  let valor = 200;
  if (valKey.includes('ate') && valKey.includes('100')) valor = 80;
  else if (valKey.includes('100') && valKey.includes('200')) valor = 150;
  else if (valKey.includes('200') && valKey.includes('350')) valor = 275;
  else if (valKey.includes('350') && valKey.includes('500')) valor = 425;
  else if (valKey.includes('acima') || valKey.includes('500')) valor = 600;
  else if (valKey.includes('pacote')) valor = 500;

  const vagas = Math.max(0, cap - at);
  return vagas * 4 * valor; // R$/mes
}

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    console.log('[yayforms] payload received:', JSON.stringify(payload).slice(0, 500));

    // Detect form
    const isCalc = !!payload[CALC.NOME];
    const isT10x = !!payload[T10X.NOME];

    if (!isCalc && !isT10x) {
      console.warn('[yayforms] unknown form, no name field detected');
      return res.status(200).json({ ok: true, skipped: true, reason: 'unknown form' });
    }

    const formLabel = isCalc ? 'Calculadora 10x' : 'Terapeuta 10x';
    console.log(`[yayforms] form: ${formLabel}`);

    // ============ Extract fields ============
    const customFields = [];
    const push = (id, value) => {
      if (value !== null && value !== undefined && value !== '') {
        customFields.push({ id, value });
      }
    };

    let leadName = '';

    if (isT10x) {
      // === FORM TERAPEUTA 10X (12 perguntas) ===
      leadName = clean(payload[T10X.NOME]);
      push(F.NOME, leadName);
      push(F.WHATSAPP, clean(payload[T10X.WHATSAPP]));
      push(F.INSTAGRAM, clean(payload[T10X.INSTAGRAM]));
      push(F.FONTE, OPT.fonte['Terapeuta 10x (Yay)']);

      const esp = mapEspecialidadeT10x(payload[T10X.ESPECIALIDADE]);
      if (esp) push(F.ESPECIALIDADE, esp);

      const mom = mapMomento(payload[T10X.MOMENTO]);
      if (mom) push(F.MOMENTO_ATUAL, mom);

      const fat = mapFaturamento(payload[T10X.FATURAMENTO]);
      if (fat) push(F.FATURAMENTO, fat);

      const valorSessao = parseFloat(payload[T10X.VALOR_SESSAO]) || 0;
      if (valorSessao > 0) push(F.VALOR_SESSAO, valorSessao);

      const objetivo = parseFloat(payload[T10X.OBJETIVO]) || 0;
      if (objetivo > 0) push(F.OBJETIVO_FATURAMENTO, objetivo);

      const dor = mapDor(payload[T10X.DOR]);
      if (dor) push(F.DOR_PRINCIPAL, dor);

      const cap = mapCapital(payload[T10X.CAPITAL]);
      if (cap) push(F.CAPITAL_INVESTIR, cap);

      push(F.PITCH_LEAD, clean(payload[T10X.PITCH]));

      const com = mapCompromisso(payload[T10X.COMPROMISSO]);
      if (com) push(F.COMPROMISSO_12H, com);
    }

    if (isCalc) {
      // === FORM CALCULADORA 10X (6 perguntas) ===
      leadName = clean(payload[CALC.NOME]);
      push(F.NOME, leadName);
      push(F.WHATSAPP, clean(payload[CALC.WHATSAPP]));
      push(F.FONTE, OPT.fonte['Calculadora 10x']);

      const esp = mapEspecialidadeCalc(payload[CALC.AREA]);
      if (esp) push(F.ESPECIALIDADE, esp);

      const cap = mapCapacidade(payload[CALC.CAPACIDADE]);
      if (cap) push(F.CAPACIDADE_SEMANAL, cap);

      const at = mapAtende(payload[CALC.ATENDE]);
      if (at) push(F.ATENDE_HOJE, at);

      const valor = mapValorFaixa(payload[CALC.VALOR]);
      if (valor) push(F.VALOR_SESSAO_FAIXA, valor);

      // Calcula potencial perdido
      const potencial = calcPotencial(payload[CALC.CAPACIDADE], payload[CALC.ATENDE], payload[CALC.VALOR]);
      if (potencial > 0) push(F.POTENCIAL_PERDIDO, potencial);
    }

    // ============ UTM tracking ============
    // Yay envia UTM no objeto raiz como "utm_source", "utm_medium", "utm_campaign"
    // Pode vir tambem em "tracking" ou "hidden"
    const utm = payload.utm || payload.tracking || payload.hidden || {};
    const utmSource = payload.utm_source || utm.utm_source || utm.source;
    const utmMedium = payload.utm_medium || utm.utm_medium || utm.medium;
    const utmCampaign = payload.utm_campaign || utm.utm_campaign || utm.campaign;

    if (utmSource) push(F.UTM_SOURCE, String(utmSource));
    if (utmMedium) push(F.UTM_MEDIUM, String(utmMedium));
    if (utmCampaign) push(F.UTM_CAMPAIGN, String(utmCampaign));

    if (!leadName) {
      console.warn('[yayforms] no name in payload, skipping');
      return res.status(200).json({ ok: true, skipped: true, reason: 'no name' });
    }

    // ============ Create task in ClickUp ============
    const taskBody = {
      name: leadName,
      status: 'novo',
      custom_fields: customFields,
      notify_all: false,
    };

    const clickupRes = await fetch(`https://api.clickup.com/api/v2/list/${LEADS_LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': CLICKUP_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskBody),
    });

    const clickupData = await clickupRes.json();

    if (!clickupRes.ok) {
      console.error('[yayforms] ClickUp error:', clickupData);
      return res.status(500).json({
        ok: false,
        error: clickupData.err || 'ClickUp API error',
        clickup: clickupData,
      });
    }

    console.log(`[yayforms] OK: ${leadName} -> ${clickupData.id} (${formLabel}, ${customFields.length} fields)`);

    return res.status(200).json({
      ok: true,
      version: 'v3-deaccent-2026-04-13',
      lead: leadName,
      taskId: clickupData.id,
      taskUrl: clickupData.url,
      form: formLabel,
      fieldsSet: customFields.length,
      debug: {
        sampleNorm: isT10x ? norm(payload[T10X.ESPECIALIDADE]) : norm(payload[CALC.AREA]),
      },
    });

  } catch (error) {
    console.error('[yayforms] uncaught error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
