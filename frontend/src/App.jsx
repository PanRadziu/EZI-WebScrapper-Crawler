import React, { useState } from "react";
import ConfigForm from "./components/ConfigForm";
import GraphView from "./components/GraphView";
import ResultPanel from "./components/ResultPanel";
import { Toaster } from "react-hot-toast";

export default function App() {
  const [runId, setRunId] = useState(null);
  const [result, setResult] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-6 flex flex-col gap-6">
      <Toaster position="bottom-right" />
      <h1 className="text-3xl font-bold text-center text-blue-700">
        Web Crawler and Scraper
      </h1>

      {!runId && <ConfigForm onStarted={setRunId} />}

      {runId && (
        <div className="grid lg:grid-cols-[2fr,3fr] gap-4 mt-4">
          {/* Panel statusu + eksporty */}
          <ResultPanel runId={runId} onResult={setResult} />

          {/* Graf linków */}
          <div className="bg-white rounded-xl shadow p-2">
            <h2 className="text-lg font-semibold mb-2">Graf linków</h2>
            <GraphView data={result} />
          </div>
        </div>
      )}
    </div>
  );
}
