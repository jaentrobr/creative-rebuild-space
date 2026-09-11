import { AlertCircle } from "lucide-react";
import type { LegalSection } from "@/data/legal";
import { legalNotice } from "@/data/legal";

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <>
      <h1 className="text-5xl font-bold">{title}</h1>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-sun bg-sun/20 p-4 text-sm font-semibold text-ink">
        <AlertCircle className="mt-0.5 size-5 shrink-0" />
        <p>{legalNotice}</p>
      </div>
      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold">{section.title}</h2>
            <div className="mt-2 space-y-2">
              {section.body.map((paragraph, index) => (
                <p key={index} className="leading-7 text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
