import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import type { Note, Link } from '../../lib/db'

// ── 图谱节点/边类型 ──────────────────────────────

interface GraphNode {
  id: string
  title: string
  subtitle: string
  connectionCount: number
  isXizhu: boolean
}

interface GraphLink {
  source: string
  target: string
}

// ── Props ────────────────────────────────────────

interface Props {
  notes: Note[]
  links: Link[]
  selectedTagIds: Set<number>
  onNodeClick: (noteId: number) => void
}

// ── ForceGraph2D ref 类型（最小接口） ─────────────

interface ForceGraphRef {
  refresh(): void
  zoomToFit(durationMs?: number, padding?: number): void
  centerAt(x: number, y: number, ms?: number): void
  d3Force(name: string): { alpha(value: number): void } | undefined
}

// ── 组件 ────────────────────────────────────────

export default function KnowledgeGraph({
  notes,
  links,
  selectedTagIds,
  onNodeClick,
}: Props) {
  const fgRef = useRef<ForceGraphRef>(null)
  const timeRef = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── 数据转换 + 标签筛选 ─────────────────────

  const { nodes, graphLinks } = useMemo(() => {
    // 1. 筛选节点
    const filteredNotes =
      selectedTagIds.size === 0
        ? notes
        : notes.filter(n => n.tags.some(tid => selectedTagIds.has(tid)))

    const visibleIds = new Set(filteredNotes.map(n => String(n.id!)))

    // 2. 筛选边（两端都在可见节点中）
    const filteredLinks = links.filter(
      l => visibleIds.has(String(l.sourceNoteId)) && visibleIds.has(String(l.targetNoteId)),
    )

    // 3. 计算连接数
    const connCount = new Map<string, number>()
    for (const l of filteredLinks) {
      const s = String(l.sourceNoteId)
      const t = String(l.targetNoteId)
      connCount.set(s, (connCount.get(s) ?? 0) + 1)
      connCount.set(t, (connCount.get(t) ?? 0) + 1)
    }

    // 4. 构建节点
    const graphNodes: GraphNode[] = filteredNotes.map(n => ({
      id: String(n.id!),
      title: n.title || '无标题',
      subtitle: n.subtitle,
      connectionCount: connCount.get(String(n.id!)) ?? 0,
      isXizhu: n.isXizhu,
    }))

    // 5. 构建边
    const graphLinks: GraphLink[] = filteredLinks.map(l => ({
      source: String(l.sourceNoteId),
      target: String(l.targetNoteId),
    }))

    return { nodes: graphNodes, graphLinks }
  }, [notes, links, selectedTagIds])

  const graphData = useMemo(
    () => ({ nodes, links: graphLinks }),
    [nodes, graphLinks],
  )

  // ── 呼吸灯循环 ──────────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
      timeRef.current += 0.05
      fgRef.current?.refresh()
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // ── 初始适配缩放 ────────────────────────────

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fgRef.current?.zoomToFit(400, 60)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [nodes.length])

  // ── 节点绘制 ────────────────────────────────

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, _globalScale: number) => {
      const r = Math.min(4 + node.connectionCount * 1.5, 12)
      const t = timeRef.current

      // 呼吸光晕透明度
      const glowAlpha = Math.sin(t + Number(node.id) * 0.7) * 0.2 + 0.5

      // 光晕颜色
      let glowColor: string
      if (node.isXizhu) {
        glowColor = `rgba(192, 132, 252, ${glowAlpha})`
      } else if (node.connectionCount >= 3) {
        glowColor = `rgba(168, 85, 247, ${glowAlpha})`
      } else {
        glowColor = `rgba(124, 58, 237, ${glowAlpha * 0.7})`
      }

      // 外光晕
      const glowGrad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.5)
      glowGrad.addColorStop(0, glowColor)
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.beginPath()
      ctx.arc(0, 0, r * 2.5, 0, 2 * Math.PI)
      ctx.fillStyle = glowGrad
      ctx.fill()

      // 主节点圆
      const mainGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, 0, 0, 0, r)
      if (node.connectionCount >= 5) {
        mainGrad.addColorStop(0, '#C084FC')
        mainGrad.addColorStop(1, '#7C3AED')
      } else if (node.connectionCount >= 3) {
        mainGrad.addColorStop(0, '#A855F7')
        mainGrad.addColorStop(1, '#5B21B6')
      } else if (node.isXizhu) {
        mainGrad.addColorStop(0, '#C084FC')
        mainGrad.addColorStop(1, '#8B5CF6')
      } else {
        mainGrad.addColorStop(0, '#8B5CF6')
        mainGrad.addColorStop(1, '#4C1D95')
      }
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, 2 * Math.PI)
      ctx.fillStyle = mainGrad
      ctx.fill()

      // 高光点
      ctx.beginPath()
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, 2 * Math.PI)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.fill()

      // 文字标签
      const label = node.title.length > 8 ? node.title.slice(0, 8) + '…' : node.title
      ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#E2E0E7'
      ctx.fillText(label, 0, r + 5)
    },
    [],
  )

  // ── 节点颜色（回退用） ──────────────────────

  const nodeColor = useCallback((node: GraphNode) => {
    if (node.isXizhu) return '#C084FC'
    if (node.connectionCount >= 3) return '#A855F7'
    return '#7C3AED'
  }, [])

  // ── 边颜色 / 宽度 ───────────────────────────

  const linkColor = useCallback(
    () => 'rgba(168, 85, 247, 0.2)',
    [],
  )

  const linkWidth = useCallback((link: GraphLink) => {
    // 如果任一端连接数高，连线稍粗
    const srcNode = nodes.find(n => n.id === link.source)
    const tgtNode = nodes.find(n => n.id === link.target)
    const maxConn = Math.max(srcNode?.connectionCount ?? 0, tgtNode?.connectionCount ?? 0)
    return maxConn >= 3 ? 2 : 1
  }, [nodes])

  // ── 悬停提示 ────────────────────────────────

  const nodeLabel = useCallback(
    (node: GraphNode) => {
      const parts = [node.title || '无标题']
      if (node.subtitle) parts.push(node.subtitle)
      parts.push(`连接: ${node.connectionCount}`)
      if (node.isXizhu) parts.push('🌟 曦筑')
      return parts.join('\n')
    },
    [],
  )

  // ── 点击处理 ────────────────────────────────

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeClick(Number(node.id))
    },
    [onNodeClick],
  )

  // ── 容器尺寸 ────────────────────────────────

  const [dims] = useStateIfResize(containerRef)

  // ── 空状态 ──────────────────────────────────

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="text-5xl mb-4 opacity-30">🌐</div>
        <p className="text-text-secondary text-sm">
          {notes.length === 0
            ? '还没有笔记，去首页创建第一篇吧'
            : selectedTagIds.size > 0
              ? '筛选标签后没有匹配的笔记'
              : graphLinks.length === 0
                ? '暂无笔记关联\n在编辑器中用 @ 链接其他笔记'
                : '暂无数据'}
        </p>
      </div>
    )
  }

  // ── 渲染图谱 ────────────────────────────────

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraph2D
        ref={fgRef as React.RefObject<any>}
        graphData={graphData}
        nodeId="id"
        linkSource="source"
        linkTarget="target"
        nodeVal={(node: GraphNode) => Math.min(4 + node.connectionCount * 1.5, 12)}
        nodeColor={nodeColor}
        nodeCanvasObject={paintNode as any}
        nodeLabel={nodeLabel}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalArrowLength={0}
        onNodeClick={handleNodeClick as any}
        backgroundColor="#0F0F1A"
        width={dims.width}
        height={dims.height}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        minZoom={0.3}
        maxZoom={4}
        cooldownTicks={100}
      />
    </div>
  )
}

// ── Hook: 监听容器尺寸 ───────────────────────

function useStateIfResize(ref: React.RefObject<HTMLDivElement | null>) {
  const [dims, setDims] = useState({ width: 400, height: 400 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const update = () => {
      setDims({ width: el.clientWidth, height: el.clientHeight })
    }
    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return [dims, setDims] as const
}
