"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera, FileImage, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Função para comprimir imagem antes de enviar - mantendo qualidade alta para OCR
async function compressImage(file: File, maxSizeBytes: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Para OCR, manter dimensões maiores (3000px) para melhor qualidade de leitura
        // Redimensionar apenas se realmente necessário
        const MAX_WIDTH = 3000;
        const MAX_HEIGHT = 3000;
        let width = img.width;
        let height = img.height;

        // Redimensionar apenas se muito grande
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          } else {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        // Criar canvas para redimensionar
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Não foi possível criar contexto do canvas"));
          return;
        }

        // Usar interpolação de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Comprimir com qualidade alta (0.95) para preservar texto para OCR
        // Reduzir qualidade apenas se absolutamente necessário
        let quality = 0.95; // Qualidade muito alta para OCR
        const tryCompress = (): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Erro ao comprimir imagem"));
                return;
              }

              // Se ainda estiver muito grande, reduzir qualidade gradualmente
              // Mas nunca abaixo de 0.85 para manter qualidade do OCR
              if (blob.size > maxSizeBytes && quality > 0.85) {
                quality -= 0.05;
                tryCompress();
                return;
              }

              // Se ainda estiver muito grande, reduzir dimensões um pouco
              // Mas manter pelo menos 2000px para OCR
              if (blob.size > maxSizeBytes && width > 2000) {
                width = Math.floor(width * 0.9);
                height = Math.floor(height * 0.9);
                canvas.width = width;
                canvas.height = height;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(img, 0, 0, width, height);
                quality = 0.9; // Manter qualidade alta
                tryCompress();
                return;
              }

              // Criar novo File com o blob comprimido
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, ".jpg"), // Renomear para .jpg
                { type: "image/jpeg", lastModified: Date.now() }
              );

              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };

        tryCompress();
      };
      img.onerror = () => reject(new Error("Erro ao carregar imagem"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

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
        // Validar tipo de arquivo
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

        // Validar tamanho
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 10MB. Reduza o tamanho da imagem.`);
        }

        // Vercel tem limite de 4.5MB para requisições - comprimir apenas se realmente necessário
        const VERCEL_MAX_SIZE = 4 * 1024 * 1024; // 4MB (margem de segurança)
        let fileToUpload = file;

        if (file.size > VERCEL_MAX_SIZE) {
          console.log("[OCR] Arquivo muito grande, comprimindo com qualidade preservada...");
          try {
            fileToUpload = await compressImage(file, VERCEL_MAX_SIZE);
            console.log("[OCR] Imagem comprimida:", {
              originalSize: (file.size / 1024 / 1024).toFixed(2) + "MB",
              newSize: (fileToUpload.size / 1024 / 1024).toFixed(2) + "MB"
            });
          } catch (compressError) {
            console.error("[OCR] Erro ao comprimir imagem:", compressError);
            throw new Error("Imagem muito grande. Tente reduzir o tamanho antes de enviar.");
          }
        }

        // Criar FormData
        const formData = new FormData();
        formData.append("file", fileToUpload);

        // Enviar para API com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout

        let response;
        try {
          response = await fetch("/api/ocr", {
            method: "POST",
            body: formData,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            throw new Error("Tempo de processamento excedido. A imagem pode ser muito grande ou a conexão está lenta. Tente com uma imagem menor.");
          }
          throw fetchError;
        }

        // Tratar erro 413 (Payload Too Large)
        if (response.status === 413) {
          throw new Error("Imagem muito grande para processar. Tente com uma imagem menor ou de menor qualidade.");
        }

        // Verificar se a resposta é JSON antes de fazer parse
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Resposta não é JSON:", text.substring(0, 200));
          throw new Error(`Erro no servidor: ${response.status} ${response.statusText}. A resposta não é JSON válido.`);
        }

        const data = await response.json();

        if (!response.ok) {
          let errorMessage = data.error || "Erro ao processar imagem";
          if (data.message && data.message !== errorMessage) {
            errorMessage += `: ${data.message}`;
          }
          if (data.code) {
            errorMessage += ` (Código: ${data.code})`;
          }
          throw new Error(errorMessage);
        }

        // Sucesso
        setSuccess(true);
        onExtract(data.text, data.confidence);

        // Limpar mensagem de sucesso após 3 segundos
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } catch (err: any) {
        console.error("[OCR] Erro ao processar:", {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        
        let errorMessage = err.message || "Erro desconhecido ao processar imagem";
        
        if (err.message?.includes("413") || err.message?.includes("muito grande") || err.message?.includes("Payload Too Large")) {
          errorMessage = "Imagem muito grande. A imagem foi comprimida automaticamente, mas ainda é grande demais. Tente com uma imagem menor.";
        } else if (err.message?.includes("network") || err.message?.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else if (err.message?.includes("timeout") || err.message?.includes("Tempo de processamento")) {
          errorMessage = "Processamento demorou muito. Tente com uma imagem menor ou melhor qualidade de conexão.";
        } else if (err.message?.includes("Failed to fetch")) {
          errorMessage = "Não foi possível conectar ao servidor. Verifique sua conexão.";
        }
        
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    },
    [onExtract, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: loading,
  });

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <FileImage className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Upload de Ficha Anestésica
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading 
                ? 'Processando ficha...' 
                : success 
                ? 'Ficha processada com sucesso!' 
                : 'Faça upload de uma foto para preencher automaticamente'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : success ? (
          <div className="flex items-center justify-center py-6">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`
              relative border border-dashed rounded-lg p-4 
              transition-all duration-200 cursor-pointer
              ${isDragActive 
                ? "border-primary-300 bg-primary-50/50" 
                : "border-gray-300 hover:border-primary-200 hover:bg-gray-50"
              }
            `}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center text-center space-y-3">
              <Upload className="h-6 w-6 text-gray-400" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-700">
                  {isDragActive 
                    ? "Solte a imagem aqui" 
                    : "Clique ou arraste a ficha aqui"
                  }
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG ou WebP (máx. 10MB)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    fileInput?.click();
                  }}
                >
                  <FileImage className="h-3.5 w-3.5" />
                  Selecionar
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 border-gray-200 text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      
                      if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                        input.capture = "environment";
                      }
                      
                      input.onchange = (event: any) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          onDrop([file]);
                        }
                      };
                      
                      input.onerror = () => {
                        setError("Erro ao acessar a câmera. Tente selecionar uma imagem da galeria.");
                      };
                      
                      input.click();
                    } catch (cameraError: any) {
                      console.error("[OCR] Erro ao criar input de câmera:", cameraError);
                      setError("Erro ao acessar a câmera. Tente selecionar uma imagem da galeria.");
                    }
                  }}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Tirar Foto
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

