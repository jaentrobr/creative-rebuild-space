import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, ArrowUp, ChevronDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { EMPRESA, aplicarDadosEmpresa } from "@/config/empresa";
import termosRaw from "@/content/termos-produtor.md?raw";

export const Route = createFileRoute("/termos-produtor")({
  head: () => ({
    meta: [
      { title: "Termos do produtor — Entrô" },
      {
        name: "description",
        content:
          "Regras completas para quem cria e vende eventos na Entrô: repasses, taxas, retenção e reembolsos.",
      },
      { property: "og:title", content: "Termos do produtor — Entrô" },
      {
        property: "og:description",
        content:
          "Repasses, taxas, retenção de cartão e responsabilidades de quem produz eventos na Entrô.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProducerTerms,
});

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function ProducerTerms() {
  const content = useMemo(() => aplicarDadosEmpresa(termosRaw), []);
  const sections = useMemo(
    () =>
      content
        .split("\n")
        .filter((line) => line.startsWith("## "))
        .map((line) => {
          const title = line.replace(/^##\s+/, "").replace(/\*\*/g, "");
          return { title, id: slugify(title) };
        }),
    [content],
  );
  const [tocOpen, setTocOpen] = useState(false);

  const downloadPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const plain = content
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/gm, "")
      .replace(/^\|/gm, "")
      .split("\n");
    for (const line of plain) {
      const rows = doc.splitTextToSize(line.trim() || " ", width) as string[];
      for (const row of rows) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(row, margin, y);
        y += 14;
      }
    }
    doc.save(`termos-produtor-entro-v${EMPRESA.VERSAO_TERMOS}.pdf`);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="lg:flex lg:gap-10">
        <aside className="hidden lg:block lg:w-64 lg:shrink-0">
          <nav className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
            <p className="mb-3 font-display text-sm font-extrabold uppercase tracking-wide">
              Índice
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="hover:text-foreground">
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="w-full max-w-[760px]">
          {EMPRESA.TERMOS_PROVISORIOS ? (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-sun bg-sun/20 p-4 text-sm font-semibold text-ink">
              <AlertCircle className="mt-0.5 size-5 shrink-0" />
              <p>Versão provisória, sujeita a revisão jurídica</p>
            </div>
          ) : null}

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Button onClick={downloadPdf}>
              <Download className="size-4" /> Baixar PDF
            </Button>
          </div>

          <div className="mb-6 lg:hidden">
            <button
              type="button"
              onClick={() => setTocOpen((open) => !open)}
              className="flex w-full items-center justify-between rounded-xl border-2 border-foreground px-4 py-3 text-sm font-bold"
            >
              Índice
              <ChevronDown
                className={`size-4 transition-transform ${tocOpen ? "rotate-180" : ""}`}
              />
            </button>
            {tocOpen ? (
              <ul className="mt-2 space-y-2 rounded-xl border border-border p-4 text-sm text-muted-foreground">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} onClick={() => setTocOpen(false)}>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <article className="space-y-4 leading-7 text-muted-foreground">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-foreground">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2
                    id={slugify(String(children))}
                    className="scroll-mt-24 pt-6 text-xl font-bold text-foreground"
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="pt-3 text-lg font-bold text-foreground">{children}</h3>
                ),
                p: ({ children }) => <p className="leading-7">{children}</p>,
                ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                strong: ({ children }) => (
                  <strong className="font-bold text-foreground">{children}</strong>
                ),
                hr: () => <hr className="border-border" />,
                a: ({ children, href }) => (
                  <a href={href} className="font-semibold text-primary underline">
                    {children}
                  </a>
                ),
                table: ({ children }) => (
                  <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[520px] border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-muted p-2 text-left font-bold text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border p-2 align-top">{children}</td>
                ),
              }}
            >
              {content}
            </Markdown>
          </article>

          <div className="mt-10">
            <Button
              variant="outline"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <ArrowUp className="size-4" /> Voltar ao topo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
