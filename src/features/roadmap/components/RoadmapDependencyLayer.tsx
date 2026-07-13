import { IconButton, Tooltip } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { EpicDependency } from "../../../features/api/dependencyService";

type RoadmapDependencyLayerProps = {
  dependencies: EpicDependency[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  refreshKey: string;
  color: string;
  previewColor: string;
  epicColorsById: Record<string, string>;
  onDeleteDependency: (dependencyId: string) => void;
};

type BarNodeData = {
  width: number;
  height: number;
};

type RouteObstacle = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type RoadmapDependencyEdgeData = {
  showHead?: boolean;
  sourceId?: string;
  targetId?: string;
  obstacles?: RouteObstacle[];
  onDelete?: (dependencyId: string) => void;
};

const NODE_PADDING = 0;
const LOOP_OFFSET = 38;
const SAME_ROW_LANE_OFFSET = 42;
const ROW_CLEARANCE = 10;
const CORNER_RADIUS = 26;

const RoadmapDependencyNode = ({ data }: NodeProps<Node<BarNodeData>>) => (
  <div
    style={{
      width: data.width,
      height: data.height,
      position: "relative",
      pointerEvents: "none",
    }}
  >
    <Handle
      id="start-target"
      type="target"
      position={Position.Left}
      style={{
        opacity: 0,
        left: -NODE_PADDING,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    />
    <Handle
      id="start-source"
      type="source"
      position={Position.Left}
      style={{
        opacity: 0,
        left: -NODE_PADDING,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    />
    <Handle
      id="end-source"
      type="source"
      position={Position.Right}
      style={{
        opacity: 0,
        right: -NODE_PADDING,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
      }}
    />
  </div>
);

const getRoutedPath = (
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  edgeData?: RoadmapDependencyEdgeData
) => {
  const laneY = getLaneY(sourceY, targetY, edgeData);
  const sourceOutX = sourceX + LOOP_OFFSET;
  const targetOutX = targetX - LOOP_OFFSET;
  const labelX = sourceOutX + (targetOutX - sourceOutX) / 2;
  const labelY = laneY;
  const sourceVerticalSign = laneY >= sourceY ? 1 : -1;
  const targetVerticalSign = targetY >= laneY ? 1 : -1;
  const laneHorizontalSign = targetOutX >= sourceOutX ? 1 : -1;
  const targetHorizontalSign = targetX >= targetOutX ? 1 : -1;
  const sourceRadius = Math.min(
    CORNER_RADIUS,
    Math.abs(laneY - sourceY) / 2,
    Math.abs(sourceOutX - sourceX)
  );
  const laneRadius = Math.min(
    CORNER_RADIUS,
    Math.abs(laneY - sourceY) / 2,
    Math.abs(targetOutX - sourceOutX) / 2
  );
  const targetRadius = Math.min(
    CORNER_RADIUS,
    Math.abs(targetY - laneY) / 2,
    Math.abs(targetX - targetOutX)
  );

  return {
    edgePath: [
      `M ${sourceX},${sourceY}`,
      `L ${sourceOutX - sourceRadius},${sourceY}`,
      `Q ${sourceOutX},${sourceY} ${sourceOutX},${sourceY + sourceVerticalSign * sourceRadius}`,
      `L ${sourceOutX},${laneY - sourceVerticalSign * laneRadius}`,
      `Q ${sourceOutX},${laneY} ${sourceOutX + laneHorizontalSign * laneRadius},${laneY}`,
      `L ${targetOutX - laneHorizontalSign * laneRadius},${laneY}`,
      `Q ${targetOutX},${laneY} ${targetOutX},${laneY + targetVerticalSign * targetRadius}`,
      `L ${targetOutX},${targetY - targetVerticalSign * targetRadius}`,
      `Q ${targetOutX},${targetY} ${targetOutX + targetHorizontalSign * targetRadius},${targetY}`,
      `L ${targetX},${targetY}`,
    ].join(" "),
    labelX,
    labelY,
  };
};

const getLaneY = (
  sourceY: number,
  targetY: number,
  edgeData?: RoadmapDependencyEdgeData
) => {
  const verticalDistance = Math.abs(targetY - sourceY);
  if (verticalDistance < SAME_ROW_LANE_OFFSET) {
    return Math.max(sourceY, targetY) + SAME_ROW_LANE_OFFSET;
  }

  const minY = Math.min(sourceY, targetY);
  const maxY = Math.max(sourceY, targetY);
  const relevantObstacles = (edgeData?.obstacles ?? [])
    .filter((obstacle) => obstacle.id !== edgeData?.sourceId && obstacle.id !== edgeData?.targetId)
    .map((obstacle) => ({
      top: obstacle.y - ROW_CLEARANCE,
      bottom: obstacle.y + obstacle.height + ROW_CLEARANCE,
    }))
    .filter((obstacle) => obstacle.bottom > minY && obstacle.top < maxY)
    .sort((a, b) => a.top - b.top);

  const gaps: Array<{ start: number; end: number }> = [];
  let cursor = minY + ROW_CLEARANCE;

  relevantObstacles.forEach((obstacle) => {
    if (obstacle.top > cursor) {
      gaps.push({ start: cursor, end: obstacle.top });
    }
    cursor = Math.max(cursor, obstacle.bottom);
  });

  if (cursor < maxY - ROW_CLEARANCE) {
    gaps.push({ start: cursor, end: maxY - ROW_CLEARANCE });
  }

  const bestGap = gaps
    .filter((gap) => gap.end - gap.start >= ROW_CLEARANCE)
    .sort((a, b) => b.end - b.start - (a.end - a.start))[0];

  if (bestGap) {
    return bestGap.start + (bestGap.end - bestGap.start) / 2;
  }

  return sourceY + (targetY - sourceY) / 2;
};

const RoadmapDependencyEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const edgeData = data as RoadmapDependencyEdgeData | undefined;
  const { edgePath, labelX, labelY } = getRoutedPath(sourceX, sourceY, targetX, targetY, edgeData);

  return (
    <>
      <path
        className="roadmap-dependency-hit-path"
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        strokeLinecap="round"
        strokeLinejoin="round"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <BaseEdge
        path={edgePath}
        markerEnd={edgeData?.showHead === false ? undefined : markerEnd}
        style={{
          ...style,
          fill: "none",
          strokeLinecap: "round",
          strokeLinejoin: "round",
          pointerEvents: "none",
        }}
      />
      {edgeData?.onDelete && isHovered ? (
        <EdgeLabelRenderer>
          <Tooltip title="Eliminar dependencia">
            <IconButton
              className="roadmap-edge-action"
              size="small"
              aria-label="Eliminar dependencia"
              onClick={(event) => {
                event.stopPropagation();
                edgeData.onDelete?.(id);
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              sx={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                width: 28,
                height: 28,
                bgcolor: "background.paper",
                color: "error.main",
                border: 1,
                borderColor: "divider",
                boxShadow: 2,
                opacity: 0.92,
                "&:hover": {
                  bgcolor: "error.main",
                  color: "error.contrastText",
                  opacity: 1,
                },
              }}
            >
              <DeleteIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
};

const nodeTypes = {
  roadmapDependencyNode: RoadmapDependencyNode,
};

const edgeTypes = {
  roadmapDependency: RoadmapDependencyEdge,
};

const RoadmapDependencyLayer = ({
  dependencies,
  scrollContainerRef,
  refreshKey,
  color,
  previewColor: _previewColor,
  epicColorsById,
  onDeleteDependency,
}: RoadmapDependencyLayerProps) => {
  const [nodes, setNodes] = useState<Node<BarNodeData>[]>([]);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });

  const measureBars = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const nextNodes: Node<BarNodeData>[] = [];

    container.querySelectorAll<HTMLElement>("[data-roadmap-bar]").forEach((bar) => {
      const rect = bar.getBoundingClientRect();
      const id = bar.dataset.roadmapBar;
      if (!id) return;

      nextNodes.push({
        id,
        type: "roadmapDependencyNode",
        position: {
          x: rect.left - containerRect.left + container.scrollLeft,
          y: rect.top - containerRect.top + container.scrollTop,
        },
        data: {
          width: rect.width,
          height: rect.height,
        },
        draggable: false,
        selectable: false,
      });
    });

    setNodes(nextNodes);
    setBounds({
      width: Math.max(container.scrollWidth, container.clientWidth),
      height: Math.max(container.scrollHeight, container.clientHeight),
    });
  }, [scrollContainerRef]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureBars);
    return () => window.cancelAnimationFrame(frame);
  }, [measureBars, refreshKey]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scheduleMeasure = () => window.requestAnimationFrame(measureBars);
    const resizeObserver = new ResizeObserver(scheduleMeasure);

    resizeObserver.observe(container);
    container.querySelectorAll<HTMLElement>("[data-roadmap-bar]").forEach((bar) => {
      resizeObserver.observe(bar);
    });

    container.addEventListener("scroll", scheduleMeasure);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("roadmap-bars-change", scheduleMeasure);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("roadmap-bars-change", scheduleMeasure);
    };
  }, [measureBars, refreshKey, scrollContainerRef]);

  const edges: Edge[] = useMemo(() => {
    const barIds = new Set(nodes.map((node) => node.id));
    return dependencies
      .filter((dependency) => barIds.has(dependency.depends_on_epic_id) && barIds.has(dependency.epic_id))
      .map<Edge>((dependency) => {
        const dependencyColor = epicColorsById[dependency.depends_on_epic_id] ?? color;

        return {
          id: dependency.id,
          type: "roadmapDependency",
          source: dependency.depends_on_epic_id,
          target: dependency.epic_id,
          sourceHandle: "end-source",
          targetHandle: "start-target",
          animated: false,
          selectable: false,
          style: {
            stroke: dependencyColor,
            strokeWidth: 2.5,
          },
          markerEnd: {
            type: "arrowclosed",
            color: dependencyColor,
            width: 16,
            height: 16,
          },
          data: {
            sourceId: dependency.depends_on_epic_id,
            targetId: dependency.epic_id,
            obstacles: nodes
              .filter((node) => node.id !== "roadmap-preview-cursor")
              .map((node) => ({
                id: node.id,
                x: node.position.x,
                y: node.position.y,
                width: node.data.width,
                height: node.data.height,
              })),
            onDelete: onDeleteDependency,
          },
        };
      });
  }, [color, dependencies, epicColorsById, nodes, onDeleteDependency]);

  if (bounds.width === 0 || bounds.height === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: "none",
        zIndex: 3,
      }}
    >
      <ReactFlow
        className="roadmap-dependency-flow"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={1}
        maxZoom={1}
        proOptions={{ hideAttribution: true }}
        style={{
          width: bounds.width,
          height: bounds.height,
          pointerEvents: "none",
          background: "transparent",
        }}
      />
    </div>
  );
};

export default RoadmapDependencyLayer;
