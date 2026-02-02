// =====================================================
// SiliconFlow LLM Integration
// =====================================================

import axios from 'axios';
import { AnalysisParams, AnalysisResult, AnalysisIssue } from '@/types';

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const API_KEY = process.env.SILICONFLOW_API_KEY || '';

export class SiliconFlowProvider {
  readonly name = 'siliconflow';
  readonly model = 'deepseek-ai/DeepSeek-V2.5';
  private maxRetries = 3;
  private timeoutMs = 30000;

  async analyzeInvoice(params: AnalysisParams): Promise<AnalysisResult> {
    const prompt = this.buildPrompt(params);
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await axios.post(
          SILICONFLOW_API_URL,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: this.getSystemPrompt(params.countryCode),
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              'Authorization': `Bearer ${API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: this.timeoutMs,
          }
        );

        const content = response.data.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from SiliconFlow');
        }

        return this.parseResponse(content);
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }
    }

    throw new Error('Max retries exceeded');
  }

  private getSystemPrompt(countryCode: string): string {
    if (countryCode === 'PT') {
      return `You are a Portuguese tax compliance expert. Analyze invoices for IVA (VAT) compliance according to Portuguese tax law.

Rules to check:
1. IVA rates: 6% (reduced), 13% (intermediate), 23% (standard), 0% (exempt)
2. Required fields: invoice number, date, supplier NIF, customer NIF, total amount, tax amount
3. NIF must be 9 digits and valid
4. SAF-T compliance for electronic invoices
5. Deductibility of IVA depends on the activity sector

Respond ONLY with valid JSON in this exact format:
{
  "compliance_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "iva_validation": {
    "is_valid": boolean,
    "errors": ["error1", "error2"],
    "warnings": ["warning1", "warning2"]
  },
  "recoverable_tax": {
    "amount": number,
    "confidence": 0-1,
    "reason": "explanation"
  } | null,
  "issues": [
    {
      "code": "ERROR_CODE",
      "severity": "info|warning|critical",
      "message": "description",
      "suggested_action": "what to do"
    }
  ],
  "confidence_score": 0-1
}`;
    }

    return `You are a tax compliance expert. Analyze invoices for tax compliance.

Respond ONLY with valid JSON in this exact format:
{
  "compliance_score": 0-100,
  "risk_level": "low|medium|high|critical",
  "iva_validation": {
    "is_valid": boolean,
    "errors": [],
    "warnings": []
  },
  "recoverable_tax": null,
  "issues": [],
  "confidence_score": 0-1
}`;
  }

  private buildPrompt(params: AnalysisParams): string {
    return `Analyze the following invoice for tax compliance:

DOCUMENT TYPE: ${params.documentType}
COUNTRY: ${params.countryCode}
TAX REGIME: ${params.regimeIva}

INVOICE CONTENT:
${params.invoiceText}

Provide a detailed analysis including compliance score, risk level, IVA validation, any recoverable tax, and specific issues found.`;
  }

  private parseResponse(content: string): AnalysisResult {
    try {
      const parsed = JSON.parse(content);
      
      return {
        compliance_score: parsed.compliance_score || 0,
        risk_level: parsed.risk_level || 'medium',
        iva_validation: {
          is_valid: parsed.iva_validation?.is_valid ?? true,
          errors: parsed.iva_validation?.errors || [],
          warnings: parsed.iva_validation?.warnings || [],
        },
        recoverable_tax: parsed.recoverable_tax || null,
        issues: parsed.issues || [],
        confidence_score: parsed.confidence_score || 0.5,
      };
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      // Return safe default
      return {
        compliance_score: 50,
        risk_level: 'medium',
        iva_validation: {
          is_valid: false,
          errors: ['Failed to parse AI analysis'],
          warnings: [],
        },
        recoverable_tax: null,
        issues: [{
          code: 'PARSE_ERROR',
          severity: 'warning',
          message: 'Could not parse AI analysis results',
          suggested_action: 'Please review manually',
        }],
        confidence_score: 0,
      };
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await axios.post(
        SILICONFLOW_API_URL,
        {
          model: this.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return true;
    } catch {
      return false;
    }
  }
}

// Factory for LLM providers
export function getLLMProvider(providerName: string = 'siliconflow') {
  switch (providerName) {
    case 'siliconflow':
      return new SiliconFlowProvider();
    default:
      return new SiliconFlowProvider();
  }
}
