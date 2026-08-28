import { Platform } from "react-native";

/**
 * Print a self-contained HTML document from the web build, which is how the app
 * produces a PDF: the browser's print dialog offers "Save as PDF" (the default
 * destination on Android Chrome).
 *
 * Rendered into a hidden iframe rather than a popup window — a PWA can have
 * window.open blocked, and an iframe needs no popup permission. Chrome names the
 * saved file after the *top-level* document title, so the title is swapped for
 * the duration of the print and restored afterwards.
 */
export function printHtmlDocument(html: string, filename: string): { ok: boolean; reason?: string } {
  if (Platform.OS !== "web" || typeof document === "undefined") {
    return { ok: false, reason: "Printing is only available in the web app." };
  }

  const previousTitle = document.title;
  const iframe = document.createElement("iframe");
  // Off-screen rather than display:none — some browsers refuse to print a
  // frame that isn't laid out.
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;";
  document.body.appendChild(iframe);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.title = previousTitle;
    iframe.remove();
  };

  try {
    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      cleanup();
      return { ok: false, reason: "Couldn't open a print view." };
    }

    doc.open();
    doc.write(html);
    doc.close();

    document.title = filename;

    const go = () => {
      try {
        win.focus();
        // Restore only once the dialog is done. print() blocks on desktop but
        // can return immediately on mobile, so afterprint is the real signal —
        // with a timeout as a backstop if it never fires.
        win.onafterprint = cleanup;
        setTimeout(cleanup, 60000);
        win.print();
      } catch {
        cleanup();
      }
    };

    // Give the iframe document a tick to lay out before printing, or the first
    // page can come out blank.
    if (doc.readyState === "complete") setTimeout(go, 50);
    else win.addEventListener("load", () => setTimeout(go, 50));

    return { ok: true };
  } catch (e: any) {
    cleanup();
    return { ok: false, reason: e?.message ?? "Couldn't open a print view." };
  }
}
