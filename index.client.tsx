import { Platform } from "react-native";

// No SDK API adds composer attachments. The app uploads non-image files dropped on the
// chat (packages/app/src/components/file-drop/use-drop-listeners.ts) but pastes only
// images (packages/app/src/composer/input/input.tsx), so a paste is re-sent as a drop.
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp"]);
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp)$/i;

// Typechecks without the DOM library; declare only what this file uses.
type FileLike = { name: string; type: string };
declare const document: {
  addEventListener(type: string, fn: (event: any) => void, capture?: boolean): void;
  removeEventListener(type: string, fn: (event: any) => void, capture?: boolean): void;
};
declare const DataTransfer: new () => { items: { add(file: FileLike): void } };
declare const DragEvent: new (type: string, init: object) => object;

const isImage = (f: FileLike) => IMAGE_TYPES.has(f.type) || IMAGE_EXT.test(f.name);

export default function contribute() {
  if (Platform.OS !== "web" || typeof document === "undefined") return () => {};

  const onPaste = (event: any) => {
    // The app loads this once per daemon it is installed on; the second copy would attach twice.
    if (event.paseoFiles) return;
    event.paseoFiles = true;
    if (event.target?.tagName !== "TEXTAREA") return;
    const files: FileLike[] = Array.from(event.clipboardData?.files ?? []);
    const other = files.filter((f) => !isImage(f));
    if (!other.length) return;
    // Stops the file name from being pasted as text; the app's own listener still takes the images.
    event.preventDefault();
    const dataTransfer = new DataTransfer();
    for (const f of other) dataTransfer.items.add(f);
    event.target.dispatchEvent(new DragEvent("drop", { dataTransfer, bubbles: true, cancelable: true }));
  };

  document.addEventListener("paste", onPaste, true);
  return () => document.removeEventListener("paste", onPaste, true);
}
