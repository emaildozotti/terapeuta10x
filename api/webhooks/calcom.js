/**
 * Webhook: Cal.com → Supabase Staging + ClickUp (dual write)
 *
 * V2 — 2026-04-15
 *
 * ARQUITETURA:
 *   Cal.com POST → webhook → 1) Supabase leads_staging (source of truth)
 *                            2) ClickUp Leads (behavior atual)
 *
 * Mesma arquitetura do yayforms.js V6:
 *   - Supabase PRIMEIRO (idempotency via calcom_booking_id)
 *   - ClickUp SEGUNDO (resiliente: cria task, depois seta campos individualmente)
 *   - Se ClickUp falhar, lead esta seguro no staging pra retry
 *
 * Eventos: BOOKING_CREATED, BOOKING_RESCHEDULED (BOOKING_CANCELLED = skip)
 *
 * URL: https://terapeuta10x.vercel.app/api/webhooks/calcom
 */

const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
const LEADS_LIST_ID = '901712860975';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================
// CLICKUP CUSTOM FIELD IDs (V5 — Leads)
// ============================================================
const F = {
  NOME:           '27ff6483-635b-4625-be67-7ec2d06cba50',
  WHATSAPP:       '979753b5-9247-4b19-9bb3-ab2525426c57',
  EMAIL:          'af9f4f17-a7a9-46d2-8b69-7789384576af',
  FONTE:          'cc53057d-b6a3-42dd-94d9-b56a4c897744',
  DATA_CALL:      'b2198771-5f4a-488f-b25d-0b440b800d6d',
  CALL_CONFIRMADA:'ccaa9a0c-58e9-4051-990d-8d2425f82127',
  NOTAS_CALL:     'cbb76ef1-e131-4022-ac1c-306d144f9b9b',
  TEMPERATURA:    '877627c7-79c1-42f5-95b2-d4704e8c80b6',
  RESPONSAVEL:    '73ad75a1-a940-4e2b-8ed4-ff20ed7287a8',
};

// ============================================================
// DROPDOWN OPTION IDs
// ============================================================
const OPT = {
  fonte: {
    SESSAO_MENTOR:   'ae96e184-c18f-4365-bfe7-074e70fd4a82',
    WEBNARIO:        '3b146d01-1ff9-4190-8a66-77dfbb48650c',
    OUTRO:           '93e1c0c4-2723-46c7-9c53-90126106ea73',
  },
  callConfirmada: {
    CONFIRMADA:      '3a5ab27c-c49c-4f2a-bd4c-cd1c44610b30',
  },
  temperatura: {
    QUENTE:          '60e71ce3-78d1-4cf0-984d-5df3f4c3e5f6',
  },
  responsavel: {
    MATHEUS:         'db23cdb9-406c-4eaf-8609-fc0ea3015e33',
  },
};

// Cal.com event slugs → ClickUp fonte
const EVENT_TYPE_MAP = {
  'sessao-estrategica': { fonte: OPT.fonte.SESSAO_MENTOR, label: 'Sessao Estrategica (Mentor)' },
  't10x':              { fonte: OPT.fonte.WEBNARIO, label: 'Terapeuta 10x (Call)' },
};

// ============================================================
// HANDLER
// ============================================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body || {};
    const triggerEvent = payload.triggerEvent || '';

    console.log(`[calcom] event: ${triggerEvent}, payload keys: ${Object.keys(payload).join(',')}`);

    // Skip cancellations
    if (triggerEvent === 'BOOKING_CANCELLED') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'cancelled booking' });
    }

    // Extract booking data
    const booking = payload.payload || {};
    const attendees = booking.attendees || [];
    const attendee = attendees[0] || {};

    const nome = attendee.name || booking.title || '';
    const email = attendee.email || '';
    const telefone = attendee.phone || '';
    const bookingId = String(booking.bookingId || booking.uid || '');
    const startTime = booking.startTime || '';

    if (!nome) {
      return res.status(200).json({ ok: true, skipped: true, reason: 'no attendee name' });
    }

    // Skip setup bookings (internal, client already paid)
    const eventTypeSlug = booking.eventType?.slug || booking.type || '';
    if (eventTypeSlug === 'setup') {
      return res.status(200).json({ ok: true, skipped: true, reason: 'setup booking (internal)' });
    }

    const eventConfig = EVENT_TYPE_MAP[eventTypeSlug] || {
      fonte: OPT.fonte.OUTRO,
      label: eventTypeSlug || 'Cal.com',
    };

    // Build custom fields
    const customFields = [];
    const push = (id, value) => {
      if (value !== null && value !== undefined && value !== '') {
        customFields.push({ id, value });
      }
    };

    push(F.NOME, nome);
    push(F.FONTE, eventConfig.fonte);
    push(F.CALL_CONFIRMADA, OPT.callConfirmada.CONFIRMADA);
    push(F.TEMPERATURA, OPT.temperatura.QUENTE);
    push(F.RESPONSAVEL, OPT.responsavel.MATHEUS);

    if (email) push(F.EMAIL, email);
    if (telefone) push(F.WHATSAPP, telefone);

    if (startTime) {
      const timestamp = new Date(startTime).getTime();
      push(F.DATA_CALL, timestamp);
    }

    const notas = `Fonte: ${eventConfig.label}\nEvento: ${booking.title || ''}\nHorario: ${startTime}\nTrigger: ${triggerEvent}`;
    push(F.NOTAS_CALL, notas);

    // ============================================================
    // SUPABASE STAGING — source of truth (escreve PRIMEIRO)
    // ============================================================
    const idempotencyKey = bookingId
      ? `calcom_${bookingId}`
      : `calcom_fallback_${Date.now()}_${nome.replace(/\s+/g, '_').slice(0, 20)}`;

    let stagingId = null;

    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const stagingRes = await fetch(
          `${SUPABASE_URL}/rest/v1/leads_staging?on_conflict=yay_response_id`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation,resolution=ignore-duplicates',
            },
            body: JSON.stringify({
              yay_response_id: idempotencyKey,
              form_id: 'calcom',
              form_label: eventConfig.label,
              payload: payload,
              submitted_at: startTime || new Date().toISOString(),
              status: 'pending',
            }),
          }
        );

        if (stagingRes.ok) {
          const rows = await stagingRes.json().catch(() => []);
          if (Array.isArray(rows) && rows.length > 0) {
            stagingId = rows[0].id;
            console.log(`[calcom] staging INSERT ok: ${stagingId}`);
          } else {
            // Duplicata — mesmo booking reenviado
            console.log(`[calcom] staging duplicate (${idempotencyKey}) — skipping`);
            try {
              const lookupRes = await fetch(
                `${SUPABASE_URL}/rest/v1/leads_staging?yay_response_id=eq.${encodeURIComponent(idempotencyKey)}&select=id,clickup_task_id,status`,
                {
                  headers: {
                    'apikey': SUPABASE_SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                }
              );
              const existing = await lookupRes.json().catch(() => []);
              if (Array.isArray(existing) && existing.length > 0) {
                return res.status(200).json({
                  ok: true,
                  duplicate: true,
                  stagingId: existing[0].id,
                  existingStatus: existing[0].status,
                  existingClickupTaskId: existing[0].clickup_task_id,
                });
              }
            } catch (e) {
              console.warn('[calcom] duplicate lookup failed:', e.message);
            }
          }
        } else {
          const errBody = await stagingRes.text().catch(() => '');
          console.error(`[calcom] staging INSERT failed: ${stagingRes.status} ${errBody.slice(0, 300)}`);
          return res.status(500).json({
            ok: false,
            error: 'supabase staging failed',
            status: stagingRes.status,
          });
        }
      } catch (e) {
        console.error('[calcom] staging exception:', e.message);
        return res.status(500).json({
          ok: false,
          error: 'supabase staging exception',
          message: e.message,
        });
      }
    } else {
      console.warn('[calcom] SUPABASE env vars not set, skipping staging');
    }

    // ============================================================
    // CLICKUP — cria task + seta campos individualmente
    // ============================================================
    const updateStaging = async (updates) => {
      if (!stagingId || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/leads_staging?id=eq.${stagingId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(updates),
          }
        );
      } catch (e) {
        console.warn('[calcom] updateStaging failed:', e.message);
      }
    };

    // Create task (nome + status agendado)
    const createRes = await fetch(`https://api.clickup.com/api/v2/list/${LEADS_LIST_ID}/task`, {
      method: 'POST',
      headers: { 'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nome,
        status: 'agendado',
        notify_all: false,
      }),
    });

    const clickupData = await createRes.json();

    if (!createRes.ok) {
      console.error('[calcom] ClickUp create failed:', clickupData);
      await updateStaging({
        status: 'failed',
        last_error: `clickup create failed: ${clickupData.err || createRes.status}`,
        last_error_at: new Date().toISOString(),
      });
      return res.status(200).json({
        ok: true,
        warning: 'clickup failed, lead saved in staging for retry',
        stagingId,
      });
    }

    const taskId = clickupData.id;

    // Set custom fields individually (resilient)
    let okCount = 0;
    let failCount = 0;
    for (const cf of customFields) {
      try {
        const r = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/field/${cf.id}`, {
          method: 'POST',
          headers: { 'Authorization': CLICKUP_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: cf.value }),
        });
        if (r.ok) {
          okCount++;
        } else {
          failCount++;
          const errBody = await r.json().catch(() => ({}));
          console.warn(`[calcom] field ${cf.id} failed:`, errBody.err || r.status);
        }
      } catch (e) {
        failCount++;
        console.warn(`[calcom] field ${cf.id} exception:`, e.message);
      }
    }

    console.log(`[calcom] OK: ${nome} -> ${taskId} (${eventConfig.label}, ${okCount}/${customFields.length} fields)`);

    // Update staging as synced
    await updateStaging({
      status: 'synced',
      clickup_task_id: taskId,
      clickup_task_url: clickupData.url || null,
      fields_synced: okCount,
      fields_failed: failCount,
      processed_at: new Date().toISOString(),
      last_error: null,
    });

    return res.status(200).json({
      ok: true,
      lead: nome,
      taskId,
      taskUrl: clickupData.url,
      event: triggerEvent,
      eventType: eventConfig.label,
      fieldsSet: okCount,
      fieldsFailed: failCount,
      stagingId,
    });

  } catch (error) {
    console.error('[calcom] uncaught error:', error);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
