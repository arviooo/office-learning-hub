import { parseSimpleMarkdown, tokenizeInline } from "@/lib/markdown";

function RenderInline({ text }: { text: string }) {
  const tokens = tokenizeInline(text);
  return (
    <>
      {tokens.map((tok, idx) => {
        if (tok.type === "bold") {
          return (
            <strong key={idx} className="font-bold text-slate-900">
              {tok.value}
            </strong>
          );
        }
        if (tok.type === "italic") {
          return (
            <em key={idx} className="italic text-slate-800">
              {tok.value}
            </em>
          );
        }
        return <span key={idx}>{tok.value}</span>;
      })}
    </>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseSimpleMarkdown(content);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "h2":
            return (
              <h2
                key={idx}
                className="pt-3 text-lg font-extrabold tracking-tight text-[#0f294a] [text-wrap:balance] sm:text-xl"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={idx}
                className="pt-2 text-base font-bold text-slate-900 [text-wrap:balance]"
              >
                {block.text}
              </h3>
            );
          case "p":
            return (
              <p key={idx} className="[text-wrap:pretty]">
                <RenderInline text={block.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={idx} className="list-disc space-y-2 pl-5 [text-wrap:pretty]">
                {block.items.map((item, i) => (
                  <li key={i}>
                    <RenderInline text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={idx} className="list-decimal space-y-2 pl-5 [text-wrap:pretty]">
                {block.items.map((item, i) => (
                  <li key={i}>
                    <RenderInline text={item} />
                  </li>
                ))}
              </ol>
            );
          case "table":
            return (
              <div
                key={idx}
                tabIndex={0}
                role="region"
                aria-label="Tabel perbandingan materi pelayanan"
                className="my-4 overflow-x-auto rounded-xl border border-slate-200 focus-visible:outline-2 focus-visible:outline-[#1d4ed8]"
              >
                <table className="w-full min-w-[460px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700">
                    <tr>
                      {block.headers.map((h, i) => (
                        <th key={i} scope="col" className="border-b border-slate-200 px-4 py-3">
                          <RenderInline text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/70">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 align-top text-slate-700">
                            <RenderInline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
