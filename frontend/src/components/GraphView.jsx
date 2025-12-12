import React, { useCallback, useMemo } from "react";
import ReactFlow, { 
  MiniMap, 
  Controls, 
  Panel, 
  ReactFlowProvider, 
  useReactFlow,
  getRectOfNodes,
  getTransformForBounds
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image"; 
import { Image as ImageIcon, LayoutList, MousePointerClick } from "lucide-react";
import toast from "react-hot-toast";
import dagre from "dagre";

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 300; 
const nodeHeight = 40;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  
  dagreGraph.setGraph({ 
    rankdir: direction,
    ranksep: 10,
    nodesep: 10,
    edgesep: 5
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function GraphViewInner({ data }) {
  const { getNodes } = useReactFlow();

  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (!data || !data.nodes || Object.keys(data.nodes).length === 0) {
      return { nodes: [], edges: [] };
    }

    const rawNodes = Object.entries(data.nodes).map(([url, meta]) => {
        const status = meta?.status || 0;
        const isSuccess = status >= 200 && status < 300;
        
        const cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, "");

        return {
          id: url,
          data: { 
            label: (
              <div 
                title={url}
                onClick={() => window.open(url, '_blank')}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    padding: '0 8px'
                }}
              >
                {cleanUrl}
              </div>
            ) 
          },
          style: { 
              background: isSuccess ? '#ecfdf5' : '#fef2f2',
              border: isSuccess ? '1px solid #10b981' : '1px solid #ef4444',
              borderRadius: '3px',
              fontSize: '11px',
              width: nodeWidth,
              height: nodeHeight,
              boxShadow: 'none',
              fontFamily: 'monospace',
              fontWeight: '600',
              color: '#334155',
              padding: 0,
          },
          ariaLabel: url,
        };
    });

    const addedEdges = new Set();
    const rawEdges = [];

    (data.edges || []).forEach(([src, tgt]) => {
        const edgeId = `${src}-${tgt}`;
        if (!addedEdges.has(edgeId)) {
            addedEdges.add(edgeId);
            rawEdges.push({
                id: edgeId,
                source: src,
                target: tgt,
                type: 'smoothstep', 
                animated: false,
                style: { stroke: '#cbd5e1', strokeWidth: 1 }
            });
        }
    });

    return getLayoutedElements(rawNodes, rawEdges);
  }, [data]);

  const handleDownloadImage = useCallback(() => {
    const nodes = getNodes();
    if (nodes.length === 0) return;
    
    const nodesBounds = getRectOfNodes(nodes);
    const imageWidth = nodesBounds.width + 20;
    const imageHeight = nodesBounds.height + 20;
    
    const transform = getTransformForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.1, 
      2    
    );

    const el = document.querySelector('.react-flow__viewport');
    if (!el) return;

    toPng(el, {
      backgroundColor: '#ffffff',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${transform[0]}px, ${transform[1]}px) scale(${transform[2]})`,
      },
      pixelRatio: 2, 
    }).then((dataUrl) => {
        const a = document.createElement('a');
        a.download = `graf_crawler_${Date.now()}.png`;
        a.href = dataUrl;
        a.click();
        toast.success("PNG saved");
    }).catch(err => {
        console.error(err);
        toast.error("Failed to generate image");
    });
  }, [getNodes]);

  if (layoutedNodes.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-gray-400 italic bg-gray-50 rounded-xl border border-dashed">
            No data to display graph
        </div>
      );
  }

  return (
    <div className="h-full w-full bg-white rounded-xl overflow-hidden shadow-inner relative group">
      <ReactFlow 
        nodes={layoutedNodes} 
        edges={layoutedEdges} 
        fitView 
        minZoom={0.05} 
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }} 
      >
        <MiniMap 
            nodeColor={(n) => n.style?.background || '#eee'} 
            maskColor="rgba(240, 240, 240, 0.6)"
            style={{ border: '1px solid #e2e8f0' }}
        />
        <Controls />
        
        <Panel position="top-right" className="flex gap-2">
            <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow border text-xs text-gray-500 flex items-center gap-2">
                <MousePointerClick size={14} />
                Click node to open
            </div>
            <button 
                onClick={handleDownloadImage}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-md transition-colors text-sm font-medium"
            >
                <ImageIcon size={16} /> Save PNG
            </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export default function GraphView(props) {
  return (
    <ReactFlowProvider>
        <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}