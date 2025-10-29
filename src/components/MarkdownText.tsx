import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

const defaultComponents: Components = {
  h1: ({ children }) => <span className="block font-semibold">{children}</span>,
  h2: ({ children }) => <span className="block font-semibold">{children}</span>,
  h3: ({ children }) => <span className="block font-semibold">{children}</span>,
  h4: ({ children }) => <span className="block font-semibold">{children}</span>,
  h5: ({ children }) => <span className="block font-semibold">{children}</span>,
  h6: ({ children }) => <span className="block font-semibold">{children}</span>,
  p: ({ children }) => <span className="block">{children}</span>,
  ul: ({ children }) => <ul className="m-0 list-disc list-inside space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 list-decimal list-inside space-y-1">{children}</ol>,
  li: ({ children }) => <li className="m-0">{children}</li>,
  strong: ({ children }) => <span className="font-semibold">{children}</span>,
  em: ({ children }) => <span className="italic">{children}</span>,
  a: ({ href, children }) => (
    <a href={href} className="underline decoration-muted-foreground/60 hover:decoration-inherit" onClick={(event) => event.stopPropagation()}>
      {children}
    </a>
  ),
};

interface MarkdownTextProps {
  content: string;
  className?: string;
  components?: Components;
}

export function MarkdownText({ content, className, components }: MarkdownTextProps) {
  if (!content) {
    return null;
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ ...defaultComponents, ...components }}
      className={cn("space-y-1", className)}
    >
      {content}
    </ReactMarkdown>
  );
}

export default MarkdownText;
