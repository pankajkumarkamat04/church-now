export function AboutBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="church-prose">
      {blocks.map((line, i) => {
        if (line.startsWith('## ')) {
          return <h2 key={i}>{line.replace(/^##\s+/, '')}</h2>;
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}
