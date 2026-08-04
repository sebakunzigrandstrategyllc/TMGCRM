// Minimal word-level diff (LCS-based), mirrors the server-side algorithm for local re-renders.
function wordDiff(a = "", b = "") {
  const aWords = a.split(/(\s+)/);
  const bWords = b.split(/(\s+)/);
  const m = aWords.length;
  const n = bWords.length;
  const lcs = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = aWords[i] === bWords[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const result = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (aWords[i] === bWords[j]) {
      result.push({ type: "same", value: aWords[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      result.push({ type: "removed", value: aWords[i] });
      i++;
    } else {
      result.push({ type: "added", value: bWords[j] });
      j++;
    }
  }
  while (i < m) result.push({ type: "removed", value: aWords[i++] });
  while (j < n) result.push({ type: "added", value: bWords[j++] });
  return result;
}

export default function DiffView({ aiDraft, humanEdit }) {
  if (!aiDraft && !humanEdit) {
    return <p className="text-sm text-gray-500">No content yet.</p>;
  }
  const diff = wordDiff(aiDraft, humanEdit);
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {diff.map((part, idx) => {
        if (part.type === "same") return <span key={idx}>{part.value}</span>;
        if (part.type === "removed")
          return (
            <span key={idx} className="bg-gray-200 text-gray-500 line-through">
              {part.value}
            </span>
          );
        return (
          <span key={idx} className="bg-black text-white">
            {part.value}
          </span>
        );
      })}
    </div>
  );
}
