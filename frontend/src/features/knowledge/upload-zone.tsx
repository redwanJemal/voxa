import { useCallback, useState } from "react";
import { Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";

type UploadZoneProps = {
  onUpload: (file: File) => void;
  isUploading: boolean;
};

export function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onUpload(file);
    },
    [onUpload],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
        isUploading && "pointer-events-none opacity-50",
      )}
    >
      <input type="file" className="hidden" onChange={handleChange} accept=".pdf,.docx,.txt,.md" />
      {isUploading ? (
        <div className="text-center">
          <File className="mx-auto mb-2 h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm font-medium">Uploading...</p>
        </div>
      ) : (
        <div className="text-center">
          <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drop files here or click to upload</p>
          <p className="mt-1 text-xs text-muted-foreground">PDF, DOCX, TXT, MD (max 50MB)</p>
        </div>
      )}
    </label>
  );
}
