"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, XCircle, Eye, EyeOff, FileText, AlertCircle } from "lucide-react";

interface OCRResultDisplayProps {
  ocrRawText: string;
  camposPreenchidos: string[];
  camposFaltando: string[];
  confidence?: number;
}

export default function OCRResultDisplay({
  ocrRawText,
  camposPreenchidos,
  camposFaltando,
  confidence
}: OCRResultDisplayProps) {
  const [showRawText, setShowRawText] = useState(false);

  if (!ocrRawText) return null;

  return (
    <div className="mt-4 space-y-4">
      {/* Resumo dos resultados */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Resultado do OCR
            </h4>
            
            {/* Campos preenchidos */}
            {camposPreenchidos.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {camposPreenchidos.length} campo(s) preenchido(s) com sucesso:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {camposPreenchidos.map((campo, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-md border border-green-200"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {campo}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Campos faltando */}
            {camposFaltando.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-gray-700">
                    {camposFaltando.length} campo(s) não encontrado(s):
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 ml-6">
                  {camposFaltando.map((campo, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-md border border-amber-200"
                    >
                      <XCircle className="h-3 w-3" />
                      {campo}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2 ml-6">
                  💡 Preencha manualmente os campos faltantes
                </p>
              </div>
            )}

            {/* Confiança do OCR */}
            {confidence !== undefined && confidence > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Confiança do OCR:</span>
                  <span className={`text-xs font-semibold ${
                    confidence > 0.8 ? 'text-green-600' : 
                    confidence > 0.6 ? 'text-amber-600' : 
                    'text-red-600'
                  }`}>
                    {(confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão para ver/ocultar texto bruto */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowRawText(!showRawText)}
        className="w-full"
      >
        {showRawText ? (
          <>
            <EyeOff className="h-4 w-4 mr-2" />
            Ocultar texto extraído
          </>
        ) : (
          <>
            <Eye className="h-4 w-4 mr-2" />
            Ver texto extraído pelo OCR
          </>
        )}
      </Button>

      {/* Área de texto bruto */}
      {showRawText && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">
              Texto bruto extraído pelo OCR
            </span>
          </div>
          <div className="bg-white border border-gray-200 rounded p-3 max-h-60 overflow-y-auto">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
              {ocrRawText}
            </pre>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 Se os campos foram preenchidos incorretamente, verifique o texto acima e ajuste manualmente os campos do formulário.
          </p>
        </div>
      )}
    </div>
  );
}

