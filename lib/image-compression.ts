/**
 * Utilitário de compressão de imagem no lado do cliente
 * Reduz o tamanho do arquivo antes do upload para economizar banda e custos de Observability/Transferência
 */

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Comprime uma imagem File usando Canvas
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = { maxSizeMB: 1.5, maxWidth: 2500, maxHeight: 2500, quality: 0.85 }
): Promise<File> {
  // Só comprimir imagens
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Se o arquivo já for menor que o máximo, não precisa comprimir (opcional)
  // Mas as vezes queremos redimensionar de qualquer forma para padronizar
  if (file.size <= options.maxSizeMB * 1024 * 1024 && !options.maxWidth) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const { maxWidth = 2500, maxHeight = 2500, maxSizeMB = 1.5 } = options;
        let width = img.width;
        let height = img.height;

        // Calcular novas dimensões mantendo proporção
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          return resolve(file); // Fallback para arquivo original
        }

        // Configurações para melhor qualidade no redimensionamento
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Função recursiva para tentar chegar no tamanho desejado ajustando a qualidade
        let currentQuality = options.quality || 0.85;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        const getCompressedBlob = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file);
              }

              // Se o blob for maior que o limite e a qualidade ainda puder cair
              if (blob.size > maxSizeBytes && quality > 0.6) {
                getCompressedBlob(quality - 0.1);
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg', // Sempre converter para JPEG para melhor compressão
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };

        getCompressedBlob(currentQuality);
      };

      img.onerror = () => resolve(file);
    };
    
    reader.onerror = () => resolve(file);
  });
}

/**
 * Comprime uma lista de arquivos
 */
export async function compressImages(
  files: File[],
  options?: CompressionOptions
): Promise<File[]> {
  const promises = files.map(file => compressImage(file, options));
  return Promise.all(promises);
}
