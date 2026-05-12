export interface OCRResult {
  rawText: string;
  confidence: number;
  provider: 'google' | 'openai';
  latency: number;
  cost: number;
}

export interface StructuredOCRData {
  docType: DocumentType;
  data: Record<string, any>;
  confidence: number;
}

export type DocumentType = 
  | 'receipt' 
  | 'medical_guide' 
  | 'invoice' 
  | 'medical_order' 
  | 'simple_text' 
  | 'bank_statement' 
  | 'unknown';

export interface ProcessedMessage {
  id: string;
  phone: string;
  mediaId?: string;
  rawText?: string;
  structuredData?: any;
  docType?: DocumentType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorLog?: string;
  createdAt: Date;
}
