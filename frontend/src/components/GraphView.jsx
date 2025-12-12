import ReactFlow, { MiniMap, Controls } from "reactflow";
import "reactflow/dist/style.css";
import React from "react";

export default function GraphView({ data }) {
  if (!data || !Object.keys(data.nodes || {}).length)
    return <p className="text-gray-500 italic">Brak danych do wyświetlenia</p>;

  const nodes = Object.entries(data.nodes).map(([url, meta]) => ({
    id: url,
    position: { x: Math.random() * 800, y: Math.random() * 400 },
    data: { label: url || meta.title },
  }));

  const edges = (data.edges || []).map(([src, tgt]) => ({
    id: `${src}-${tgt}`,
    source: src,
    target: tgt
  }));

  return (
    <div className="h-[600px] border rounded-xl bg-white">
      <ReactFlow nodes={nodes} edges={edges}>
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
}
