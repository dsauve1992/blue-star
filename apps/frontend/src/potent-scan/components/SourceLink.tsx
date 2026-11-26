import { isHttpUrl } from "../utils/format";

export function SourceLink({ source }: { source: string }) {
  if (!isHttpUrl(source)) {
    return <span className="break-all">{source}</span>;
  }
  return (
    <a
      href={source}
      target="_blank"
      rel="noopener noreferrer"
      className="break-all text-primary-600 hover:underline dark:text-primary-400"
    >
      {source}
    </a>
  );
}
