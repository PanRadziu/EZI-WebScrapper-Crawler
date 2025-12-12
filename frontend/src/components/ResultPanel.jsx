import { useEffect, useState } from "react";
import { getStatus, getResult, exportData } from "../api";
import toast from "react-hot-toast";
import { Loader2, CheckCircle2, XCircle, Link as LinkIcon, FileText, FileJson } from "lucide-react";

export default function ResultPanel({ runId, onResult }) {
  const [status, setStatus] = useState("loading");
  const [stats, setStats] = useState({ nodes: 0, edges: 0, limit: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId;

    const poll = async () => {
      try {
        const { data } = await getStatus(runId);
        setStatus(data.status);
        
        setStats({ 
            nodes: data.total_nodes, 
            edges: data.total_edges,
            limit: data.limit || 100 
        });

        if (data.limit > 0) {
            const percent = Math.min(100, Math.round((data.total_nodes / data.limit) * 100));
            setProgress(percent);
        }

        if (data.status === "finished") {
          const res = await getResult(runId);
          onResult && onResult(res.data);
          clearInterval(intervalId);
          setProgress(100);
        } else if (data.status === "stopped" || data.status === "error") {
          clearInterval(intervalId);
        }

      } catch (e) {
        console.error(e);
      }
    };

    poll();
    intervalId = setInterval(poll, 1000);

    return () => clearInterval(intervalId);
  }, [runId, onResult]);

  const handleExportJson = async () => {
    try {
      const res = await exportData(runId, "json");
      const blob = new Blob([res.data]);
      
      if (blob.size === 0) {
          throw new Error("Received empty file");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crawl_${runId}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("JSON downloaded");
    } catch (e) {
      console.error("Export Error:", e);
      // Sprawdź czy to błąd sieciowy/odpowiedzi
      const msg = e.response?.data?.detail || "Export failed. Check if job is finished.";
      toast.error(msg);
    }
  };

  const getStatusBadge = () => {
    const styles = {
      queued: "bg-gray-100 text-gray-600",
      running: "bg-blue-100 text-blue-700 animate-pulse",
      finished: "bg-green-100 text-green-700",
      error: "bg-red-100 text-red-700",
      stopped: "bg-yellow-100 text-yellow-700",
    };
    
    const labels = {
      queued: "Queued",
      running: "Running...",
      finished: "Finished",
      error: "Error",
      stopped: "Stopped"
    };

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${styles[status] || styles.queued}`}>
        {status === 'running' && <Loader2 className="animate-spin" size={14} />}
        {status === 'finished' && <CheckCircle2 size={14} />}
        {status === 'error' && <XCircle size={14} />}
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800">Job Statistics</h2>
        {getStatusBadge()}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-sm font-medium text-gray-600">
            <span>Progress (Pages)</span>
            <span>{stats.nodes} / {stats.limit}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div 
                className="bg-blue-600 h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3 border border-blue-100">
            <div className="bg-blue-200 p-2 rounded text-blue-700">
                <FileText size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500">Downloaded Pages</p>
                <p className="text-2xl font-bold text-gray-800">{stats.nodes}</p>
            </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg flex items-center gap-3 border border-purple-100">
            <div className="bg-purple-200 p-2 rounded text-purple-700">
                <LinkIcon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500">Found Links</p>
                <p className="text-2xl font-bold text-gray-800">{stats.edges}</p>
            </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t">
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Data Export</h3>
        <button 
            onClick={handleExportJson} 
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors border bg-gray-900 text-white hover:bg-black"
        >
            <FileJson size={18} /> Download Results (JSON)
        </button>
      </div>
    </div>
  );
}