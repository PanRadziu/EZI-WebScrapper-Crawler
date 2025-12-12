import { useEffect, useState } from "react";
import { getStatus, getResult, exportData } from "../api";
import toast from "react-hot-toast";

export default function ResultPanel({ runId, onResult }) {
  const [status, setStatus] = useState("loading");
  const [summary, setSummary] = useState({ nodes: 0, edges: 0 });

  useEffect(() => {
    let intervalId;

    const poll = async () => {
      try {
        const { data } = await getStatus(runId);
        setStatus(data.status);

        if (data.status === "finished") {
          const res = await getResult(runId);
          const r = res.data;

          const nodesCount = Object.keys(r.nodes || {}).length;
          const edgesCount = (r.edges || []).length;

          setSummary({ nodes: nodesCount, edges: edgesCount });
          onResult && onResult(r);
          clearInterval(intervalId);
        }
      } catch (e) {
        console.error(e);
        toast.error("Błąd pobierania statusu");
        clearInterval(intervalId);
      }
    };

    poll();
    intervalId = setInterval(poll, 2000);

    return () => clearInterval(intervalId);
  }, [runId, onResult]);

  const handleExport = async (format) => {
    try {
      const res = await exportData(runId, format);
      const blob = new Blob([res.data]);

      const extMap = { json: "json", graphml: "graphml", csv: "zip", zip: "zip" };
      const ext = extMap[format] || format;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${runId}.${ext}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Eksport nie powiódł się");
    }
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Status: {status}</h2>
      <p>Nodes: {summary.nodes}</p>
      <p>Edges: {summary.edges}</p>

      <div className="flex flex-wrap gap-2 mt-2">
        {["json", "csv", "graphml"].map((f) => (
          <button
            key={f}
            onClick={() => handleExport(f)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
          >
            Export {f}
          </button>
        ))}
      </div>
    </div>
  );
}
