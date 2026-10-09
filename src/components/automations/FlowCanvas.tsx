'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  WorkflowNode,
  WorkflowEdge,
  WorkflowViewport,
  WorkflowNodeType,
} from '@/lib/types/automation-flow';
import { CustomNode } from './CustomNode';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';

interface FlowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onOpenLibrary: () => void;
  onOpenSettings: (node: WorkflowNode) => void;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onOpenLibrary,
  onOpenSettings,
  selectedNodeId,
  onSelectNode,
}: FlowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport zoom & pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Connection line creation
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    handleId: string;
  } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Edge selection
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on empty background
    if ((e.target as HTMLElement).closest('.group')) return;

    onSelectNode(null);
    setSelectedEdgeId(null);
    setConnectingFrom(null);

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Panning canvas
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
        return;
      }

      // Dragging a node
      if (draggingNodeId) {
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const rawX = (e.clientX - rect.left - pan.x) / zoom;
        const rawY = (e.clientY - rect.top - pan.y) / zoom;

        onNodesChange(
          nodes.map((n) =>
            n.id === draggingNodeId
              ? {
                  ...n,
                  position: {
                    x: Math.round(rawX - dragOffset.x),
                    y: Math.round(rawY - dragOffset.y),
                  },
                }
              : n
          )
        );
      }

      // Track mouse position for connection preview line
      if (connectingFrom) {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom,
        });
      }
    },
    [isPanning, panStart, draggingNodeId, dragOffset, nodes, onNodesChange, connectingFrom, pan, zoom]
  );

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag Start
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectNode(nodeId);
    setSelectedEdgeId(null);

    const targetNode = nodes.find((n) => n.id === nodeId);
    if (!targetNode) return;

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseX - targetNode.position.x,
      y: mouseY - targetNode.position.y,
    });
  };

  // Connect handlers
  const handleStartConnect = (nodeId: string, handleId: string) => {
    setConnectingFrom({ nodeId, handleId });
  };

  const handleEndConnect = (targetNodeId: string, targetHandleId: string) => {
    if (!connectingFrom) return;
    if (connectingFrom.nodeId === targetNodeId) {
      setConnectingFrom(null);
      return;
    }

    const newEdge: WorkflowEdge = {
      id: `edge_${connectingFrom.nodeId}_${targetNodeId}_${Date.now()}`,
      source: connectingFrom.nodeId,
      target: targetNodeId,
      sourceHandle: connectingFrom.handleId,
      targetHandle: targetHandleId,
    };

    // Prevent exact duplicate edge
    const exists = edges.some(
      (e) =>
        e.source === newEdge.source &&
        e.target === newEdge.target &&
        e.sourceHandle === newEdge.sourceHandle
    );

    if (!exists) {
      onEdgesChange([...edges, newEdge]);
    }

    setConnectingFrom(null);
  };

  // Node actions
  const handleDeleteNode = (nodeId: string) => {
    onNodesChange(nodes.filter((n) => n.id !== nodeId));
    onEdgesChange(edges.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) onSelectNode(null);
  };

  const handleDuplicateNode = (node: WorkflowNode) => {
    const newNode: WorkflowNode = {
      ...node,
      id: `node_${Date.now()}`,
      label: `${node.label} (Copy)`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: { ...node.data },
    };
    onNodesChange([...nodes, newNode]);
    onSelectNode(newNode.id);
  };

  // Keyboard shortcut to delete selected node or edge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeElem = document.activeElement;
        // Don't delete if focused in an input or textarea
        if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA')) {
          return;
        }

        if (selectedNodeId) {
          handleDeleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          onEdgesChange(edges.filter((e) => e.id !== selectedEdgeId));
          setSelectedEdgeId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, edges, nodes, onEdgesChange]);

  // Fit to screen
  const handleFitScreen = () => {
    if (nodes.length === 0) {
      setZoom(1);
      setPan({ x: 50, y: 50 });
      return;
    }

    const minX = Math.min(...nodes.map((n) => n.position.x));
    const maxX = Math.max(...nodes.map((n) => n.position.x + 280));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    const maxY = Math.max(...nodes.map((n) => n.position.y + 160));

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;

    const targetZoom = Math.min(
      Math.max(Math.min(width / graphWidth, height / graphHeight), 0.5),
      1.3
    );

    setZoom(targetZoom);
    setPan({
      x: (width - graphWidth * targetZoom) / 2 - minX * targetZoom + 80,
      y: (height - graphHeight * targetZoom) / 2 - minY * targetZoom + 80,
    });
  };

  // Calculate coordinates for connection bezier curve
  const getNodeCenter = (nodeId: string, handleId?: string, isSource = true) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };

    const width = 260;
    const height = 120;

    if (isSource) {
      // Source handle (bottom or specific offset)
      if (handleId === 'true') {
        return { x: node.position.x + width * 0.25, y: node.position.y + height };
      }
      if (handleId === 'false') {
        return { x: node.position.x + width * 0.75, y: node.position.y + height };
      }
      return { x: node.position.x + width / 2, y: node.position.y + height };
    } else {
      // Target handle (top)
      return { x: node.position.x + width / 2, y: node.position.y };
    }
  };

  const getSourcePos = (nodeId: string, handleId?: string) =>
    getNodeCenter(nodeId, handleId, true);
  const getTargetPos = (nodeId: string, handleId?: string) =>
    getNodeCenter(nodeId, handleId, false);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none cursor-grab active:cursor-grabbing"
      style={{
        backgroundImage: `radial-gradient(circle, #334155 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* Zoom / Viewport Controls Floating Toolbar */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl text-slate-300">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
          className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-semibold px-1 text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-800" />
        <button
          type="button"
          onClick={handleFitScreen}
          className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(1);
            setPan({ x: 50, y: 50 });
          }}
          className="p-1.5 rounded-xl hover:bg-slate-800 hover:text-white transition"
          title="Reset Zoom & Pan"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Add Node Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={onOpenLibrary}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Step</span>
        </button>
      </div>

      {/* SVG Canvas for Edges */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transformOrigin: '0 0',
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Render existing connections */}
          {edges.map((edge) => {
            const source = getSourcePos(edge.source, edge.sourceHandle);
            const target = getTargetPos(edge.target, edge.targetHandle);

            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const deltaY = Math.max(Math.abs(dy) * 0.5, 40);

            const path = `M ${source.x} ${source.y} C ${source.x} ${source.y + deltaY}, ${target.x} ${target.y - deltaY}, ${target.x} ${target.y}`;
            const isSelected = selectedEdgeId === edge.id;

            const isTrueBranch = edge.sourceHandle === 'true';
            const isFalseBranch = edge.sourceHandle === 'false';
            const strokeColor = isTrueBranch
              ? '#10b981'
              : isFalseBranch
              ? '#ef4444'
              : isSelected
              ? '#6366f1'
              : '#64748b';

            return (
              <g
                key={edge.id}
                className="pointer-events-auto cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  onSelectNode(null);
                }}
              >
                {/* Fat invisible line for easier click detection */}
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                />
                {/* Visible curved line */}
                <path
                  d={path}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={isFalseBranch ? '4 4' : undefined}
                  className="transition-all duration-150 group-hover:stroke-indigo-400 group-hover:stroke-[3px]"
                />
              </g>
            );
          })}

          {/* Interactive live connection drawing line */}
          {connectingFrom && (
            <path
              d={`M ${getSourcePos(connectingFrom.nodeId, connectingFrom.handleId).x} ${
                getSourcePos(connectingFrom.nodeId, connectingFrom.handleId).y
              } C ${getSourcePos(connectingFrom.nodeId, connectingFrom.handleId).x} ${
                getSourcePos(connectingFrom.nodeId, connectingFrom.handleId).y + 50
              }, ${mousePos.x} ${mousePos.y - 50}, ${mousePos.x} ${mousePos.y}`}
              fill="none"
              stroke="#6366f1"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              className="animate-pulse"
            />
          )}
        </g>
      </svg>

      {/* Transformed Nodes Container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map((node) => (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: `${node.position.x}px`,
              top: `${node.position.y}px`,
            }}
            onMouseDown={(e) => handleNodeDragStart(node.id, e)}
            className="pointer-events-auto cursor-move"
          >
            <CustomNode
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={onSelectNode}
              onOpenSettings={onOpenSettings}
              onDelete={handleDeleteNode}
              onDuplicate={handleDuplicateNode}
              onStartConnect={handleStartConnect}
              onEndConnect={handleEndConnect}
              isConnectingFrom={connectingFrom}
            />
          </div>
        ))}
      </div>

      {/* Delete Edge Floating Tooltip */}
      {selectedEdgeId && (
        <div className="absolute top-6 right-6 z-20">
          <button
            type="button"
            onClick={() => {
              onEdgesChange(edges.filter((e) => e.id !== selectedEdgeId));
              setSelectedEdgeId(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Connection</span>
          </button>
        </div>
      )}
    </div>
  );
}
