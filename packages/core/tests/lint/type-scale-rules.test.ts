import { describe, expect, test } from 'bun:test'

import { createLinter, type LintMessage } from '@open-pencil/core/lint'
import { SceneGraph } from '@open-pencil/scene-graph'

function lint(graph: SceneGraph, rule: string): LintMessage[] {
  const pageId = graph.getPages()[0].id
  return createLinter({ rules: [rule], config: { rules: { [rule]: 'warning' } } }).lintGraph(
    graph,
    [pageId]
  ).messages
}

function lintWithOptions(
  graph: SceneGraph,
  rule: string,
  options: Record<string, unknown>
): LintMessage[] {
  const pageId = graph.getPages()[0].id
  return createLinter({
    rules: [rule],
    config: { rules: { [rule]: { severity: 'warning', options } } }
  }).lintGraph(graph, [pageId]).messages
}

describe('consistent-typography', () => {
  function textGraph(fontSize: number, fontWeight = 400) {
    const graph = new SceneGraph()
    const text = graph.createNode('TEXT', graph.getPages()[0].id, {
      name: 'Label',
      text: 'Hello',
      fontSize,
      fontWeight
    })
    return { graph, text }
  }

  test('flags a size outside the default scale and suggests the nearest one', () => {
    const { graph, text } = textGraph(13)

    const messages = lint(graph, 'consistent-typography')

    expect(messages.map((m) => m.nodeId)).toEqual([text.id])
    expect(messages[0]?.data).toEqual({ fontSize: 13 })
    expect(messages[0]?.suggestions).toEqual([{ kind: 'set', changes: { fontSize: 14 } }])
  })

  test('accepts sizes of the scale', () => {
    expect(lint(textGraph(14).graph, 'consistent-typography')).toEqual([])
  })

  test('takes the scale from the options', () => {
    const { graph } = textGraph(13)

    expect(lintWithOptions(graph, 'consistent-typography', { sizes: [13, 16] })).toEqual([])
    expect(
      lintWithOptions(textGraph(14).graph, 'consistent-typography', { sizes: [13, 16] })
    ).toHaveLength(1)
  })

  test('checks the weight only for sizes with a style entry', () => {
    const styles = [{ size: 12, weights: [400, 500, 600] }]

    const bold = lintWithOptions(textGraph(12, 700).graph, 'consistent-typography', { styles })
    const medium = lintWithOptions(textGraph(12, 500).graph, 'consistent-typography', { styles })
    const other = lintWithOptions(textGraph(14, 700).graph, 'consistent-typography', { styles })

    expect(bold.map((m) => m.data)).toEqual([{ fontSize: 12, fontWeight: 700 }])
    expect(bold[0]?.suggestions).toBeUndefined()
    expect(medium).toEqual([])
    expect(other).toEqual([])
  })
})

describe('consistent-spacing with a strict grid', () => {
  function frameGraph() {
    const graph = new SceneGraph()
    graph.createNode('FRAME', graph.getPages()[0].id, {
      layoutMode: 'VERTICAL',
      itemSpacing: 2,
      paddingTop: 6,
      paddingLeft: 8
    })
    return graph
  }

  test('accepts the built-in scale by default, so 2px passes', () => {
    expect(
      lintWithOptions(frameGraph(), 'consistent-spacing', { base: 4 }).map((m) => m.data)
    ).toEqual([{ property: 'paddingTop', value: 6, base: 4 }])
  })

  test('strict keeps only multiples of the base', () => {
    const messages = lintWithOptions(frameGraph(), 'consistent-spacing', { base: 4, strict: true })

    expect(messages.map((m) => m.data?.property)).toEqual(['itemSpacing', 'paddingTop'])
    expect(messages[0]?.suggestions).toEqual([{ kind: 'set', changes: { itemSpacing: 4 } }])
  })

  test('a base of 2 accepts even values and flags odd ones', () => {
    const graph = new SceneGraph()
    graph.createNode('FRAME', graph.getPages()[0].id, {
      layoutMode: 'HORIZONTAL',
      itemSpacing: 6,
      paddingLeft: 21
    })

    const messages = lintWithOptions(graph, 'consistent-spacing', { base: 2, strict: true })

    expect(messages.map((m) => m.data?.property)).toEqual(['paddingLeft'])
  })
})
