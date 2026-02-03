// =====================================================
// WhatsApp Webhook Handler (Evolution API)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/db/supabase';
import { getLLMProvider } from '@/lib/ai/siliconflow';
import { hash } from '@/lib/utils/helpers';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || '';

/**
 * Validates webhook signature using HMAC-SHA256
 * Uses timing-safe comparison to prevent timing attacks
 */
function validateWebhookSignature(body: string, signature: string, secret: string): boolean {
  try {
    // Evolution API uses HMAC-SHA256 in hex format
    const hmac = createHmac('sha256', secret);
    hmac.update(body, 'utf8');
    const expectedSignature = hmac.digest('hex');
    
    // Remove 'sha256=' prefix if present (some webhook providers use this)
    const actualSignature = signature.startsWith('sha256=') 
      ? signature.slice(7) 
      : signature;
    
    // Timing-safe comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const actualBuf = Buffer.from(actualSignature, 'hex');
    
    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }
    
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch (error) {
    console.error('Webhook signature validation error:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature validation
    const rawBody = await req.text();
    
    // Validate webhook signature if configured
    const signature = req.headers.get('x-webhook-signature');
    if (WEBHOOK_SECRET && signature) {
      const isValid = validateWebhookSignature(rawBody, signature, WEBHOOK_SECRET);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { received: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (WEBHOOK_SECRET && !signature) {
      // Log warning if secret is configured but no signature provided
      console.warn('Webhook received without signature while WHATSAPP_WEBHOOK_SECRET is set');
    }
    
    // Parse body after signature validation
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    // Only process message events
    if (!event?.includes('message')) {
      return NextResponse.json({ received: true });
    }

    const from = data.from;
    const messageType = data.type;

    // Find client by WhatsApp number
    const { data: client } = await supabaseServer
      .from('clients')
      .select('*, firm:firm_id(*)')
      .eq('whatsapp_number', formatPhoneNumber(from))
      .single();

    if (!client) {
      console.log('Client not found for WhatsApp:', from);
      return NextResponse.json({ received: true, error: 'Client not found' }, { status: 404 });
    }

    // Handle document (PDF/XML)
    if (messageType === 'document' && data.document) {
      return await handleDocument(client, data);
    }

    // Handle text commands
    if (messageType === 'text' && data.text) {
      return await handleTextCommand(client, data.text.body);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { received: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleDocument(client: any, data: any) {
  const document = data.document;
  
  // Download file from Evolution API
  const fileBuffer = await downloadFile(document.url);
  const fileHash = hash(fileBuffer.toString('base64'));
  
  // Check for duplicates
  const { data: existingInvoice } = await supabaseServer
    .from('invoices')
    .select('id')
    .eq('file_hash', fileHash)
    .eq('client_id', client.id)
    .single();

  if (existingInvoice) {
    // Send duplicate notification
    await sendWhatsAppMessage(
      client.whatsapp_number,
      '⚠️ Esta fatura já foi recebida anteriormente. Não será processada novamente.'
    );
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Generate file path
  const timestamp = Date.now();
  const filePath = `invoices/${client.firm_id}/${client.id}/${timestamp}_${document.filename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabaseServer
    .storage
    .from('invoices')
    .upload(filePath, fileBuffer, {
      contentType: document.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Extract text from document
  let rawText = '';
  try {
    if (document.mimetype === 'application/pdf') {
      rawText = await extractPdfText(fileBuffer);
    } else if (document.mimetype === 'text/xml') {
      rawText = fileBuffer.toString('utf-8');
    }
  } catch (error) {
    console.error('Text extraction error:', error);
  }

  // Create invoice record
  const { data: invoice, error: insertError } = await supabaseServer
    .from('invoices')
    .insert({
      firm_id: client.firm_id,
      client_id: client.id,
      source_type: 'whatsapp',
      source_id: data.id,
      file_path: filePath,
      file_name: document.filename,
      file_type: document.mimetype,
      file_size_bytes: fileBuffer.length,
      file_hash: fileHash,
      raw_text: rawText,
      status: 'processing',
    })
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to create invoice: ${insertError.message}`);
  }

  // Create audit log
  await supabaseServer.from('audit_logs').insert({
    firm_id: client.firm_id,
    client_id: client.id,
    action_type: 'create',
    resource_type: 'invoice',
    resource_id: invoice.id,
    metadata: { source: 'whatsapp', filename: document.filename },
  });

  // Trigger async analysis
  analyzeInvoiceAsync(invoice, client);

  // Send confirmation
  await sendWhatsAppMessage(
    client.whatsapp_number,
    `✅ Fatura recebida: *${document.filename}*\n\nEstamos analisando o documento. Você receberá uma notificação quando a análise estiver pronta.\n\nID: ${invoice.id.slice(0, 8)}`
  );

  return NextResponse.json({ received: true, invoice_id: invoice.id });
}

async function handleTextCommand(client: any, text: string) {
  const command = text.trim().toLowerCase();

  if (command === '/status' || command === 'status') {
    // Get recent invoices count
    const { count } = await supabaseServer
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { count: alertsCount } = await supabaseServer
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .is('resolved_at', null)
      .in('severity', ['warning', 'critical']);

    await sendWhatsAppMessage(
      client.whatsapp_number,
      `📊 *Status dos últimos 30 dias*\n\nFaturas recebidas: ${count || 0}\nAlertas pendentes: ${alertsCount || 0}\n\nPara enviar uma fatura, simplesmente anexe o PDF ou XML aqui.`
    );
    return NextResponse.json({ received: true });
  }

  if (command === '/ajuda' || command === 'help') {
    await sendWhatsAppMessage(
      client.whatsapp_number,
      `🤖 *Comandos disponíveis:*\n\n/status - Ver status das faturas\n/ajuda - Mostrar esta mensagem\n\nPara enviar uma fatura, basta anexar o arquivo PDF ou XML nesta conversa.`
    );
    return NextResponse.json({ received: true });
  }

  // Default response
  await sendWhatsAppMessage(
    client.whatsapp_number,
    `👋 Olá! Recebemos sua mensagem.\n\nPara enviar uma fatura, anexe o arquivo PDF ou XML.\n\nDigite /ajuda para ver os comandos disponíveis.`
  );

  return NextResponse.json({ received: true });
}

async function analyzeInvoiceAsync(invoice: any, client: any) {
  try {
    const provider = getLLMProvider(client.firm?.preferred_llm || 'siliconflow');

    const result = await provider.analyzeInvoice({
      invoiceText: invoice.raw_text || '',
      documentType: invoice.file_type.includes('xml') ? 'xml' : 'pdf',
      countryCode: client.firm?.country_code || 'PT',
      regimeIva: client.regime_iva,
    });

    // Create analysis record
    const { data: analysis } = await supabaseServer
      .from('analyses')
      .insert({
        firm_id: invoice.firm_id,
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        llm_provider: provider.name,
        llm_model: provider.model,
        compliance_score: result.compliance_score,
        risk_level: result.risk_level,
        iva_validation: result.iva_validation,
        recoverable_tax: result.recoverable_tax,
        issues: result.issues,
        confidence_score: result.confidence_score,
      })
      .select()
      .single();

    // Create alerts for critical issues
    const criticalIssues = result.issues.filter((i: any) => i.severity === 'critical');
    const warningIssues = result.issues.filter((i: any) => i.severity === 'warning');

    for (const issue of [...criticalIssues, ...warningIssues]) {
      await supabaseServer.from('alerts').insert({
        firm_id: invoice.firm_id,
        client_id: invoice.client_id,
        invoice_id: invoice.id,
        analysis_id: analysis?.id,
        severity: issue.severity,
        category: issue.code,
        title: issue.message,
        description: issue.message,
        suggested_action: issue.suggested_action,
      });
    }

    // Update invoice status
    await supabaseServer
      .from('invoices')
      .update({ 
        status: 'analyzed',
        extracted_data: {
          ...result,
          analyzed_at: new Date().toISOString(),
        }
      })
      .eq('id', invoice.id);

    // Send notification for critical issues
    if (criticalIssues.length > 0) {
      await sendWhatsAppMessage(
        client.whatsapp_number,
        `🔴 *Atenção: Problemas críticos detectados*\n\nFatura: ${invoice.file_name}\n\n${criticalIssues.map((i: any) => `• ${i.message}`).join('\n')}\n\nEntre em contato com seu contador para mais informações.`
      );
    }

  } catch (error) {
    console.error('Analysis error:', error);
    
    // Move to DLQ
    await supabaseServer.from('analysis_dlq').insert({
      invoice_id: invoice.id,
      firm_id: invoice.firm_id,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      original_payload: { invoice_id: invoice.id },
    });

    // Update invoice status
    await supabaseServer
      .from('invoices')
      .update({ status: 'error' })
      .eq('id', invoice.id);
  }
}

// Helper functions
async function downloadFile(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // In production, use pdf-parse or similar
  // For now, return placeholder
  return '[PDF Content - Text extraction required]';
}

async function sendWhatsAppMessage(to: string, message: string) {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL;
  const evolutionApiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'auditpack';

  if (!evolutionApiUrl || !evolutionApiKey) {
    console.log('WhatsApp message (mock):', { to, message });
    return;
  }

  try {
    await axios.post(
      `${evolutionApiUrl}/message/sendText/${instanceName}`,
      {
        number: formatPhoneNumber(to),
        text: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey,
        },
      }
    );
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
  }
}

function formatPhoneNumber(phone: string): string {
  // Remove non-numeric characters
  return phone.replace(/\D/g, '');
}
