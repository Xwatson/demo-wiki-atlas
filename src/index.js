import * as d3 from "d3";
import Graph from "graphology";
import circular from "graphology-layout/circular";
import random from "graphology-layout/random";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { document_d } from "./path";

// 创建一个无向图
const graph = new Graph();

graph.addNode("node1", { label: "页面 A" });
graph.addNode("node2", { label: "页面 B" });
graph.addNode("node3", { label: "页面 C" });
graph.addNode("node4", { label: "页面 D" });

graph.addNode("node5", { label: "引用 A" });
graph.addNode("node6", { label: "引用 A1" });

graph.addNode("node7", { label: "与A互相引用" });

graph.addEdge("node1", "node2", { depth: 0 });
graph.addEdge("node1", "node7", { depth: 0 });
graph.addEdge("node2", "node3", { depth: 1 });
graph.addEdge("node3", "node4", { depth: 2 });

graph.addEdge("node5", "node1", { depth: 0 });
graph.addEdge("node6", "node5", { depth: 0 });

graph.addEdge("node7", "node1", { depth: 0 });

/* for (let i = 1; i <= 50; i++) {
  graph.addNode("node" + i, { label: "Node " + i });
  graph.addEdge("center", "node" + i, { weight: i < 10 ? 1 : 0.2 });
} */
// 为节点分配初始位置 圆形排列
circular.assign(graph);
// random.assign(graph);

// 计算节点大小
const degrees = graph.nodes().map((node) => graph.degree(node));
const minDegree = Math.min(...degrees);
const maxDegree = Math.max(...degrees);
const minSize = 50,
  maxSize = 100;
graph.forEachNode((node) => {
  const degree = graph.degree(node);
  graph.setNodeAttribute(
    node,
    "size",
    50
    // minSize +
    //   ((degree - minDegree) / (maxDegree - minDegree)) * (maxSize - minSize)
  );
});

// 使用 ForceAtlas2 算法计算布局
console.time("计算布局");
const settings = forceAtlas2.inferSettings(graph);
settings.adjustSizes = true;
settings.scalingRatio = 100; // 增加节点之间的距离
settings.barnesHutOptimize = true;
// settings.gravity = 1; // 减少重力，使图形更松散
const positions = forceAtlas2(graph, { iterations: 600, settings });
console.timeEnd("计算布局");

// 使用 D3.js 绘制 SVG 图形
const svg = d3.select("svg");
const width = svg.attr("width");
const height = svg.attr("height");

// 计算图形的中心位置
const centerX = width / 2;
const centerY = height / 2;

// 计算所有节点的平均位置
let sumX = 0,
  sumY = 0;
const nodeCount = graph.order;

graph.forEachNode((node) => {
  sumX += positions[node].x;
  sumY += positions[node].y;
});

const avgX = sumX / nodeCount;
const avgY = sumY / nodeCount;

// 平移所有节点的位置，使其中心对齐到 SVG 中心
graph.forEachNode((node) => {
  positions[node].x += centerX - avgX;
  positions[node].y += centerY - avgY;
});

// 曲线生成器
const lineGenerator = d3
  .line()
  .curve(d3.curveCatmullRom.alpha(0)) // 使用 Catmull-Rom 曲线
  .x((d) => d.x)
  .y((d) => d.y);

// 创建线 g
const linkG = svg
  .append("g")
  .attr("class", "links")
  .selectAll("path")
  .data(graph.edges())
  .enter()
  .append("g");

// 创建线
const link = linkG
  .append("path")
  .attr("class", "link")
  .attr("fill", "none")
  .attr("stroke", "#ccc")
  .attr("stroke-width", 0.5);

// 创建节点
const nodes = svg
  .append("g")
  .attr("class", "nodes")
  .selectAll("circle")
  .data(graph.nodes())
  .enter()
  .append("g");
const node = nodes
  .append("circle")
  .attr("class", "node")
  .attr("r", 15)
  .attr("fill", "#6698FF");
const nodeG = nodes
  .append("g")
  .attr("transform", (d, v) => {
    return `translate(${positions[d].x - 8}, ${positions[d].y - 8})`;
  })
  .attr("cursor", "pointer")
  .on("click", (e, d) => {
    const hoveredNode = d;
    const hoveredNeighbors = new Set(graph.neighbors(d));
    const nodes = graph.filterNodes(
      (n) => n !== hoveredNode && !hoveredNeighbors?.has(n)
    );
    console.log("nodes==", nodes);
    const nodesIndex = new Set(nodes);
    const edges = graph.filterEdges((e) =>
      graph.extremities(e).some((n) => nodesIndex.has(n))
    );
    console.log("edges==", edges);
  });
nodeG.append("path").attr("class", "icon-document").attr("d", document_d);
nodeG
  .append("text")
  .attr("y", 35)
  .text((d) => {
    return graph.getNodeAttribute(d, "label");
  });

// 更新节点和边的位置
function updatePositions() {
  link
    .attr("d", (d) => {
      const startPos = positions[graph.source(d)];
      const endPos = positions[graph.target(d)];
      // 起始和结束位置坐标
      const start = { x: startPos.x, y: startPos.y };
      const end = { x: endPos.x, y: endPos.y };
      // console.log(graph.source(d), "---", "start:", start, "end:", end);
      const points = [
        start,
        { x: (start.x + end.x) / 2, y: end.y }, // 控制点，决定曲线的弧度
        end,
      ];

      const pathData = lineGenerator(points);
      return pathData;
    })
    .attr("stroke", (d) => {
      const depth = graph.getEdgeAttribute(d, "depth");
      if (depth === 0) {
        const inEdges = graph.inEdges(graph.source(d)); // 入边
        return inEdges.length > 1 ? "#6698FF" : "green";
      }
      return "#ccc";
    });
  //   link
  //     .attr("x1", (d) => positions[graph.source(d)].x)
  //     .attr("y1", (d) => positions[graph.source(d)].y)
  //     .attr("x2", (d) => positions[graph.target(d)].x)
  //     .attr("y2", (d) => positions[graph.target(d)].y);

  node.attr("cx", (d) => positions[d].x).attr("cy", (d) => positions[d].y);
}

// 初始位置更新
updatePositions();

// 点动画
function animate(dot, path, start, pathLength) {
  dot
    .attr("transform", "translate(" + start.x + "," + start.y + ")")
    .transition()
    .duration(1200)
    .ease(d3.easeLinear)
    .attrTween("transform", function () {
      return function (t) {
        const point = path.getPointAtLength(t * pathLength);
        return "translate(" + point.x + "," + point.y + ")";
      };
    })
    .on("end", () => animate(dot, path, start, pathLength)); // 动画结束时重新开始
}

link.each(function (d) {
  const depth = graph.getEdgeAttribute(d, "depth");
  if (depth === 0) {
    const node = d3.select(this).node();
    const start = positions[graph.source(d)];
    const inEdges = graph.inEdges(graph.source(d)); // 入边
    // 创建点
    const dot = d3
      .select(node.parentNode)
      .append("circle")
      .attr("r", 3)
      .attr("fill", inEdges.length > 1 ? "#6698FF" : "green");
    // .attr("class", "dot");
    // 获取路径长度
    const pathLength = node.getTotalLength();
    animate(dot, node, start, pathLength);
  }
});
