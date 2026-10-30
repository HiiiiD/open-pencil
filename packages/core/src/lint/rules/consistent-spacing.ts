import { defineRule } from '#core/lint/rule'
import { isMultipleOf, nearestValue, SPACING_SCALE } from '#core/lint/utils'

export default defineRule({
  meta: {
    id: 'consistent-spacing',
    category: 'layout',
    description: 'Spacing should follow the spacing scale'
  },
  match: ['FRAME', 'COMPONENT'],
  check(node, context) {
    if (node.layoutMode === 'NONE') return
    const config = context.getConfig() as { base?: number; strict?: boolean } | undefined
    const base = config?.base ?? 4
    // strict: only multiples of base are on the grid, the built-in scale (which has 1 and 2) is ignored
    const strict = config?.strict === true
    const scale = strict ? [] : SPACING_SCALE
    const valid = (value: number) => scale.includes(value) || isMultipleOf(value, base)
    const values = [
      ['itemSpacing', node.itemSpacing],
      ['paddingTop', node.paddingTop],
      ['paddingRight', node.paddingRight],
      ['paddingBottom', node.paddingBottom],
      ['paddingLeft', node.paddingLeft]
    ] as const
    for (const [name, value] of values) {
      if (value > 0 && !valid(value)) {
        const step = base > 0 ? base : 1
        const multiples = [Math.floor(value / step) * step, Math.ceil(value / step) * step]
        const suggested = nearestValue(
          value,
          [...scale, ...multiples].filter((candidate) => candidate > 0)
        )
        context.report({
          node,
          message: `${name === 'itemSpacing' ? 'gap' : name} ${value}px is not in spacing scale`,
          suggest: `Use a spacing token or a multiple of ${base}px`,
          data: { property: name, value, base },
          suggestions:
            suggested === null ? undefined : [{ kind: 'set', changes: { [name]: suggested } }]
        })
      }
    }
  }
})
