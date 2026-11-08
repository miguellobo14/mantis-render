const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // The API's limit.
const MAX_SIDE = 2400;

/**
 * Makes a picked file ready to upload. Phone photos usually exceed the upload limit, so instead of
 * rejecting them this shrinks them in the browser.
 */
export async function prepareImage(file: File): Promise<File> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Usa una imagen JPG, PNG o WebP. Las fotos HEIC del iPhone hay que convertirlas a JPG.");
  }
  if (file.size <= MAX_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob || blob.size > MAX_BYTES) throw new Error("La imagen es demasiado pesada. Prueba con una de menos de 5 MB.");
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

export async function fileFromUrl(url: string, name: string): Promise<File> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la imagen.");
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

/** A real download: the `download` attribute alone is ignored for images on another origin. */
export async function downloadImage(url: string, name: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo descargar la imagen.");
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
