"use client";

export interface NewsletterPreviewProps {
  html: string;
}

/**
 * Renders the generated newsletter HTML inside a sandboxed iframe so its
 * inlined styles don't leak into the app shell.
 */
export function NewsletterPreview({ html }: NewsletterPreviewProps) {
  return (
    <iframe
      title="Aperçu de la newsletter"
      srcDoc={html}
      sandbox=""
      className="h-[720px] w-full rounded-md border bg-white"
    />
  );
}
