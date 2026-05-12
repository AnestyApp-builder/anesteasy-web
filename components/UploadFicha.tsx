"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera, FileImage, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { compressImage } from "@/lib/image-compression";

interface UploadFichaProps {
  onExtract: (rawText: string, confidence?: number, parsedData?: any) => void;
  onError?: (error: string) => void;
}

export default function UploadFicha({ onExtract, onError }: UploadFichaProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        const fileType = file.type || "";
        const fileName = file.name?.toLowerCase() || "";
        
        const isValidType = allowedTypes.includes(fileType) || 
                           fileName.endsWith('.jpg') || 
                           fileName.endsWith('.jpeg') || 
                           fileName.endsWith('.png') || 
                           fileName.endsWith('.webp');
        
        if (!isValidType && fileType) {
          throw new Error(`Formato não suportado: ${fileType}. Use JPEG, PNG ou WebP.`);
        }

        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          throw new Error(`Arquivo muito grande. Máximo permitido: 10MB.`);
        }

        const TARGET_SIZE_MB = 1.5;
        let fileToUpload = file;

        if (file.size > TARGET_SIZE_MB * 1024 * 1024) {
          try {
            fileToUpload = await compressImage(file, { 
              maxSizeMB: TARGET_SIZE_MB,
              maxWidth: 2500,
              maxHeight: 2500,
              quality: 0.85
            });
          } catch (compressError) {
            console.warn("Falha na compressão, enviando original", compressError);
          }
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch("/api/ocr/vision", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao processar imagem");
        }

        setSuccess(true);
        if (data.parsed) {
          onExtract(data.text || "", data.camposPreenchidos || 0, data.parsed);
        } else {
          onExtract(data.text, data.confidence);
        }

        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        console.error("[OCR] Erro:", err);
        const errorMessage = err.message || "Erro ao processar imagem";
        setError(errorMessage);
        if (onError) onError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [onExtract, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: loading,
  });

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <FileImage className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Upload de Ficha Anestésica (IA Vision)</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? 'Processando com IA de alta precisão...' : success ? 'Sucesso!' : 'Tire uma foto ou arraste o arquivo'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
          </div>
        ) : success ? (
          <div className="flex items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        ) : (
          <div {...getRootProps()} className={`relative border border-dashed rounded-lg p-4 transition-all cursor-pointer ${isDragActive ? "border-teal-300 bg-teal-50" : "border-gray-300 hover:bg-gray-50"}`}>
            <input {...getInputProps()} />
            <div className="flex flex-col items-center text-center space-y-3">
              <Upload className="h-6 w-6 text-gray-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">{isDragActive ? "Solte aqui" : "Clique ou arraste a ficha"}</p>
                <p className="text-xs text-gray-500">JPEG, PNG ou WebP</p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" className="gap-2">
                  <Camera className="h-3.5 w-3.5" /> Tirar Foto
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
