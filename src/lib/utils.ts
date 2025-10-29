export function mediaTypeFromPath(p: string): "image"|"video" {
  const ext = (p.split(".").pop() || "").toLowerCase();
  if (["png","jpg","jpeg","gif","webp","bmp"].includes(ext)) return "image";
  if (["mp4","mov","webm","avi","mkv"].includes(ext)) return "video";
  return "image";
}
